# Windows-Style Desktop (React + Vite)

A web-based Windows-style desktop built with React and TypeScript. It renders a draggable, resizable window manager with desktop icons, context menus, and a taskbar. Included sample apps: Notes (rich text editor), Photos (placeholder), Files (placeholder list), Terminal (resume quick facts), and a PDF viewer.

## Live Demo
- [desktop.yamanalkhashashneh.online](https://desktop.yamanalkhashashneh.online/)

## Project Structure

- `src/App.tsx`: bootstraps the desktop with the registered apps.
- `src/apps`: each app lives in its own folder with a `Component.tsx` and an `index.tsx` that exports a `DesktopApp`.
- `src/desktop`: desktop shell (icons, context menu, taskbar, window chrome, window store).
- `src/components`: shared UI primitives (Radix UI wrappers) and the Lexical editor used by the Notes app.
- `public/pdfs`: static PDF assets (used by the PDF viewer).

## Running the project

```bash
npm install
npm run dev     # local dev server
npm run build   # production build
npm run preview # serve the build output
```

## End-to-End Testing

Playwright tests now live under `tests/playwright` and are written in TypeScript.

- `playwright.config.ts`: shared Playwright config, including the local Vite web server.
- `tests/playwright/run.ts`: typed test orchestrator. Use this instead of creating one npm script per test.
- `tests/playwright/registry.ts`: central registry of implemented and planned tests.
- `tests/playwright/helpers`: shared Playwright helpers for opening apps and interacting with windows.
- `tests/playwright/specs`: the actual test specs.

### Run tests

List every registered test:

```bash
npm run test:e2e -- --list
```

Run a single implemented test by name:

```bash
npm run test:e2e -- --test window.drag
```

The test id can also be passed positionally:

```bash
npm run test:e2e -- window.drag
```

Run all implemented Playwright tests:

```bash
npm run test:e2e -- --all
```

### Browser dependencies

Playwright needs its browser runtime dependencies installed on the host machine. On Linux/WSL, if Chromium fails to launch with an error such as `libnspr4.so: cannot open shared object file`, install the Playwright browser dependencies before running the suite.

Typical setup:

```bash
npx playwright install
npx playwright install-deps chromium
```

## Test Plan

Use `tests/playwright/registry.ts` as the source of truth for what should be verified after each feature is implemented. Current coverage plan:

| Test ID | Feature | Status | Purpose |
| --- | --- | --- | --- |
| `window.drag` | Window manager | Implemented | Drag windows by the title bar. |
| `window.minimize` | Window manager | Planned | Minimize windows to the taskbar. |
| `window.maximize` | Window manager | Planned | Maximize and restore windows. |
| `window.dock.left` | Window manager | Planned | Snap windows to the left edge. |
| `window.dock.right` | Window manager | Planned | Snap windows to the right edge. |
| `window.close` | Window manager | Planned | Close windows and remove taskbar entries. |
| `desktop.icon.open` | Desktop | Planned | Open apps from desktop icons. |
| `desktop.icon.drag.single` | Desktop | Planned | Drag a single desktop icon. |
| `desktop.icon.drag.group` | Desktop | Planned | Drag multiple selected desktop icons together. |
| `desktop.icon.selection.marquee` | Desktop | Planned | Select icons with a marquee. |
| `desktop.context.personalization` | Desktop | Planned | Open Personalization from the desktop context menu. |
| `taskbar.window.toggle` | Taskbar | Planned | Restore and focus windows from the taskbar. |
| `notes.editor.clear` | Notes | Planned | Clear the current note from the menubar. |
| `notes.file.open` | Notes | Planned | Open a note file into the editor. |
| `notes.file.save-markdown` | Notes | Planned | Save note content as markdown. |
| `notes.format.shortcuts` | Notes | Planned | Apply formatting commands from the menubar. |
| `files.folder.navigate` | Files | Planned | Navigate folders in Explorer. |
| `files.open.notes` | Files | Planned | Open a note file from Explorer. |
| `files.open.pdf` | Files | Planned | Open a PDF file from Explorer. |
| `files.open.image` | Files | Planned | Open an image file from Explorer. |
| `files.open.fallback` | Files | Planned | Verify fallback behavior for unsupported file types. |
| `pdf.open` | PDF viewer | Planned | Render the sample PDF. |
| `pdf.zoom` | PDF viewer | Planned | Zoom the PDF via menu commands. |
| `photos.empty-state` | Photos | Planned | Show the empty-state view with no image selected. |
| `photos.file-open` | Photos | Planned | Render an image opened from Explorer. |
| `terminal.help` | Terminal | Planned | Show the supported terminal commands. |
| `terminal.echo` | Terminal | Planned | Echo custom terminal input. |
| `personalization.theme.change` | Personalization | Planned | Change the active desktop theme. |
| `personalization.background.change` | Personalization | Planned | Change the desktop background. |
| `personalization.background.custom` | Personalization | Planned | Add and select a custom background. |

## Adding a new desktop app (step-by-step)

1) Create your app UI: add `src/apps/<your-app>/Component.tsx` with your React component.
2) Define the app metadata: add `src/apps/<your-app>/index.tsx` exporting a `DesktopApp` object (`id`, `title`, `icon`, `Component`, optional `menubar`). Example:
```tsx
// src/apps/calculator/index.tsx
import { Calculator } from "lucide-react";
import type { DesktopApp } from "../types";
import CalculatorComponent from "./Component";

export const CalculatorApp: DesktopApp = {
  id: "calculator",
  title: "Calculator",
  icon: Calculator,
  Component: CalculatorComponent,
  menubar: [
    { label: "Edit", items: [{ label: "Clear", shortcut: "Esc", onSelect: () => {/* ... */} }] },
  ],
};
```
3) Register the app so it appears on the desktop: add your export to `desktopApps` in `src/apps/index.ts`.
```ts
import { CalculatorApp } from "./calculator";
export const desktopApps = [CalculatorApp /*, ...others */];
```
4) Optional behaviors:
   - Menus: `WindowMenubar` reads `menubar` items; use `type: "separator"` or nested submenus.
   - Window actions: dispatch custom events (like the Notes/PDF apps) or keep all logic inside your component.
   - Assets: place static files in `public` (they’re served at the root).

Icons are positioned with `localStorage` (`desktop-icon-positions`); new apps get a default position, and the desktop context menu can reflow/sort them.

## Personalization & Themes

- Open the desktop context menu (right click) and choose **Personalization** to switch themes and toggle light/dark mode. A dedicated window opens with a list of themes and a light/dark switch.
- Theme state persists in `localStorage` (`desktop-theme`) and is applied to `document.documentElement` via `src/desktop/stores/ThemeStore.ts`.
- Themes are defined in `src/desktop/themes.ts` as plain objects: `id`, `name`, `description`, `swatch`, and optional `css` (raw CSS that sets your custom variables).

### Adding a new theme
1) Create a theme entry in `src/desktop/themes.ts`:
```ts
{
  id: "my-theme",
  name: "My Theme",
  description: "Short description",
  swatch: {
    background: "#f5f5f5",
    foreground: "#1a1a1a",
    primary: "#4f46e5",
    accent: "#22d3ee", // optional
  },
  css: `
:root {
  --background: #f5f5f5;
  --foreground: #1a1a1a;
  --primary: #4f46e5;
  --accent: #22d3ee;
  /* add the rest of your variables here */
}
.dark {
  --background: #0f172a;
  --foreground: #e2e8f0;
  --primary: #a855f7;
  --accent: #22d3ee;
  /* dark overrides */
}
  `,
}
```
2) Save; the theme automatically appears in the Personalization window. Selecting it injects the `css` into a `<style>` tag and toggles light/dark via the `ThemeStore`.

## Tech Stack

- React 19 + TypeScript
- Vite (rolldown build) with React Compiler
- Tailwind CSS v4 + class-variance-authority + tailwind-merge + clsx
- Radix UI primitives (context menu, menubar, navigation menu, tooltip)
- Zustand + Immer for window state management
- lucide-react icons
- Lexical + shadcn-editor for the Notes rich text editor
- react-pdf + pdfjs-dist for PDF rendering
- react-terminal for the terminal app
- Motion for animation primitives (available for future interactions)
- ESLint 9 (React/TypeScript configs)
