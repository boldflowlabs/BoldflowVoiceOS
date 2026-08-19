"use client";

import {
  AudioLines,
  BarChart3,
  Brain,
  ChevronDown,
  Contact,
  CreditCard,
  Database,
  Home,
  Key,
  LifeBuoy,
  Lock,
  LogOut,
  Megaphone,
  Menu,
  MessageCircle,
  Phone,
  PhoneCall,
  PhoneIncoming,
  Settings,
  Sparkles,
  Users,
  Workflow,
  Wrench,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useState } from "react";

import { BrandLogo } from "@/components/BrandLogo";
import { GitHubStarBadge } from "@/components/layout/GitHubStarBadge";
import ThemeToggle from "@/components/ThemeSwitcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLeadForms } from "@/context/LeadFormsContext";
import { useTelephonyConfigWarnings } from "@/context/TelephonyConfigWarningsContext";
import { useUserConfig } from "@/context/UserConfigContext";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import type { Team } from "@stackframe/stack";
import type { LocalUser } from "@/lib/auth";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

// Lazy load StackTeamSwitcher
const StackTeamSwitcher = React.lazy(() =>
  import("@stackframe/stack").then((mod) => ({
    default: mod.SelectedTeamSwitcher,
  }))
);

export function TopNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { provider, getSelectedTeam, logout, user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const { isSuperuser, planFeatures } = useUserConfig();
  const { openSupport } = useLeadForms();
  const { telnyxMissingWebhookPublicKeyCount } = useTelephonyConfigWarnings();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const selectedTeam = provider === "stack" && getSelectedTeam ? (getSelectedTeam() as Team | null) : null;
  const hasTelephonyWarning = telnyxMissingWebhookPublicKeyCount > 0;

  const displayIdentity =
    user?.displayName ||
    (user as { primaryEmail?: string } | undefined)?.primaryEmail ||
    (user as LocalUser | undefined)?.email ||
    "";

  const userInitials =
    displayIdentity
      .split(/[\s@]/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s: string) => s[0]?.toUpperCase())
      .join("") || "U";

  const isRouteActive = (url: string) => {
    if (url === "/home") return pathname === "/home" || pathname === "/";
    return pathname.startsWith(url);
  };

  const isMoreActive = [
    "/integrations",
    "/model-configurations",
    "/recordings",
    "/files",
    "/tools",
    "/api-keys",
    "/clients",
  ].some((prefix) => pathname.startsWith(prefix));

  const isTelephonyActive = [
    "/telephony-configurations",
    "/phone-numbers",
    "/inbound",
  ].some((prefix) => pathname.startsWith(prefix));

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand + Team Switcher */}
        <div className="flex items-center gap-4">
          <Link href="/home" className="flex items-center gap-2">
            <BrandLogo showTagline={false} />
          </Link>

          {provider === "stack" && (
            <div className="hidden sm:block border-l border-border pl-3">
              <React.Suspense fallback={<div className="h-7 w-28 animate-pulse rounded bg-muted" />}>
                <StackTeamSwitcher
                  selectedTeam={selectedTeam || undefined}
                  onChange={() => router.refresh()}
                />
              </React.Suspense>
            </div>
          )}

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 pl-2">
            <Link
              href="/home"
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isRouteActive("/home")
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Overview
            </Link>

            <Link
              href="/workflow"
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isRouteActive("/workflow")
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Voice Agents
            </Link>

            {(isSuperuser || planFeatures.build_with_ai) && (
              <Link
                href="/agent-builder"
                className={cn(
                  "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  isRouteActive("/agent-builder")
                    ? "bg-primary/10 text-primary font-semibold"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Sparkles className="h-3 w-3 text-primary" />
                Prompt Studio
              </Link>
            )}

            <Link
              href="/campaigns"
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isRouteActive("/campaigns")
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Campaigns
            </Link>

            {/* Telephony Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer outline-none",
                    isTelephonyActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  Telephony
                  {hasTelephonyWarning && (
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                {isAdmin && (
                  <DropdownMenuItem onClick={() => router.push("/telephony-configurations")} className="cursor-pointer flex items-center justify-between">
                    <div className="flex items-center">
                      <Phone className="mr-2 h-4 w-4 text-primary" />
                      Configurations
                    </div>
                    {hasTelephonyWarning && (
                      <Badge variant="warning" className="ml-auto text-[9px] px-1 py-0">Alert</Badge>
                    )}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => router.push("/phone-numbers")} className="cursor-pointer">
                  <PhoneCall className="mr-2 h-4 w-4 text-primary" />
                  Phone Numbers
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/inbound")} className="cursor-pointer flex items-center justify-between">
                  <div className="flex items-center">
                    <PhoneIncoming className="mr-2 h-4 w-4 text-primary" />
                    Inbound Routing
                  </div>
                  {!isAdmin && <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/model-configurations")} className="cursor-pointer flex items-center justify-between">
                  <div className="flex items-center">
                    <Brain className="mr-2 h-4 w-4 text-primary" />
                    Voice &amp; LLM Models
                  </div>
                  {!isAdmin && <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              href="/analytics"
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                isRouteActive("/analytics")
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              Analytics
            </Link>

            {/* Advanced & Integrations Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer outline-none",
                    isMoreActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  Integrations
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Channels</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push("/integrations/whatsapp")} className="cursor-pointer flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageCircle className="mr-2 h-4 w-4 text-emerald-500" />
                    WhatsApp Follow-up
                  </div>
                  {!isAdmin && <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/integrations/crm")} className="cursor-pointer">
                  <Contact className="mr-2 h-4 w-4 text-blue-500" />
                  CRM Sync
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Knowledge &amp; Tools</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => router.push("/recordings")} className="cursor-pointer">
                  <AudioLines className="mr-2 h-4 w-4" />
                  Media Library
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/files")} className="cursor-pointer">
                  <Database className="mr-2 h-4 w-4" />
                  Knowledge Base Files
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/tools")} className="cursor-pointer flex items-center justify-between">
                  <div className="flex items-center">
                    <Wrench className="mr-2 h-4 w-4" />
                    API Webhooks &amp; MCP
                  </div>
                  {!isAdmin && <Lock className="h-3 w-3 text-muted-foreground/60 shrink-0" />}
                </DropdownMenuItem>
                {(isSuperuser || planFeatures.api) && (
                  <DropdownMenuItem onClick={() => router.push("/api-keys")} className="cursor-pointer">
                    <Key className="mr-2 h-4 w-4" />
                    Developer API Keys
                  </DropdownMenuItem>
                )}
                {isSuperuser && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/clients")} className="cursor-pointer">
                      <Users className="mr-2 h-4 w-4" />
                      Client Workspaces
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openSupport("navbar")}
            className="hidden sm:inline-flex text-xs text-muted-foreground hover:text-foreground h-8"
          >
            <LifeBuoy className="mr-1.5 h-3.5 w-3.5" />
            Support
          </Button>

          <div className="hidden sm:block">
            <GitHubStarBadge source="top_navbar" />
          </div>

          <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

          {/* User Profile & Workspace Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/80 text-xs font-semibold text-foreground transition-colors hover:bg-muted hover:border-primary/50 cursor-pointer outline-none"
                aria-label="User menu"
              >
                {userInitials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-0.5">
                  <p className="text-xs font-semibold text-foreground truncate">{displayIdentity || "My Account"}</p>
                  <p className="text-[10px] text-muted-foreground">{BRAND.name} Console</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/credits")} className="cursor-pointer">
                <CreditCard className="mr-2 h-4 w-4" />
                Credits &amp; Billing
              </DropdownMenuItem>
              {isAdmin && (
                <DropdownMenuItem onClick={() => router.push("/settings")} className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  Platform Settings
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <ThemeToggle showLabel variant="ghost" size="sm" className="h-8 justify-start" />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden h-8 w-8"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          <nav className="flex flex-col space-y-1">
            <Link
              href="/home"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                isRouteActive("/home") ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Home className="h-4 w-4" /> Overview
            </Link>
            <Link
              href="/workflow"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                isRouteActive("/workflow") ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Workflow className="h-4 w-4" /> Voice Agents
            </Link>
            <Link
              href="/agent-builder"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                isRouteActive("/agent-builder") ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Sparkles className="h-4 w-4 text-primary" /> Prompt Studio
            </Link>
            <Link
              href="/campaigns"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                isRouteActive("/campaigns") ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Megaphone className="h-4 w-4" /> Campaigns
            </Link>
            {isAdmin && (
              <Link
                href="/telephony-configurations"
                onClick={() => setMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                  isRouteActive("/telephony-configurations") ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"
                )}
              >
                <Phone className="h-4 w-4" /> Telephony
              </Link>
            )}
            <Link
              href="/analytics"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                isRouteActive("/analytics") ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <BarChart3 className="h-4 w-4" /> Analytics
            </Link>
            <Link
              href="/tools"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                isRouteActive("/tools") ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <Wrench className="h-4 w-4" /> Tools &amp; MCP
            </Link>
            <Link
              href="/credits"
              onClick={() => setMobileMenuOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium",
                isRouteActive("/credits") ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:bg-muted"
              )}
            >
              <CreditCard className="h-4 w-4" /> Credits &amp; Billing
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
