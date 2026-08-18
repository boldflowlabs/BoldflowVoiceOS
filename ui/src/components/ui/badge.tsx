import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border-primary/20 bg-primary/10 text-primary hover:bg-primary/20",
                brand:
                    "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20",
                secondary:
                    "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
                destructive:
                    "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
                outline: "border-border text-foreground bg-card/40 backdrop-blur-sm",
                success:
                    "border-success/30 bg-success/10 text-success hover:bg-success/20",
                warning:
                    "border-warning/30 bg-warning/10 text-warning hover:bg-warning/20",
                info:
                    "border-info/30 bg-info/10 text-info hover:bg-info/20",
                muted:
                    "border-border/60 bg-muted/60 text-muted-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(badgeVariants({ variant }), className)}
                {...props}
            />
        )
    }
)
Badge.displayName = "Badge"

export { Badge, badgeVariants }
