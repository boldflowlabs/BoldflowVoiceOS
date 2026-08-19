"""LeadSquared CRM adapter.

Upserts a lead in LeadSquared using accessKey & secretKey, then logs the call activity.
Supports region hosts e.g. api-in21.leadsquared.com, api.leadsquared.com.
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


class LeadSquaredProvider(CRMProvider):
    name = "leadsquared"

    def __init__(
        self,
        access_key: str,
        secret_key: str,
        region_host: str = "",
        timeout: float = 15.0,
    ):
        self._access_key = access_key
        self._secret_key = secret_key
        host = region_host.strip() if region_host else "api-in21.leadsquared.com"
        if not host.startswith("http"):
            host = f"https://{host}"
        self._base_url = host.rstrip("/")
        self._timeout = timeout

    async def sync_call(self, call: CallLog) -> CRMSyncResult:
        phone = normalize_phone(call.phone)
        if not phone:
            return CRMSyncResult(ok=False, detail="no_phone")

        lead_props = [
            {"Attribute": "Phone", "Value": phone},
            {"Attribute": "Source", "Value": "AI Voice Agent"},
        ]
        if call.name:
            parts = call.name.split(" ", 1)
            lead_props.append({"Attribute": "FirstName", "Value": parts[0]})
            if len(parts) > 1:
                lead_props.append({"Attribute": "LastName", "Value": parts[1]})
        if call.email:
            lead_props.append({"Attribute": "EmailAddress", "Value": call.email})
        if call.disposition:
            lead_props.append({"Attribute": "ProspectStage", "Value": call.disposition})

        params = {"accessKey": self._access_key, "secretKey": self._secret_key}

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                # 1. Create or Update Lead
                lead_res = await client.post(
                    f"{self._base_url}/v2/LeadManagement.svc/Lead.CreateOrUpdateByEmailOrPhone",
                    params=params,
                    json=lead_props,
                )

                if not lead_res.is_success:
                    err = _err_text(lead_res)
                    logger.warning(f"LeadSquared lead sync failed: {lead_res.status_code} {err}")
                    return CRMSyncResult(ok=False, detail=f"lead_sync_failed: {err}")

                lead_data = lead_res.json() if lead_res.content else {}
                lead_id = (lead_data.get("Message") or {}).get("Id") or lead_data.get("Id")
                if not lead_id and lead_data.get("Status") != "Success":
                    err = str(lead_data.get("ExceptionMessage") or lead_data.get("Message") or "unknown_error")
                    return CRMSyncResult(ok=False, detail=f"leadsquared_error: {err}")

                # 2. Log Prospect Activity
                activity_payload = {
                    "RelatedProspectId": lead_id,
                    "ActivityEvent": 201,  # Standard phone call activity code
                    "ActivityNote": render_call_note(call),
                    "Fields": [
                        {"SchemaName": "mx_Custom_1", "Value": call.disposition or "AI Call"},
                        {"SchemaName": "mx_Custom_2", "Value": str(call.duration_seconds)},
                    ],
                }

                if lead_id:
                    act_res = await client.post(
                        f"{self._base_url}/v2/ProspectActivity.svc/Create",
                        params=params,
                        json=activity_payload,
                    )
                    if not act_res.is_success:
                        logger.warning(f"LeadSquared activity log failed: {act_res.status_code}")

                logger.info(f"LeadSquared synced call for lead {lead_id or phone}")
                return CRMSyncResult(ok=True, detail="synced", contact_id=str(lead_id or phone))

        except Exception as exc:
            logger.warning(f"LeadSquared sync exception: {exc}")
            return CRMSyncResult(ok=False, detail=f"network_error: {exc}")


def _err_text(res: httpx.Response) -> str:
    try:
        data = res.json()
        return str(data.get("ExceptionMessage") or data.get("Message") or f"http_{res.status_code}")
    except Exception:
        return f"http_{res.status_code}"
