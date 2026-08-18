"use client";

import { Database, ExternalLink, Upload } from "lucide-react";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/layout/PageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth";

import DocumentList from "./DocumentList";
import DocumentUpload from "./DocumentUpload";

export default function FilesPage() {
    const { user, redirectToLogin, loading } = useAuth();
    const [refreshKey, setRefreshKey] = useState(0);
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    useEffect(() => {
        if (!loading && !user) {
            redirectToLogin();
        }
    }, [loading, user, redirectToLogin]);

    const handleUploadSuccess = () => {
        setRefreshKey(prev => prev + 1);
        setIsUploadOpen(false);
    };

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
                icon={Database}
                eyebrow="Intelligence"
                title="Knowledge Base & Documents"
                subtitle={
                    <span>
                        Upload PDF documents, product manuals, and FAQ sheets for your voice agents to reference in real-time.{" "}
                        <a
                            href="https://docs.dograh.com/voice-agent/knowledge-base"
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
                        Upload Document
                    </Button>
                }
            />

            <Card className="rounded-2xl border-border/70 bg-card shadow-xs">
                <CardHeader>
                    <div>
                        <CardTitle>Organization Documents</CardTitle>
                        <CardDescription>
                            Vector-embedded documents shared across all agents in your organization
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <DocumentList refreshTrigger={refreshKey} />
                </CardContent>
            </Card>

            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
                <DialogContent className="rounded-2xl border-border/80 bg-card/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Upload Document</DialogTitle>
                        <DialogDescription>
                            Upload a PDF, text, or document file to add to your knowledge base
                        </DialogDescription>
                    </DialogHeader>
                    <DocumentUpload onUploadSuccess={handleUploadSuccess} />
                </DialogContent>
            </Dialog>
        </PageShell>
    );
}
