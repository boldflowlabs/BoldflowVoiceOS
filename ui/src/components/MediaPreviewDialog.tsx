'use client';

import {
    Download,
    FastForward,
    FileText,
    Headphones,
    Loader2,
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
import { downloadFile, getSignedUrl } from '@/lib/files';

function formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '0:00';
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

    useEffect(() => {
        let isMounted = true;
        let blobUrl: string | null = null;

        const audio = new Audio();
        audioRef.current = audio;
        audio.preload = 'auto';

        const handleTimeUpdate = () => {
            if (isMounted) setCurrentTime(audio.currentTime);
        };

        const handleLoadedMetadata = () => {
            if (isMounted) {
                if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                    setDuration(audio.duration);
                }
                setLoadError(null);
            }
        };

        const handleDurationChange = () => {
            if (isMounted && audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
                setDuration(audio.duration);
            }
        };

        const handleEnded = () => {
            if (isMounted) {
                setIsPlaying(false);
                setCurrentTime(0);
            }
        };

        const handleError = async () => {
            // If direct src failed, try fetching as a blob (bypasses browser media streaming quirks)
            try {
                const res = await fetch(src);
                if (res.ok) {
                    const blob = await res.blob();
                    if (isMounted) {
                        blobUrl = URL.createObjectURL(blob);
                        audio.src = blobUrl;
                        audio.load();
                        setLoadError(null);
                        return;
                    }
                }
            } catch {
                // Ignore fallback fetch error
            }

            if (isMounted) {
                setLoadError('Failed to load audio stream');
            }
        };

        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('durationchange', handleDurationChange);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('error', handleError);

        // Set source
        audio.src = src;
        audio.load();

        return () => {
            isMounted = false;
            audio.pause();
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('durationchange', handleDurationChange);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('error', handleError);
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            audioRef.current = null;
        };
    }, [src]);

    const togglePlay = async () => {
        if (!audioRef.current) return;
        try {
            if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            } else {
                // If there was a load error or audio has no source yet, try to load and play
                if (audioRef.current.error || !audioRef.current.src) {
                    const res = await fetch(src);
                    if (res.ok) {
                        const blob = await res.blob();
                        const bUrl = URL.createObjectURL(blob);
                        audioRef.current.src = bUrl;
                        audioRef.current.load();
                        setLoadError(null);
                    }
                }
                await audioRef.current.play();
                setIsPlaying(true);
                if (runId) {
                    posthog.capture(PostHogEvent.RECORDING_PLAYED, {
                        run_id: runId,
                        source: 'media_preview_dialog',
                    });
                }
            }
        } catch (err) {
            console.warn('Playback play() note:', err);
        }
    };

    const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !audioRef.current || !duration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const clickPos = (e.clientX - rect.left) / rect.width;
        const targetTime = Math.max(0, Math.min(duration, clickPos * duration));
        audioRef.current.currentTime = targetTime;
        setCurrentTime(targetTime);
    };

    const skipTime = (offset: number) => {
        if (!audioRef.current) return;
        const newTime = Math.max(0, Math.min(duration || Infinity, audioRef.current.currentTime + offset));
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const toggleRate = () => {
        if (!audioRef.current) return;
        const rates = [1, 1.25, 1.5, 2];
        const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
        const nextRate = rates[nextIdx];
        audioRef.current.playbackRate = nextRate;
        setPlaybackRate(nextRate);
    };

    const toggleMute = () => {
        if (!audioRef.current) return;
        const nextMute = !isMuted;
        audioRef.current.muted = nextMute;
        setIsMuted(nextMute);
    };

    const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setVolume(val);
        if (audioRef.current) {
            audioRef.current.volume = val;
            audioRef.current.muted = val === 0;
            setIsMuted(val === 0);
        }
    };

    const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

    return (
        <div className="w-full rounded-xl border border-border/60 bg-card/80 p-5 shadow-sm backdrop-blur-sm space-y-4">
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

export function MediaPreviewDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [audioSignedUrl, setAudioSignedUrl] = useState<string | null>(null);
    const [transcriptContent, setTranscriptContent] = useState<string | null>(null);
    const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
    const [recordingKey, setRecordingKey] = useState<string | null>(null);
    const [transcriptKey, setTranscriptKey] = useState<string | null>(null);
    const [mediaLoading, setMediaLoading] = useState(false);

    const openPreview = useCallback(
        async (recordingUrl: string | null, transcriptUrl: string | null, runId: number) => {
            if (!recordingUrl && !transcriptUrl) return;

            const immediateAudioUrl = recordingUrl
                ? normalizeMediaUrl(`/voice-audio/${recordingUrl.replace(/^\/+/, '')}`)
                : null;
            const immediateTranscriptUrl = transcriptUrl
                ? normalizeMediaUrl(`/voice-audio/${transcriptUrl.replace(/^\/+/, '')}`)
                : null;

            setAudioSignedUrl(immediateAudioUrl);
            setTranscriptContent(null);
            setRecordingKey(recordingUrl);
            setTranscriptKey(transcriptUrl);
            setSelectedRunId(runId);
            setMediaLoading(false);
            setIsOpen(true);

            // Fetch transcript in background without blocking player
            if (immediateTranscriptUrl) {
                try {
                    const response = await fetch(immediateTranscriptUrl);
                    if (response.ok) {
                        const text = await response.text();
                        setTranscriptContent(text);
                        posthog.capture(PostHogEvent.TRANSCRIPT_VIEWED, {
                            run_id: runId,
                            source: 'media_preview_dialog',
                            transcript_length: text.length,
                        });
                    }
                } catch (error) {
                    console.warn('Transcript background fetch note:', error);
                }
            }

            // Optionally refresh signed URLs in background if S3 provider is used
            try {
                const [audioResult] = await Promise.all([
                    recordingUrl ? getSignedUrl(recordingUrl) : null,
                ]);
                if (audioResult) {
                    setAudioSignedUrl(normalizeMediaUrl(audioResult));
                }
            } catch {
                // Keep immediate URL on any background error
            }
        },
        [],
    );

    return {
        openPreview,
        dialog: (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Headphones className="h-5 w-5 text-primary" />
                            Run Preview {selectedRunId && `#${selectedRunId}`}
                        </DialogTitle>
                    </DialogHeader>

                    {mediaLoading && (
                        <div className="flex items-center justify-center py-12 space-x-2 text-muted-foreground">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                            <span className="text-sm">Loading media...</span>
                        </div>
                    )}

                    {!mediaLoading && (
                        <div className="mt-2 space-y-4">
                            {/* Audio Player Section */}
                            {audioSignedUrl ? (
                                <CustomAudioPlayer
                                    src={audioSignedUrl}
                                    runId={selectedRunId}
                                    onDownload={recordingKey ? () => downloadFile(recordingKey) : undefined}
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
                                        {transcriptKey && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-6 px-2 text-xs text-muted-foreground"
                                                onClick={() => downloadFile(transcriptKey)}
                                            >
                                                <Download className="h-3 w-3 mr-1" /> Download
                                            </Button>
                                        )}
                                    </div>
                                    <pre className="w-full max-h-[45vh] overflow-auto rounded-lg border border-border/60 bg-muted/40 p-4 text-xs font-mono leading-relaxed whitespace-pre-wrap">
                                        {transcriptContent}
                                    </pre>
                                </div>
                            ) : transcriptKey ? (
                                <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                                    Transcript is being processed or was empty for this call.
                                </div>
                            ) : null}
                        </div>
                    )}

                    <DialogFooter className="pt-3 border-t border-border/40">
                        <DialogClose asChild>
                            <Button variant="secondary">Close</Button>
                        </DialogClose>
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

