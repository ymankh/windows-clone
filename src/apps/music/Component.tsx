import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import type { AppWindowComponentProps } from "../types";
import { audioFileDataSchema } from "./schema";

type DemoTrack = {
  title: string;
  artist: string;
  notes: number[];
  bpm: number;
};

type PlaylistTrack = DemoTrack & {
  src: string;
};

type ExternalTrack = {
  title: string;
  artist: string;
  src: string;
};

const DEMO_TRACKS: DemoTrack[] = [
  {
    title: "Startup Glow",
    artist: "System Sounds",
    notes: [261.63, 293.66, 329.63, 392, 329.63, 293.66, 349.23, 440],
    bpm: 104,
  },
  {
    title: "Night Drive",
    artist: "System Sounds",
    notes: [220, 246.94, 293.66, 329.63, 293.66, 246.94, 196, 220],
    bpm: 96,
  },
  {
    title: "Soft Focus",
    artist: "System Sounds",
    notes: [196, 220, 246.94, 261.63, 293.66, 261.63, 246.94, 220],
    bpm: 88,
  },
];

const SAMPLE_RATE = 22050;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const formatTime = (seconds: number) => {
  const safeSeconds = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = Math.floor(safeSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainder}`;
};

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
};

const createWaveBlobUrl = (notes: number[], bpm: number) => {
  const beatSeconds = 60 / bpm;
  const noteDuration = beatSeconds * 0.9;
  const tailSeconds = 0.4;
  const totalSeconds = notes.length * noteDuration + tailSeconds;
  const sampleCount = Math.floor(totalSeconds * SAMPLE_RATE);
  const pcm = new Int16Array(sampleCount);

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const time = sampleIndex / SAMPLE_RATE;
    const noteIndex = Math.min(
      notes.length - 1,
      Math.floor(time / noteDuration)
    );
    const noteStart = noteIndex * noteDuration;
    const noteTime = time - noteStart;
    const envelope = Math.max(0, 1 - noteTime / noteDuration);
    const frequency = notes[noteIndex];
    const value =
      Math.sin(2 * Math.PI * frequency * time) * envelope +
      Math.sin(2 * Math.PI * (frequency / 2) * time) * envelope * 0.35;

    pcm[sampleIndex] = Math.round(clamp(value, -1, 1) * 32767 * 0.35);
  }

  const buffer = new ArrayBuffer(44 + pcm.length * 2);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + pcm.length * 2, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, pcm.length * 2, true);

  pcm.forEach((sample, index) => {
    view.setInt16(44 + index * 2, sample, true);
  });

  return URL.createObjectURL(new Blob([buffer], { type: "audio/wav" }));
};

const createPlaylist = () =>
  DEMO_TRACKS.map((track) => ({
    ...track,
    src: createWaveBlobUrl(track.notes, track.bpm),
  }));

const createExternalTrack = (fileContext: AppWindowComponentProps["fileContext"]) => {
  if (fileContext?.type !== "audio") return undefined;
  const parsed = audioFileDataSchema.safeParse(fileContext.data);
  if (!parsed.success) return undefined;

  return {
    title: parsed.data.title ?? fileContext.name,
    artist: parsed.data.artist ?? "Opened from Files",
    src: parsed.data.url,
  } satisfies ExternalTrack;
};

const MusicComponent = ({ windowId = "music", fileContext }: AppWindowComponentProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playlist] = useState<PlaylistTrack[]>(createPlaylist);
  const openedTrack = useMemo(() => createExternalTrack(fileContext), [fileContext]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(Boolean(openedTrack));
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);

  useEffect(() => {
    return () => {
      playlist.forEach((track) => URL.revokeObjectURL(track.src));
    };
  }, [playlist]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (!isPlaying) {
      audio.pause();
      return;
    }

    audio.play().catch(() => {
      setIsPlaying(false);
    });
  }, [isPlaying, openedTrack?.src, playlist, trackIndex]);

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
        setIsPlaying((value) => !value);
      }

      if (detail.type === "next") {
        if (openedTrack) return;
        setCurrentTime(0);
        setTrackIndex((value) => (value + 1) % DEMO_TRACKS.length);
        setIsPlaying(true);
      }

      if (detail.type === "previous") {
        if (openedTrack) return;
        setCurrentTime(0);
        setTrackIndex((value) => (value - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length);
        setIsPlaying(true);
      }
    };

    window.addEventListener("music-command", handleCommand as EventListener);
    return () => {
      window.removeEventListener("music-command", handleCommand as EventListener);
    };
  }, [openedTrack, windowId]);

  const currentTrack = openedTrack ?? playlist[trackIndex];
  const isSingleTrack = Boolean(openedTrack);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <audio
        ref={audioRef}
        src={currentTrack?.src}
        autoPlay={isPlaying}
        preload="auto"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          setCurrentTime(0);
          setDuration(event.currentTarget.duration);
        }}
        onEnded={() => {
          if (isSingleTrack) {
            setIsPlaying(false);
            return;
          }
          setCurrentTime(0);
          setTrackIndex((value) => (value + 1) % DEMO_TRACKS.length);
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
          <div className="mt-2 text-2xl font-semibold">{currentTrack?.title ?? "Loading..."}</div>
          <div className="text-sm text-white/80">{currentTrack?.artist ?? "Preparing playlist"}</div>
        </div>
      </div>

      <div className="grid flex-1 gap-4 p-4 md:grid-cols-[1.25fr_0.9fr]">
        <section className="flex flex-col rounded-md border border-border bg-card/80 p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between text-sm">
            <span className="font-medium">
              {isSingleTrack ? "Opened Track" : "Demo Playlist"}
            </span>
            <span className="text-muted-foreground">
              {isSingleTrack ? "1 track" : `${playlist.length} tracks`}
            </span>
          </div>

          <div className="space-y-2 overflow-auto">
            {(isSingleTrack ? [currentTrack] : playlist).map((track, index) => {
              const active = index === trackIndex;
              return (
                <button
                  key={track.title}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left transition ${
                    active
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-muted/60"
                  }`}
                  onClick={() => {
                    if (isSingleTrack) {
                      setCurrentTime(0);
                      if (audioRef.current) {
                        audioRef.current.currentTime = 0;
                      }
                      setIsPlaying(true);
                      return;
                    }
                    setCurrentTime(0);
                    setTrackIndex(index);
                    setIsPlaying(true);
                  }}
                >
                  <div>
                    <div className="font-medium">{track.title}</div>
                    <div className="text-sm text-muted-foreground">{track.artist}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {"bpm" in track ? `${track.bpm} BPM` : "public/audio"}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="flex flex-col rounded-md border border-border bg-card/80 p-4 shadow-sm">
          <div className="text-sm font-medium">Controls</div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              className="rounded-md border border-border bg-background p-3 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isSingleTrack}
              onClick={() => {
                setCurrentTime(0);
                setTrackIndex((value) => (value - 1 + DEMO_TRACKS.length) % DEMO_TRACKS.length);
                setIsPlaying(true);
              }}
            >
              <SkipBack className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="rounded-md border border-primary bg-primary px-5 py-3 text-primary-foreground hover:opacity-90"
              onClick={() => setIsPlaying((value) => !value)}
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              className="rounded-md border border-border bg-background p-3 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              disabled={isSingleTrack}
              onClick={() => {
                setCurrentTime(0);
                setTrackIndex((value) => (value + 1) % DEMO_TRACKS.length);
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
              value={Math.min(currentTime, duration || 0)}
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
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
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

          <p className="mt-auto pt-6 text-xs leading-relaxed text-muted-foreground">
            {isSingleTrack
              ? "This track was opened through Files using a public URL."
              : "This player uses tiny generated demo loops, so the app stays simple and fully local."}
          </p>
        </section>
      </div>
    </div>
  );
};

export default MusicComponent;
