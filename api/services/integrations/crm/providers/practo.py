"""Practo CRM / Healthcare Lead adapter.

Upserts patient/lead contact into Practo Ray / Reach / Clinic API and records call details.
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


class PractoProvider(CRMProvider):
    name = "practo"

    def __init__(
        self,
        api_key: str,
        practice_id: str = "",
        region_host: str = "",
        timeout: float = 15.0,
    ):
        self._api_key = api_key
        self._practice_id = practice_id
        host = region_host.strip() if region_host else "https://api.practo.com"
        if not host.startswith("http"):
            host = f"https://{host}"
        self._base_url = host.rstrip("/")
        self._timeout = timeout

    @property
    def _headers(self) -> dict:
        return {
            "Authorization": f"Bearer {self._api_key}" if not self._api_key.lower().startswith("bearer ") else self._api_key,
            "X-Practice-Id": self._practice_id,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def sync_call(self, call: CallLog) -> CRMSyncResult:
        phone = normalize_phone(call.phone)
        if not phone:
            return CRMSyncResult(ok=False, detail="no_phone")

        patient_body: dict = {
            "mobile_number": phone,
            "practice_id": self._practice_id,
            "source": "AI Voice Agent",
        }
        if call.name:
            patient_body["name"] = call.name
        if call.email:
            patient_body["email"] = call.email

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                # 1. Upsert Patient / Lead
                res = await client.post(
                    f"{self._base_url}/v1/patients",
                    headers=self._headers,
                    json=patient_body,
                )

                contact_id = None
                if res.is_success:
                    data = res.json() if res.content else {}
                    contact_id = data.get("id") or data.get("patient_id")

                # 2. Attach call note / appointment log
                note_body = {
                    "patient_phone": phone,
                    "patient_id": contact_id,
                    "notes": render_call_note(call),
                    "disposition": call.disposition or "Completed",
                }
                note_res = await client.post(
                    f"{self._base_url}/v1/call_logs",
                    headers=self._headers,
                    json=note_body,
                )
                if not note_res.is_success and not res.is_success:
                    err = f"practo_upsert_failed: {res.status_code}"
                    logger.warning(err)
                    return CRMSyncResult(ok=False, detail=err)

                logger.info(f"Practo synced call for patient {contact_id or phone}")
                return CRMSyncResult(ok=True, detail="synced", contact_id=str(contact_id or phone))

        except Exception as exc:
            logger.warning(f"Practo sync exception: {exc}")
            return CRMSyncResult(ok=False, detail=f"network_error: {exc}")
