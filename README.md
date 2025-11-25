# Windows-Style Desktop (React + Vite)

A web-based Windows-style desktop built with React and TypeScript. It renders a draggable, resizable window manager with desktop icons, context menus, and a taskbar. Included sample apps: Notes (rich text editor), Photos (placeholder), Files (placeholder list), Terminal (resume quick facts), and a PDF viewer.

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
