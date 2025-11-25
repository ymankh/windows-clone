import type { SVGProps } from "react";
import clsx from "clsx";
import useWindowsManagerStore from "../stores/WindowsStore";

const Taskbar = () => {
  const windows = useWindowsManagerStore((state) => state.windows);
  const toggleWindow = useWindowsManagerStore((state) => state.toggleWindow);
  const focusWindow = useWindowsManagerStore((state) => state.focusWindow);

  const activeWindowId =
    windows
      .filter((win) => !win.isMinimized)
      .reduce<string | null>((topId, win) => {
        if (!topId) return win.id;
        const currentTop = windows.find((w) => w.id === topId);
        if (!currentTop) return win.id;
        return win.zIndex > currentTop.zIndex ? win.id : topId;
      }, null) ?? null;

  const handleClick = (id: string, isMinimized: boolean) => {
    if (isMinimized) {
      toggleWindow(id);
      focusWindow(id);
      return;
    }
    focusWindow(id);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-999 bg-background/80 backdrop-blur border-t border-border">
      <div className="mx-auto flex h-14 items-center gap-2 px-4">
        {windows.length === 0 ? (
          null
        ) : (
          windows.map((win) => {
            const Icon = win.icon as (props: SVGProps<SVGSVGElement>) => React.ReactElement;

            return (
              <button
                key={win.id}
                type="button"
                onClick={() => handleClick(win.id, win.isMinimized)}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition",
                  "hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
                  win.id === activeWindowId && !win.isMinimized
                    ? "bg-accent text-accent-foreground"
                    : "bg-transparent text-foreground/80"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="max-w-40 truncate">{win.title}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Taskbar;
