import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Uniform empty state for list/table pages with glowing acoustic icon aura.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-card/40 backdrop-blur-md px-6 py-16 text-center shadow-xs transition-all duration-200 overflow-hidden",
        className,
      )}
    >
      {/* Background ambient bloom */}
      <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 h-32 w-64 rounded-full bg-primary/10 blur-2xl" />

      {Icon && (
        <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/15 to-primary/5 text-primary shadow-sm">
          <Icon className="h-6 w-6" />
          <div className="absolute -inset-1 rounded-2xl bg-primary/15 blur-sm -z-10 animate-pulse-glow" />
        </div>
      )}
      <p className="text-h3 font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-2 max-w-md text-body leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-6 flex items-center justify-center gap-3">{action}</div>}
    </div>
  );
}
