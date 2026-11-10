import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import clsx from "clsx";
import { getAppById, useLauncherApps, type DesktopApp } from "@/apps";
import { buildAppWindow } from "@/apps/windowBuilder";
import useWindowsManagerStore from "../stores/WindowsStore";

const CLOCK_REFRESH_MS = 15_000;

const TaskbarClock = () => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), CLOCK_REFRESH_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <time
      dateTime={now.toISOString()}
      className="ml-auto shrink-0 text-right text-xs leading-tight text-foreground/80"
    >
      <span className="block">
        {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </span>
      <span className="block">{now.toLocaleDateString()}</span>
    </time>
  );
};

type StartMenuProps = {
  onLaunch: (app: DesktopApp) => void;
};

const StartMenu = ({ onLaunch }: StartMenuProps) => {
  const launcherApps = useLauncherApps();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && containerRef.current?.contains(event.target)) {
        return;
      }
      setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    return () => window.removeEventListener("pointerdown", handlePointerDown, true);
  }, [open]);

  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="shrink-0"
      onKeyDown={(event) => {
        if (!open) return;
        if (event.key === "Escape") {
          event.preventDefault();
          close(true);
          return;
        }
        if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
        const items = Array.from(
          containerRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
        );
        if (!items.length) return;
        event.preventDefault();
        const current = items.indexOf(document.activeElement as HTMLElement);
        const step = event.key === "ArrowDown" ? 1 : -1;
        items[(current + step + items.length) % items.length]?.focus();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label="Start"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={clsx(
          "flex h-10 w-10 items-center justify-center rounded-md transition",
          "hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          open ? "bg-accent text-accent-foreground" : "text-foreground/80"
        )}
      >
        <LayoutGrid className="h-5 w-5" />
      </button>
      {open ? (
        <ul
          role="menu"
          aria-label="Apps"
          className="absolute bottom-full left-2 mb-2 w-56 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          {launcherApps.map((app, index) => {
            const Icon = app.icon;
            return (
              <li key={app.id} role="none">
                <button
                  type="button"
                  role="menuitem"
                  autoFocus={index === 0}
                  className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none"
                  onClick={() => {
                    close(false);
                    onLaunch(app);
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {app.title}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
};

const Taskbar = () => {
  const windows = useWindowsManagerStore((state) => state.windows);
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const activateWindow = useWindowsManagerStore((state) => state.activateWindow);
  const minimizeWindow = useWindowsManagerStore((state) => state.minimizeWindow);

  const activeWindowId = windows.reduce<{ id: string; zIndex: number } | null>(
    (top, win) =>
      !win.isMinimized && (!top || win.zIndex > top.zIndex)
        ? { id: win.id, zIndex: win.zIndex }
        : top,
    null
  )?.id ?? null;

  const handleClick = (id: string, isMinimized: boolean) => {
    if (!isMinimized && id === activeWindowId) {
      minimizeWindow(id);
      return;
    }
    activateWindow(id);
  };

  return (
    <div
      role="toolbar"
      aria-label="Taskbar"
      className="fixed inset-x-0 bottom-0 z-999 bg-background/80 backdrop-blur border-t border-border"
    >
      <div className="mx-auto flex h-14 items-center gap-2 px-4">
        <StartMenu onLaunch={(app) => openWindow(buildAppWindow(app))} />
        <div className="flex min-w-0 items-center gap-2 overflow-x-auto">
          {windows.map((win) => {
            const app = getAppById(win.appId);
            if (!app) return null;
            const Icon = app.icon;
            const isActive = win.id === activeWindowId && !win.isMinimized;

            return (
              <button
                key={win.id}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleClick(win.id, win.isMinimized)}
                className={clsx(
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                  "hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "bg-transparent text-foreground/80"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-40 truncate">{win.title}</span>
              </button>
            );
          })}
        </div>
        <TaskbarClock />
      </div>
    </div>
  );
};

export default Taskbar;
