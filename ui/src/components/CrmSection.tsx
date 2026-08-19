"use client";

import { AlertCircle, ArrowUpRight, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { client } from "@/client/client.gen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useUserConfig } from "@/context/UserConfigContext";
import { useAuth } from "@/lib/auth";

interface CRMConfig {
  enabled: boolean;
  provider: string;
  api_key: string;
  secret_key: string;
  location_id: string;
  region_host: string;
  custom_webhook_url: string;
  pipeline_id: string;
  trigger_dispositions: string[];
  trigger_sentiments: string[];
  min_call_seconds: number;
}

const EMPTY: CRMConfig = {
  enabled: false,
  provider: "zoho",
  api_key: "",
  secret_key: "",
  location_id: "",
  region_host: "",
  custom_webhook_url: "",
  pipeline_id: "",
  trigger_dispositions: [],
  trigger_sentiments: [],
  min_call_seconds: 0,
};

const BASE = "/api/v1/organizations/crm-config";

const CRM_PROVIDERS = [
  { value: "zoho", label: "Zoho CRM" },
  { value: "leadsquared", label: "LeadSquared" },
  { value: "practo", label: "Practo (Ray / Reach)" },
  { value: "gohighlevel", label: "GoHighLevel" },
  { value: "custom_api", label: "Custom API / Webhook (Multi-Pipeline)" },
];

export function CrmSection() {
  const { user, loading: authLoading } = useAuth();
  const { isSuperuser, planFeatures, planLoaded, plan } = useUserConfig();
  const [cfg, setCfg] = useState<CRMConfig>(EMPTY);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testPhone, setTestPhone] = useState("");
  const [testing, setTesting] = useState(false);
  const hasFetched = useRef(false);

  const canUseCRM = isSuperuser || (planLoaded && planFeatures.crm);

  useEffect(() => {
    if (authLoading || !user || hasFetched.current) return;
    hasFetched.current = true;
    (async () => {
      try {
        const res = await client.get({ url: BASE });
        const data = res.data as { config: CRMConfig | null } | undefined;
        if (data?.config) {
          setExists(true);
          setCfg({ ...EMPTY, ...data.config });
        }
      } catch {
        // nothing configured yet
      } finally {
        setLoading(false);
      }
    })();
  }, [authLoading, user]);

  function set<K extends keyof CRMConfig>(key: K, value: CRMConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await client.put({ url: BASE, body: cfg });
      if (res.error) throw new Error("save_failed");
      const data = res.data as { config: CRMConfig | null } | undefined;
      if (data?.config) setCfg({ ...EMPTY, ...data.config });
      setExists(true);
      toast.success("CRM settings saved");
    } catch {
      toast.error("Failed to save CRM settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setSaving(true);
    try {
      await client.delete({ url: BASE });
      setCfg(EMPTY);
      setExists(false);
      toast.success("CRM disconnected");
    } catch {
      toast.error("Failed to disconnect");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      const res = await client.post({
        url: `${BASE}/test`,
        body: { phone: testPhone.trim() },
      });
      if (res.error) throw new Error("test_failed");
      const data = res.data as { ok: boolean; detail: string } | undefined;
      if (data?.ok) toast.success(`Connected — test contact synced (${data.detail})`);
      else toast.error(`Test failed: ${data?.detail ?? "unknown error"}`);
    } catch {
      toast.error("Test failed — save a valid config first");
    } finally {
      setTesting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-16 w-full rounded-md" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  if (!canUseCRM) {
    return (
      <div className="rounded-xl border border-border bg-card p-6 shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">
              CRM Automation is not available on your plan
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Your organization is currently on the{" "}
              <span className="font-semibold text-foreground uppercase">{plan}</span> plan.
              CRM integrations (Zoho, LeadSquared, Practo, and Custom APIs) require a{" "}
              <strong className="text-foreground">Growth</strong> or{" "}
              <strong className="text-foreground">Scale</strong> plan.
            </p>
          </div>
        </div>
        <div className="pt-2">
          <Button asChild variant="brand">
            <Link href="/credits" className="inline-flex items-center gap-1.5">
              Upgrade Plan in Credits & Billing
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Automatically push each call to your CRM — upsert the contact and log the
        outcome, recording, transcript and sentiment as a note. Select your CRM provider below.
      </p>

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <Label htmlFor="crm-enabled" className="font-medium">
            Enabled
          </Label>
          <p className="text-xs text-muted-foreground">
            Auto-sync after calls. Turn off to pause without losing settings.
          </p>
        </div>
        <Switch
          id="crm-enabled"
          checked={cfg.enabled}
          onCheckedChange={(v) => set("enabled", v)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="crm-provider">CRM Provider</Label>
          <Select
            value={cfg.provider}
            onValueChange={(v) => set("provider", v)}
          >
            <SelectTrigger id="crm-provider" className="w-full">
              <SelectValue placeholder="Select a CRM" />
            </SelectTrigger>
            <SelectContent>
              {CRM_PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {cfg.provider === "zoho" && (
          <div className="space-y-2">
            <Label htmlFor="crm-region">Data Center Domain</Label>
            <Input
              id="crm-region"
              placeholder="https://www.zohoapis.in or zohoapis.com"
              value={cfg.region_host}
              onChange={(e) => set("region_host", e.target.value)}
            />
          </div>
        )}

        {cfg.provider === "leadsquared" && (
          <div className="space-y-2">
            <Label htmlFor="crm-region">Region Host</Label>
            <Input
              id="crm-region"
              placeholder="api-in21.leadsquared.com"
              value={cfg.region_host}
              onChange={(e) => set("region_host", e.target.value)}
            />
          </div>
        )}

        {cfg.provider === "practo" && (
          <div className="space-y-2">
            <Label htmlFor="crm-location">Practice / Clinic ID</Label>
            <Input
              id="crm-location"
              placeholder="Practo Practice or Clinic ID"
              value={cfg.location_id}
              onChange={(e) => set("location_id", e.target.value)}
            />
          </div>
        )}

        {cfg.provider === "gohighlevel" && (
          <div className="space-y-2">
            <Label htmlFor="crm-location">Location ID</Label>
            <Input
              id="crm-location"
              placeholder="GHL sub-account location id"
              value={cfg.location_id}
              onChange={(e) => set("location_id", e.target.value)}
            />
          </div>
        )}

        {cfg.provider === "custom_api" && (
          <div className="space-y-2">
            <Label htmlFor="crm-pipeline">Pipeline / Routing ID</Label>
            <Input
              id="crm-pipeline"
              placeholder="Pipeline or campaign ID (optional)"
              value={cfg.pipeline_id}
              onChange={(e) => set("pipeline_id", e.target.value)}
            />
          </div>
        )}
      </div>

      {cfg.provider === "custom_api" && (
        <div className="space-y-2">
          <Label htmlFor="crm-webhook-url">Webhook / Custom API Endpoint URL</Label>
          <Input
            id="crm-webhook-url"
            placeholder="https://your-crm.domain.com/api/v1/voice-calls"
            value={cfg.custom_webhook_url}
            onChange={(e) => set("custom_webhook_url", e.target.value)}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="crm-key">
          {cfg.provider === "leadsquared"
            ? "Access Key"
            : cfg.provider === "zoho"
              ? "OAuth / API Token"
              : cfg.provider === "practo"
                ? "Practo API Key"
                : cfg.provider === "custom_api"
                  ? "Bearer Token (Optional)"
                  : "API Token"}
        </Label>
        <Input
          id="crm-key"
          type="password"
          placeholder="Enter credentials token"
          value={cfg.api_key}
          onChange={(e) => set("api_key", e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Stored encrypted and shown masked. Leave masked value to keep current token.
        </p>
      </div>

      {(cfg.provider === "leadsquared" || cfg.provider === "custom_api") && (
        <div className="space-y-2">
          <Label htmlFor="crm-secret-key">
            {cfg.provider === "leadsquared" ? "Secret Key" : "Webhook Secret / Signature Header (Optional)"}
          </Label>
          <Input
            id="crm-secret-key"
            type="password"
            placeholder="Enter secret key"
            value={cfg.secret_key}
            onChange={(e) => set("secret_key", e.target.value)}
          />
        </div>
      )}

      {cfg.provider === "zoho" && (
        <div className="space-y-2">
          <Label htmlFor="crm-pipeline">Target Pipeline (Optional)</Label>
          <Input
            id="crm-pipeline"
            placeholder="Pipeline name or ID"
            value={cfg.pipeline_id}
            onChange={(e) => set("pipeline_id", e.target.value)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="crm-dispositions">Only sync for dispositions</Label>
          <Input
            id="crm-dispositions"
            placeholder="INTERESTED, XFER (blank = all)"
            value={cfg.trigger_dispositions.join(", ")}
            onChange={(e) =>
              set(
                "trigger_dispositions",
                e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crm-minsec">Minimum call seconds</Label>
          <Input
            id="crm-minsec"
            type="number"
            min={0}
            value={cfg.min_call_seconds}
            onChange={(e) => set("min_call_seconds", Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="crm-sentiments">Only sync if sentiment matches</Label>
        <Input
          id="crm-sentiments"
          placeholder="interested, positive (blank = any sentiment)"
          value={cfg.trigger_sentiments.join(", ")}
          onChange={(e) =>
            set(
              "trigger_sentiments",
              e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
        <p className="text-xs text-muted-foreground">
          e.g. only push leads who sounded interested to your CRM.
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        {exists && (
          <Button
            type="button"
            variant="destructive"
            disabled={saving}
            onClick={handleDelete}
          >
            Disconnect
          </Button>
        )}
      </div>

      {exists && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label htmlFor="crm-test">Test connection</Label>
            <div className="flex gap-2">
              <Input
                id="crm-test"
                placeholder="Test phone e.g. 9876543210"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button
                type="button"
                variant="secondary"
                disabled={testing}
                onClick={handleTest}
              >
                <Send className="mr-1 h-4 w-4" />
                {testing ? "Testing..." : "Test"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Upserts a test contact into your CRM. Save your changes first.
            </p>
          </div>
        </>
      )}
    </form>
  );
}
