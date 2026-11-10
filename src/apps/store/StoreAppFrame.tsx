import { useEffect, useEffectEvent, useRef, useState } from "react";
import useWindowsManagerStore from "@/desktop/stores/WindowsStore";
import useThemeStore from "@/desktop/modules/personalization/store/ThemeStore";
import type { AppWindowComponentProps } from "../types";
import useInstalledAppsStore from "./installedAppsStore";
import { toPortableFile } from "./portableFile";
import {
  appToHostMessageSchema,
  HOST_MESSAGE_SOURCE,
  toStoreAppId,
  type AppToHostMessage,
  type HostInitPayload,
} from "./protocol";
import { loadStoreAppState, saveStoreAppState } from "./storeAppState";

type StoreAppFrameProps = AppWindowComponentProps & {
  appId: string;
};

const DOWNLOAD_COOLDOWN_MS = 1_000;
const MIME_TYPE_PATTERN = /^[\w.+-]+\/[\w.+-]+$/;

/**
 * Locks the app down with a Content-Security-Policy placed before any of its
 * markup: no network access, no external scripts, and images only from data
 * URLs or the desktop itself. Combined with the iframe sandbox (scripts only,
 * opaque origin) an installed app cannot reach the desktop's storage or phone
 * home, regardless of what the store served.
 */
const withSandboxPolicy = (html: string) => {
  const policy = [
    "default-src 'none'",
    "script-src 'unsafe-inline'",
    "style-src 'unsafe-inline'",
    `img-src data: blob: ${window.location.origin}`,
    `media-src data: blob: ${window.location.origin}`,
    "font-src data:",
  ].join("; ");
  const body = html.replace(/^\s*<!doctype[^>]*>/i, "");
  return `<!doctype html><meta http-equiv="Content-Security-Policy" content="${policy}">${body}`;
};

const safeFileName = (name: string) =>
  Array.from(name, (char) => (char.charCodeAt(0) < 32 || '\\/:*?"<>|'.includes(char) ? "_" : char))
    .join("")
    .slice(0, 120) || "download.txt";

const StoreAppFrame = ({ appId, windowId = appId, fileContext }: StoreAppFrameProps) => {
  const installed = useInstalledAppsStore((state) =>
    state.apps.find((app) => toStoreAppId(app.manifest.id) === appId)
  );
  const mode = useThemeStore((state) => state.mode);
  const setWindowTitle = useWindowsManagerStore((state) => state.setWindowTitle);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastDownloadRef = useRef(0);
  const [notice, setNotice] = useState<string | null>(null);

  const post = (message: Record<string, unknown>) => {
    // The sandboxed frame has an opaque ("null") origin, so "*" is the only
    // usable target. The message only ever goes to this app's own frame.
    iframeRef.current?.contentWindow?.postMessage(
      { source: HOST_MESSAGE_SOURCE, ...message },
      "*"
    );
  };

  // The SDK ignores repeated init messages, so it is safe to send on both
  // "ready" and "load"; whichever arrives first wins.
  const sendInit = () => {
    const payload: HostInitPayload = {
      windowId,
      file: toPortableFile(fileContext),
      state: loadStoreAppState(appId, windowId),
      theme: mode,
    };
    post({ type: "init", payload });
  };

  const handleMessage = useEffectEvent((message: AppToHostMessage) => {
    switch (message.type) {
      case "ready":
        sendInit();
        break;
      case "setTitle":
        if (message.title.trim()) setWindowTitle(windowId, message.title.trim());
        break;
      case "saveState":
        setNotice(
          saveStoreAppState(appId, windowId, message.state)
            ? null
            : "This app's data could not be saved in browser storage."
        );
        break;
      case "download": {
        // Apps can't prove a user gesture across the frame boundary, so rate
        // limit downloads to stop a misbehaving app from flooding the user.
        const now = Date.now();
        if (now - lastDownloadRef.current < DOWNLOAD_COOLDOWN_MS) return;
        lastDownloadRef.current = now;
        const type =
          message.mimeType && MIME_TYPE_PATTERN.test(message.mimeType)
            ? message.mimeType
            : "text/plain";
        const url = URL.createObjectURL(new Blob([message.content], { type }));
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = safeFileName(message.name);
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        break;
      }
    }
  });

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      // Only accept messages from this window's own frame.
      if (!iframeRef.current || event.source !== iframeRef.current.contentWindow) return;
      const parsed = appToHostMessageSchema.safeParse(event.data);
      if (parsed.success) handleMessage(parsed.data);
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { source: HOST_MESSAGE_SOURCE, type: "theme", theme: mode },
      "*"
    );
  }, [mode]);

  if (!installed) {
    return (
      <div role="alert" className="flex h-full items-center justify-center p-6 text-sm text-muted-foreground">
        This app is no longer installed.
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col">
      <iframe
        ref={iframeRef}
        title={installed.manifest.name}
        srcDoc={withSandboxPolicy(installed.html)}
        sandbox="allow-scripts"
        referrerPolicy="no-referrer"
        className="min-h-0 w-full flex-1 border-0 bg-background"
        data-store-app={installed.manifest.id}
        onLoad={() => sendInit()}
      />
      {notice ? (
        <p role="alert" className="border-t border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {notice}
        </p>
      ) : null}
    </div>
  );
};

export default StoreAppFrame;
