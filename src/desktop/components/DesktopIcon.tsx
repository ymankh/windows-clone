import type { ComponentType, SVGProps } from "react";
import { useEffect, useRef, useState } from "react";
import type { DesktopApp } from "../../apps";
import useWindowsManagerStore from "../stores/WindowsStore";
import DesktopIconMenu from "./DesktopIconMenu";

type DesktopIconProps = {
  app: DesktopApp;
};

const DesktopIcon = ({ app }: DesktopIconProps) => {
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const Icon: ComponentType<SVGProps<SVGSVGElement>> = app.icon;
  const [hidden, setHidden] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: Math.random() * 200,
    y: Math.random() * 200,
  }));
  const dragState = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      if (!dragState.current.dragging) return;
      event.preventDefault();
      const deltaX = event.clientX - dragState.current.startX;
      const deltaY = event.clientY - dragState.current.startY;
      setPosition({
        x: Math.max(0, dragState.current.originX + deltaX),
        y: Math.max(0, dragState.current.originY + deltaY),
      });
    };
    const handleUp = () => {
      dragState.current.dragging = false;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };

    if (dragState.current.dragging) {
      window.addEventListener("pointermove", handleMove);
      window.addEventListener("pointerup", handleUp, { once: true });
    }

    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [position]);

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
        className="absolute flex w-24 flex-col items-center gap-2 rounded-md p-2 text-sm font-medium text-foreground/80 transition hover:bg-white/10"
        style={{ left: position.x, top: position.y }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragState.current = {
            dragging: true,
            startX: event.clientX,
            startY: event.clientY,
            originX: position.x,
            originY: position.y,
          };
        }}
        onClick={() =>
          openWindow({
            id: app.id,
            title: app.title,
            icon: app.icon,
            component: <app.Component />,
            menubar: app.menubar,
          })
        }
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
