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
  addTrack: (track: Omit<MusicTrack, "id">) => void;
  clearTracks: () => void;
  setActiveTrack: (id: string) => void;
  playNext: () => void;
  playPrevious: () => void;
};

const makeTrackId = (track: Omit<MusicTrack, "id">) =>
  `${track.src}::${track.title}::${track.artist}`;

const useMusicStore = create<MusicStore>((set) => ({
  tracks: [],
  activeTrackId: null,
  addTrack: (track) =>
    set((state) => {
      const id = makeTrackId(track);
      const existing = state.tracks.find((entry) => entry.id === id);
      if (existing) {
        return {
          activeTrackId: existing.id,
        };
      }

      const nextTrack = { ...track, id };
      return {
        tracks: [...state.tracks, nextTrack],
        activeTrackId: nextTrack.id,
      };
    }),
  clearTracks: () =>
    set({
      tracks: [],
      activeTrackId: null,
    }),
  setActiveTrack: (id) =>
    set((state) => ({
      activeTrackId: state.tracks.some((track) => track.id === id) ? id : state.activeTrackId,
    })),
  playNext: () =>
    set((state) => {
      if (!state.tracks.length) return state;
      const currentIndex = state.tracks.findIndex((track) => track.id === state.activeTrackId);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % state.tracks.length : 0;
      return {
        activeTrackId: state.tracks[nextIndex]?.id ?? null,
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
      };
    }),
}));

export default useMusicStore;
