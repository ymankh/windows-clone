import { expect, test } from "@playwright/test";
import { FileTypes } from "../../../src/apps/fileTypes";
import { createActionReplayQueue } from "../../../src/agent/actionExecutor";
import { createFilesAgentCapabilities } from "../../../src/apps/files/capabilities";
import { MusicApp } from "../../../src/apps/music";
import { audioFileDataSchema } from "../../../src/apps/music/schema";
import { notesFileDataSchema } from "../../../src/apps/notes/schema";
import type { DesktopApp } from "../../../src/apps/types";
import useWindowsManagerStore from "../../../src/desktop/stores/WindowsStore";
import type { AgentActionCall, CapabilityName, SerializableJsonValue } from "../../../src/agent/protocol";
import useNotesStore from "../../../src/apps/notes/store";
import useMusicStore from "../../../src/apps/music/store";
import {
  findVirtualFile,
  listVirtualFolder,
  searchVirtualFiles,
} from "../../../src/apps/files/data";

const installLocalStorage = () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
      clear: () => values.clear(),
    },
  });
};

const TEST_NOW = "2026-06-28T00:00:00.000Z";

const makeCall = (
  capability: CapabilityName,
  input: SerializableJsonValue = {},
  id = capability
): AgentActionCall => ({
  id,
  capability,
  input,
  createdAt: TEST_NOW,
});

const NullComponent = () => null;
const NullIcon = () => null;

const capabilityTestApps = [
  {
    id: "notes",
    title: "Notes",
    icon: NullIcon,
    Component: NullComponent,
    fileCapabilities: [{ fileType: FileTypes.notes, schema: notesFileDataSchema }],
  },
  {
    id: "music",
    title: "Music",
    icon: NullIcon,
    Component: NullComponent,
    fileCapabilities: [{ fileType: FileTypes.audio, schema: audioFileDataSchema }],
  },
] satisfies DesktopApp[];

test.describe("virtual Files helpers", () => {
  test("searches the in-app filesystem by name, path, and file type", () => {
    const reportResults = searchVirtualFiles({ query: "report", includeFolders: false });
    expect(reportResults.map((result) => result.path)).toEqual([
      "Home / Documents / Reports / Q1-Report.pdf",
      "Home / Documents / Reports / Q2-Report.pdf",
    ]);

    const scopedAudioResults = searchVirtualFiles({ query: "audio", folderId: "Home / Media / Music" });
    expect(scopedAudioResults).toEqual([
      expect.objectContaining({
        type: "file",
        name: "Moavii - Foreign (freetouse.com).mp3",
        folderPath: "Home / Media / Music",
        fileType: "audio",
      }),
      expect.objectContaining({
        type: "file",
        name: "Demo.wav",
        folderPath: "Home / Media / Music",
        fileType: "audio",
      }),
    ]);
  });

  test("lists folders and resolves files by virtual path for open actions", () => {
    const folder = listVirtualFolder("Home / Documents");

    expect(folder).toMatchObject({
      folderId: "documents",
      path: "Home / Documents",
      items: expect.arrayContaining([
        expect.objectContaining({ type: "file", name: "Notes.md", path: "Home / Documents / Notes.md" }),
        expect.objectContaining({ type: "file", name: "Budget.xlsx", fileType: "notes" }),
      ]),
    });

    const opened = findVirtualFile({ path: "Home / Media / Music / Demo.wav" });

    expect(opened).toMatchObject({
      folderId: "music",
      file: expect.objectContaining({
        name: "Demo.wav",
        fileType: "audio",
        data: { title: "Demo Track", artist: "Public Library", url: "/audio/demo.wav" },
      }),
    });
  });
});

test.describe("Files agent capabilities", () => {
  test.beforeEach(() => {
    useWindowsManagerStore.setState({ windows: [] });
  });

  test("searches, lists, and opens virtual files through the action queue", async () => {
    const queue = createActionReplayQueue(createFilesAgentCapabilities(capabilityTestApps), {
      now: () => TEST_NOW,
    });

    await expect(
      queue.executeAction(makeCall("files.search", { query: "budget", includeFolders: false }))
    ).resolves.toMatchObject({
      ok: true,
      data: {
        results: [
          expect.objectContaining({
            type: "file",
            name: "Budget.xlsx",
            path: "Home / Documents / Budget.xlsx",
            fileType: "notes",
          }),
        ],
      },
    });

    await expect(
      queue.executeAction(makeCall("files.listFolder", { folderId: "Home / Media / Music" }))
    ).resolves.toMatchObject({
      ok: true,
      data: {
        folderId: "music",
        items: expect.arrayContaining([
          expect.objectContaining({ type: "file", name: "Demo.wav", fileType: "audio" }),
        ]),
      },
    });

    const openResult = await queue.executeAction(
      makeCall("files.openFile", { path: "Home / Media / Music / Demo.wav" })
    );

    expect(openResult).toMatchObject({
      ok: true,
      data: {
        appId: "music",
        appTitle: "Music",
        fileName: "Demo.wav",
        fileType: "audio",
        windowId: "music",
      },
    });
    expect(useWindowsManagerStore.getState().windows).toEqual([
      expect.objectContaining({ id: "music", title: "Music" }),
    ]);
  });

  test("returns action errors for unknown virtual files without opening windows", async () => {
    const queue = createActionReplayQueue(createFilesAgentCapabilities(capabilityTestApps), {
      now: () => TEST_NOW,
    });

    const result = await queue.executeAction(
      makeCall("files.openFile", { path: "Home / Documents / Missing.md" })
    );

    expect(result).toMatchObject({ ok: false, error: { code: "file-not-found" } });
    expect(useWindowsManagerStore.getState().windows).toEqual([]);
  });
});

test.describe("Notes store", () => {
  test.beforeEach(() => {
    installLocalStorage();
    useNotesStore.setState({ serialized: undefined, revision: 0 });
  });

  test("replaces, appends, reads, and clears text through the shared store", () => {
    const notes = useNotesStore.getState();

    notes.writeText({ mode: "replace", text: "Line one" });
    expect(useNotesStore.getState().readText()).toBe("Line one");

    useNotesStore.getState().writeText({ mode: "append", text: "\nLine two" });
    expect(useNotesStore.getState().readText()).toBe("Line one\nLine two");

    useNotesStore.getState().clear();
    expect(useNotesStore.getState().readText()).toBe("");
  });

});

test.describe("Music queue store", () => {
  test.beforeEach(() => {
    useMusicStore.getState().clearTracks();
  });

  test("adds tracks, avoids duplicate queue entries, and wraps next/previous selection", () => {
    const firstTrack = {
      title: "Foreign",
      artist: "Moavii",
      src: "/music/Moavii - Foreign (freetouse.com).mp3",
    };
    const secondTrack = {
      title: "Demo Track",
      artist: "Public Library",
      src: "/audio/demo.wav",
    };

    const firstId = useMusicStore.getState().addTrack(firstTrack);
    const secondId = useMusicStore.getState().addTrack(secondTrack);
    const duplicateFirstId = useMusicStore.getState().addTrack(firstTrack);

    expect(duplicateFirstId).toBe(firstId);
    expect(useMusicStore.getState().tracks.map((track) => track.title)).toEqual([
      "Foreign",
      "Demo Track",
    ]);
    expect(useMusicStore.getState().activeTrackId).toBe(firstId);
    expect(useMusicStore.getState().isPlaying).toBe(true);

    useMusicStore.getState().playNext();
    expect(useMusicStore.getState().activeTrackId).toBe(secondId);

    useMusicStore.getState().playNext();
    expect(useMusicStore.getState().activeTrackId).toBe(firstId);

    useMusicStore.getState().playPrevious();
    expect(useMusicStore.getState().activeTrackId).toBe(secondId);
    expect(useMusicStore.getState().getCurrentTrack()).toMatchObject(secondTrack);
  });

  test("does not start playback without a selected track and clears playback state", () => {
    useMusicStore.getState().togglePlayback();
    expect(useMusicStore.getState().isPlaying).toBe(false);

    useMusicStore.getState().addTrack({ title: "Demo Track", artist: "Public Library", src: "/audio/demo.wav" });
    useMusicStore.getState().setIsPlaying(false);
    useMusicStore.getState().setPlaybackError("Media failed");
    expect(useMusicStore.getState()).toMatchObject({ isPlaying: false, playbackError: "Media failed" });

    useMusicStore.getState().clearTracks();
    expect(useMusicStore.getState()).toMatchObject({
      tracks: [],
      activeTrackId: null,
      isPlaying: false,
      playbackError: null,
    });
  });
});

test.describe("Music agent capabilities", () => {
  test.beforeEach(() => {
    useMusicStore.getState().clearTracks();
    useWindowsManagerStore.setState({ windows: [] });
  });

  test("queues files, selects next and previous tracks, and reports playback state", async () => {
    const queue = createActionReplayQueue(MusicApp.agentCapabilities ?? [], { now: () => TEST_NOW });

    const first = await queue.executeAction(
      makeCall("music.playFile", {
        url: "/music/Moavii - Foreign (freetouse.com).mp3",
        title: "Foreign",
        artist: "Moavii",
      })
    );
    const second = await queue.executeAction(
      makeCall("music.playFile", {
        url: "/audio/demo.wav",
        title: "Demo Track",
        artist: "Public Library",
      })
    );

    expect(first).toMatchObject({
      ok: true,
      data: { windowId: "music", queue: { activeTrackId: expect.any(String), isPlaying: true } },
    });
    expect(second).toMatchObject({
      ok: true,
      data: {
        windowId: "music",
        queue: {
          tracks: [
            expect.objectContaining({ title: "Foreign", active: false }),
            expect.objectContaining({ title: "Demo Track", active: true }),
          ],
          isPlaying: true,
        },
      },
    });

    await expect(queue.executeAction(makeCall("music.next"))).resolves.toMatchObject({
      ok: true,
      data: {
        tracks: [
          expect.objectContaining({ title: "Foreign", active: true }),
          expect.objectContaining({ title: "Demo Track", active: false }),
        ],
      },
    });
    await expect(queue.executeAction(makeCall("music.previous"))).resolves.toMatchObject({
      ok: true,
      data: {
        tracks: [
          expect.objectContaining({ title: "Foreign", active: false }),
          expect.objectContaining({ title: "Demo Track", active: true }),
        ],
      },
    });
    await expect(queue.executeAction(makeCall("music.listQueue"))).resolves.toMatchObject({
      ok: true,
      data: {
        activeTrackId: useMusicStore.getState().activeTrackId,
        isPlaying: true,
        tracks: [
          expect.objectContaining({ title: "Foreign" }),
          expect.objectContaining({ title: "Demo Track", active: true }),
        ],
      },
    });
    expect(useWindowsManagerStore.getState().windows).toEqual([
      expect.objectContaining({ id: "music", title: "Music" }),
    ]);
  });
});
