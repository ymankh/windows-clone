export const GROUP_DRAG_START_EVENT = "desktop-icon-group-drag-start";
export const GROUP_DRAG_MOVE_EVENT = "desktop-icon-group-drag-move";
export const GROUP_DRAG_END_EVENT = "desktop-icon-group-drag-end";

export type GroupDragStartDetail = {
  leaderId: string;
  selectedIds: string[];
};

export type GroupDragMoveDetail = {
  leaderId: string;
  deltaX: number;
  deltaY: number;
};

export const emitGroupDragStart = (detail: GroupDragStartDetail) => {
  window.dispatchEvent(new CustomEvent<GroupDragStartDetail>(GROUP_DRAG_START_EVENT, { detail }));
};

export const emitGroupDragMove = (detail: GroupDragMoveDetail) => {
  window.dispatchEvent(new CustomEvent<GroupDragMoveDetail>(GROUP_DRAG_MOVE_EVENT, { detail }));
};

export const emitGroupDragEnd = (detail: GroupDragMoveDetail) => {
  window.dispatchEvent(new CustomEvent<GroupDragMoveDetail>(GROUP_DRAG_END_EVENT, { detail }));
};

export const getGroupDragDetail = <T>(event: Event) => (event as CustomEvent<T>).detail;
