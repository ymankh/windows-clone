export type TestStatus = "implemented" | "planned";

export type TestDefinition = {
  id: string;
  feature: string;
  title: string;
  status: TestStatus;
  spec?: string;
  details: string;
};

export const testRegistry: TestDefinition[] = [
  {
    id: "window.drag",
    feature: "Window manager",
    title: "Drag windows by the title bar",
    status: "implemented",
    spec: "tests/playwright/specs/window.drag.spec.ts",
    details: "Opens Notes and verifies the window position changes after a drag gesture.",
  },
  {
    id: "window.minimize",
    feature: "Window manager",
    title: "Minimize windows to the taskbar",
    status: "planned",
    details: "Verify minimize hides the window and taskbar restore reopens it.",
  },
  {
    id: "window.maximize",
    feature: "Window manager",
    title: "Maximize and restore windows",
    status: "planned",
    details: "Verify maximize fills the desktop and restore returns the previous bounds.",
  },
  {
    id: "window.dock.left",
    feature: "Window manager",
    title: "Dock windows to the left edge",
    status: "planned",
    details: "Verify left-edge snap updates bounds and preserves restore behavior.",
  },
  {
    id: "window.dock.right",
    feature: "Window manager",
    title: "Dock windows to the right edge",
    status: "planned",
    details: "Verify right-edge snap updates bounds and preserves restore behavior.",
  },
  {
    id: "window.close",
    feature: "Window manager",
    title: "Close windows and remove taskbar entries",
    status: "planned",
    details: "Verify close removes the window and its taskbar button.",
  },
  {
    id: "desktop.icon.open",
    feature: "Desktop",
    title: "Open apps from desktop icons",
    status: "planned",
    details: "Verify double-clicking an icon opens the expected window.",
  },
  {
    id: "desktop.icon.drag.single",
    feature: "Desktop",
    title: "Drag a single desktop icon",
    status: "planned",
    details: "Verify icon coordinates update and clamp to the desktop bounds.",
  },
  {
    id: "desktop.icon.drag.group",
    feature: "Desktop",
    title: "Drag multiple selected desktop icons together",
    status: "planned",
    details: "Verify group drag keeps relative offsets for selected icons.",
  },
  {
    id: "desktop.icon.selection.marquee",
    feature: "Desktop",
    title: "Select icons with marquee selection",
    status: "planned",
    details: "Verify marquee selection updates icon selection state.",
  },
  {
    id: "desktop.context.personalization",
    feature: "Desktop",
    title: "Open Personalization from the desktop context menu",
    status: "planned",
    details: "Verify right-clicking the desktop opens the context menu and launches Personalization.",
  },
  {
    id: "taskbar.window.toggle",
    feature: "Taskbar",
    title: "Focus and restore windows from the taskbar",
    status: "planned",
    details: "Verify taskbar buttons restore minimized windows and focus active ones.",
  },
  {
    id: "notes.editor.clear",
    feature: "Notes",
    title: "Create a new note from the File menu",
    status: "planned",
    details: "Verify the New Note command clears the current editor content.",
  },
  {
    id: "notes.file.open",
    feature: "Notes",
    title: "Open markdown or json notes",
    status: "planned",
    details: "Verify importing a supported note file updates the editor content.",
  },
  {
    id: "notes.file.save-markdown",
    feature: "Notes",
    title: "Save notes as markdown",
    status: "planned",
    details: "Verify Save as Markdown triggers the expected download.",
  },
  {
    id: "notes.format.shortcuts",
    feature: "Notes",
    title: "Apply formatting commands from the menubar",
    status: "planned",
    details: "Verify bold, italic, and underline actions affect the editor selection.",
  },
  {
    id: "files.folder.navigate",
    feature: "Files",
    title: "Navigate folders in Explorer",
    status: "planned",
    details: "Verify sidebar or grid navigation updates the current folder path and contents.",
  },
  {
    id: "files.open.notes",
    feature: "Files",
    title: "Open note files in Notes",
    status: "planned",
    details: "Verify Explorer opens notes files in the Notes app with file data.",
  },
  {
    id: "files.open.pdf",
    feature: "Files",
    title: "Open PDF files in the PDF viewer",
    status: "planned",
    details: "Verify Explorer opens PDF files in the PDF viewer with file data.",
  },
  {
    id: "files.open.image",
    feature: "Files",
    title: "Open image files in Photos",
    status: "planned",
    details: "Verify Explorer opens image files in Photos with file data.",
  },
  {
    id: "files.open.fallback",
    feature: "Files",
    title: "Show fallback behavior for unsupported file types",
    status: "planned",
    details: "Verify unsupported file types do not break the UI and surface the intended fallback.",
  },
  {
    id: "pdf.open",
    feature: "PDF viewer",
    title: "Open and render the sample PDF",
    status: "planned",
    details: "Verify the PDF viewer renders at least one page.",
  },
  {
    id: "pdf.zoom",
    feature: "PDF viewer",
    title: "Zoom the PDF with menu commands",
    status: "planned",
    details: "Verify zoom in, zoom out, and reset update the rendered scale.",
  },
  {
    id: "photos.empty-state",
    feature: "Photos",
    title: "Show the empty state when no image is selected",
    status: "planned",
    details: "Verify the Photos app shows the empty-state text with no file context.",
  },
  {
    id: "photos.file-open",
    feature: "Photos",
    title: "Render an image file in Photos",
    status: "planned",
    details: "Verify Photos renders an image when opened from Explorer.",
  },
  {
    id: "terminal.help",
    feature: "Terminal",
    title: "Show available commands",
    status: "planned",
    details: "Verify the help command lists the supported terminal commands.",
  },
  {
    id: "terminal.echo",
    feature: "Terminal",
    title: "Echo custom input",
    status: "planned",
    details: "Verify the echo command returns the provided text.",
  },
  {
    id: "personalization.theme.change",
    feature: "Personalization",
    title: "Change the active desktop theme",
    status: "planned",
    details: "Verify selecting a theme updates the desktop appearance and persisted state.",
  },
  {
    id: "personalization.background.change",
    feature: "Personalization",
    title: "Change the desktop background",
    status: "planned",
    details: "Verify selecting a background updates the desktop wallpaper.",
  },
  {
    id: "personalization.background.custom",
    feature: "Personalization",
    title: "Add a custom background entry",
    status: "planned",
    details: "Verify custom background inputs add and select a new wallpaper option.",
  },
];

export const getImplementedTests = () =>
  testRegistry.filter((testCase) => testCase.status === "implemented");

export const getTestById = (id: string) =>
  testRegistry.find((testCase) => testCase.id === id);
