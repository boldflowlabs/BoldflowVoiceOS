"use client";

import { ExternalLink } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
    getModelConfigurationV2ApiV1OrganizationsModelConfigurationsV2Get,
    getModelConfigurationV2DefaultsApiV1OrganizationsModelConfigurationsV2DefaultsGet,
    saveModelConfigurationV2ApiV1OrganizationsModelConfigurationsV2Put,
} from "@/client/sdk.gen";
import type {
    OrganizationAiModelConfigurationResponse,
    OrganizationAiModelConfigurationV2,
} from "@/client/types.gen";
import { AIModelConfigurationV2Editor, type ModelConfigurationDefaultsV2 } from "@/components/AIModelConfigurationV2Editor";
import { LockedSafeguardBanner } from "@/components/LockedSafeguardBanner";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { detailFromError } from "@/lib/apiError";
import { useAuth } from "@/lib/auth";
import { BRAND } from "@/lib/brand";
import { getModelConfigurationV2Raw } from "@/lib/modelConfigRaw";

/**
 * Card shown to client accounts where AI models and provider configurations are managed by the agency.
 */
function ManagedByAdminCard() {
    return (
        <LockedSafeguardBanner
            variant="card"
            title="Managed AI & Voice Infrastructure"
            featureName="AI models, provider keys, and voice synthesis configurations"
            description={`Your LLM engines, speech recognition (STT), voice synthesis (TTS), and provider credentials are centrally configured and optimized by ${BRAND.name}. Model settings are preserved in view-only mode to ensure reliable uptime. If you need new model integrations or self-editing permissions, contact your account team.`}
        />
    );
}

export default function ModelConfigurationV2({
    docsUrl,
}: {
    docsUrl?: string;
    initialAction?: string;
}) {
    const auth = useAuth();
    const { isAdmin, isLoaded: adminLoaded } = useIsAdmin();
    const hasFetched = useRef(false);

    const [defaults, setDefaults] = useState<ModelConfigurationDefaultsV2 | null>(null);
    const [response, setResponse] = useState<OrganizationAiModelConfigurationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const [rawDialogOpen, setRawDialogOpen] = useState(false);
    const [rawPayload, setRawPayload] = useState<string | null>(null);
    const [rawLoading, setRawLoading] = useState(false);
    const [rawError, setRawError] = useState<string | null>(null);

    const applyResponse = (nextResponse: OrganizationAiModelConfigurationResponse) => {
        setResponse(nextResponse);
    };

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        const [defaultsResult, configResult] = await Promise.all([
            getModelConfigurationV2DefaultsApiV1OrganizationsModelConfigurationsV2DefaultsGet(),
            getModelConfigurationV2ApiV1OrganizationsModelConfigurationsV2Get(),
        ]);

        if (defaultsResult.error) {
            setError(detailFromError(defaultsResult.error, "Failed to load model configuration defaults"));
            setLoading(false);
            return;
        }
        if (configResult.error) {
            setError(detailFromError(configResult.error, "Failed to load model configuration"));
            setLoading(false);
            return;
        }

        const nextDefaults = defaultsResult.data as ModelConfigurationDefaultsV2;
        if (!nextDefaults || !configResult.data) {
            setError("Failed to load model configuration");
            setLoading(false);
            return;
        }
        setDefaults(nextDefaults);
        applyResponse(configResult.data);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (auth.loading || !auth.user || !adminLoaded) return;
        if (!isAdmin) {
            setLoading(false);
            return;
        }
        if (hasFetched.current) return;
        hasFetched.current = true;
        void load();
    }, [auth.loading, auth.user, adminLoaded, isAdmin, load]);

    const saveConfiguration = async (configuration: OrganizationAiModelConfigurationV2) => {
        if (!defaults) return;
        setError(null);
        setNotice(null);

        const result = await saveModelConfigurationV2ApiV1OrganizationsModelConfigurationsV2Put({
            body: configuration,
        });

        if (result.error) {
            throw new Error(detailFromError(result.error, "Failed to save model configuration"));
        }
        if (!result.data) {
            throw new Error("Failed to save model configuration");
        }

        applyResponse(result.data);
        await load();
        setNotice("Model configuration saved");
    };

    const invalidInfo = response as
        | (OrganizationAiModelConfigurationResponse & {
              configuration_invalid?: boolean;
              configuration_error?: string | null;
          })
        | null;
    const configurationInvalid = invalidInfo?.configuration_invalid === true;
    const configurationError = invalidInfo?.configuration_error ?? null;

    const openRawPayload = async () => {
        setRawDialogOpen(true);
        setRawLoading(true);
        setRawError(null);
        try {
            const token = await auth.getAccessToken();
            const result = await getModelConfigurationV2Raw(token);
            setRawPayload(JSON.stringify(result, null, 2));
        } catch (e) {
            setRawError(e instanceof Error ? e.message : "Failed to load raw payload");
        } finally {
            setRawLoading(false);
        }
    };

    const invalidConfigurationBanner = configurationInvalid ? (
        <div className="space-y-3 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p>
                Your saved model configuration failed validation and is being ignored: {configurationError || "unknown validation error"}
            </p>
            {isAdmin && (
                <Button type="button" variant="outline" size="sm" onClick={openRawPayload}>
                    View raw payload
                </Button>
            )}
        </div>
    ) : null;

    const rawPayloadDialog = (
        <Dialog open={rawDialogOpen} onOpenChange={setRawDialogOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Stored model configuration (raw)</DialogTitle>
                    <DialogDescription>
                        The payload stored for this organization, with secrets masked.
                    </DialogDescription>
                </DialogHeader>
                {rawLoading ? (
                    <Skeleton className="h-48 w-full" />
                ) : rawError ? (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {rawError}
                    </div>
                ) : (
                    <pre className="max-h-96 overflow-auto rounded-md bg-muted p-4 text-xs">
                        {rawPayload}
                    </pre>
                )}
            </DialogContent>
        </Dialog>
    );

    if (loading || !adminLoaded) {
        return (
            <div className="w-full max-w-4xl mx-auto space-y-6">
                <Skeleton className="h-10 w-80" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="w-full max-w-4xl mx-auto space-y-6">
                <div>
                    <h1 className="text-h1">AI Models Configuration</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Voice settings for your organization&apos;s agents.{" "}
                        {docsUrl && (
                            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
                                Learn more <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </p>
                </div>

                {invalidConfigurationBanner}
                {error && (
                    <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        {error}
                    </div>
                )}
                {notice && (
                    <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                        {notice}
                    </div>
                )}

                <ManagedByAdminCard />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="text-h1">AI Models Configuration</h1>
                    <p className="mt-2 text-sm text-muted-foreground">
                        Organization-scoped model settings.{" "}
                        {docsUrl && (
                            <a href={docsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 underline">
                                Learn more <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                    </p>
                </div>
            </div>

            {invalidConfigurationBanner}
            {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </div>
            )}
            {notice && (
                <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
                    {notice}
                </div>
            )}

            {defaults && response && (
                <AIModelConfigurationV2Editor
                    defaults={defaults}
                    configuration={response.configuration}
                    effectiveConfiguration={response.effective_configuration}
                    onSave={saveConfiguration}
                />
            )}
            {rawPayloadDialog}
        </div>
    );
}
