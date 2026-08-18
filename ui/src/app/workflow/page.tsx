import { Bot, Workflow } from 'lucide-react';
import { Suspense } from 'react';

import { getWorkflowsApiV1WorkflowFetchGet, listFoldersApiV1FolderGet } from '@/client/sdk.gen';
import type { FolderResponse, WorkflowListResponse } from '@/client/types.gen';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { LockedSafeguardBanner } from '@/components/LockedSafeguardBanner';
import { Card, CardContent } from '@/components/ui/card';
import { AgentFolderView } from '@/components/workflow/folders/AgentFolderView';
import { FolderSection } from '@/components/workflow/folders/FolderSection';
import {
    WorkflowEmptyStateAction,
    WorkflowHeaderActions,
} from '@/components/workflow/WorkflowHeaderActions';
import { getServerAccessToken, getServerAuthProvider, getServerUser } from '@/lib/auth/server';
import { BRAND } from '@/lib/brand';
import logger from '@/lib/logger';

import WorkflowLayout from "./WorkflowLayout";

export const dynamic = 'force-dynamic';

// Server component for workflow list
async function WorkflowList() {
    const authProvider = await getServerAuthProvider();
    const accessToken = await getServerAccessToken();

    const user = await getServerUser();
    const isSuperuser = user ? ('is_superuser' in user ? Boolean(user.is_superuser) : false) : false;

    if (!accessToken) {
        const { redirect } = await import('next/navigation');
        if (authProvider === 'stack') {
            redirect('/');
        } else {
            return (
                <Card className="rounded-2xl border border-destructive/30 bg-card shadow-[var(--shadow-card)]">
                    <CardContent className="p-8 text-center text-body text-destructive">
                        Authentication required. Please refresh the page.
                    </CardContent>
                </Card>
            );
        }
    }

    try {
        const response = await getWorkflowsApiV1WorkflowFetchGet({
            headers: {
                'Authorization': `Bearer ${accessToken}`,
            },
            query: {
                status: 'active,archived'
            }
        });

        const allWorkflowData = response.data ? (Array.isArray(response.data) ? response.data : [response.data]) : [];

        const activeWorkflows = allWorkflowData
            .filter((w: WorkflowListResponse) => w.status === 'active')
            .sort((a: WorkflowListResponse, b: WorkflowListResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const archivedWorkflows = allWorkflowData
            .filter((w: WorkflowListResponse) => w.status === 'archived')
            .sort((a: WorkflowListResponse, b: WorkflowListResponse) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        let folders: FolderResponse[] = [];
        try {
            const foldersResponse = await listFoldersApiV1FolderGet({
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });
            folders = foldersResponse.data ?? [];
        } catch (folderErr) {
            logger.error(`Error fetching folders: ${folderErr}`);
        }

        return (
            <>
                {/* Active Workflows Section */}
                <div className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-h3 font-semibold text-foreground">Active Agents</h2>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {activeWorkflows.length} {activeWorkflows.length === 1 ? 'Agent' : 'Agents'}
                        </span>
                    </div>
                    {activeWorkflows.length > 0 || folders.length > 0 ? (
                        <AgentFolderView workflows={activeWorkflows} folders={folders} />
                    ) : (
                        <EmptyState
                            icon={Bot}
                            title="No active agents yet"
                            description={
                                isSuperuser
                                    ? "Deploy your first voice agent or start from an award-winning template."
                                    : `Your conversational voice agents are configured and deployed by the ${BRAND.name} team.`
                            }
                            action={<WorkflowEmptyStateAction />}
                        />
                    )}
                </div>

                {/* Archived Section */}
                {archivedWorkflows.length > 0 && (
                    <div className="mb-10">
                        <FolderSection kind="archived" workflows={archivedWorkflows} />
                    </div>
                )}
            </>
        );
    } catch (err) {
        logger.error(`Error fetching workflows: ${err}`);
        return (
            <Card className="rounded-2xl border border-destructive/30 bg-card shadow-[var(--shadow-card)]">
                <CardContent className="p-8 text-center text-body text-destructive">
                    Failed to load agents. Please try again later.
                </CardContent>
            </Card>
        );
    }
}

async function PageContent() {
    const workflowList = await WorkflowList();

    return (
        <PageShell width="wide">
            <PageHeader
                icon={Workflow}
                eyebrow="Voice Studio"
                title="Conversational Agents"
                subtitle="View and monitor production-grade voice workflows assigned to your organization."
                actions={<WorkflowHeaderActions />}
            />

            <div className="mt-4 space-y-6">
                <LockedSafeguardBanner
                    variant="card"
                    featureName="voice agent workflows"
                />
                {workflowList}
            </div>
        </PageShell>
    );
}

function WorkflowsLoading() {
    return (
        <PageShell width="wide">
            <div className="animate-pulse space-y-6">
                <div className="h-12 w-64 rounded-xl bg-muted" />
                <div className="h-64 w-full rounded-2xl bg-muted/60" />
            </div>
        </PageShell>
    );
}

export default function WorkflowPage() {
    return (
        <WorkflowLayout showFeaturesNav={true}>
            <Suspense fallback={<WorkflowsLoading />}>
                <PageContent />
            </Suspense>
        </WorkflowLayout>
    );
}
