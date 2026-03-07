import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Trash2, Volume2 } from "lucide-react";
import type { AppWindowComponentProps } from "../types";
import { audioFileDataSchema } from "./schema";
import useMusicStore from "./store";

const formatTime = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder}`;
};

const createIncomingTrack = (fileContext: AppWindowComponentProps["fileContext"]) => {
  if (fileContext?.type !== "audio") return undefined;
  const parsed = audioFileDataSchema.safeParse(fileContext.data);
  if (!parsed.success) return undefined;

  return {
    title: parsed.data.title ?? fileContext.name,
    artist: parsed.data.artist ?? "Opened from Files",
    src: parsed.data.url,
  };
};

const MusicComponent = ({ windowId = "music", fileContext }: AppWindowComponentProps) => {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingAutoplayRef = useRef(false);
  const incomingTrack = useMemo(() => createIncomingTrack(fileContext), [fileContext]);
  const tracks = useMusicStore((state) => state.tracks);
  const activeTrackId = useMusicStore((state) => state.activeTrackId);
  const addTrack = useMusicStore((state) => state.addTrack);
  const clearTracks = useMusicStore((state) => state.clearTracks);
  const setActiveTrack = useMusicStore((state) => state.setActiveTrack);
  const playNext = useMusicStore((state) => state.playNext);
  const playPrevious = useMusicStore((state) => state.playPrevious);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isCompact, setIsCompact] = useState(false);

  const currentTrack = tracks.find((track) => track.id === activeTrackId) ?? null;
  const currentTrackId = currentTrack?.id ?? null;
  const hasTracks = tracks.length > 0;

  useEffect(() => {
    if (!incomingTrack) return;
    pendingAutoplayRef.current = true;
    addTrack(incomingTrack);
  }, [addTrack, incomingTrack]);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell || typeof ResizeObserver === "undefined") return;

    const observer = new ResizeObserver(([entry]) => {
      setIsCompact(entry.contentRect.width < 720);
    });

    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !currentTrack) return;

    if (!isPlaying && !pendingAutoplayRef.current) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {
      pendingAutoplayRef.current = false;
      setIsPlaying(false);
    });
  }, [currentTrackId, isPlaying, currentTrack]);

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          type?: "toggle" | "next" | "previous";
          windowId?: string;
        }>
      ).detail;
      if (!detail) return;
      if (detail.windowId && detail.windowId !== windowId) return;

      if (detail.type === "toggle") {
        if (!currentTrack) return;
        setIsPlaying((value) => !value);
      }

      if (detail.type === "next") {
        if (tracks.length < 2) return;
        playNext();
        setIsPlaying(true);
      }

      if (detail.type === "previous") {
        if (tracks.length < 2) return;
        playPrevious();
        setIsPlaying(true);
      }
    };

    window.addEventListener("music-command", handleCommand as EventListener);
    return () => {
      window.removeEventListener("music-command", handleCommand as EventListener);
    };
  }, [currentTrack, playNext, playPrevious, tracks.length, windowId]);

  return (
    <div
      ref={shellRef}
      className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground"
    >
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        autoPlay={isPlaying}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          pendingAutoplayRef.current = false;
          setCurrentTime(0);
          setDuration(event.currentTarget.duration);
        }}
        onEnded={() => {
          pendingAutoplayRef.current = false;
          if (tracks.length < 2) {
            setIsPlaying(false);
            return;
          }
          playNext();
          setIsPlaying(true);
        }}
      />

      <div
        className="p-5"
        style={{
          backgroundImage:
            "linear-gradient(135deg, color-mix(in oklch, var(--primary) 78%, transparent), color-mix(in oklch, var(--accent) 56%, transparent), color-mix(in oklch, var(--background) 82%, transparent))",
        }}
      >
        <div className="rounded-md border border-white/20 bg-black/25 p-4 text-white backdrop-blur-sm">
          <div className="text-xs uppercase tracking-[0.25em] text-white/70">Now Playing</div>
          <div className="mt-2 text-2xl font-semibold">
            {currentTrack?.title ?? "No track selected"}
          </div>
          <div className="text-sm text-white/80">
            {currentTrack?.artist ?? "Open a file from Explorer to add it here"}
          </div>
        </div>
      </div>

      <div className={`flex flex-1 gap-4 p-4 ${isCompact ? "flex-col" : "grid md:grid-cols-[1.25fr_0.9fr]"}`}>
        {!isCompact ? (
          <section className="flex flex-col rounded-md border border-border bg-card/80 p-4 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3 text-sm">
              <div>
                <div className="font-medium">Track List</div>
                <div className="text-muted-foreground">
                  {hasTracks ? `${tracks.length} tracks` : "Empty"}
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!hasTracks}
                onClick={() => {
                  pendingAutoplayRef.current = false;
                  clearTracks();
                  setIsPlaying(false);
                  setCurrentTime(0);
                  setDuration(0);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear list
              </button>
            </div>

            {hasTracks ? (
              <div className="space-y-2 overflow-auto">
                {tracks.map((track) => {
                  const active = track.id === currentTrack?.id;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition ${
                        active
                          ? "border-primary bg-primary/10"
                          : "border-border bg-background hover:bg-muted/60"
                      }`}
                      onClick={() => {
                        pendingAutoplayRef.current = false;
                        setCurrentTime(0);
                        setActiveTrack(track.id);
                        setIsPlaying(true);
                      }}
                    >
                      <div>
                        <div className="font-medium">{track.title}</div>
                        <div className="text-sm text-muted-foreground">{track.artist}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">Explorer</div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                The track list is empty. Open audio files from Explorer to add them.
              </div>
            )}
          </section>
        ) : null}

        <section className="flex flex-col rounded-md border border-border bg-card/80 p-4 shadow-sm">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>Controls</span>
            {isCompact && hasTracks ? (
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs hover:bg-muted"
                onClick={() => {
                  pendingAutoplayRef.current = false;
                  clearTracks();
                  setIsPlaying(false);
                  setCurrentTime(0);
                  setDuration(0);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear list
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-md border border-border bg-background p-3 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              disabled={tracks.length < 2}
              onClick={() => {
                pendingAutoplayRef.current = false;
                setCurrentTime(0);
                playPrevious();
                setIsPlaying(true);
              }}
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md border border-primary bg-primary px-5 py-3 text-primary-foreground hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!currentTrack}
              onClick={() => setIsPlaying((value) => !value)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-background p-3 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              disabled={tracks.length < 2}
              onClick={() => {
                pendingAutoplayRef.current = false;
                setCurrentTime(0);
                playNext();
                setIsPlaying(true);
              }}
            >
              <SkipForward className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-6">
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.1}
              value={Math.min(currentTrack ? currentTime : 0, currentTrack ? duration : 0)}
              className="w-full accent-primary"
              onChange={(event) => {
                const nextTime = Number(event.target.value);
                setCurrentTime(nextTime);
                if (audioRef.current) {
                  audioRef.current.currentTime = nextTime;
                }
              }}
            />
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>{formatTime(currentTrack ? currentTime : 0)}</span>
              <span>{formatTime(currentTrack ? duration : 0)}</span>
            </div>
          </div>

          <label className="mt-6 block">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Volume2 className="h-4 w-4" />
              Volume
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              className="w-full accent-primary"
              onChange={(event) => setVolume(Number(event.target.value))}
            />
          </label>
        </section>
      </div>
    </div>
  );
};

export default MusicComponent;
