import { describe, expect, it } from "vitest";
import {
  clampPointToDesktop,
  resolveFreeGridCell,
  snapToGrid,
} from "@/desktop/helpers/iconPositioning";

// Usable area for icon origins: three columns (0, 120, 240) by three rows
// (0, 140, 280).
const bounds = { width: 240, height: 280 };

describe("snapToGrid", () => {
  it("rounds to the nearest grid cell and never goes negative", () => {
    expect(snapToGrid({ x: 70, y: 60 })).toEqual({ x: 120, y: 0 });
    expect(snapToGrid({ x: 50, y: 80 })).toEqual({ x: 0, y: 140 });
    expect(snapToGrid({ x: -500, y: -500 })).toEqual({ x: 0, y: 0 });
  });
});

describe("clampPointToDesktop", () => {
  it("keeps points inside the given bounds", () => {
    expect(clampPointToDesktop({ x: 999, y: -5 }, bounds)).toEqual({ x: 240, y: 0 });
    expect(clampPointToDesktop({ x: 100, y: 100 }, bounds)).toEqual({ x: 100, y: 100 });
  });
});

describe("resolveFreeGridCell", () => {
  it("returns the snapped cell when it is free", () => {
    expect(resolveFreeGridCell({ x: 115, y: 150 }, {}, "notes", [], bounds)).toEqual({
      x: 120,
      y: 140,
    });
  });

  it("moves down the column when the cell is taken", () => {
    const positions = { browser: { x: 0, y: 0 } };
    expect(resolveFreeGridCell({ x: 0, y: 0 }, positions, "notes", [], bounds)).toEqual({
      x: 0,
      y: 140,
    });
  });

  it("wraps to the next column when the column is full", () => {
    const positions = {
      a: { x: 0, y: 0 },
      b: { x: 0, y: 140 },
      c: { x: 0, y: 280 },
    };
    expect(resolveFreeGridCell({ x: 0, y: 280 }, positions, "notes", [], bounds)).toEqual({
      x: 120,
      y: 0,
    });
  });

  it("ignores the icon's own position and excluded icons", () => {
    const positions = { notes: { x: 0, y: 0 }, music: { x: 120, y: 0 } };
    expect(resolveFreeGridCell({ x: 0, y: 0 }, positions, "notes", [], bounds)).toEqual({
      x: 0,
      y: 0,
    });
    expect(
      resolveFreeGridCell({ x: 120, y: 0 }, positions, "notes", ["music"], bounds)
    ).toEqual({ x: 120, y: 0 });
  });
});
