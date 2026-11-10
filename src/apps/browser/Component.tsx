import { useEffect, useEffectEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Globe,
  Home,
  RefreshCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AppWindowComponentProps } from "../types";
import {
  BrowserCommandTypes,
  type BrowserCommandDetail,
} from "./constants";

type QuickLink = {
  label: string;
  url: string;
};

const QUICK_LINKS = [
  { label: "Donoud", url: "https://donoud.pages.dev" },
  { label: "Portfolio", url: "https://yamanalkhashashneh.online" },
] as const satisfies ReadonlyArray<QuickLink>;

const HOME_URL = QUICK_LINKS[0].url;

const BASE_SANDBOX = "allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-scripts";

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return HOME_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

// A framed page that shares this app's origin could remove its own sandbox if
// it were given both scripts and same-origin access, so only cross-origin
// pages get `allow-same-origin`.
const getSandbox = (url: string) => {
  try {
    if (new URL(url, window.location.href).origin === window.location.origin) {
      return BASE_SANDBOX;
    }
  } catch {
    return BASE_SANDBOX;
  }
  return `${BASE_SANDBOX} allow-same-origin`;
};

const BrowserComponent = ({ windowId = "browser" }: AppWindowComponentProps) => {
  const [history, setHistory] = useState<string[]>([HOME_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [address, setAddress] = useState<string>(HOME_URL);
  const [iframeKey, setIframeKey] = useState(0);

  const currentUrl = history[historyIndex] ?? HOME_URL;
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const goToIndex = (index: number) => {
    const nextIndex = Math.min(history.length - 1, Math.max(0, index));
    setHistoryIndex(nextIndex);
    setAddress(history[nextIndex] ?? HOME_URL);
  };

  const navigateTo = (target: string) => {
    const nextUrl = normalizeUrl(target);
    const nextHistory = [...history.slice(0, historyIndex + 1), nextUrl];
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setAddress(nextUrl);
  };

  const goBack = () => goToIndex(historyIndex - 1);
  const goForward = () => goToIndex(historyIndex + 1);
  const reload = () => setIframeKey((value) => value + 1);
  const goHome = () => navigateTo(HOME_URL);

  // Menubar commands share the toolbar's handlers instead of duplicating them.
  const handleCommand = useEffectEvent((detail: BrowserCommandDetail | undefined) => {
    if (!detail) return;
    if (detail.windowId && detail.windowId !== windowId) return;
    if (detail.type === BrowserCommandTypes.back) goBack();
    if (detail.type === BrowserCommandTypes.forward) goForward();
    if (detail.type === BrowserCommandTypes.reload) reload();
    if (detail.type === BrowserCommandTypes.home) goHome();
  });

  useEffect(() => {
    const listener = (event: Event) =>
      handleCommand((event as CustomEvent<BrowserCommandDetail>).detail);
    window.addEventListener("browser-command", listener);
    return () => window.removeEventListener("browser-command", listener);
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="border-b border-border bg-card/90 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!canGoBack}
            aria-label="Back"
            onClick={goBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!canGoForward}
            aria-label="Forward"
            onClick={goForward}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Reload"
            onClick={reload}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Home"
            onClick={goHome}
          >
            <Home className="h-4 w-4" />
          </Button>

          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              navigateTo(address);
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="h-10 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                placeholder="Enter a URL"
                aria-label="Address"
              />
            </div>
            <Button type="submit">
              Go
            </Button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {QUICK_LINKS.map((link) => (
            <Button
              key={link.url}
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => navigateTo(link.url)}
            >
              {link.label}
            </Button>
          ))}
          {/* Many sites refuse to load inside a frame, and a page cannot detect
              that from the outside, so always offer a way out. */}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Blank page? Open in a new tab
          </a>
        </div>
      </div>

      <div className="relative flex-1 bg-card">
        <iframe
          key={iframeKey}
          src={currentUrl}
          title="Browser preview"
          className="h-full w-full border-0 bg-white"
          sandbox={getSandbox(currentUrl)}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
};

export default BrowserComponent;
