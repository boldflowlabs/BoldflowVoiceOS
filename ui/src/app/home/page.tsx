'use client';

import { ArrowRight, BarChart3, Sparkles, Workflow, Zap } from 'lucide-react';
import Link from 'next/link';

import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { useUserConfig } from '@/context/UserConfigContext';

export default function HomePage() {
    const { planFeatures, isSuperuser } = useUserConfig();
    const canBuildWithAI = planFeatures.build_with_ai || isSuperuser;

    return (
        <PageShell width="default">
            {/* Mission Control Header */}
            <PageHeader
                eyebrow="Overview"
                title="Voice AI Command Center"
                subtitle="Real-time telemetry, agent metrics, and conversational call analytics."
                actions={
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" asChild>
                            <Link href="/analytics" className="gap-1.5">
                                <BarChart3 className="h-3.5 w-3.5" />
                                Analytics
                            </Link>
                        </Button>
                    </div>
                }
            />

            {/* Quick Launch Strip — Single Unified Accent Style */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Link
                    href="/workflow"
                    className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-sm"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Workflow className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Active Agents</p>
                        <p className="text-xs text-muted-foreground truncate">Manage &amp; deploy voice agents</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>

                <Link
                    href="/agent-builder"
                    className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-sm"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Prompt Studio</p>
                            <span className="rounded-full bg-primary/10 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-primary">AI</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">Prompt → voice workflow</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>

                <Link
                    href="/campaigns"
                    className="group relative flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-xs transition-all hover:border-primary/50 hover:shadow-sm"
                >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Zap className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Campaigns</p>
                        <p className="text-xs text-muted-foreground truncate">Outbound call automation</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </Link>
            </div>

            {/* At-a-glance dashboard — compact tiles + one sparkline + outcomes donut */}
            <OverviewDashboard compact showHeader={false} />

            {/* Build with AI — prompt-to-agent entry */}
            {canBuildWithAI && (
                <Link
                    href="/agent-builder"
                    className="group relative block overflow-hidden rounded-xl border border-primary/30 bg-primary/5 p-5 shadow-xs transition-all hover:border-primary/60 hover:bg-primary/8"
                >
                    <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/15 text-primary shadow-xs">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Generative AI Studio</span>
                            </div>
                            <p className="text-sm sm:text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                                Describe your business in plain English → Auto-synthesize voice agent
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Seed telephony nodes, LLM context, and custom speech transitions in seconds.
                            </p>
                        </div>
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                            <ArrowRight className="h-4 w-4" />
                        </div>
                    </div>
                </Link>
            )}
        </PageShell>
    );
}
