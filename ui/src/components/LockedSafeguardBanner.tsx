"use client";

import { Check, Copy, Lock, Mail, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { BRAND } from "@/lib/brand";

interface LockedSafeguardBannerProps {
  title?: string;
  description?: string;
  featureName?: string;
  variant?: "banner" | "card" | "floating" | "inline";
  className?: string;
}

export function LockedSafeguardBanner({
  title,
  description,
  featureName = "this section",
  variant = "banner",
  className = "",
}: LockedSafeguardBannerProps) {
  const { isAdmin, isLoaded } = useIsAdmin();
  const [copied, setCopied] = useState(false);

  // If permissions are still loading or the user is an admin/unlocked, do not show
  if (!isLoaded || isAdmin) {
    return null;
  }

  const defaultTitle = `Managed by ${BRAND.name} • View-Only Mode`;
  const defaultDescription = `To protect your live voice operations from accidental changes or errors, ${featureName} is maintained in safe view-only mode by ${BRAND.name}. If you need self-editing access or want to request changes, feel free to contact us.`;

  const displayTitle = title || defaultTitle;
  const displayDescription = description || defaultDescription;

  const mailtoSubject = encodeURIComponent(`Access / Edit Request for ${featureName} — ${BRAND.name}`);
  const mailtoBody = encodeURIComponent(
    `Hello ${BRAND.name} Support Team,\n\nI would like to request changes or self-editing permissions for ${featureName}.\n\nPlease let me know how to proceed.\n\nThank you!`
  );
  const mailtoUrl = `mailto:${BRAND.supportEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(BRAND.supportEmail);
    setCopied(true);
    toast.success(`${BRAND.name} support email copied to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  if (variant === "floating") {
    return (
      <div
        className={`z-20 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 backdrop-blur-md text-amber-900 dark:text-amber-200 shadow-lg text-xs ${className}`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Lock className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-semibold">{displayTitle}</span>
            <span className="hidden sm:inline text-muted-foreground ml-1.5">— View-only safeguard active</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200"
            asChild
          >
            <a href={mailtoUrl}>
              <Mail className="w-3 h-3 mr-1.5" />
              Contact {BRAND.name}
            </a>
          </Button>
        </div>
      </div>
    );
  }

  if (variant === "card") {
    return (
      <div
        className={`rounded-2xl border border-amber-500/25 bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 backdrop-blur-xs text-card-foreground shadow-xs ${className}`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="mt-0.5 p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-semibold text-foreground tracking-tight">{displayTitle}</h4>
                <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 text-[10px] uppercase font-bold tracking-wider">
                  View Only
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
                {displayDescription}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyEmail}
              className="text-xs h-8"
              title="Copy support email"
            >
              {copied ? <Check className="w-3.5 h-3.5 mr-1 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 mr-1" />}
              {copied ? "Copied" : "Copy Email"}
            </Button>
            <Button
              size="sm"
              className="text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
              asChild
            >
              <a href={mailtoUrl}>
                <Mail className="w-3.5 h-3.5 mr-1.5" />
                Contact {BRAND.name}
              </a>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Default "banner" variant
  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-amber-950 dark:text-amber-100 ${className}`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 font-medium text-xs sm:text-sm">
              <span>{displayTitle}</span>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-200/80 leading-normal">
              {displayDescription}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs border-amber-500/40 bg-background/80 hover:bg-background text-foreground"
            asChild
          >
            <a href={mailtoUrl}>
              <Mail className="w-3 h-3 mr-1.5 text-amber-600 dark:text-amber-400" />
              Contact {BRAND.name}
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
