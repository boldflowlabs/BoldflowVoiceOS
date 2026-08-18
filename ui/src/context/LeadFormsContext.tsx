"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

import { EnterpriseModal } from "@/components/lead-forms/EnterpriseModal";
import { SupportModal } from "@/components/lead-forms/SupportModal";
import type { LeadSource } from "@/components/lead-forms/leadFieldOptions";

interface LeadFormsContextValue {
  openSupport: (source: LeadSource) => void;
  openHireExpert: (source: LeadSource) => void;
  openEnterprise: (source: LeadSource, prefill?: { company?: string }) => void;
  // True once the support modal has been opened this session (used to suppress the builder nudge).
  hasOpenedSupportRef: React.MutableRefObject<boolean>;
  hasOpenedHireRef: React.MutableRefObject<boolean>;
}

const LeadFormsContext = createContext<LeadFormsContextValue | null>(null);

export function LeadFormsProvider({ children }: { children: ReactNode }) {
  const [supportOpen, setSupportOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  // Track the originating source so the *_OPENED and submit events agree.
  const [supportSource, setSupportSource] = useState<LeadSource>("sidebar");
  const [enterpriseSource, setEnterpriseSource] = useState<LeadSource>("sidebar");
  const [enterprisePrefill, setEnterprisePrefill] = useState<{ company?: string } | undefined>(undefined);
  const hasOpenedSupportRef = useRef(false);

  const openSupport = useCallback((source: LeadSource) => {
    hasOpenedSupportRef.current = true;
    setSupportSource(source);
    setSupportOpen(true);
  }, []);

  const openEnterprise = useCallback((source: LeadSource, prefill?: { company?: string }) => {
    setEnterpriseSource(source);
    setEnterprisePrefill(prefill);
    setEnterpriseOpen(true);
  }, []);

  const value = useMemo<LeadFormsContextValue>(
    () => ({
      openSupport,
      openHireExpert: openSupport, // backward compatibility
      openEnterprise,
      hasOpenedSupportRef,
      hasOpenedHireRef: hasOpenedSupportRef, // backward compatibility
    }),
    [openSupport, openEnterprise]
  );

  return (
    <LeadFormsContext.Provider value={value}>
      {children}
      <SupportModal
        open={supportOpen}
        onOpenChange={setSupportOpen}
        source={supportSource}
        onOpenEnterprise={() => openEnterprise("support")}
      />
      <EnterpriseModal
        open={enterpriseOpen}
        onOpenChange={setEnterpriseOpen}
        source={enterpriseSource}
        prefill={enterprisePrefill}
      />
    </LeadFormsContext.Provider>
  );
}

export function useLeadForms(): LeadFormsContextValue {
  const ctx = useContext(LeadFormsContext);
  if (!ctx) {
    const dummyRef = { current: false };
    return {
      openSupport: () => {},
      openHireExpert: () => {},
      openEnterprise: () => {},
      hasOpenedSupportRef: dummyRef,
      hasOpenedHireRef: dummyRef,
    };
  }
  return ctx;
}
