import { describe, expect, it } from "vitest";
import {
  clampDockSplitRatio,
  getLeftDockWidth,
  isDockedLayout,
} from "@/desktop/components/windows/windowing/utils";
import { WindowLayoutModes } from "@/desktop/stores/WindowsStore";

describe("clampDockSplitRatio", () => {
  it("keeps ratios inside the allowed range", () => {
    expect(clampDockSplitRatio(0.5)).toBe(0.5);
    expect(clampDockSplitRatio(0)).toBe(0.2);
    expect(clampDockSplitRatio(1)).toBe(0.8);
  });
});

describe("getLeftDockWidth", () => {
  it("splits the viewport by the ratio", () => {
    expect(getLeftDockWidth(1000, 0.5)).toBe(500);
    expect(getLeftDockWidth(1000, 0.6)).toBe(600);
  });

  it("leaves room for the minimum width on both sides", () => {
    expect(getLeftDockWidth(1000, 0.2, 400)).toBe(400);
    expect(getLeftDockWidth(1000, 0.8, 400)).toBe(600);
  });

  it("handles viewports narrower than the minimum width", () => {
    expect(getLeftDockWidth(300, 0.5, 320)).toBe(300);
    expect(getLeftDockWidth(0, 0.5)).toBe(0);
  });
});

describe("isDockedLayout", () => {
  it("is true only for the two docked modes", () => {
    expect(isDockedLayout(WindowLayoutModes.dockedLeft)).toBe(true);
    expect(isDockedLayout(WindowLayoutModes.dockedRight)).toBe(true);
    expect(isDockedLayout(WindowLayoutModes.normal)).toBe(false);
    expect(isDockedLayout(WindowLayoutModes.maximized)).toBe(false);
  });
});
