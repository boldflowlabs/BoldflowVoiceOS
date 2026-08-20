'use client';

import { Headphones, Loader2 } from 'lucide-react';
import posthog from 'posthog-js';
import { useCallback, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { PostHogEvent } from '@/constants/posthog-events';
import { downloadFile, getSignedUrl } from '@/lib/files';

export function MediaPreviewDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [audioSignedUrl, setAudioSignedUrl] = useState<string | null>(null);
    const [transcriptContent, setTranscriptContent] = useState<string | null>(null);
    const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
    const [recordingKey, setRecordingKey] = useState<string | null>(null);
    const [transcriptKey, setTranscriptKey] = useState<string | null>(null);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [audioError, setAudioError] = useState(false);

    const openPreview = useCallback(
        async (recordingUrl: string | null, transcriptUrl: string | null, runId: number) => {
            if (!recordingUrl && !transcriptUrl) return;
            setMediaLoading(true);
            setAudioSignedUrl(null);
            setTranscriptContent(null);
            setAudioError(false);
            setRecordingKey(recordingUrl);
            setTranscriptKey(transcriptUrl);
            setSelectedRunId(runId);
            setIsOpen(true);

            const [audioResult, transcriptResult] = await Promise.all([
                recordingUrl ? getSignedUrl(recordingUrl) : null,
                transcriptUrl ? getSignedUrl(transcriptUrl, true) : null,
            ]);

            const finalAudioUrl = audioResult || (recordingUrl ? `/voice-audio/${recordingUrl.replace(/^\/+/, "")}` : null);
            const finalTranscriptUrl = transcriptResult || (transcriptUrl ? `/voice-audio/${transcriptUrl.replace(/^\/+/, "")}` : null);

            if (finalAudioUrl) {
                setAudioSignedUrl(finalAudioUrl);
            }

            if (finalTranscriptUrl) {
                try {
                    const response = await fetch(finalTranscriptUrl);
                    if (response.ok) {
                        const text = await response.text();
                        setTranscriptContent(text);
                        posthog.capture(PostHogEvent.TRANSCRIPT_VIEWED, {
                            run_id: runId,
                            source: 'media_preview_dialog',
                            transcript_length: text.length,
                        });
                    } else {
                        console.error('Error fetching transcript: HTTP', response.status);
                        setTranscriptContent(null);
                    }
                } catch (error) {
                    console.error('Error fetching transcript:', error);
                    setTranscriptContent(null);
                }
            }

            setMediaLoading(false);
        },
        [],
    );

    return {
        openPreview,
        dialog: (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            Run Preview
                            {selectedRunId && ` - Run #${selectedRunId}`}
                        </DialogTitle>
                    </DialogHeader>

                    {mediaLoading && (
                        <div className="flex items-center justify-center py-8 space-x-2">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <span>Loading...</span>
                        </div>
                    )}

                    {!mediaLoading && audioSignedUrl && !audioError && (
                        <div className="mt-4 space-y-1">
                            <audio
                                src={audioSignedUrl}
                                controls
                                autoPlay
                                className="w-full"
                                onError={(e) => {
                                    console.error('Audio playback error:', e);
                                    setAudioError(true);
                                }}
                                onPlay={() => posthog.capture(PostHogEvent.RECORDING_PLAYED, {
                                    run_id: selectedRunId,
                                    source: 'media_preview_dialog',
                                })}
                            />
                        </div>
                    )}

                    {!mediaLoading && audioError && (
                        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
                            Audio recording is not available for this run (audio was not captured or is missing from storage).
                        </div>
                    )}

                    {!mediaLoading && transcriptContent && (
                        <pre className="w-full h-[50vh] overflow-auto border rounded-md mt-4 p-4 bg-muted text-sm whitespace-pre-wrap font-mono">
                            {transcriptContent}
                        </pre>
                    )}

                    {!mediaLoading && !audioSignedUrl && !transcriptContent && (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            No recording or transcript available for this run.
                        </div>
                    )}

                    <DialogFooter className="pt-4">
                        <DialogClose asChild>
                            <Button variant="secondary">Close</Button>
                        </DialogClose>
                        <div className="flex gap-2">
                            {recordingKey && (
                                <Button variant="outline" onClick={() => downloadFile(recordingKey)}>
                                    Download Recording
                                </Button>
                            )}
                            {transcriptKey && (
                                <Button variant="outline" onClick={() => downloadFile(transcriptKey)}>
                                    Download Transcript
                                </Button>
                            )}
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        ),
    };
}

interface MediaPreviewButtonProps {
    recordingUrl: string | null | undefined;
    transcriptUrl: string | null | undefined;
    runId: number;
    onOpenPreview: (recordingUrl: string | null, transcriptUrl: string | null, runId: number) => void;
    onSelect?: (runId: number) => void;
}

export function MediaPreviewButton({
    recordingUrl,
    transcriptUrl,
    runId,
    onOpenPreview,
    onSelect,
}: MediaPreviewButtonProps) {
    if (!recordingUrl && !transcriptUrl) return null;

    const handleOpen = () => {
        onSelect?.(runId);
        onOpenPreview(recordingUrl ?? null, transcriptUrl ?? null, runId);
    };

    return (
        <Button
            variant="outline"
            size="icon"
            onClick={handleOpen}
        >
            <Headphones className="h-4 w-4" />
        </Button>
    );
}
