"use client";

import { CheckCircle2, Mail, Phone, PhoneOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { client } from "@/client/client.gen";
import { EmptyState } from "@/components/layout/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";

interface Did {
  did_id?: number | null;
  did_number: number | string | null;
  display_number?: string | null;
  inbound_configured?: boolean | null;
  country?: string | null;
  type_label?: string | null;
}

export function PhoneNumbersSection() {
  const { user, loading: authLoading } = useAuth();
  const [owned, setOwned] = useState<Did[]>([]);
  const [loading, setLoading] = useState(true);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (authLoading || !user || hasFetched.current) return;
    hasFetched.current = true;
    void refresh();
  }, [authLoading, user]);

  async function refresh() {
    try {
      const res = await client.get({ url: "/api/v1/telephony/marketplace/my-numbers" });
      const payload = res.data as { numbers?: Did[] } | undefined;
      setOwned(payload?.numbers ?? []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  const requestMailto = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
    `Request Additional Phone Number — ${BRAND.name}`
  )}&body=${encodeURIComponent(
    `Hello Support Team,\n\nI would like to request an additional phone line / caller ID for our organization.\n\nThank you!`
  )}`;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-14 w-full rounded-xl" />
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {owned.length === 0 ? (
        <EmptyState
          icon={PhoneOff}
          title="No phone numbers assigned yet"
          description={`Your dedicated phone numbers and caller IDs are provisioned and configured by the ${BRAND.name} team.`}
          action={
            <Button variant="default" size="sm" asChild className="gap-1.5 mt-2">
              <a href={requestMailto}>
                <Mail className="h-4 w-4" />
                Request Phone Number
              </a>
            </Button>
          }
        />
      ) : (
        <div className="divide-y rounded-2xl border border-border/60 bg-card overflow-hidden">
          {owned.map((d) => (
            <div
              key={d.did_id ?? `did-${d.did_number}`}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-mono text-sm font-semibold tracking-wide text-foreground">
                    {d.display_number || d.did_number}
                  </span>
                  {d.type_label && (
                    <p className="text-xs text-muted-foreground">{d.type_label}</p>
                  )}
                </div>
              </div>
              <Badge
                variant="secondary"
                className="gap-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300 font-medium"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Active & Connected
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
