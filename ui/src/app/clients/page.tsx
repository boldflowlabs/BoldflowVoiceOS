"use client";

import {
  ArrowRight,
  Coins,
  ExternalLink,
  KeyRound,
  Loader2,
  Lock,
  MinusCircle,
  RefreshCw,
  Search,
  Unlock,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import {
  ConfigurationStatusBadge,
  PlanBadge,
  SuspendedBadge,
  TelephonyStatusBadge,
} from "@/components/admin/AdminBadges";
import {
  formatCredits,
  formatInr,
  formatMoneyBalance,
  planLabel,
} from "@/components/admin/adminFormat";
import { EmptyState } from "@/components/layout/EmptyState";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ADMIN_PLANS,
  type AdminClient,
  createAdminClient,
  deductCreditsFromClient,
  grantCreditsToClient,
  listAdminClients,
  resetClientPassword,
  toggleClientLock,
} from "@/lib/adminClients";
import { useAuth } from "@/lib/auth";
import { impersonateAsSuperadmin } from "@/lib/utils";

const LOW_BALANCE_THRESHOLD_INR = 100;

/** True when the org is unmetered (unlimited) on money or credits. */
function isUnlimited(client: AdminClient): boolean {
  return (
    client.money_left_inr === null || client.credits_seconds_remaining === null
  );
}

/** Balance cell — prefers the INR money balance, falls back to credit minutes
 * when the backend has not shipped the money fields yet. */
function balanceDisplay(client: AdminClient): string {
  if (client.money_left_inr !== undefined) {
    return formatMoneyBalance(client.money_left_inr);
  }
  return formatCredits(client.credits_seconds_remaining);
}

type SuspendedFilter = "all" | "active" | "suspended";

export default function ClientsPage() {
  const { user, getAccessToken, loading: authLoading } = useAuth();
  const hasFetched = useRef(false);

  const [clients, setClients] = useState<AdminClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [suspendedFilter, setSuspendedFilter] = useState<SuspendedFilter>("all");
  const [lowBalanceOnly, setLowBalanceOnly] = useState(false);

  // Grant credits dialog state (kept as a quick row action)
  const [grantTarget, setGrantTarget] = useState<AdminClient | null>(null);
  const [grantMinutes, setGrantMinutes] = useState("");

  // Deduct credits dialog state
  const [deductTarget, setDeductTarget] = useState<AdminClient | null>(null);
  const [deductMinutes, setDeductMinutes] = useState("");
  const [deductReason, setDeductReason] = useState("");

  // New client dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [newPlan, setNewPlan] = useState<string>("trial");
  const [newCredits, setNewCredits] = useState("");

  // Reset password dialog state
  const [resetTarget, setResetTarget] = useState<AdminClient | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const fetchClients = useCallback(
    async (showSpinner = false) => {
      if (showSpinner) setRefreshing(true);
      try {
        const token = await getAccessToken();
        if (!token) throw new Error("Missing access token");
        const result = await listAdminClients(token);
        setClients(result.clients);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to load clients",
        );
      } finally {
        setLoading(false);
        if (showSpinner) setRefreshing(false);
      }
    },
    [getAccessToken],
  );

  useEffect(() => {
    if (authLoading || !user || hasFetched.current) return;
    hasFetched.current = true;
    fetchClients();
  }, [authLoading, user, fetchClients]);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (q) {
        const haystack = [
          c.organization_name,
          c.owner_email ?? "",
          `#${c.organization_id}`,
          String(c.organization_id),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (planFilter !== "all" && (c.effective_plan ?? "") !== planFilter) {
        return false;
      }
      if (suspendedFilter === "suspended" && !c.suspended) return false;
      if (suspendedFilter === "active" && c.suspended) return false;
      if (lowBalanceOnly) {
        const low =
          c.money_left_inr != null &&
          c.money_left_inr < LOW_BALANCE_THRESHOLD_INR;
        if (!low) return false;
      }
      return true;
    });
  }, [clients, search, planFilter, suspendedFilter, lowBalanceOnly]);

  const grantMinutesNumber = Number(grantMinutes);
  const grantMinutesValid =
    Number.isInteger(grantMinutesNumber) &&
    grantMinutesNumber >= 1 &&
    grantMinutesNumber <= 100000;

  const openGrantDialog = (client: AdminClient) => {
    setGrantTarget(client);
    setGrantMinutes("");
  };

  const onGrantCredits = async () => {
    if (!grantTarget || !grantMinutesValid) return;
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing access token");
      const result = await grantCreditsToClient(
        token,
        grantTarget.organization_id,
        grantMinutesNumber,
      );
      toast.success(
        `Granted ${grantMinutesNumber} minute${grantMinutesNumber === 1 ? "" : "s"} — balance is now ${formatCredits(result.credits_seconds_remaining)}`,
      );
      setGrantTarget(null);
      // Refetch so the ₹ balance column reflects the new credit balance.
      await fetchClients();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to grant credits",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const deductMinutesNumber = Number(deductMinutes);
  const deductMaxMinutes = deductTarget?.credits_seconds_remaining
    ? Math.floor(deductTarget.credits_seconds_remaining / 60)
    : 0;
  const deductMinutesValid =
    Number.isInteger(deductMinutesNumber) &&
    deductMinutesNumber >= 1 &&
    deductMinutesNumber <= 100000 &&
    deductMinutesNumber <= deductMaxMinutes;

  const openDeductDialog = (client: AdminClient) => {
    setDeductTarget(client);
    setDeductMinutes("");
    setDeductReason("");
  };

  const onDeductCredits = async () => {
    if (!deductTarget || !deductMinutesValid) return;
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing access token");
      const result = await deductCreditsFromClient(
        token,
        deductTarget.organization_id,
        deductMinutesNumber,
        deductReason.trim() || undefined,
      );
      toast.success(
        `Deducted ${deductMinutesNumber} minute${deductMinutesNumber === 1 ? "" : "s"} — balance is now ${formatCredits(result.credits_seconds_remaining)}`,
      );
      setDeductTarget(null);
      await fetchClients();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to deduct credits",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const newEmailValid = /.+@.+\..+/.test(newEmail.trim());
  const newCreditsNumber = newCredits.trim() === "" ? 0 : Number(newCredits);
  const newCreditsValid =
    newCredits.trim() === "" ||
    (Number.isInteger(newCreditsNumber) &&
      newCreditsNumber >= 0 &&
      newCreditsNumber <= 100000);

  const resetCreateForm = () => {
    setNewEmail("");
    setNewPassword("");
    setNewName("");
    setNewPlan("trial");
    setNewCredits("");
  };

  const onCreateClient = async () => {
    if (!newEmailValid || !newCreditsValid) return;
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing access token");
      await createAdminClient(token, {
        email: newEmail.trim(),
        ...(newPassword.trim() ? { password: newPassword.trim() } : {}),
        ...(newName.trim() ? { name: newName.trim() } : {}),
        plan: newPlan,
        ...(newCredits.trim() !== ""
          ? { initial_credit_minutes: newCreditsNumber }
          : {}),
      });
      toast.success(`Client created for ${newEmail.trim()}`);
      setCreateOpen(false);
      resetCreateForm();
      await fetchClients();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to create client",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const onResetPassword = async () => {
    if (!resetTarget || !resetPasswordValue.trim()) return;
    if (resetPasswordValue.trim().length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing access token");
      const res = await resetClientPassword(
        token,
        resetTarget.organization_id,
        resetPasswordValue.trim(),
        resetTarget.owner_email ?? undefined,
      );
      toast.success(res.message || `Password updated for ${resetTarget.owner_email}`);
      setResetTarget(null);
      setResetPasswordValue("");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to reset password",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const [togglingLockOrgId, setTogglingLockOrgId] = useState<number | null>(null);

  const onToggleLock = async (client: AdminClient) => {
    const nextLocked = client.is_locked === false ? true : false;
    setTogglingLockOrgId(client.organization_id);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing access token");
      await toggleClientLock(token, client.organization_id, nextLocked);
      setClients((prev) =>
        prev.map((c) =>
          c.organization_id === client.organization_id
            ? { ...c, is_locked: nextLocked }
            : c
        )
      );
      toast.success(
        nextLocked
          ? `Client #${client.organization_id} locked in view-only mode`
          : `Client #${client.organization_id} unlocked for self-service editing`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle lock status");
    } finally {
      setTogglingLockOrgId(null);
    }
  };

  const onImpersonate = async (client: AdminClient) => {
    if (!client.owner_provider_id) {
      toast.error("This organization has no owner user to impersonate");
      return;
    }
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing access token");
      await impersonateAsSuperadmin({
        accessToken: token,
        providerUserId: client.owner_provider_id,
        redirectPath: "/model-configurations",
        openInNewTab: true,
      });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to impersonate user",
      );
    }
  };

  const hasFilters =
    search.trim() !== "" ||
    planFilter !== "all" ||
    suspendedFilter !== "all" ||
    lowBalanceOnly;

  return (
    <PageShell width="full" className="max-w-[1600px]">
      <PageHeader
        eyebrow="Superuser"
        title="Clients"
        icon={Users}
        subtitle="Client organizations, their plan, balance and VoiceLink state. Open Manage on a row to change plan & pricing, provision VoiceLink, view KYC, add ops notes, or suspend the client."
        actions={
          <>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              New client
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchClients(true)}
              disabled={loading || refreshing}
            >
              <RefreshCw
                className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, email or #id"
              className="pl-9"
            />
          </div>
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All plans</SelectItem>
              {ADMIN_PLANS.map((p) => (
                <SelectItem key={p} value={p}>
                  {planLabel(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={suspendedFilter}
            onValueChange={(v) => setSuspendedFilter(v as SuspendedFilter)}
          >
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="suspended">Suspended only</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={lowBalanceOnly}
              onCheckedChange={(v) => setLowBalanceOnly(v === true)}
            />
            Low balance (&lt; {formatInr(LOW_BALANCE_THRESHOLD_INR)})
          </label>
          {hasFilters && (
            <span className="text-xs text-muted-foreground">
              {filteredClients.length} of {clients.length}
            </span>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="grid gap-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        ) : clients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No client organizations yet"
            description="New signups appear here automatically, or use New client to create one."
          />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matching clients"
            description="No clients match the current search and filters."
          />
        ) : (
          <div className="w-full overflow-x-auto rounded-2xl border border-border/60 bg-card shadow-[var(--shadow-card)]">
            <Table className="w-full">
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="text-label text-muted-foreground whitespace-nowrap">
                    Organization
                  </TableHead>
                  <TableHead className="text-label text-muted-foreground whitespace-nowrap">
                    Owner email
                  </TableHead>
                  <TableHead className="text-label text-muted-foreground whitespace-nowrap">
                    Plan
                  </TableHead>
                  <TableHead className="text-label text-muted-foreground whitespace-nowrap">
                    Telephony
                  </TableHead>
                  <TableHead className="text-label text-muted-foreground whitespace-nowrap">
                    Configuration
                  </TableHead>
                  <TableHead className="text-label text-muted-foreground whitespace-nowrap">
                    DID
                  </TableHead>
                  <TableHead className="text-label text-right text-muted-foreground whitespace-nowrap">
                    ₹ Balance
                  </TableHead>
                  <TableHead className="text-label text-right text-muted-foreground whitespace-nowrap">
                    ₹ Spent
                  </TableHead>
                  <TableHead className="text-label text-muted-foreground whitespace-nowrap">
                    Status
                  </TableHead>
                  <TableHead className="text-label text-right text-muted-foreground whitespace-nowrap min-w-[210px] pr-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClients.map((client) => (
                  <TableRow
                    key={client.organization_id}
                    className="border-border/50 transition-colors hover:bg-muted/40"
                  >
                    <TableCell className="min-w-[140px] max-w-[180px]">
                      <Link
                        href={`/clients/${client.organization_id}`}
                        className="font-medium tabular-nums hover:underline"
                      >
                        #{client.organization_id}
                      </Link>
                      <div className="truncate text-xs text-muted-foreground">
                        {client.organization_name}
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[140px] max-w-[180px] truncate text-muted-foreground">
                      {client.owner_email ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <PlanBadge plan={client.effective_plan} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <TelephonyStatusBadge
                        providers={client.telephony_providers}
                        status={client.telephony_status}
                        error={client.voicelink_error}
                        liveState={client.live_state}
                        voicelinkStatus={client.voicelink_status}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <ConfigurationStatusBadge
                        status={client.configuration_status}
                        error={client.configuration_error}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-mono text-xs tabular-nums">
                      {client.did_number ??
                        (client.has_voicelink_config ? (
                          <span className="font-sans text-muted-foreground">
                            No DID
                          </span>
                        ) : (
                          "—"
                        ))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs sm:text-sm tabular-nums">
                      {isUnlimited(client) ? (
                        <span className="text-muted-foreground">Unlimited</span>
                      ) : (
                        balanceDisplay(client)
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right text-xs sm:text-sm tabular-nums">
                      {client.money_spent_inr !== undefined
                        ? formatInr(client.money_spent_inr)
                        : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <SuspendedBadge suspended={client.suspended} />
                    </TableCell>
                    <TableCell className="text-right min-w-[210px] whitespace-nowrap pr-3">
                      <div className="flex items-center justify-end gap-1 flex-nowrap">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openGrantDialog(client)}
                                disabled={isUnlimited(client)}
                              >
                                <Coins className="h-3.5 w-3.5" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>
                              {isUnlimited(client)
                                ? "Unmetered org (unlimited) — granting would meter it"
                                : "Grant call credits (minutes)"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openDeductDialog(client)}
                                disabled={
                                  isUnlimited(client) ||
                                  (client.credits_seconds_remaining || 0) <= 0
                                }
                              >
                                <MinusCircle className="h-3.5 w-3.5 text-rose-500" />
                              </Button>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>
                              {isUnlimited(client)
                                ? "Unmetered org (unlimited)"
                                : (client.credits_seconds_remaining || 0) <= 0
                                ? "No credits available to deduct"
                                : "Deduct call credits (minutes)"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setResetTarget(client);
                                setResetPasswordValue("");
                              }}
                            >
                              <KeyRound className="h-3.5 w-3.5 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Reset client login password</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onImpersonate(client)}
                              disabled={!client.owner_provider_id}
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Impersonate the owner (new tab)</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onToggleLock(client)}
                              disabled={togglingLockOrgId === client.organization_id}
                              className={client.is_locked === false ? "text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10" : "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"}
                            >
                              {togglingLockOrgId === client.organization_id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : client.is_locked === false ? (
                                <Unlock className="h-3.5 w-3.5" />
                              ) : (
                                <Lock className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>
                              {client.is_locked === false
                                ? "Unlocked (Editing Allowed) — Click to lock in view-only mode"
                                : "Locked (View Only) — Click to unlock client self-service editing"}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                        <Button variant="outline" size="sm" asChild className="shrink-0 h-8 px-2.5 text-xs">
                          <Link href={`/clients/${client.organization_id}`}>
                            Manage
                            <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Grant credits dialog */}
        <Dialog
          open={grantTarget !== null}
          onOpenChange={(open) => !open && setGrantTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant credits</DialogTitle>
              <DialogDescription>
                Adds call credits to the metered balance of{" "}
                {grantTarget?.owner_email ?? "this organization"} (1 credit = 1
                minute of call time). Current balance:{" "}
                {grantTarget ? balanceDisplay(grantTarget) : "—"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="grant-minutes">Minutes</Label>
              <Input
                id="grant-minutes"
                type="number"
                min={1}
                max={100000}
                step={1}
                value={grantMinutes}
                onChange={(e) => setGrantMinutes(e.target.value)}
                placeholder="e.g. 60"
              />
              <p className="text-xs text-muted-foreground">
                Whole minutes, between 1 and 100,000.
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setGrantTarget(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={onGrantCredits}
                disabled={submitting || !grantMinutesValid}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Grant credits
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Deduct credits dialog */}
        <Dialog
          open={deductTarget !== null}
          onOpenChange={(open) => !open && setDeductTarget(null)}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deduct credits</DialogTitle>
              <DialogDescription>
                Deducts call credits from the metered balance of{" "}
                {deductTarget?.owner_email ?? "this organization"} (1 credit = 1
                minute of call time). Current balance:{" "}
                {deductTarget ? balanceDisplay(deductTarget) : "—"}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="deduct-minutes">Minutes to deduct</Label>
                <Input
                  id="deduct-minutes"
                  type="number"
                  min={1}
                  max={deductMaxMinutes > 0 ? deductMaxMinutes : 1}
                  step={1}
                  value={deductMinutes}
                  onChange={(e) => setDeductMinutes(e.target.value)}
                  placeholder={deductMaxMinutes > 0 ? `Max: ${deductMaxMinutes}` : "0"}
                />
                <p className="text-xs text-muted-foreground">
                  Available to deduct: {deductMaxMinutes} minute(s).
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deduct-reason">Reason / Note (optional)</Label>
                <Input
                  id="deduct-reason"
                  value={deductReason}
                  onChange={(e) => setDeductReason(e.target.value)}
                  placeholder="e.g. Billing adjustment, refund"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeductTarget(null)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={onDeductCredits}
                disabled={submitting || !deductMinutesValid}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Deduct credits
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* New client dialog */}
        <Dialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) resetCreateForm();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New client</DialogTitle>
              <DialogDescription>
                Creates a client organization for this email. Pick a plan and,
                optionally, seed an initial credit balance.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-email">Owner email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="owner@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Owner login password</Label>
                <Input
                  id="new-password"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set login password (or leave blank to auto-generate)"
                />
                <p className="text-[11px] text-muted-foreground">
                  The client will use this password to sign in to their workspace.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Organization name (optional)</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Acme Inc."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="new-plan">Plan</Label>
                  <Select value={newPlan} onValueChange={setNewPlan}>
                    <SelectTrigger id="new-plan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ADMIN_PLANS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {planLabel(p)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-credits">Initial credits (min)</Label>
                  <Input
                    id="new-credits"
                    type="number"
                    min={0}
                    max={100000}
                    step={1}
                    value={newCredits}
                    onChange={(e) => setNewCredits(e.target.value)}
                    placeholder="optional"
                  />
                </div>
              </div>
              {!newCreditsValid && (
                <p className="text-xs text-destructive">
                  Credits must be a whole number between 0 and 100,000.
                </p>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setCreateOpen(false);
                  resetCreateForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={onCreateClient}
                disabled={submitting || !newEmailValid || !newCreditsValid}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create client
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Reset client password dialog */}
        <Dialog
          open={resetTarget !== null}
          onOpenChange={(open) => {
            if (!open) {
              setResetTarget(null);
              setResetPasswordValue("");
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset client password</DialogTitle>
              <DialogDescription>
                Set a new login password for {resetTarget?.owner_email ?? "this client"}.
                The client will be able to log in immediately with this new password.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="reset-pwd">New password</Label>
                <Input
                  id="reset-pwd"
                  type="text"
                  value={resetPasswordValue}
                  onChange={(e) => setResetPasswordValue(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setResetTarget(null);
                  setResetPasswordValue("");
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={onResetPassword}
                disabled={submitting || resetPasswordValue.trim().length < 6}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update password
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
    </PageShell>
  );
}
