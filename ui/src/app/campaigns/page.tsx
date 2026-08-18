"use client";

import { Megaphone, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { getCampaignsApiV1CampaignGet } from '@/client/sdk.gen';
import type { CampaignsResponse } from '@/client/types.gen';
import { EmptyState } from '@/components/layout/EmptyState';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuth } from '@/lib/auth';

export default function CampaignsPage() {
    const { user, getAccessToken, redirectToLogin, loading } = useAuth();
    const router = useRouter();

    const [campaignsData, setCampaignsData] = useState<CampaignsResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const hasFetched = useRef(false);

    // Redirect if not authenticated
    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    // Fetch campaigns once when user is ready
    useEffect(() => {
        if (loading || !user || hasFetched.current) {
            return;
        }
        hasFetched.current = true;

        const fetchCampaigns = async () => {
            setIsLoading(true);
            try {
                const accessToken = await getAccessToken();
                const response = await getCampaignsApiV1CampaignGet({
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                    }
                });

                if (response.data) {
                    setCampaignsData(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch campaigns:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchCampaigns();
    }, [loading, user, getAccessToken]);

    const handleRowClick = (campaignId: number) => {
        router.push(`/campaigns/${campaignId}`);
    };

    const handleCreateCampaign = () => {
        router.push('/campaigns/new');
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    const getStateBadgeVariant = (state: string): "default" | "brand" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "muted" => {
        switch (state) {
            case 'created':
                return 'brand';
            case 'running':
                return 'success';
            case 'paused':
                return 'warning';
            case 'completed':
                return 'secondary';
            case 'failed':
                return 'destructive';
            default:
                return 'secondary';
        }
    };

    return (
        <PageShell width="wide">
            <PageHeader
                icon={Megaphone}
                eyebrow="Outbound Dispatch"
                title="Calling Campaigns"
                subtitle="Automated high-throughput voice campaigns with intelligent call pacing and disposition analytics."
                actions={
                    <Button variant="brand" onClick={handleCreateCampaign}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Campaign
                    </Button>
                }
            />

            <Card className="rounded-2xl border-border/70 bg-card shadow-xs">
                <CardHeader>
                    <CardTitle className="text-h3">All Campaigns</CardTitle>
                    <CardDescription className="text-small">
                        View, monitor, and manage your bulk voice execution runs
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="animate-pulse space-y-3 px-6 pb-6">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="h-12 rounded-xl bg-muted" />
                            ))}
                        </div>
                    ) : campaignsData && campaignsData.campaigns.length > 0 ? (
                        <div className="overflow-x-auto border-t border-border/60">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-border/60 bg-muted/40 hover:bg-muted/40">
                                        <TableHead className="text-label text-muted-foreground font-semibold">ID</TableHead>
                                        <TableHead className="text-label text-muted-foreground font-semibold">Name</TableHead>
                                        <TableHead className="text-label text-muted-foreground font-semibold">Workflow</TableHead>
                                        <TableHead className="text-label text-muted-foreground font-semibold">State</TableHead>
                                        <TableHead className="text-label text-muted-foreground font-semibold">Progress</TableHead>
                                        <TableHead className="text-label text-muted-foreground font-semibold">Spent</TableHead>
                                        <TableHead className="text-label text-muted-foreground font-semibold">Created</TableHead>
                                        <TableHead className="text-label text-right text-muted-foreground font-semibold">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {campaignsData.campaigns.map((campaign) => (
                                        <TableRow
                                            key={campaign.id}
                                            className="cursor-pointer border-border/60 transition-colors duration-200 hover:bg-muted/40"
                                            onClick={() => handleRowClick(campaign.id)}
                                        >
                                            <TableCell className="py-3.5 tabular-nums font-mono text-xs text-muted-foreground">#{campaign.id}</TableCell>
                                            <TableCell className="py-3.5 font-semibold text-foreground">{campaign.name}</TableCell>
                                            <TableCell className="py-3.5 text-muted-foreground">{campaign.workflow_name}</TableCell>
                                            <TableCell className="py-3.5">
                                                <Badge variant={getStateBadgeVariant(campaign.state)} className="capitalize">
                                                    {campaign.state}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="py-3.5 tabular-nums text-muted-foreground font-medium">
                                                {campaign.executed_count} / {campaign.total_queued_count}
                                            </TableCell>
                                            <TableCell className="py-3.5 tabular-nums text-muted-foreground">
                                                ₹{(campaign.spent_inr ?? 0).toLocaleString()}
                                                {campaign.spent_minutes ? (
                                                    <span className="ml-1 text-xs text-muted-foreground/70">
                                                        ({campaign.spent_minutes} min)
                                                    </span>
                                                ) : null}
                                            </TableCell>
                                            <TableCell className="py-3.5 tabular-nums text-muted-foreground">{formatDate(campaign.created_at)}</TableCell>
                                            <TableCell className="py-3.5 text-right">
                                                <Button
                                                    variant="glass"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRowClick(campaign.id);
                                                    }}
                                                >
                                                    View Details
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="px-6 pb-6">
                            <EmptyState
                                icon={Megaphone}
                                title="No outbound campaigns yet"
                                description="Launch your first campaign to start automated voice outreach at scale."
                                action={
                                    <Button onClick={handleCreateCampaign} variant="brand">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create First Campaign
                                    </Button>
                                }
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </PageShell>
    );
}
