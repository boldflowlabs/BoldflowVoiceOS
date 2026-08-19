"""Custom API / Multi-Pipeline Webhook CRM adapter.

Dispatches complete call metadata, transcripts, recordings, contact details, and pipeline IDs
to user-configured external endpoints/webhooks.
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


class CustomApiProvider(CRMProvider):
    name = "custom_api"

    def __init__(
        self,
        custom_webhook_url: str,
        api_key: str = "",
        secret_key: str = "",
        pipeline_id: str = "",
        timeout: float = 15.0,
    ):
        self._url = custom_webhook_url.strip()
        self._api_key = api_key.strip()
        self._secret_key = secret_key.strip()
        self._pipeline_id = pipeline_id.strip()
        self._timeout = timeout

    @property
    def _headers(self) -> dict:
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "Dograh-CRM-Sync/1.0",
        }
        if self._api_key:
            headers["Authorization"] = f"Bearer {self._api_key}" if not self._api_key.lower().startswith("bearer ") else self._api_key
        if self._secret_key:
            headers["X-API-Secret"] = self._secret_key
        return headers

    async def sync_call(self, call: CallLog) -> CRMSyncResult:
        if not self._url:
            return CRMSyncResult(ok=False, detail="no_webhook_url_configured")

        phone = normalize_phone(call.phone)
        payload = {
            "event": "call_completed",
            "pipeline_id": self._pipeline_id or "default",
            "call": {
                "phone": phone or call.phone,
                "name": call.name,
                "email": call.email,
                "disposition": call.disposition,
                "duration_seconds": call.duration_seconds,
                "sentiment": call.sentiment,
                "quality_score": call.quality_score,
                "summary": call.summary,
                "recording_url": call.recording_url,
                "transcript_url": call.transcript_url,
                "direction": call.direction,
                "external_id": call.external_id,
                "extra": call.extra,
            },
            "rendered_note": render_call_note(call),
        }

        try:
            async with httpx.AsyncClient(timeout=self._timeout) as client:
                res = await client.post(
                    self._url,
                    headers=self._headers,
                    json=payload,
                )
                if not res.is_success:
                    logger.warning(f"Custom API CRM sync failed: {res.status_code}")
                    return CRMSyncResult(ok=False, detail=f"http_{res.status_code}")

                data = res.json() if res.headers.get("content-type", "").startswith("application/json") and res.content else {}
                contact_id = str(data.get("contact_id") or data.get("id") or phone)
                logger.info(f"Custom API CRM synced call successfully to {self._url}")
                return CRMSyncResult(ok=True, detail="synced", contact_id=contact_id)

        except Exception as exc:
            logger.warning(f"Custom API CRM sync exception: {exc}")
            return CRMSyncResult(ok=False, detail=f"network_error: {exc}")
