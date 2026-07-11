# Windowing Module

This folder contains the desktop window shell and the interaction logic that makes it behave like a lightweight window manager.

## File layout

- `Window.tsx`: thin composition component. It reads window state from the store, wires up close/minimize/focus actions, and renders the shell.
- `WindowHeader.tsx`: titlebar and window control buttons.
- `WindowResizeHandles.tsx`: invisible edge and corner hit targets used for resize interactions.
- `WindowDockPreview.tsx`: snap preview overlay shown while dragging near the left, right, or top edges.
- `windowing/constants.ts`: shared sizing and docking constants.
- `windowing/types.ts`: local interaction types for dock targets, resize edges, and basic bounds.
- `windowing/utils.ts`: pure helper functions for viewport bounds, docking thresholds, and split calculations.
- `windowing/useWindowInteractions.ts`: the stateful interaction hook for drag, dock, maximize, restore, and resize behavior.

## Interaction flow

1. `Window.tsx` loads the current `windowData` from the Zustand store and passes it into `useWindowInteractions`.
2. `useWindowInteractions` owns pointer-driven behavior:
   - freeform dragging
   - snap target detection
   - restoring a snapped/maximized window back to a movable size
   - normal edge/corner resizing
   - shared left/right dock split resizing
3. The hook updates `WindowsStore` so layout decisions are stored centrally and every window sees the same dock split state.
4. Presentational pieces render based on that state, keeping the JSX layer small and easier to scan.

## Why the split matters

Left and right snapped windows share a single `horizontalDockSplit` value in the store. When the user drags the divider between two snapped windows, the hook updates that split ratio and reapplies bounds to both windows. This keeps the layout synchronized and lets the pair respond correctly when the viewport size changes.

## Documentation strategy

The hook includes comments only around the non-obvious transitions:

- restoring a snapped window when drag starts
- keeping maximized and docked windows aligned during viewport resize

The rest of the code is documented by file boundaries and explicit helper names rather than line-by-line comments.
