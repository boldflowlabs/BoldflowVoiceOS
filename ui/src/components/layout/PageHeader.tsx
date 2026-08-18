import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Clean production-grade page header with optional icon and action buttons.
 */
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
  actions,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  icon?: LucideIcon;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="flex items-start gap-3.5">
        {Icon && (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-[11px] font-semibold tracking-wider uppercase text-primary mb-1">
              {eyebrow}
            </p>
          )}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground leading-tight">{title}</h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2 pt-0.5">{actions}</div>}
    </div>
  );
}
