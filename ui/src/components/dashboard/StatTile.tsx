'use client';

import type { LucideIcon } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface StatTileProps {
    icon: LucideIcon;
    label: string;
    value: React.ReactNode;
    sub?: React.ReactNode;
    live?: boolean;
    loading?: boolean;
    className?: string;
}

export function StatTile({
    icon: Icon,
    label,
    value,
    sub,
    live,
    loading,
    className,
}: StatTileProps) {
    return (
        <Card className={cn('relative flex flex-col justify-between p-4 sm:p-5 transition-shadow hover:shadow-sm', className)}>
            <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                </span>
            </div>

            <div className="my-2">
                {loading ? (
                    <Skeleton className="h-8 w-24 rounded-lg" />
                ) : (
                    <div className="flex items-center gap-2">
                        <p className="metric text-2xl font-bold tracking-tight text-foreground">{value}</p>
                        {live && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </span>
                        )}
                    </div>
                )}
            </div>

            <div className="min-h-[1rem] text-xs text-muted-foreground">
                {loading ? <Skeleton className="h-3 w-20 rounded" /> : (sub ?? ' ')}
            </div>
        </Card>
    );
}
