import { GRID_COL_WIDTH, GRID_ROW_HEIGHT, ICON_POSITION_STORAGE_KEY } from "../constants/iconGrid";

export type IconPoint = {
  x: number;
  y: number;
};

export type IconPositionsMap = Record<string, IconPoint>;

export const clampPointToDesktop = (point: IconPoint): IconPoint => ({
  x: Math.max(0, point.x),
  y: Math.max(0, point.y),
});

export const snapToGrid = (point: IconPoint): IconPoint => ({
  x: Math.max(0, Math.round(point.x / GRID_COL_WIDTH) * GRID_COL_WIDTH),
  y: Math.max(0, Math.round(point.y / GRID_ROW_HEIGHT) * GRID_ROW_HEIGHT),
});

export const readStoredIconPositions = (): IconPositionsMap => {
  try {
    const stored = localStorage.getItem(ICON_POSITION_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as IconPositionsMap) : {};
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
  const excluded = new Set(excludedIds);
  const occupied = new Set(
    Object.entries(positions)
      .filter(([id]) => id !== currentAppId && !excluded.has(id))
      .map(([, point]) => {
        const snapped = snapToGrid(point);
        return `${snapped.x},${snapped.y}`;
      })
  );

  let resolved = snapToGrid(candidate);
  while (occupied.has(`${resolved.x},${resolved.y}`)) {
    resolved = {
      x: resolved.x,
      y: resolved.y + GRID_ROW_HEIGHT,
    };
  }

  return resolved;
};

export const getInitialIconPosition = (appId: string): IconPoint => {
  const positions = readStoredIconPositions();
  if (positions[appId]) {
    return resolveFreeGridCell(positions[appId], positions, appId);
  }

  return resolveFreeGridCell(
    {
      x: Math.random() * 200,
      y: Math.random() * 200,
    },
    positions,
    appId
  );
};

export const getSortedIconPosition = (appId: string, rowsPerCol = 5): IconPoint => {
  const positions = readStoredIconPositions();
  const ids = Object.keys(positions);
  const index = ids.indexOf(appId) >= 0 ? ids.indexOf(appId) : ids.length;
  const col = Math.floor(index / rowsPerCol);
  const row = index % rowsPerCol;

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
