import { GRID_COL_WIDTH, GRID_ROW_HEIGHT, ICON_POSITION_STORAGE_KEY } from "../constants/iconGrid";
import { TASKBAR_HEIGHT } from "../components/windows/windowing/constants";
import { z } from "zod";

export type IconPoint = {
  x: number;
  y: number;
};

export type IconPositionsMap = Record<string, IconPoint>;

export type IconDesktopBounds = { width: number; height: number };

const ICON_WIDTH = 96;
const ICON_HEIGHT = 120;
const iconPointSchema = z.object({ x: z.number().finite(), y: z.number().finite() });
const iconPositionsSchema = z.record(z.string(), iconPointSchema);

export const getIconDesktopBounds = (): IconDesktopBounds => ({
  width: Math.max(0, window.innerWidth - ICON_WIDTH),
  height: Math.max(0, window.innerHeight - TASKBAR_HEIGHT - ICON_HEIGHT),
});

export const clampPointToDesktop = (
  point: IconPoint,
  bounds = getIconDesktopBounds()
): IconPoint => ({
  x: Math.min(bounds.width, Math.max(0, point.x)),
  y: Math.min(bounds.height, Math.max(0, point.y)),
});

export const snapToGrid = (point: IconPoint): IconPoint => ({
  x: Math.max(0, Math.round(point.x / GRID_COL_WIDTH) * GRID_COL_WIDTH),
  y: Math.max(0, Math.round(point.y / GRID_ROW_HEIGHT) * GRID_ROW_HEIGHT),
});

export const readStoredIconPositions = (): IconPositionsMap => {
  try {
    const stored = localStorage.getItem(ICON_POSITION_STORAGE_KEY);
    if (!stored) return {};
    const parsed = iconPositionsSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : {};
  } catch {
    return {};
  }
};

const writeStoredIconPositions = (positions: IconPositionsMap) => {
  try {
    localStorage.setItem(ICON_POSITION_STORAGE_KEY, JSON.stringify(positions));
  } catch {
    // ignore
  }
};

export const resolveFreeGridCell = (
  candidate: IconPoint,
  positions: IconPositionsMap,
  currentAppId: string,
  excludedIds: string[] = [],
  bounds = getIconDesktopBounds()
): IconPoint => {
  const excluded = new Set(excludedIds);
  const occupied = new Set(
    Object.entries(positions)
      .filter(([id]) => id !== currentAppId && !excluded.has(id))
      .map(([, point]) => {
        const snapped = snapToGrid(clampPointToDesktop(point, bounds));
        return `${snapped.x},${snapped.y}`;
      })
  );
  const maxColumn = Math.floor(bounds.width / GRID_COL_WIDTH) * GRID_COL_WIDTH;
  const maxRow = Math.floor(bounds.height / GRID_ROW_HEIGHT) * GRID_ROW_HEIGHT;
  const columns = Math.floor(maxColumn / GRID_COL_WIDTH) + 1;
  const rows = Math.floor(maxRow / GRID_ROW_HEIGHT) + 1;
  let resolved = snapToGrid(clampPointToDesktop(candidate, bounds));
  resolved = {
    x: Math.min(maxColumn, resolved.x),
    y: Math.min(maxRow, resolved.y),
  };

  for (let attempts = 0; attempts < columns * rows; attempts += 1) {
    if (!occupied.has(`${resolved.x},${resolved.y}`)) return resolved;
    const nextY = resolved.y + GRID_ROW_HEIGHT;
    resolved =
      nextY <= maxRow
        ? { x: resolved.x, y: nextY }
        : {
            x: resolved.x + GRID_COL_WIDTH <= maxColumn
              ? resolved.x + GRID_COL_WIDTH
              : 0,
            y: 0,
          };
  }

  return resolved;
};

export const getInitialIconPosition = (appId: string, appIndex: number): IconPoint => {
  const positions = readStoredIconPositions();
  if (positions[appId]) {
    return resolveFreeGridCell(positions[appId], positions, appId);
  }

  const bounds = getIconDesktopBounds();
  const rowsPerColumn = Math.floor(bounds.height / GRID_ROW_HEIGHT) + 1;
  return resolveFreeGridCell(
    {
      x: Math.floor(appIndex / rowsPerColumn) * GRID_COL_WIDTH,
      y: (appIndex % rowsPerColumn) * GRID_ROW_HEIGHT,
    },
    positions,
    appId,
    [],
    bounds
  );
};

export const getSortedIconPosition = (
  appId: string,
  appIndex: number,
  rowsPerColumn?: number
): IconPoint => {
  const positions = readStoredIconPositions();
  const bounds = getIconDesktopBounds();
  const rowCount =
    rowsPerColumn ?? Math.floor(bounds.height / GRID_ROW_HEIGHT) + 1;
  const col = Math.floor(appIndex / rowCount);
  const row = appIndex % rowCount;

  return resolveFreeGridCell(
    {
      x: col * GRID_COL_WIDTH,
      y: row * GRID_ROW_HEIGHT,
    },
    positions,
    appId,
    [],
    bounds
  );
};

export const persistIconPosition = (
  appId: string,
  next: IconPoint,
  excludedIds: string[] = []
): IconPoint => {
  const positions = readStoredIconPositions();
  const resolved = resolveFreeGridCell(next, positions, appId, excludedIds);
  positions[appId] = resolved;
  writeStoredIconPositions(positions);
  return resolved;
};
