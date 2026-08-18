"use client";

import { createContext, type ReactNode, useCallback, useContext, useMemo, useRef, useState } from "react";

import { EnterpriseModal } from "@/components/lead-forms/EnterpriseModal";
import { HireExpertModal } from "@/components/lead-forms/HireExpertModal";
import type { LeadSource } from "@/components/lead-forms/leadFieldOptions";

interface LeadFormsContextValue {
  openHireExpert: (source: LeadSource) => void;
  openEnterprise: (source: LeadSource, prefill?: { company?: string }) => void;
  // True once the hire modal has been opened this session (used to suppress the builder nudge).
  hasOpenedHireRef: React.MutableRefObject<boolean>;
}

const LeadFormsContext = createContext<LeadFormsContextValue | null>(null);

export function LeadFormsProvider({ children }: { children: ReactNode }) {
  const [hireOpen, setHireOpen] = useState(false);
  const [enterpriseOpen, setEnterpriseOpen] = useState(false);
  // Track the originating source so the *_OPENED and submit events agree.
  const [hireSource, setHireSource] = useState<LeadSource>("sidebar");
  const [enterpriseSource, setEnterpriseSource] = useState<LeadSource>("sidebar");
  const [enterprisePrefill, setEnterprisePrefill] = useState<{ company?: string } | undefined>(undefined);
  const hasOpenedHireRef = useRef(false);

  const openHireExpert = useCallback((source: LeadSource) => {
    hasOpenedHireRef.current = true;
    setHireSource(source);
    setHireOpen(true);
  }, []);

  const openEnterprise = useCallback((source: LeadSource, prefill?: { company?: string }) => {
    setEnterpriseSource(source);
    setEnterprisePrefill(prefill);
    setEnterpriseOpen(true);
  }, []);

  const value = useMemo<LeadFormsContextValue>(
    () => ({
      openHireExpert,
      openEnterprise,
      hasOpenedHireRef,
    }),
    [openHireExpert, openEnterprise]
  );

  return (
    <LeadFormsContext.Provider value={value}>
      {children}
      <HireExpertModal
        open={hireOpen}
        onOpenChange={setHireOpen}
        source={hireSource}
        onOpenEnterprise={() => openEnterprise("hire_expert")}
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
    return {
      openHireExpert: () => {},
      openEnterprise: () => {},
      hasOpenedHireRef: { current: false },
    };
  }
  return ctx;
}
