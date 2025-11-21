import type { ReactNode, SVGProps, ComponentType } from "react";
import { FileText, Folder, Image, Terminal } from "lucide-react";
import Window from "./components/windows/Window";
import Taskbar from "./components/Taskbar";
import type { WindowMenu } from "./stores/WindowsStore";
import useWindowsManagerStore from "./stores/WindowsStore";

type AppIcon = {
  id: string;
  title: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  component: ReactNode;
  menubar?: WindowMenu[];
};

const apps: AppIcon[] = [
  {
    id: "notes",
    title: "Notes",
    icon: FileText,
    component: (
      <div className="space-y-2 text-sm leading-relaxed">
        <p>Welcome to your desktop mock. This is a sample Notes window.</p>
        <p>Click the top bar buttons to minimize, restore, or close.</p>
      </div>
    ),
    menubar: [
      {
        label: "File",
        items: [
          { label: "New Note", shortcut: "Ctrl+N" },
          { label: "Open...", shortcut: "Ctrl+O" },
          { type: "separator" },
          { label: "Save", shortcut: "Ctrl+S" },
          { label: "Save As..." },
        ],
      },
      {
        label: "Edit",
        items: [
          { label: "Undo", shortcut: "Ctrl+Z" },
          { label: "Redo", shortcut: "Ctrl+Y" },
          { type: "separator" },
          { label: "Find", shortcut: "Ctrl+F" },
        ],
      },
      {
        label: "View",
        items: [
          {
            type: "submenu",
            label: "Zoom",
            items: [
              { label: "Zoom In", shortcut: "Ctrl++" },
              { label: "Zoom Out", shortcut: "Ctrl+-" },
              { label: "Reset Zoom", shortcut: "Ctrl+0" },
            ],
          },
          { label: "Toggle Sidebar" },
        ],
      },
    ],
  },
  {
    id: "photos",
    title: "Photos",
    icon: Image,
    component: (
      <div className="text-sm">
        <p>A placeholder Photos app preview.</p>
      </div>
    ),
  },
  {
    id: "files",
    title: "Files",
    icon: Folder,
    component: (
      <div className="text-sm">
        <ul className="list-disc space-y-1 pl-4">
          <li>Documents</li>
          <li>Downloads</li>
          <li>Pictures</li>
        </ul>
      </div>
    ),
  },
  {
    id: "terminal",
    title: "Terminal",
    icon: Terminal,
    component: (
      <div className="font-mono text-sm">
        <p>user@pc:~$ echo &quot;Hello World&quot;</p>
        <p>Hello World</p>
      </div>
    ),
  },
];

const Desktop = () => {
  const windows = useWindowsManagerStore((state) => state.windows);
  const openWindow = useWindowsManagerStore((state) => state.openWindow);

  return (
    <div className="relative min-h-screen w-full bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.08),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,0.06),transparent_20%),radial-gradient(circle_at_50%_80%,rgba(0,0,0,0.05),transparent_25%)] bg-background text-foreground">
      <div className="flex flex-wrap gap-6 p-6">
        {apps.map((app) => (
          <button
            key={app.id}
            type="button"
            className="flex w-24 flex-col items-center gap-2 rounded-md p-2 text-sm font-medium text-foreground/80 transition hover:bg-white/10"
            onClick={() =>
              openWindow({
                id: app.id,
                title: app.title,
                icon: app.icon,
                component: app.component,
                menubar: app.menubar,
              })
            }
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-md bg-white/5 shadow-sm">
              <app.icon className="h-8 w-8" />
            </div>
            <span className="text-center leading-tight">{app.title}</span>
          </button>
        ))}
      </div>

      {windows
        .filter((win) => !win.isMinimized)
        .map((win) => (
          <Window key={win.id} id={win.id} title={win.title} icon={win.icon}>
            {win.component}
          </Window>
        ))}

      <Taskbar />
    </div>
  );
};

export default Desktop;
