"use client";

import { AudioLines, ExternalLink, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SETTINGS_DOCUMENTATION_URLS } from "@/constants/documentation";
import { useAuth } from "@/lib/auth";

import RecordingsList from "./RecordingsList";
import { RecordingsUploadDialog } from "./RecordingsUploadDialog";

export default function RecordingsPage() {
    const { user, redirectToLogin, loading } = useAuth();
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    if (loading || !user) {
        return (
            <PageShell width="wide">
                <div className="space-y-4 animate-pulse">
                    <Skeleton className="h-12 w-64 rounded-xl" />
                    <Skeleton className="h-64 w-full rounded-2xl" />
                </div>
            </PageShell>
        );
    }

    return (
        <PageShell width="wide">
            <PageHeader
                icon={AudioLines}
                eyebrow="Media Library"
                title="Audio Recordings & Assets"
                subtitle={
                    <span>
                        Manage audio recordings for your voice workflows. Use{" "}
                        <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">@</code> in prompt fields to insert audio clips.{" "}
                        <a
                            href={SETTINGS_DOCUMENTATION_URLS.recordings}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-foreground underline underline-offset-2 hover:text-primary transition-colors font-medium"
                        >
                            Learn more <ExternalLink className="h-3 w-3" />
                        </a>
                    </span>
                }
                actions={
                    <Button variant="brand" onClick={() => setIsUploadOpen(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Audio
                    </Button>
                }
            />

            <Card className="rounded-2xl border-border/70 bg-card shadow-xs">
                <CardHeader>
                    <div>
                        <CardTitle>Audio Library</CardTitle>
                        <CardDescription>
                            High-fidelity audio recordings available to all conversational agents in your organization
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <RecordingsList refreshKey={refreshKey} />
                </CardContent>
            </Card>

            <RecordingsUploadDialog
                open={isUploadOpen}
                onOpenChange={setIsUploadOpen}
                onUploadComplete={() => setRefreshKey((k) => k + 1)}
            />
        </PageShell>
    );
}
