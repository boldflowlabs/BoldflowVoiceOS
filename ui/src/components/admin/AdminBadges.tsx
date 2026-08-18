"use client";

import { planLabel } from "@/components/admin/adminFormat";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AdminClientKycStatus } from "@/lib/adminClients";

// Refined, high-contrast plan badge styling with crisp borders and glowing dark-theme tones
const PLAN_CLASSES: Record<string, string> = {
  trial: "border-slate-500/40 bg-slate-500/15 text-slate-300 hover:bg-slate-500/25",
  starter: "border-sky-500/40 bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 font-medium",
  growth: "border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 font-medium",
  scale: "border-violet-500/40 bg-violet-500/20 text-violet-300 hover:bg-violet-500/30 font-medium",
  enterprise: "border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 font-medium",
};

export function PlanBadge({
  plan,
  overridden = false,
}: {
  plan: string | null | undefined;
  /** When true, a small dot marks the plan as a per-client override. */
  overridden?: boolean;
}) {
  if (!plan) return <span className="text-muted-foreground">—</span>;
  const cls = PLAN_CLASSES[plan] ?? "border-border/60 bg-muted/40 text-muted-foreground";
  const badge = (
    <Badge variant="outline" className={cls}>
      {planLabel(plan)}
      {overridden && (
        <span
          aria-hidden
          className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-80"
        />
      )}
    </Badge>
  );
  if (!overridden) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p>Plan is a per-client override</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function SuspendedBadge({
  suspended,
}: {
  suspended: boolean | null | undefined;
}) {
  if (suspended) {
    return (
      <Badge variant="destructive" className="border-rose-500/40 bg-rose-500/20 text-rose-300 font-medium">
        Suspended
      </Badge>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400">
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
      Active
    </span>
  );
}

/**
 * KYC status badge shared by the clients list and the per-client detail page.
 * Renders the disabled / no-client / progress states with an explanatory tooltip.
 */
export function KycStatusBadge({ status }: { status: AdminClientKycStatus }) {
  if (status.status === "disabled") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <Badge variant="outline" className="border-border/60 bg-muted/30 text-muted-foreground">KYC off</Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>VoiceLink reseller credentials are not configured on the backend</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  if (status.status === "no_client") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <Badge variant="secondary" className="border-border/60 bg-muted/50 text-muted-foreground">No client</Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p>The org has no VoiceLink client id — provision the client first</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const label = status.is_complete
    ? "KYC complete"
    : status.kyc_status ||
      (status.current_step != null
        ? `Step ${status.current_step}`
        : "Not started");
  const details = [
    `PAN: ${status.pan_verified ? "verified" : "pending"}`,
    `Aadhaar: ${status.aadhaar_verified ? "verified" : "pending"}`,
    ...(status.account_type === "business"
      ? [`GST: ${status.gst_verified ? "verified" : "pending"}`]
      : []),
    ...(status.account_type ? [`Account: ${status.account_type}`] : []),
  ].join(" · ");

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">
          {status.is_complete ? (
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {label}
            </Badge>
          ) : (
            <Badge variant="secondary" className="border-border/60 bg-muted/50 text-muted-foreground">{label}</Badge>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p>{details}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * AI Model Configuration status badge with error tooltip.
 */
export function ConfigurationStatusBadge({
  status,
  error,
}: {
  status?: string | null;
  error?: string | null;
}) {
  let badge: React.ReactNode;
  switch (status) {
    case "active":
      badge = (
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-medium flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active
        </Badge>
      );
      break;
    case "error":
      badge = (
        <Badge variant="destructive" className="border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-medium flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
          Error
        </Badge>
      );
      break;
    case "unconfigured":
      badge = (
        <Badge variant="outline" className="border-border/60 bg-muted/30 text-muted-foreground font-normal">
          Not configured
        </Badge>
      );
      break;
    default:
      badge = (
        <Badge variant="outline" className="border-border/60 bg-muted/30 text-muted-foreground font-normal">
          {status || "Not configured"}
        </Badge>
      );
  }

  if (!error) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <p className="text-xs">{error}</p>
      </TooltipContent>
    </Tooltip>
  );
}

const TELEPHONY_PROVIDER_LABELS: Record<string, string> = {
  voicelink: "VoiceLink",
  twilio: "Twilio",
  telnyx: "Telnyx",
  plivo: "Plivo",
  vonage: "Vonage",
  vobiz: "Vobiz",
  cloudonix: "Cloudonix",
  ari: "Asterisk ARI",
};

export function formatTelephonyProvider(provider: string): string {
  return (
    TELEPHONY_PROVIDER_LABELS[provider.toLowerCase()] ||
    provider.charAt(0).toUpperCase() + provider.slice(1)
  );
}

/**
 * Telephony provider status badge showing all configured providers (VoiceLink, Twilio, Telnyx, Plivo, etc.).
 */
export function TelephonyStatusBadge({
  providers = [],
  status,
  error,
  liveState,
  voicelinkStatus,
}: {
  providers?: string[];
  status?: string | null;
  error?: string | null;
  liveState?: string | null;
  voicelinkStatus?: string | null;
}) {
  // If there are configured providers
  if (providers && providers.length > 0) {
    if (providers.length === 1) {
      const p = providers[0];
      const label = formatTelephonyProvider(p);
      const isError =
        error &&
        (p === "voicelink" || status === "error" || liveState === "missing");
      if (isError) {
        return (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex cursor-help">
                <Badge variant="destructive" className="border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-medium flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                  {label} (Error)
                </Badge>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">{error || "VoiceLink missing in live index"}</p>
            </TooltipContent>
          </Tooltip>
        );
      }
      return (
        <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-medium flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          {label}
        </Badge>
      );
    }

    // Multiple providers configured
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {providers.length} Providers
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="font-semibold mb-1 text-xs text-foreground">Configured Providers:</p>
          <div className="flex flex-wrap gap-1">
            {providers.map((p) => (
              <span
                key={p}
                className="inline-block px-1.5 py-0.5 rounded bg-muted/80 text-[11px] font-medium text-foreground"
              >
                {formatTelephonyProvider(p)}
              </span>
            ))}
          </div>
          {error && <p className="text-rose-400 mt-1.5 text-xs">{error}</p>}
        </TooltipContent>
      </Tooltip>
    );
  }

  // If liveState is missing or error
  if (error || liveState === "missing" || status === "error") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex cursor-help">
            <Badge variant="destructive" className="border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              Error
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-xs">{error || (liveState === "missing" ? "Missing on provider" : "Telephony error")}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Not configured
  return (
    <Badge variant="outline" className="border-border/60 bg-muted/30 text-muted-foreground font-normal">
      Not configured
    </Badge>
  );
}
