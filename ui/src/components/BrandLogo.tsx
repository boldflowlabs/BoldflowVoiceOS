import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

export function BrandVoiceGlyph({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <div
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs",
        className,
      )}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="h-3/5 w-3/5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <line x1="4" y1="10" x2="4" y2="14" />
        <line x1="9" y1="6" x2="9" y2="18" />
        <line x1="14" y1="3" x2="14" y2="21" />
        <line x1="19" y1="8" x2="19" y2="16" />
      </svg>
    </div>
  );
}

// Reusable clean brand wordmark
export function BrandLogo({
  className,
  inverse = false,
  mark = false,
  showTagline = false,
}: {
  className?: string;
  inverse?: boolean;
  mark?: boolean;
  showTagline?: boolean;
}) {
  if (BRAND.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={BRAND.logoUrl} alt={BRAND.name} className={cn("w-auto select-none", className)} />
    );
  }

  if (mark) {
    return <BrandVoiceGlyph className={className} size={28} />;
  }

  return (
    <div className={cn("inline-flex select-none items-center gap-2.5", className)}>
      <BrandVoiceGlyph size={28} />
      <div className="flex flex-col min-w-0">
        <span
          className={cn(
            "text-sm font-semibold tracking-tight leading-none",
            inverse ? "text-white" : "text-foreground",
          )}
        >
          {BRAND.name}
        </span>
        {showTagline && (
          <span className="text-[10px] font-medium tracking-wide uppercase text-muted-foreground mt-0.5">
            Voice Platform
          </span>
        )}
      </div>
    </div>
  );
}
