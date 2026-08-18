import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader } from "@/components/layout/PageHeader";

interface Highlight {
  icon: LucideIcon;
  title: string;
  description: string;
}

/**
 * Integration-page hero with glowing highlight grid and canonical PageHeader.
 */
export function IntegrationHero({
  icon,
  eyebrow,
  title,
  subtitle,
  highlights,
  children,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  subtitle: string;
  highlights?: Highlight[];
  children?: ReactNode;
}) {
  return (
    <>
      <PageHeader
        icon={icon}
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        actions={children}
      />

      {highlights && highlights.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          {highlights.map(({ icon: HighlightIcon, title: hTitle, description }) => (
            <div
              key={hTitle}
              className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-4 shadow-xs backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-pop)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
                <HighlightIcon className="h-4.5 w-4.5" />
              </div>
              <p className="text-sm font-semibold text-foreground mt-3">{hTitle}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {description}
              </p>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
