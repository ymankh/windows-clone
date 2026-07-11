import { Copy, Minus, Square, X } from "lucide-react";
import { WindowLayoutModes, type WindowLayoutMode } from "@/desktop/stores/WindowsStore";

type WindowHeaderProps = {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  title: string;
  titleId?: string;
  layoutMode: WindowLayoutMode;
  onDragPointerDown: React.PointerEventHandler<HTMLDivElement>;
  onDragPointerMove: React.PointerEventHandler<HTMLDivElement>;
  onDragPointerUp: React.PointerEventHandler<HTMLDivElement>;
  onDragPointerCancel: React.PointerEventHandler<HTMLDivElement>;
  onMinimize: React.MouseEventHandler<HTMLButtonElement>;
  onToggleMaximize: React.MouseEventHandler<HTMLButtonElement>;
  onClose: React.MouseEventHandler<HTMLButtonElement>;
};

const WindowHeader = ({
  icon: IconComponent,
  title,
  titleId,
  layoutMode,
  onDragPointerDown,
  onDragPointerMove,
  onDragPointerUp,
  onDragPointerCancel,
  onMinimize,
  onToggleMaximize,
  onClose,
}: WindowHeaderProps) => (
  <div
    className="flex cursor-move items-center justify-between bg-muted px-3 py-2 text-sm font-semibold select-none"
    onPointerDown={onDragPointerDown}
    onPointerMove={onDragPointerMove}
    onPointerUp={onDragPointerUp}
    onPointerCancel={onDragPointerCancel}
    onLostPointerCapture={onDragPointerCancel}
  >
    <span className="flex items-center gap-2 truncate">
      <span className="text-muted-foreground">
        <IconComponent className="h-4 w-4" />
      </span>
      <span id={titleId} className="truncate">{title}</span>
    </span>

    <div className="flex items-center gap-2" data-no-drag="true">
      <button
        type="button"
        data-no-drag="true"
        className="p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        onClick={onMinimize}
        aria-label="Minimize"
      >
        <Minus size={14} />
      </button>
      <button
        type="button"
        data-no-drag="true"
        className="p-1 text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
        onClick={onToggleMaximize}
        aria-label={layoutMode === WindowLayoutModes.maximized ? "Restore" : "Maximize"}
      >
        {layoutMode === WindowLayoutModes.maximized ? <Copy size={14} /> : <Square size={14} />}
      </button>
      <button
        type="button"
        data-no-drag="true"
        className="p-1 text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground"
        onClick={onClose}
        aria-label="Close"
      >
        <X size={14} />
      </button>
    </div>
  </div>
);

export default WindowHeader;
