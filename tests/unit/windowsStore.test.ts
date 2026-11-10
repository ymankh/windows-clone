import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";

const TASKBAR_HEIGHT = 56;

const stubViewport = (width: number, height: number) => {
  vi.stubGlobal("window", { innerWidth: width, innerHeight: height });
};

const store = () => useWindowsManagerStore.getState();
const open = (id: string, extra: Record<string, number> = {}) =>
  store().openWindow({ id, title: id, appId: "notes", ...extra });
const find = (id: string) => {
  const entry = store().windows.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing window ${id}`);
  return entry;
};

beforeEach(() => {
  useWindowsManagerStore.setState({ windows: [], horizontalDockSplit: 0.5 });
  stubViewport(1280, 720);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("z-index", () => {
  it("stays within 1..n no matter how often windows are activated", () => {
    open("a");
    open("b");
    open("c");
    for (let index = 0; index < 2_000; index += 1) {
      store().activateWindow(["a", "b", "c"][index % 3]);
    }

    const zIndexes = store()
      .windows.map((entry) => entry.zIndex)
      .sort((left, right) => left - right);
    expect(zIndexes).toEqual([1, 2, 3]);
  });

  it("puts the activated window on top and keeps the rest in order", () => {
    open("a");
    open("b");
    open("c");
    store().activateWindow("a");

    expect(find("a").zIndex).toBe(3);
    expect(find("b").zIndex).toBe(1);
    expect(find("c").zIndex).toBe(2);
  });

  it("raises and restores a window that is reopened", () => {
    open("a");
    open("b");
    store().minimizeWindow("a");
    open("a");

    expect(find("a").isMinimized).toBe(false);
    expect(find("a").zIndex).toBe(2);
    expect(store().windows).toHaveLength(2);
  });
});

describe("opening windows", () => {
  it("cascades new windows and wraps the cascade", () => {
    open("first");
    open("second");
    expect(find("first")).toMatchObject({ x: 80, y: 80 });
    expect(find("second")).toMatchObject({ x: 100, y: 100 });

    for (let index = 2; index < 10; index += 1) open(`w${index}`);
    open("wrapped");
    expect(find("wrapped")).toMatchObject({ x: 80, y: 80 });
  });

  it("keeps a new window inside a small viewport", () => {
    stubViewport(400, 500);
    open("small");

    const entry = find("small");
    expect(entry.x + entry.width).toBeLessThanOrEqual(400);
    expect(entry.y + entry.height).toBeLessThanOrEqual(500 - TASKBAR_HEIGHT);
    expect(entry.x).toBeGreaterThanOrEqual(0);
    expect(entry.y).toBeGreaterThanOrEqual(0);
  });

  it("never shrinks a window below its minimum size", () => {
    stubViewport(300, 300);
    open("tiny", { minWidth: 480, minHeight: 320 });

    expect(find("tiny")).toMatchObject({ width: 480, height: 320, x: 0, y: 0 });
  });
});

describe("clampWindowsToViewport", () => {
  it("pulls normal windows back on screen after the viewport shrinks", () => {
    open("a", { x: 700, y: 250, width: 520, height: 360 });
    stubViewport(800, 600);
    store().clampWindowsToViewport();

    const entry = find("a");
    expect(entry.x + entry.width).toBeLessThanOrEqual(800);
    expect(entry.y + entry.height).toBeLessThanOrEqual(600 - TASKBAR_HEIGHT);
  });

  it("leaves maximized and docked windows to their own layout logic", () => {
    open("a", { x: 700, y: 250, width: 520, height: 360 });
    store().setWindowLayoutMode("a", "maximized");
    stubViewport(800, 600);
    store().clampWindowsToViewport();

    expect(find("a")).toMatchObject({ x: 700, y: 250 });
  });
});

describe("updateWindowBounds", () => {
  it("clamps to the window's minimum size", () => {
    open("a", { minWidth: 400, minHeight: 300 });
    store().updateWindowBounds("a", { width: 0, height: 0 });

    expect(find("a")).toMatchObject({ width: 400, height: 300 });
  });
});
