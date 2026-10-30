import type { ComponentType, SVGProps } from "react";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import type { DesktopApp } from "../../apps";
import { buildAppWindow } from "../../apps/windowBuilder";
import useWindowsManagerStore from "../stores/WindowsStore";
import DesktopIconMenu from "./DesktopIconMenu";
import { cn } from "@/lib/utils";
import {
  clampPointToDesktop,
  getIconDesktopBounds,
  getInitialIconPosition,
  persistIconPositions,
  type IconPoint,
  type IconPositionsMap,
} from "../helpers/iconPositioning";
import {
  emitGroupDragEnd,
  emitGroupDragMove,
  emitGroupDragStart,
  getGroupDragDetail,
  GROUP_DRAG_END_EVENT,
  GROUP_DRAG_MOVE_EVENT,
  GROUP_DRAG_START_EVENT,
  type GroupDragBounds,
  type GroupDragEndDetail,
  type GroupDragMoveDetail,
  type GroupDragStartDetail,
} from "../helpers/groupDragEvents";

const getGroupDragSnapshot = (
  selectedIds: string[]
): Pick<GroupDragStartDetail, "origins" | "bounds"> => {
  const selected = new Set(selectedIds);
  const origins: IconPositionsMap = {};
  const bounds: GroupDragBounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  document.querySelectorAll<HTMLElement>("[data-desktop-icon-id]").forEach((icon) => {
    const id = icon.dataset.desktopIconId;
    if (!id || !selected.has(id)) return;
    const x = Number.parseFloat(icon.style.left);
    const y = Number.parseFloat(icon.style.top);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    origins[id] = { x, y };
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  });

  return { origins, bounds };
};

const clampGroupDelta = (
  bounds: GroupDragBounds,
  deltaX: number,
  deltaY: number
) => {
  const desktopBounds = getIconDesktopBounds();
  return {
    x: Math.min(desktopBounds.width - bounds.maxX, Math.max(-bounds.minX, deltaX)),
    y: Math.min(desktopBounds.height - bounds.maxY, Math.max(-bounds.minY, deltaY)),
  };
};

const applyGroupDelta = (
  origins: IconPositionsMap,
  delta: { x: number; y: number }
): IconPositionsMap =>
  Object.fromEntries(
    Object.entries(origins).map(([id, origin]) => [
      id,
      { x: origin.x + delta.x, y: origin.y + delta.y },
    ])
  );

type DesktopIconProps = {
  app: DesktopApp;
  appIndex: number;
  sortedPosition?: IconPoint;
  selected?: boolean;
  selectedIds?: string[];
  onSelect?: (options?: { additive?: boolean; toggle?: boolean }) => void;
  clearSelection?: () => void;
};

const DesktopIcon = ({
  app,
  appIndex,
  sortedPosition,
  selected = false,
  selectedIds = [],
  onSelect,
  clearSelection,
}: DesktopIconProps) => {
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const Icon: ComponentType<SVGProps<SVGSVGElement>> = app.icon;
  const [hidden, setHidden] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() =>
    getInitialIconPosition(app.id, appIndex)
  );
  const dragState = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const groupDragState = useRef<{
    active: boolean;
    leaderId: string;
    origins: IconPositionsMap;
    bounds: GroupDragBounds;
  }>({
    active: false,
    leaderId: "",
    origins: {},
    bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
  });
  const positionRef = useRef(position);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);


  const persistPosition = useCallback(
    (next: IconPositionsMap, excludedIds: string[] = []) =>
      persistIconPositions(next, excludedIds),
    []
  );

  const applySortedPosition = useEffectEvent(() => {
    if (!sortedPosition) return;
    setPosition(sortedPosition);
  });

  useEffect(() => {
    applySortedPosition();
  }, [sortedPosition]);

  useEffect(() => {
    const onGroupDragStart = (event: Event) => {
      const detail = getGroupDragDetail<GroupDragStartDetail>(event);
      if (!detail.selectedIds.includes(app.id) || !detail.origins[app.id]) return;
      groupDragState.current = {
        active: true,
        leaderId: detail.leaderId,
        origins: detail.origins,
        bounds: detail.bounds,
      };
    };

    const onGroupDragMove = (event: Event) => {
      const detail = getGroupDragDetail<GroupDragMoveDetail>(event);
      const group = groupDragState.current;
      if (!group.active || group.leaderId !== detail.leaderId) return;

      const delta = clampGroupDelta(group.bounds, detail.deltaX, detail.deltaY);
      const origin = group.origins[app.id];
      setPosition({ x: origin.x + delta.x, y: origin.y + delta.y });
    };

    const onGroupDragEnd = (event: Event) => {
      const detail = getGroupDragDetail<GroupDragEndDetail>(event);
      const group = groupDragState.current;
      if (!group.active || group.leaderId !== detail.leaderId) return;

      const delta = clampGroupDelta(group.bounds, detail.deltaX, detail.deltaY);
      const origin = group.origins[app.id];
      setPosition(
        detail.positions[app.id] ?? {
          x: origin.x + delta.x,
          y: origin.y + delta.y,
        }
      );
      groupDragState.current.active = false;
      groupDragState.current.leaderId = "";
    };

    window.addEventListener(GROUP_DRAG_START_EVENT, onGroupDragStart as EventListener);
    window.addEventListener(GROUP_DRAG_MOVE_EVENT, onGroupDragMove as EventListener);
    window.addEventListener(GROUP_DRAG_END_EVENT, onGroupDragEnd as EventListener);

    return () => {
      window.removeEventListener(
        GROUP_DRAG_START_EVENT,
        onGroupDragStart as EventListener
      );
      window.removeEventListener(GROUP_DRAG_MOVE_EVENT, onGroupDragMove as EventListener);
      window.removeEventListener(GROUP_DRAG_END_EVENT, onGroupDragEnd as EventListener);
    };
  }, [app.id]);

  useEffect(() => {
    const handleResize = () => {
      const next = clampPointToDesktop(positionRef.current);
      const resolved = persistPosition({ [app.id]: next });
      setPosition(resolved[app.id]);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [app.id, persistPosition]);

  if (hidden) return null;

  return (
    <DesktopIconMenu
      onOpen={() => openWindow(buildAppWindow(app))}
      onDelete={() => setHidden(true)}
    >
      <button
        type="button"
        className={cn(
          "absolute flex w-24 flex-col items-center gap-2 rounded-md p-2 text-sm font-medium text-foreground/80 transition hover:bg-white/15 backdrop-blur-md",
          selected && "bg-white/20 ring-2 ring-primary/60"
        )}
        style={{ left: position.x, top: position.y }}
        data-desktop-icon-id={app.id}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.stopPropagation();
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragState.current = {
            dragging: true,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          };
          if (selected && selectedIds.length > 1) {
            const snapshot = getGroupDragSnapshot(selectedIds);
            if (Object.keys(snapshot.origins).length > 1) {
              emitGroupDragStart({
                leaderId: app.id,
                selectedIds,
                ...snapshot,
              });
            }
          }
          if (!selected && !event.shiftKey) {
            onSelect?.();
          }
        }}
        onPointerMove={(event) => {
          if (!dragState.current.dragging) return;
          event.stopPropagation();
          const deltaX = event.clientX - dragState.current.startX;
          const deltaY = event.clientY - dragState.current.startY;
          if (!dragState.current.moved && (Math.abs(deltaX) > 0 || Math.abs(deltaY) > 0)) {
            dragState.current.moved = true;
          }
          const group = groupDragState.current;
          if (group.active && group.leaderId === app.id) {
            emitGroupDragMove({
              leaderId: app.id,
              deltaX,
              deltaY,
            });
          } else {
            setPosition(
              clampPointToDesktop({
                x: dragState.current.originX + deltaX,
                y: dragState.current.originY + deltaY,
              })
            );
          }
        }}
        onPointerUp={(event) => {
          if (!dragState.current.dragging) return;
          event.stopPropagation();
          const deltaX = event.clientX - dragState.current.startX;
          const deltaY = event.clientY - dragState.current.startY;
          dragState.current.dragging = false;
          const group = groupDragState.current;
          if (group.active && group.leaderId === app.id) {
            const delta = clampGroupDelta(group.bounds, deltaX, deltaY);
            const released = applyGroupDelta(group.origins, delta);
            const snapped = persistPosition(released, selectedIds);
            emitGroupDragEnd({
              leaderId: app.id,
              deltaX,
              deltaY,
              positions: snapped,
            });
          } else {
            const released = clampPointToDesktop({
              x: dragState.current.originX + deltaX,
              y: dragState.current.originY + deltaY,
            });
            const snapped = persistPosition({ [app.id]: released }, selectedIds);
            setPosition(snapped[app.id]);
          }
          event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (dragState.current.moved) return;
          if (event.shiftKey) {
            onSelect?.({ additive: true, toggle: true });
            return;
          }
          onSelect?.();
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          clearSelection?.();
          openWindow(buildAppWindow(app));
        }}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-md bg-white/5 shadow-sm">
          <Icon className="h-8 w-8" />
        </div>
        <span className="text-center leading-tight">{app.title}</span>
      </button>
    </DesktopIconMenu>
  );
};

export default DesktopIcon;
