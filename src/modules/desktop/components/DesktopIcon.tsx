import type { ComponentType, SVGProps } from "react";
import type { DesktopApp } from "../../../apps";
import useWindowsManagerStore from "../stores/WindowsStore";

type DesktopIconProps = {
  app: DesktopApp;
};

const DesktopIcon = ({ app }: DesktopIconProps) => {
  const openWindow = useWindowsManagerStore((state) => state.openWindow);
  const Icon: ComponentType<SVGProps<SVGSVGElement>> = app.icon;

  return (
    <button
      type="button"
      className="flex w-24 flex-col items-center gap-2 rounded-md p-2 text-sm font-medium text-foreground/80 transition hover:bg-white/10"
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
  );
};

export default DesktopIcon;
