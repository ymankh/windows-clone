import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SplitProps = {
  children: [ReactNode, ReactNode];
  className?: string;
  initialLeft?: number;
  minLeft?: number;
  minRight?: number;
};

const Split = ({
  children,
  className,
  initialLeft = 240,
  minLeft = 160,
  minRight = 240,
}: SplitProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const [leftWidth, setLeftWidth] = useState(initialLeft);

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!dragging.current) return;
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const raw = event.clientX - rect.left;
      const clamped = Math.min(
        Math.max(raw, minLeft),
        rect.width - minRight
      );
      setLeftWidth(clamped);
    },
    [minLeft, minRight]
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  const startDragging: React.PointerEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    dragging.current = true;
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  };

  const [left, right] = children;

  return (
    <div
      ref={containerRef}
      className={cn("relative flex h-full w-full overflow-hidden", className)}
    >
      <div
        className="flex-shrink-0"
        style={{ width: leftWidth, minWidth: minLeft }}
      >
        {left}
      </div>
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize panel"
        className="flex w-1 cursor-col-resize select-none items-center justify-center bg-border/60 transition hover:bg-primary/50"
        onPointerDown={startDragging}
      >
        <span className="pointer-events-none h-8 w-0.5 rounded-full bg-border" />
      </div>
      <div className="min-w-0 flex-1">{right}</div>
    </div>
  );
};

export { Split };
