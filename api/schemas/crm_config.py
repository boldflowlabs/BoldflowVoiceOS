"""Per-org post-call CRM sync config.

Stored as a single JSON value under OrganizationConfigurationKey.CRM_PROVIDERS.
Provider-agnostic: `provider` selects the adapter (gohighlevel first; leadsquared/
kylas/hubspot follow). After each qualifying call the platform upserts the contact
(matched by phone) and logs a call activity/note with disposition, duration,
recording/transcript links, sentiment, and summary.
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class CRMConfig(BaseModel):
    enabled: bool = False
    provider: str = "zoho"  # zoho | leadsquared | practo | gohighlevel | custom_api
    api_key: str = ""  # sensitive (access token, bearer token, API key) — masked on read, encrypted at rest
    secret_key: str = ""  # sensitive (LeadSquared secret key, custom API auth signature) — masked on read, encrypted at rest
    location_id: str = ""  # Location ID (GHL), Practice / Clinic ID (Practo)
    region_host: str = ""  # LeadSquared host (api-in21.leadsquared.com), Zoho data center domain (zohoapis.in / zohoapis.com)
    custom_webhook_url: str = ""  # Endpoint for Custom API / Webhook integration
    pipeline_id: str = ""  # Target pipeline / stage / module ID (for multi-pipeline sync)
    # Empty = log for any disposition; else only these mapped dispositions.
    trigger_dispositions: List[str] = Field(default_factory=list)
    # Empty = sync regardless of sentiment; else only when overall_sentiment matches
    # one of these (case-insensitive substring), e.g. ["interested", "positive"].
    trigger_sentiments: List[str] = Field(default_factory=list)
    # Only sync if the call lasted at least this many seconds (0 = no gate).
    min_call_seconds: int = 0


class CRMConfigResponse(BaseModel):
    config: Optional[CRMConfig] = None


class CRMTestRequest(BaseModel):
    phone: str = ""  # optional phone to upsert as a connectivity probe
