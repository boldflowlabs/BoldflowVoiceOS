import { Activity, Coins, ShieldCheck, Wallet } from "lucide-react";

import { CreditsSection } from "@/components/CreditsSection";
import { IntegrationHero } from "@/components/integrations/IntegrationHero";
import { PageShell } from "@/components/layout/PageShell";

const highlights = [
  {
    icon: Coins,
    title: "Pay as you go",
    description: "Buy call credits in seconds — no lock-in, no minimums.",
  },
  {
    icon: ShieldCheck,
    title: "Secure online checkout",
    description: "Top up instantly through our PCI-compliant payment gateway.",
  },
  {
    icon: Activity,
    title: "Live balance & spend",
    description: "Track remaining credits and usage as calls complete.",
  },
];

export default function CreditsPage() {
  return (
    <PageShell width="narrow">
      <IntegrationHero
        icon={Wallet}
        eyebrow="Billing"
        title="Credits & Billing"
        subtitle="Track your plan, monitor remaining call credits, and top up in seconds with secure online payments."
        highlights={highlights}
      />

      <CreditsSection />
    </PageShell>
  );
}
