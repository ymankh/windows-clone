export type SelectionRect = {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};

export const normalizeSelectionRect = (rect: SelectionRect) => ({
  left: Math.min(rect.startX, rect.endX),
  right: Math.max(rect.startX, rect.endX),
  top: Math.min(rect.startY, rect.endY),
  bottom: Math.max(rect.startY, rect.endY),
});

export const createSelectionRect = (
  startX: number,
  startY: number,
  endX: number,
  endY: number
): SelectionRect => ({
  startX,
  startY,
  endX,
  endY,
});

export const collectIntersectedIconIds = (
  container: HTMLDivElement,
  rect: SelectionRect
): string[] => {
  const normalized = normalizeSelectionRect(rect);
  const icons = container.querySelectorAll<HTMLElement>("[data-desktop-icon-id]");
  const selected: string[] = [];

  icons.forEach((icon) => {
    const id = icon.dataset.desktopIconId;
    if (!id) return;

    const bounds = icon.getBoundingClientRect();
    const intersects =
      bounds.left <= normalized.right &&
      bounds.right >= normalized.left &&
      bounds.top <= normalized.bottom &&
      bounds.bottom >= normalized.top;

    if (intersects) selected.push(id);
  });

  return selected;
};

export const mergeSelections = (baseSelection: string[], additionalIds: string[]) => [
  ...new Set([...baseSelection, ...additionalIds]),
];

export const getSelectionRectStyle = (rect: SelectionRect) => {
  const normalized = normalizeSelectionRect(rect);
  return {
    left: normalized.left,
    top: normalized.top,
    width: normalized.right - normalized.left,
    height: normalized.bottom - normalized.top,
  };
};

export const movedPastThreshold = (rect: SelectionRect, threshold = 3) =>
  Math.abs(rect.endX - rect.startX) > threshold || Math.abs(rect.endY - rect.startY) > threshold;
