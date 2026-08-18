'use client';

import { Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

import { createWorkflowApiV1WorkflowCreateDefinitionPost } from '@/client/sdk.gen';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { detailFromError } from '@/lib/apiError';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';
import { getRandomId } from '@/lib/utils';

export function UploadWorkflowButton() {
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { user, getAccessToken } = useAuth();

    const handleFileUpload = useCallback(async (file: File) => {
        setError(null);
        try {
            const raw = await file.text();
            let parsed: { name?: string; workflow_definition?: unknown; nodes?: unknown; edges?: unknown };
            try {
                parsed = JSON.parse(raw);
            } catch {
                setError("That file isn't valid JSON. Please upload a workflow JSON file.");
                return;
            }

            // Accept either { name, workflow_definition: {...} } or a raw
            // { nodes, edges } definition. viewport is optional — the editor
            // adds a default one, and AI-built / exported agents omit it.
            const definition = (parsed?.workflow_definition ?? parsed) as {
                nodes?: unknown;
                edges?: unknown;
            };
            if (!definition || !Array.isArray(definition.nodes) || !Array.isArray(definition.edges)) {
                setError('This doesn\'t look like an agent file — it must contain "nodes" and "edges".');
                return;
            }

            // An upload is a COPY of an agent. Strip trigger paths so the backend
            // mints fresh, unique ones — re-using the source agent's paths returns
            // a 409 Conflict (trigger endpoints must be unique per org).
            for (const node of definition.nodes as Array<{ type?: string; data?: Record<string, unknown> }>) {
                if (node?.type === 'trigger' && node.data && 'trigger_path' in node.data) {
                    delete node.data.trigger_path;
                }
            }

            if (!user) {
                setError('Still signing you in — try again in a moment.');
                return;
            }
            const accessToken = await getAccessToken();
            const response = await createWorkflowApiV1WorkflowCreateDefinitionPost({
                body: {
                    name: parsed?.name || `WF-${getRandomId()}`,
                    workflow_definition: definition as unknown as { [key: string]: unknown },
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (response.error) {
                setError(detailFromError(response.error, 'Failed to upload the agent.'));
                return;
            }
            if (response.data?.id) {
                router.push(`/workflow/${response.data.id}`);
                setIsOpen(false);
            } else {
                setError('Upload succeeded but no workflow was returned. Please try again.');
            }
        } catch (err) {
            setError('Failed to upload the agent. Please check the file and try again.');
            logger.error(`Error uploading workflow: ${err}`);
        }
    }, [router, user, getAccessToken]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        setError(null);

        const file = e.dataTransfer.files[0];
        // Accept by MIME OR .json extension — browsers report .json files with
        // an empty or non-standard MIME type, which was rejecting valid files.
        if (file && (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json'))) {
            handleFileUpload(file);
        } else {
            setError('Please upload a valid JSON file');
        }
    }, [handleFileUpload]);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset the input so picking the SAME file again re-fires onChange —
        // otherwise a retry after a failed upload does nothing at all.
        e.target.value = '';
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
            >
                <Upload className="w-4 h-4 mr-2" />
                Upload Agent Definition
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-md rounded-2xl border-border/80 bg-card/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle>Upload Agent Definition</DialogTitle>
                    </DialogHeader>
                    <div
                        className={`mt-4 border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                            isDragging ? 'border-primary bg-primary/10' : 'border-border/80 bg-background/50'
                        }`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                    >
                        <div className="flex h-12 w-12 mx-auto mb-4 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                            <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                            Drag and drop your Workflow JSON file here
                        </p>
                        <p className="text-xs text-muted-foreground mb-5">
                            Supports exported agent definitions (.json)
                        </p>
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileInput}
                            className="hidden"
                            id="workflow-upload"
                        />
                        <Button
                            variant="brand"
                            size="sm"
                            onClick={() => document.getElementById('workflow-upload')?.click()}
                        >
                            Select File from Computer
                        </Button>
                        {error && (
                            <p className="mt-4 text-xs font-medium text-destructive">{error}</p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
