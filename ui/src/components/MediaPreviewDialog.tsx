'use client';

import {
    Download,
    FastForward,
    FileText,
    Headphones,
    Pause,
    Play,
    RotateCcw,
    Volume2,
    VolumeX,
} from 'lucide-react';
import posthog from 'posthog-js';
import { useCallback, useEffect, useRef, useState } from 'react';

import { Badge } from '@/components/ui/badge';
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
import { downloadFile, normalizeMediaUrl } from '@/lib/files';

function formatTime(seconds: number): string {
    if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function CustomAudioPlayer({
    src,
    runId,
    onDownload,
}: {
    src: string;
    runId: number | null;
    onDownload?: () => void;
}) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const progressRef = useRef<HTMLDivElement | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [loadError, setLoadError] = useState<string | null>(null);

    const togglePlay = async () => {
        const audio = audioRef.current;
        if (!audio) return;
        try {
            if (isPlaying) {
                audio.pause();
                setIsPlaying(false);
            } else {
                await audio.play();
                setIsPlaying(true);
                if (runId) {
                    posthog.capture(PostHogEvent.RECORDING_PLAYED, {
                        run_id: runId,
                        source: 'media_preview_dialog',
                    });
                }
            }
        } catch (err) {
            console.warn('Direct play note, trying blob fallback:', err);
            try {
                const res = await fetch(src);
                if (res.ok) {
                    const blob = await res.blob();
                    const bUrl = URL.createObjectURL(blob);
                    audio.src = bUrl;
                    await audio.play();
                    setIsPlaying(true);
                    setLoadError(null);
                }
            } catch {
                setLoadError('Failed to play audio stream');
            }
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        const audio = audioRef.current;
        if (!progressRef.current || !audio || !duration || !isFinite(duration)) return;
        const rect = progressRef.current.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        const targetTime = Math.max(0, Math.min(duration, clickPos * duration));
        audio.currentTime = targetTime;
        setCurrentTime(targetTime);
    };

    const skipTime = (offset: number) => {
        const audio = audioRef.current;
        if (!audio) return;
        const maxTime = duration && isFinite(duration) ? duration : Infinity;
        const newTime = Math.max(0, Math.min(maxTime, audio.currentTime + offset));
        audio.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const toggleRate = () => {
        const audio = audioRef.current;
        if (!audio) return;
        const rates = [1, 1.25, 1.5, 2];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const nextRate = rates[nextIdx];
        audio.playbackRate = nextRate;
        setPlaybackRate(nextRate);
    };

    const toggleMute = () => {
        const audio = audioRef.current;
        if (!audio) return;
        const nextMute = !isMuted;
        audio.muted = nextMute;
        setIsMuted(nextMute);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        const audio = audioRef.current;
        if (audio) {
            audio.volume = val;
            audio.muted = val === 0;
            setIsMuted(val === 0);
        }
    };

    const progressPercent = duration > 0 && isFinite(duration) ? Math.min(100, (currentTime / duration) * 100) : 0;

    return (
        <div className="w-full rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm space-y-4">
            <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration;
                    if (d && !isNaN(d) && isFinite(d)) setDuration(d);
                    setLoadError(null);
                }}
                onDurationChange={(e) => {
                    const d = e.currentTarget.duration;
                    if (d && !isNaN(d) && isFinite(d)) setDuration(d);
                }}
                onEnded={() => {
                    setIsPlaying(false);
                    setCurrentTime(0);
                }}
                onError={() => {
                    console.warn('Audio stream loaded');
                }}
                className="hidden"
            />
            {/* Visualizer Waveform Animation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 h-6 px-1">
                        {[40, 75, 90, 60, 100, 45, 80, 65, 95, 50, 70, 85].map((height, i) => (
                            <span
                                key={i}
                                className={`w-1 rounded-full transition-all duration-300 ${
                                    isPlaying
                                        ? 'bg-primary animate-pulse'
                                        : 'bg-muted-foreground/30'
                                }`}
                                style={{
                                    height: isPlaying ? `${height}%` : '20%',
                                    animationDelay: `${(i % 5) * 0.15}s`,
                                }}
                            />
                        ))}
                    </div>
                    <span className="text-xs font-medium text-muted-foreground">
                        {isPlaying ? 'Playing' : 'Audio Ready'}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                        {formatTime(currentTime)} / {formatTime(duration)}
                    </Badge>
                </div>
            </div>

            {/* Scrubber Timeline */}
            <div
                ref={progressRef}
                onClick={handleSeek}
                className="group relative h-3 w-full cursor-pointer rounded-full bg-secondary/80 transition-all hover:h-4 flex items-center"
            >
                <div
                    className="h-full rounded-full bg-primary transition-all group-hover:bg-primary/90 relative"
                    style={{ width: `${progressPercent}%` }}
                >
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-primary-foreground border-2 border-primary opacity-0 group-hover:opacity-100 transition-opacity shadow-md" />
                </div>
            </div>

            {/* Controls Bar */}
            <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                    {/* -10s */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => skipTime(-10)}
                        title="Rewind 10s"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>

                    {/* Main Play / Pause */}
                    <Button
                        size="icon"
                        className="h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-md hover:scale-105 transition-transform"
                        onClick={togglePlay}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </Button>

                    {/* +10s */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => skipTime(10)}
                        title="Forward 10s"
                    >
                        <FastForward className="h-4 w-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    {/* Speed Pill */}
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs font-mono rounded-md"
                        onClick={toggleRate}
                        title="Change Playback Speed"
                    >
                        {playbackRate}x
                    </Button>

                    {/* Volume Control */}
                    <div className="flex items-center gap-1.5 group">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={toggleMute}
                        >
                            {isMuted || volume === 0 ? (
                                <VolumeX className="h-4 w-4 text-destructive" />
                            ) : (
                                <Volume2 className="h-4 w-4" />
                            )}
                        </Button>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="h-1.5 w-16 cursor-pointer accent-primary rounded-lg bg-secondary"
                        />
                    </div>

                    {/* Download Button */}
                    {onDownload && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                            onClick={onDownload}
                            title="Download Audio"
                        >
                            <Download className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {loadError && (
                <div className="text-xs text-amber-500/90 pt-1">
                    {loadError} — you can still download or open the audio file directly below.
                </div>
            )}
        </div>
    );
}

export function MediaPreviewModal({
    isOpen,
    onOpenChange,
    runId,
    recordingUrl,
    transcriptUrl,
}: {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    runId: number | null;
    recordingUrl: string | null;
    transcriptUrl: string | null;
}) {
    const [transcriptContent, setTranscriptContent] = useState<string | null>(null);

    const audioUrl = recordingUrl ? normalizeMediaUrl(recordingUrl) : null;
    const directTranscriptUrl = transcriptUrl ? normalizeMediaUrl(transcriptUrl) : null;

    useEffect(() => {
        if (!isOpen || !directTranscriptUrl) {
            setTranscriptContent(null);
            return;
        }

        let isMounted = true;
        fetch(directTranscriptUrl)
            .then(async (res) => {
                if (res.ok && isMounted) {
                    const text = await res.text();
                    setTranscriptContent(text);
                    if (runId) {
                        posthog.capture(PostHogEvent.TRANSCRIPT_VIEWED, {
                            run_id: runId,
                            source: 'media_preview_dialog',
                            transcript_length: text.length,
                        });
                    }
                }
            })
            .catch((err) => {
                console.warn('Transcript load note:', err);
            });

        return () => {
            isMounted = false;
        };
    }, [isOpen, directTranscriptUrl, runId]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Headphones className="h-5 w-5 text-primary" />
                        Run Preview {runId && `#${runId}`}
                    </DialogTitle>
                </DialogHeader>

                <div className="mt-2 space-y-4">
                    {/* Audio Player Section */}
                    {audioUrl ? (
                        <CustomAudioPlayer
                            src={audioUrl}
                            runId={runId}
                            onDownload={recordingUrl ? () => downloadFile(recordingUrl) : undefined}
                        />
                    ) : (
                        <div className="rounded-lg border border-border p-4 text-center text-xs text-muted-foreground">
                            No audio recording available for this run.
                        </div>
                    )}

                    {/* Transcript Section */}
                    {transcriptContent ? (
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    <FileText className="h-3.5 w-3.5" /> Call Transcript
                                </span>
                                {transcriptUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs text-muted-foreground"
                                        onClick={() => downloadFile(transcriptUrl)}
                                    >
                                        <Download className="h-3 w-3 mr-1" /> Download
                                    </Button>
                                )}
                            </div>
                            <pre className="w-full max-h-[45vh] overflow-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                {transcriptContent}
                            </pre>
                        </div>
                    ) : transcriptUrl ? (
                        <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                            Transcript is being processed or was empty for this call.
                        </div>
                    ) : null}
                </div>

                <DialogFooter className="pt-3 border-t border-border/40">
                    <DialogClose asChild>
                        <Button variant="secondary">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function MediaPreviewDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
    const [recordingKey, setRecordingKey] = useState<string | null>(null);
    const [transcriptKey, setTranscriptKey] = useState<string | null>(null);

    const openPreview = useCallback(
        (recordingUrl: string | null, transcriptUrl: string | null, runId: number) => {
            if (!recordingUrl && !transcriptUrl) return;
            setRecordingKey(recordingUrl);
            setTranscriptKey(transcriptUrl);
            setSelectedRunId(runId);
            setIsOpen(true);
        },
        [],
    );

    return {
        openPreview,
        dialog: (
            <MediaPreviewModal
                isOpen={isOpen}
                onOpenChange={setIsOpen}
                runId={selectedRunId}
                recordingUrl={recordingKey}
                transcriptUrl={transcriptKey}
            />
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

    const handleOpen = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        e.stopPropagation();
        onSelect?.(runId);
        onOpenPreview(recordingUrl ?? null, transcriptUrl ?? null, runId);
    };

    return (
        <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleOpen}
            title="Preview Audio & Transcript"
        >
            <Headphones className="h-4 w-4" />
        </Button>
    );
}

