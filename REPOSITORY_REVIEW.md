# Repository Review

The project builds, lints, and all 9 implemented Playwright tests pass. This report prioritizes correctness risks, maintainability smells, accessibility gaps, and opportunities to simplify the code.

## Highest-priority issues

### 1. Critical — Notes “Save as Markdown” saves Lexical JSON, not Markdown

`src/apps/notes/Component.tsx:85` reads serialized editor state from local storage and downloads it as `text/markdown`. Users receive JSON inside a `.md` file.

**Suggested fix:** Export plain text or convert Lexical state to Markdown through a dedicated serializer.

### 2. Critical — Notes cannot actually open ordinary Markdown files

`src/apps/notes/Component.tsx:96` calls `JSON.parse()` for every imported `.md` file and silently ignores parsing failures.

**Suggested fix:** Distinguish `.json` from `.md`; parse JSON only for the internal format and convert Markdown or plain text to Lexical state.

### 3. Critical — Multiple Notes windows overwrite one another

Every instance uses the global `notes-app-content` key at `src/apps/notes/Component.tsx:14`. Opening a file also immediately replaces the shared saved note.

**Suggested fix:** Use a document model keyed by `windowId` or document ID, and keep persistence outside the editor component.

### 4. Important — Pointer and mouse handling is duplicated

Window resize installs both pointer and mouse listeners at `src/desktop/components/windows/windowing/useWindowInteractions.ts:445`, while `src/desktop/components/windows/Window.tsx:109` also forwards both event types. Compatibility mouse events can make one gesture execute twice and greatly complicate cleanup.

**Suggested fix:** Use Pointer Events exclusively, capture the pointer, and centralize the drag and resize lifecycle in one controller.

### 5. Important — Window interaction logic has become a “god hook”

`src/desktop/components/windows/windowing/useWindowInteractions.ts` is almost 600 lines and handles dragging, resizing, docking, animation, viewport changes, split resizing, and listener cleanup.

**Suggested fix:** Split it into `useWindowDrag`, `useWindowResize`, `useWindowDocking`, and a small coordinator. Put geometry calculations in pure functions that can be unit-tested.

### 6. Important — Window state contains rendered React nodes

`src/desktop/stores/WindowsStore.ts:41` stores `component: ReactNode`. This couples global state to rendering, makes state difficult to inspect or persist, and can retain stale component closures.

**Suggested fix:** Store `{ appId, instanceId, fileContext }` and render the app through a registry in `Window`.

### 7. Important — Stored data is cast rather than validated

Icon positions are trusted after `JSON.parse()` at `src/desktop/helpers/iconPositioning.ts:20`, and theme values are similarly accepted at `src/desktop/modules/personalization/store/ThemeStore.ts:42`. Valid JSON with an invalid shape can introduce `NaN`, unknown modes, or invalid theme IDs.

**Suggested fix:** Validate persisted state with the Zod dependency already used elsewhere, migrate old versions, and reset invalid entries.

### 8. Important — Icons are not clamped to the actual desktop

`src/desktop/helpers/iconPositioning.ts:10` only clamps coordinates to zero, while collision resolution can keep moving downward indefinitely. Icons may land beneath the taskbar or outside a resized viewport.

**Suggested fix:** Pass usable desktop bounds into a pure placement function, account for icon dimensions and taskbar height, and search the next column when a column is full.

### 9. Important — Initial icon placement is random and sorting is storage-dependent

New positions use `Math.random()` at `src/desktop/helpers/iconPositioning.ts:64`, while sorting uses object key insertion order at line 80. This produces inconsistent layouts and difficult tests.

**Suggested fix:** Derive placement from the ordered app registry and use a deterministic grid allocator.

### 10. Important — Core product behavior is largely untested

The 9 passing tests focus almost entirely on window geometry. The registry still marks Notes import/export, taskbar toggling, closing, file opening, icon interaction, PDF rendering, music, and personalization as planned in `tests/playwright/registry.ts:62`.

**Suggested priority:** Test the two Notes bugs first, then close/minimize/taskbar behavior, file-to-app routing, icon bounds, and persisted-state recovery. Add fast unit tests for geometry and serialization instead of covering everything through Playwright.

## Maintainability and design smells

### 11. Important — Files app combines data, navigation, dispatch, and UI orchestration

`src/apps/files/Component.tsx:21` embeds the entire virtual filesystem and application-opening policy in one component file.

**Suggested simplification:**

- Move sample filesystem data into `filesystemData.ts`.
- Create `useFileNavigation`.
- Create a file-association registry instead of scanning every app repeatedly.
- Use stable file IDs rather than `Date.now()` plus `Math.random()` for window IDs.

### 12. Important — Incorrect extensions are intentionally represented as Notes files

`Project-Proposal.docx` and `Budget.xlsx` are assigned the Notes file type at `src/apps/files/Component.tsx:87`. This makes the UI misleading.

**Suggested fix:** Introduce explicit unsupported types and show “no compatible app,” or rename them to `.txt` or `.md`.

### 13. Important — Accessibility support stops at basic buttons

Windows in `src/desktop/components/windows/Window.tsx:145` lack a window/dialog role and accessible title relationship. Resize handles and the split separator are pointer-only, so keyboard users cannot move or resize windows.

**Suggested fix:** Add window semantics, focus management, keyboard window controls, and a focusable separator supporting arrow keys and `aria-valuenow`.

### 14. Important — No reduced-motion behavior

Window animation is unconditional at `src/desktop/components/windows/Window.tsx:83`.

**Suggested fix:** Use Framer Motion’s reduced-motion support and make transitions instant when requested by the operating system.

### 15. Nice to improve — Confusing store action names

`closeWindow` only minimizes at `src/desktop/stores/WindowsStore.ts:160`, while `removeWindow` performs the real close.

**Suggested fix:** Rename them to `minimizeWindow`, `restoreWindow`, and `closeWindow`. This removes translation logic across components.

### 16. Nice to improve — Repeated store scans and avoidable state updates

The taskbar calculates the active window with filtering, reducing, and repeated `find()` calls at `src/desktop/components/Taskbar.tsx:10`. Restoring a minimized window also invokes two store mutations.

**Suggested fix:** Use a single-pass `getTopVisibleWindow`, and expose semantic store commands such as `activateWindow(id)`.

### 17. Nice to improve — Folder name typo has spread into imports

The directory `src/apps/files/componsnts` is misspelled and used throughout the Files component.

**Suggested fix:** Rename it to `components` before more imports depend on it.

### 18. Nice to improve — Font configuration is inconsistent

`src/index.css:1` downloads `VT323`, while the tokens specify `Oxanium` and `Source Code Pro`, which are not imported.

**Suggested fix:** Select one deliberate font stack, self-host it if performance matters, and remove the unused network import.

### 19. Nice to improve — Production bundle needs code splitting

The build emits approximately 1.3 MB of JavaScript before gzip and a 1 MB PDF worker. Every app is imported eagerly through `src/apps/index.ts:1`.

**Suggested fix:** Lazy-load app components and defer Lexical, PDF, terminal, and music code until their windows open. Avoid importing `desktopApps` back into the Files component; put app metadata in a lightweight registry.

## Recommended resolution order

1. Correct Notes import/export and isolate document persistence.
2. Consolidate pointer interactions and split the large window hook.
3. Validate all local-storage data and fix icon bounds.
4. Add tests for Notes, taskbar/close, Files routing, and persistence failures.
5. Decouple rendered components from the Zustand store.
6. Extract Files data/navigation and introduce a typed association registry.
7. Address accessibility and reduced motion.
8. Lazy-load heavyweight applications and clean up naming and fonts.

## Verification status

- `npm run lint`: passed.
- `npm run build`: passed, with a large-chunk warning.
- `npm run test:e2e -- --all`: 9 tests passed.
