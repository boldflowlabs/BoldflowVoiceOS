'use client';

import { Copy, LayoutTemplate } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { duplicateWorkflowTemplateApiV1WorkflowTemplatesDuplicatePost } from '@/client/sdk.gen';
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/lib/auth';
import logger from '@/lib/logger';

interface DuplicateWorkflowTemplateProps {
    id: number;
    title: string;
    description: string;
    serverAccessToken?: string | null;
}

export function DuplicateWorkflowTemplate({ id, title, description, serverAccessToken }: DuplicateWorkflowTemplateProps) {
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { user, getAccessToken } = useAuth();

    const handleDuplicate = async () => {
        setIsLoading(true);
        try {
            let accessToken = serverAccessToken;

            if (!accessToken) {
                if (!user) {
                    logger.error('User not authenticated and no server token provided');
                    return;
                }
                accessToken = await getAccessToken();
            }

            if (!accessToken) {
                logger.error('No access token available');
                return;
            }

            const response = await duplicateWorkflowTemplateApiV1WorkflowTemplatesDuplicatePost({
                body: {
                    template_id: id,
                    workflow_name: title,
                },
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (response.data) {
                logger.info('Workflow created successfully from template');
                router.push(`/workflow/${response.data.id}`);
            }
        } catch (error) {
            logger.error(`Error creating workflow from template: ${error}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="flex flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-pop)]">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                        <LayoutTemplate className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base font-semibold">{title}</CardTitle>
                </div>
                <CardDescription className="text-small leading-relaxed text-muted-foreground mb-5">
                    {description}
                </CardDescription>
            </div>
            <Button
                variant="brand"
                size="sm"
                className="w-full"
                onClick={handleDuplicate}
                disabled={isLoading}
            >
                <Copy className="w-4 h-4 mr-2" />
                {isLoading ? 'Instantiating...' : 'Use Template'}
            </Button>
        </Card>
    );
}
