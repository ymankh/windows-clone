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
  excludedIds: string[] = []
): IconPoint => {
  const bounds = getIconDesktopBounds();
  const excluded = new Set(excludedIds);
  const occupied = new Set(
    Object.entries(positions)
      .filter(([id]) => id !== currentAppId && !excluded.has(id))
      .map(([, point]) => {
        const snapped = snapToGrid(point);
        return `${snapped.x},${snapped.y}`;
      })
  );

  let resolved = clampPointToDesktop(snapToGrid(candidate), bounds);
  const maxRows = Math.max(1, Math.floor(bounds.height / GRID_ROW_HEIGHT) + 1);
  let attempts = 0;
  while (occupied.has(`${resolved.x},${resolved.y}`)) {
    attempts += 1;
    if (attempts > Object.keys(positions).length + maxRows) break;
    const nextY = resolved.y + GRID_ROW_HEIGHT;
    resolved = {
      x: nextY <= bounds.height ? resolved.x : resolved.x + GRID_COL_WIDTH,
      y: nextY <= bounds.height ? nextY : 0,
    };
    resolved = clampPointToDesktop(resolved, bounds);
  }

  return resolved;
};

export const getInitialIconPosition = (appId: string, appIndex: number): IconPoint => {
  const positions = readStoredIconPositions();
  if (positions[appId]) {
    return resolveFreeGridCell(positions[appId], positions, appId);
  }

  return resolveFreeGridCell(
    {
      x: Math.floor(appIndex / 5) * GRID_COL_WIDTH,
      y: (appIndex % 5) * GRID_ROW_HEIGHT,
    },
    positions,
    appId
  );
};

export const getSortedIconPosition = (
  appId: string,
  appIndex: number,
  rowsPerCol = 5
): IconPoint => {
  const positions = readStoredIconPositions();
  const col = Math.floor(appIndex / rowsPerCol);
  const row = appIndex % rowsPerCol;

  return resolveFreeGridCell(
    {
      x: col * GRID_COL_WIDTH,
      y: row * GRID_ROW_HEIGHT,
    },
    positions,
    appId
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
