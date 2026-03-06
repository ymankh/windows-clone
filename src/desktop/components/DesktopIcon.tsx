import type { ComponentType, SVGProps } from "react";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { DesktopApp } from "../../apps";
import useWindowsManagerStore from "../stores/WindowsStore";
import DesktopIconMenu from "./DesktopIconMenu";
import { cn } from "@/lib/utils";
import {
  clampPointToDesktop,
  getInitialIconPosition,
  getSortedIconPosition,
  persistIconPosition,
} from "../helpers/iconPositioning";
import {
  emitGroupDragEnd,
  emitGroupDragMove,
  emitGroupDragStart,
  getGroupDragDetail,
  GROUP_DRAG_END_EVENT,
  GROUP_DRAG_MOVE_EVENT,
  GROUP_DRAG_START_EVENT,
  type GroupDragMoveDetail,
  type GroupDragStartDetail,
} from "../helpers/groupDragEvents";

type DesktopIconProps = {
  app: DesktopApp;
  sortVersion?: number;
  selected?: boolean;
  selectedIds?: string[];
  onSelect?: (options?: { additive?: boolean; toggle?: boolean }) => void;
  clearSelection?: () => void;
};

const DesktopIcon = ({
  app,
  sortVersion = 0,
  selected = false,
  selectedIds = [],
  onSelect,
  clearSelection,
}: DesktopIconProps) => {
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const Icon: ComponentType<SVGProps<SVGSVGElement>> = app.icon;
  const [hidden, setHidden] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() =>
    getInitialIconPosition(app.id)
  );
  const dragState = useRef({
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });
  const groupDragState = useRef({
    active: false,
    leaderId: "",
    originX: 0,
    originY: 0,
  });
  const positionRef = useRef(position);
  const selectedIdsRef = useRef(selectedIds);

  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  const persistPosition = (next: { x: number; y: number }, excludedIds: string[] = []) =>
    persistIconPosition(app.id, next, excludedIds);

  const applySortedPosition = useEffectEvent(() => {
    if (!sortVersion) return;
    const resolved = getSortedIconPosition(app.id);
    setPosition(resolved);
    persistPosition(resolved, selectedIdsRef.current);
  });

  useEffect(() => {
    applySortedPosition();
  }, [sortVersion]);

  useEffect(() => {
    const onGroupDragStart = (event: Event) => {
      const detail = getGroupDragDetail<GroupDragStartDetail>(event);
      if (!detail.selectedIds.includes(app.id) || detail.leaderId === app.id) return;
      groupDragState.current = {
        active: true,
        leaderId: detail.leaderId,
        originX: positionRef.current.x,
        originY: positionRef.current.y,
      };
    };

    const onGroupDragMove = (event: Event) => {
      const detail = getGroupDragDetail<GroupDragMoveDetail>(event);
      if (
        !groupDragState.current.active ||
        groupDragState.current.leaderId !== detail.leaderId
      ) {
        return;
      }
      setPosition({
        x: Math.max(0, groupDragState.current.originX + detail.deltaX),
        y: Math.max(0, groupDragState.current.originY + detail.deltaY),
      });
    };

    const onGroupDragEnd = (event: Event) => {
      const detail = getGroupDragDetail<GroupDragMoveDetail>(event);
      if (
        !groupDragState.current.active ||
        groupDragState.current.leaderId !== detail.leaderId
      ) {
        return;
      }
      const released = {
        x: Math.max(0, groupDragState.current.originX + detail.deltaX),
        y: Math.max(0, groupDragState.current.originY + detail.deltaY),
      };
      const snapped = persistPosition(released, selectedIdsRef.current);
      setPosition(snapped);
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

  if (hidden) return null;

  return (
    <DesktopIconMenu
      onOpen={() =>
        openWindow({
          id: app.id,
          title: app.title,
          icon: app.icon,
          component: <app.Component />,
          menubar: app.menubar,
        })
      }
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
            emitGroupDragStart({
              leaderId: app.id,
              selectedIds,
            });
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
          const next = {
            x: dragState.current.originX + deltaX,
            y: dragState.current.originY + deltaY,
          };
          setPosition(clampPointToDesktop(next));
          if (selected && selectedIds.length > 1) {
            emitGroupDragMove({
              leaderId: app.id,
              deltaX,
              deltaY,
            });
          }
        }}
        onPointerUp={(event) => {
          if (!dragState.current.dragging) return;
          event.stopPropagation();
          const deltaX = event.clientX - dragState.current.startX;
          const deltaY = event.clientY - dragState.current.startY;
          const released = {
            x: Math.max(0, dragState.current.originX + deltaX),
            y: Math.max(0, dragState.current.originY + deltaY),
          };
          dragState.current.dragging = false;
          const snapped = persistPosition(released, selectedIds);
          setPosition(snapped);
          if (selected && selectedIds.length > 1) {
            emitGroupDragEnd({
              leaderId: app.id,
              deltaX,
              deltaY,
            });
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
          openWindow({
            id: app.id,
            title: app.title,
            icon: app.icon,
            component: <app.Component />,
            menubar: app.menubar,
          });
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
