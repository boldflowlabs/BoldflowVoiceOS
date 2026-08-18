import { Headphones, Mail, PhoneCall, ShieldCheck } from "lucide-react";

import { IntegrationHero } from "@/components/integrations/IntegrationHero";
import { PageShell } from "@/components/layout/PageShell";
import { SectionCard } from "@/components/layout/SectionCard";
import { PhoneNumbersSection } from "@/components/PhoneNumbersSection";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

const highlights = [
  {
    icon: PhoneCall,
    title: "Dedicated Voice Lines",
    description: "Configured and assigned directly to your conversational AI agents.",
  },
  {
    icon: ShieldCheck,
    title: "Carrier Compliant",
    description: `Telephony registration and compliance are managed by ${BRAND.name}.`,
  },
  {
    icon: Headphones,
    title: "Managed Provisioning",
    description: "Your account team provisions and connects new numbers on demand.",
  },
];

export default function PhoneNumbersPage() {
  const requestMailto = `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(
    `Request Additional Phone Number — ${BRAND.name}`
  )}&body=${encodeURIComponent(
    `Hello Support Team,\n\nI would like to request an additional phone line / caller ID for our organization.\n\nThank you!`
  )}`;

  return (
    <PageShell width="wide">
      <IntegrationHero
        icon={PhoneCall}
        eyebrow="Telephony"
        title="Phone Numbers"
        subtitle="View and manage dedicated caller IDs and phone lines assigned to your conversational voice agents."
        highlights={highlights}
      />

      <SectionCard
        description="Active voice lines assigned to your organization."
        actions={
          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
            <a href={requestMailto}>
              <Mail className="h-3.5 w-3.5" />
              Request New Number
            </a>
          </Button>
        }
      >
        <PhoneNumbersSection />
      </SectionCard>
    </PageShell>
  );
}
