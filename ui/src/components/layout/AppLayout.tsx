"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import React, { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useAppConfig } from "@/context/AppConfigContext";
import { LeadFormsProvider } from "@/context/LeadFormsContext";

import { ImpersonationBanner } from "./ImpersonationBanner";
import { TopNavbar } from "./TopNavbar";

function BackendStatusBanner() {
  const { config, loading, refresh } = useAppConfig();

  if (!config || config.backendStatus === "reachable") {
    return null;
  }

  const backendUrl = config.backendUrl && config.backendUrl !== "unknown"
    ? config.backendUrl
    : "the configured backend";
  const message = config.backendMessage || `Backend is not reachable at ${backendUrl}.`;

  return (
    <div
      role="alert"
      className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-800 dark:text-amber-200"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0 flex items-center gap-2 flex-wrap">
            <p className="text-xs font-semibold">Backend Offline:</p>
            <p className="break-words text-xs opacity-90">{message}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refresh()}
          disabled={loading}
          className="self-start text-xs h-7 sm:self-auto border-amber-500/30 hover:bg-amber-500/10"
        >
          <RefreshCw className={`mr-1.5 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          Retry
        </Button>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isAuthOrAdmin =
    pathname?.startsWith("/admin") ||
    pathname?.startsWith("/auth") ||
    pathname?.startsWith("/handler") ||
    pathname === "/login" ||
    pathname === "/signup";

  const isWorkflowBuilder = pathname?.startsWith("/workflow/");

  if (isAuthOrAdmin) {
    return <>{children}</>;
  }

  return (
    <LeadFormsProvider>
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
        {!isWorkflowBuilder && <TopNavbar />}
        {!isWorkflowBuilder && <BackendStatusBanner />}
        {!isWorkflowBuilder && <ImpersonationBanner />}
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </LeadFormsProvider>
  );
}

export default AppLayout;
