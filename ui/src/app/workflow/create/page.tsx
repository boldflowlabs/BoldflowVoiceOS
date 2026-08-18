'use client';

import { Bot, CheckCircle2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost } from '@/client/sdk.gen';
import { PageHeader } from '@/components/layout/PageHeader';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

export default function CreateWorkflowPage() {
    const router = useRouter();
    const { user, getAccessToken } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [workflowId, setWorkflowId] = useState<string | null>(null);

    const [callType, setCallType] = useState<'inbound' | 'outbound'>('inbound');
    const [useCase, setUseCase] = useState('');
    const [activityDescription, setActivityDescription] = useState('');

    const handleCreateWorkflow = async () => {
        if (!useCase || !activityDescription) {
            setError('Please fill in all fields');
            return;
        }

        if (!user) {
            setError('You must be logged in to create a workflow');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const accessToken = await getAccessToken();

            const response = await createWorkflowFromTemplateApiV1WorkflowCreateTemplatePost({
                body: {
                    call_type: callType,
                    use_case: useCase,
                    activity_description: activityDescription,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (response.data?.id) {
                setWorkflowId(String(response.data.id));
                setShowSuccessModal(true);
            }
        } catch (err) {
            setError('Failed to create workflow. Please try again.');
            logger.error(`Error creating workflow: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleModalContinue = () => {
        if (!workflowId) return;
        router.push(`/workflow/${workflowId}?onboarding=web_call`);
    };

    return (
        <PageShell width="narrow">
            <PageHeader
                icon={Bot}
                eyebrow="Quick Setup"
                title="Create Voice Agent"
                subtitle="Tell us about your use case and we'll scaffold a customized conversational workflow for you."
            />

            <Card className="rounded-2xl border-border/70 bg-card shadow-xs">
                <CardHeader>
                    <CardTitle>Agent Parameters</CardTitle>
                    <CardDescription>
                        Configure call direction, conversational objectives, and behavior rules
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                    <div className="space-y-2">
                        <Label htmlFor="call-type">Call Direction</Label>
                        <Select value={callType} onValueChange={(value) => setCallType(value as 'inbound' | 'outbound')}>
                            <SelectTrigger id="call-type" className="rounded-xl">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="inbound">
                                    Inbound (Users call AI Agent)
                                </SelectItem>
                                <SelectItem value="outbound">
                                    Outbound (AI Agent calls Users)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                            Choose whether users will dial into your agent or your agent initiates outreach
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="use-case">Use Case / Title</Label>
                        <Input
                            id="use-case"
                            placeholder="e.g., Real Estate Lead Qualification, Doctor Appointment Booking"
                            value={useCase}
                            onChange={(e) => setUseCase(e.target.value)}
                            className="rounded-xl"
                        />
                        <p className="text-xs text-muted-foreground">
                            Describe the primary purpose of your voice agent
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="activity-description">Agent Instructions &amp; Prompt Context</Label>
                        <Textarea
                            id="activity-description"
                            placeholder="Describe what your voice agent should say, qualify, questions to ask, and rules to follow..."
                            value={activityDescription}
                            onChange={(e) => setActivityDescription(e.target.value)}
                            className="min-h-[120px] rounded-xl resize-none"
                        />
                        <p className="text-xs text-muted-foreground">
                            This description will seed the LLM system prompt and flow state graph
                        </p>
                    </div>

                    {error && (
                        <p className="text-sm font-medium text-destructive">{error}</p>
                    )}

                    <div className="pt-2">
                        <Button
                            variant="brand"
                            size="lg"
                            onClick={handleCreateWorkflow}
                            disabled={isLoading || !useCase || !activityDescription}
                            className="w-full shadow-md"
                        >
                            {isLoading ? 'Synthesizing Agent...' : 'Generate Voice Agent'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md">
                    <Card className="w-full max-w-md p-8 text-center rounded-2xl border-primary/20 bg-card/90 shadow-2xl">
                        <div className="flex flex-col items-center space-y-5">
                            <div className="relative">
                                <div className="h-16 w-16 rounded-full border-4 border-primary/20" />
                                <div className="absolute top-0 left-0 h-16 w-16 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                            </div>
                            <div className="space-y-1.5">
                                <h3 className="text-lg font-bold text-foreground">
                                    Scaffolding Voice Agent
                                </h3>
                                <p className="text-xs text-muted-foreground max-w-xs">
                                    Setting up telephony nodes, LLM configuration, and voice synthesis...
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* Success Modal */}
            <Dialog open={showSuccessModal} onOpenChange={setShowSuccessModal}>
                <DialogContent className="sm:max-w-lg rounded-2xl border-border/80 bg-card/95 backdrop-blur-xl">
                    <DialogHeader>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <DialogTitle className="text-lg font-bold">Workflow Created Successfully!</DialogTitle>
                        </div>
                        <DialogDescription asChild>
                            <div className="mt-4 space-y-3 text-sm text-muted-foreground leading-relaxed">
                                <p>
                                    A tailored voice agent workflow has been synthesized with initial state transitions and speech guidelines.
                                </p>
                                <p>
                                    You can now immediately simulate test calls in the browser simulator, fine-tune the prompt, and attach telephony phone numbers.
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="mt-6">
                        <Button
                            variant="brand"
                            size="lg"
                            onClick={handleModalContinue}
                            className="w-full"
                        >
                            Open Editor &amp; Test Live
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </PageShell>
    );
}
