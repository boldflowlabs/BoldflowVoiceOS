'use client';

import { ArrowRight, Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface WorkflowCardProps {
    id: number;
    name: string;
    createdAt: string;
    className?: string;
}

export function WorkflowCard({ id, name, createdAt, className }: WorkflowCardProps) {
    const router = useRouter();

    const handleClick = () => {
        router.push(`/workflow/${id}`);
    };

    return (
        <Card
            className={cn(
                "group relative cursor-pointer overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-pop)]",
                className
            )}
            onClick={handleClick}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/15 to-primary/5 text-primary shadow-xs transition-transform duration-200 group-hover:scale-105">
                        <Bot className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground tracking-tight group-hover:text-primary transition-colors truncate">
                            {name}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Created on {new Date(createdAt).toLocaleDateString()}
                        </p>
                    </div>
                </div>

                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted/60 text-muted-foreground transition-all duration-200 group-hover:bg-primary group-hover:text-primary-foreground group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                </div>
            </div>
        </Card>
    );
}
