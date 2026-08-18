'use client';

import { BarChart3, Clock, Hash, LayoutDashboard } from 'lucide-react';
import { Suspense } from 'react';

import { ByNumberTab } from '@/components/dashboard/ByNumberTab';
import { OverviewDashboard } from '@/components/dashboard/OverviewDashboard';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { RunsView } from '../usage/RunsView';

export default function AnalyticsPage() {
  return (
    <PageShell width="wide">
      <PageHeader
        icon={BarChart3}
        eyebrow="Observability"
        title="Voice Analytics & Intelligence"
        subtitle="Performance metrics, latency telemetry, and a complete history of every agent run."
      />

      <Suspense fallback={null}>
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="h-9 rounded-lg border border-border bg-muted/60 p-0.5">
            <TabsTrigger
              value="overview"
              className="gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger
              value="by-number"
              className="gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Hash className="h-3.5 w-3.5" />
              By Number
            </TabsTrigger>
            <TabsTrigger
              value="runs"
              className="gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-xs"
            >
              <Clock className="h-3.5 w-3.5" />
              Run History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-0 space-y-6">
            <OverviewDashboard showHeader={false} />
          </TabsContent>

          <TabsContent value="by-number" className="mt-0">
            <ByNumberTab />
          </TabsContent>

          <TabsContent value="runs" className="mt-0">
            <RunsView showHeader={false} />
          </TabsContent>
        </Tabs>
      </Suspense>
    </PageShell>
  );
}
