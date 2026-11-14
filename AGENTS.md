# Project rules

## User-facing messages must be plain language

The people using this desktop are not developers. Anything rendered in the UI
(error banners, alerts, notices, empty states, labels, tooltips) must be
understandable without technical knowledge.

**Never show in the UI:**

- URLs, hosts, ports or IP addresses of our own services (e.g. `http://127.0.0.1:4000`).
- Shell commands, script names or setup instructions (e.g. `npm run store:server`).
- HTTP status codes, error codes, stack traces or exception names.
- Raw `error.message` / `String(error)` from a caught error, a rejected promise
  or an error boundary. Its text is not under our control.
- Implementation terms: "server", "API", "localStorage", "browser storage",
  "JSON", "schema", "sandbox", "iframe", "manifest", "chunk", "null", "undefined".

**Do instead:**

1. Show a short, fixed sentence written for the user: what happened, and what
   they can do next if anything ("Please try again in a moment.").
2. Log the technical detail with `console.error`, prefixed with the app name,
   and pass the original error object:
   `console.error("[App Store] Failed to load the catalog:", error);`
3. If the UI needs different wording for different failures, give the error a
   machine-readable `kind` and map `kind` to copy in the UI layer. Do not branch
   on, or display, the error's message. See `StoreApiError` and `toUserMessage`
   in `src/apps/appstore/api.ts` for the pattern.
4. Developer hints (how to start a server, which env var to set) belong in the
   console message, the README or code comments.

**When adding or changing an error path:**

- A `catch` that sets UI state must set a fixed string, never the caught
  error's message.
- Add or update a test that asserts the friendly text, and for network failures
  also asserts the technical detail is absent (see `[store.offline]` in
  `tests/playwright/specs/store.spec.ts`).

The Terminal app is the one exception: its output is intentionally technical.
