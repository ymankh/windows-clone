import { create } from "zustand";

export type MusicTrack = {
  id: string;
  title: string;
  artist: string;
  src: string;
};

type MusicStore = {
  tracks: MusicTrack[];
  activeTrackId: string | null;
  isPlaying: boolean;
  playbackError: string | null;
  addTrack: (track: Omit<MusicTrack, "id">) => string;
  clearTracks: () => void;
  setActiveTrack: (id: string, options?: { play?: boolean }) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setPlaybackError: (message: string | null) => void;
  togglePlayback: () => void;
  playNext: () => void;
  playPrevious: () => void;
  getCurrentTrack: () => MusicTrack | null;
};

const makeTrackId = (track: Omit<MusicTrack, "id">) =>
  `${track.src}::${track.title}::${track.artist}`;

const useMusicStore = create<MusicStore>((set, get) => ({
  tracks: [],
  activeTrackId: null,
  isPlaying: false,
  playbackError: null,
  addTrack: (track) => {
    const id = makeTrackId(track);

    set((state) => {
      const existing = state.tracks.find((entry) => entry.id === id);
      if (existing) {
        return {
          activeTrackId: existing.id,
          isPlaying: true,
          playbackError: null,
        };
      }

      const nextTrack = { ...track, id };
      return {
        tracks: [...state.tracks, nextTrack],
        activeTrackId: nextTrack.id,
        isPlaying: true,
        playbackError: null,
      };
    });

    return id;
  },
  clearTracks: () =>
    set({
      tracks: [],
      activeTrackId: null,
      isPlaying: false,
      playbackError: null,
    }),
  setActiveTrack: (id, options) =>
    set((state) => {
      if (!state.tracks.some((track) => track.id === id)) return state;
      return {
        activeTrackId: id,
        isPlaying: options?.play ?? state.isPlaying,
        playbackError: null,
      };
    }),
  setIsPlaying: (isPlaying) =>
    set((state) => ({
      isPlaying: state.activeTrackId ? isPlaying : false,
      playbackError: isPlaying ? null : state.playbackError,
    })),
  setPlaybackError: (message) =>
    set({
      playbackError: message,
      isPlaying: false,
    }),
  togglePlayback: () =>
    set((state) => ({
      isPlaying: state.activeTrackId ? !state.isPlaying : false,
      playbackError: state.isPlaying ? state.playbackError : null,
    })),
  playNext: () =>
    set((state) => {
      if (!state.tracks.length) return state;
      const currentIndex = state.tracks.findIndex((track) => track.id === state.activeTrackId);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % state.tracks.length : 0;
      return {
        activeTrackId: state.tracks[nextIndex]?.id ?? null,
        isPlaying: true,
        playbackError: null,
      };
    }),
  playPrevious: () =>
    set((state) => {
      if (!state.tracks.length) return state;
      const currentIndex = state.tracks.findIndex((track) => track.id === state.activeTrackId);
      const nextIndex =
        currentIndex >= 0
          ? (currentIndex - 1 + state.tracks.length) % state.tracks.length
          : 0;
      return {
        activeTrackId: state.tracks[nextIndex]?.id ?? null,
        isPlaying: true,
        playbackError: null,
      };
    }),
  getCurrentTrack: () => {
    const { tracks, activeTrackId } = get();
    return tracks.find((track) => track.id === activeTrackId) ?? null;
  },
}));

export default useMusicStore;
