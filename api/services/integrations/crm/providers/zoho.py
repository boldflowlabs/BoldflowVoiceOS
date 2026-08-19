"""Zoho CRM adapter.

Upserts a lead in Zoho CRM (matched by Phone/Mobile) and creates an attached Note.
Supports India (zohoapis.in), US (zohoapis.com), EU (zohoapis.eu), etc.
"""

from __future__ import annotations

import httpx
from loguru import logger

from api.services.integrations.crm.base import (
    CallLog,
    CRMProvider,
    CRMSyncResult,
    normalize_phone,
    render_call_note,
)


class ZohoCRMProvider(CRMProvider):
    name = "zoho"

    def __init__(
        self,
        api_key: str,
        region_host: str = "",
        pipeline_id: str = "",
        timeout: float = 15.0,
    ):
        self._api_key = api_key
        # Default to India DC if not specified, or normalize host
        host = region_host.strip() if region_host else "https://www.zohoapis.in"
        if not host.startswith("http"):
            host = f"https://{host}"
        self._base_url = host.rstrip("/")
        self._pipeline_id = pipeline_id
        self._timeout = timeout

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Zoho-oauthtoken {self._api_key}"
            if not self._api_key.lower().startswith("bearer ")
            and not self._api_key.lower().startswith("zoho-oauthtoken ")
            else self._api_key,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def sync_call(self, call: CallLog) -> CRMSyncResult:
        phone = normalize_phone(call.phone)
        if not phone:
            return CRMSyncResult(ok=False, detail="no_phone")

        lead_data: dict = {
            "Phone": phone,
            "Mobile": phone,
            "Lead_Source": "AI Voice Agent",
        }
        if call.name:
            parts = call.name.split(" ", 1)
            lead_data["First_Name"] = parts[0]
            lead_data["Last_Name"] = parts[1] if len(parts) > 1 else parts[0]
        else:
            lead_data["Last_Name"] = f"Lead {phone[-4:]}"

        if call.email:
            lead_data["Email"] = call.email
        if call.disposition:
            lead_data["Lead_Status"] = call.disposition
        if self._pipeline_id:
            lead_data["Pipeline"] = self._pipeline_id

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                # 1. Upsert Lead (dedupe by Phone & Mobile)
                upsert_payload = {
                    "data": [lead_data],
                    "duplicate_check_fields": ["Phone", "Mobile"],
                }
                res = await client.post(
                    f"{self._base_url}/crm/v3/Leads/upsert",
                    headers=self._headers,
                    json=upsert_payload,
                )

                if not res.is_success:
                    err_msg = _extract_error(res)
                    logger.warning(f"Zoho lead upsert failed: {res.status_code} {err_msg}")
                    return CRMSyncResult(ok=False, detail=f"upsert_failed: {err_msg}")

                res_json = res.json() if res.content else {}
                data_list = res_json.get("data") or []
                record_id = None
                if data_list and isinstance(data_list[0], dict):
                    details = data_list[0].get("details") or {}
                    record_id = details.get("id") or data_list[0].get("id")

                if not record_id:
                    return CRMSyncResult(ok=False, detail="no_record_id_in_response")

                # 2. Add Note attached to the Lead
                note_payload = {
                    "data": [
                        {
                            "Note_Title": f"AI Call - {call.disposition or 'Completed'}",
                            "Note_Content": render_call_note(call),
                            "Parent_Id": record_id,
                            "$se_module": "Leads",
                        }
                    ]
                }
                note_res = await client.post(
                    f"{self._base_url}/crm/v3/Notes",
                    headers=self._headers,
                    json=note_payload,
                )
                if not note_res.is_success:
                    logger.warning(f"Zoho note creation failed: {note_res.status_code}")

                logger.info(f"Zoho CRM synced call for lead {record_id} ({phone})")
                return CRMSyncResult(ok=True, detail="synced", contact_id=str(record_id))

        except Exception as exc:
            logger.warning(f"Zoho CRM sync exception: {exc}")
            return CRMSyncResult(ok=False, detail=f"network_error: {exc}")


def _extract_error(res: httpx.Response) -> str:
    try:
        data = res.json()
        if "message" in data:
            return str(data["message"])
        if "data" in data and isinstance(data["data"], list) and data["data"]:
            return str(data["data"][0].get("message") or data["data"][0].get("code"))
        return f"http_{res.status_code}"
    except Exception:
        return f"http_{res.status_code}"
