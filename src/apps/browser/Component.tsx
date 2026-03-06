import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Globe,
  Home,
  RefreshCcw,
} from "lucide-react";
import type { AppWindowComponentProps } from "../types";

type QuickLink = {
  label: string;
  url: string;
};

const HOME_URL = "https://example.com";

const QUICK_LINKS: QuickLink[] = [
  { label: "Donoud", url: "https://donoud.pages.dev" },
  { label: "Portfolio", url: "https://yamanalkhashashneh.online" },
];

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return HOME_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const BrowserComponent = ({ windowId = "browser" }: AppWindowComponentProps) => {
  const [history, setHistory] = useState<string[]>([HOME_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [address, setAddress] = useState(HOME_URL);
  const [iframeKey, setIframeKey] = useState(0);

  const currentUrl = history[historyIndex] ?? HOME_URL;

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (
        event as CustomEvent<{
          type?: "back" | "forward" | "reload" | "home";
          windowId?: string;
        }>
      ).detail;
      if (!detail) return;
      if (detail.windowId && detail.windowId !== windowId) return;

      if (detail.type === "back") {
          setHistoryIndex((value) => {
            const nextIndex = Math.max(0, value - 1);
            setAddress(history[nextIndex] ?? HOME_URL);
            return nextIndex;
          });
        }

      if (detail.type === "forward") {
          setHistoryIndex((value) => {
            const nextIndex = Math.min(history.length - 1, value + 1);
            setAddress(history[nextIndex] ?? HOME_URL);
            return nextIndex;
          });
        }

        if (detail.type === "reload") {
          setIframeKey((value) => value + 1);
        }

      if (detail.type === "home") {
        const nextHistory = history.slice(0, historyIndex + 1);
        nextHistory.push(HOME_URL);
        setHistory(nextHistory);
        setHistoryIndex(nextHistory.length - 1);
        setAddress(HOME_URL);
      }
    };

    window.addEventListener("browser-command", handleCommand as EventListener);
    return () => {
      window.removeEventListener("browser-command", handleCommand as EventListener);
    };
  }, [history, historyIndex, windowId]);

  const navigateTo = (target: string) => {
    const nextUrl = normalizeUrl(target);
    const nextHistory = history.slice(0, historyIndex + 1);
    nextHistory.push(nextUrl);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
    setAddress(nextUrl);
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  const quickLinks = useMemo(() => QUICK_LINKS, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-background text-foreground">
      <div className="border-b border-border bg-card/90 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-border bg-background p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canGoBack}
            onClick={() => {
              const nextIndex = Math.max(0, historyIndex - 1);
              setHistoryIndex(nextIndex);
              setAddress(history[nextIndex] ?? HOME_URL);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-background p-2 hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
            disabled={!canGoForward}
            onClick={() => {
              const nextIndex = Math.min(history.length - 1, historyIndex + 1);
              setHistoryIndex(nextIndex);
              setAddress(history[nextIndex] ?? HOME_URL);
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-background p-2 hover:bg-muted"
            onClick={() => setIframeKey((value) => value + 1)}
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            className="rounded-md border border-border bg-background p-2 hover:bg-muted"
            onClick={() => navigateTo(HOME_URL)}
          >
            <Home className="h-4 w-4" />
          </button>

          <form
            className="flex min-w-0 flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              navigateTo(address);
            }}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-3">
              <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
                placeholder="Enter a URL"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-primary bg-primary px-4 py-2 text-sm text-primary-foreground hover:opacity-90"
            >
              Go
            </button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {quickLinks.map((link) => (
            <button
              key={link.url}
              type="button"
              className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
              onClick={() => navigateTo(link.url)}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative flex-1 bg-card">
        <iframe
          key={iframeKey}
          src={currentUrl}
          title="Browser preview"
          className="h-full w-full border-0 bg-white"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>
  );
};

export default BrowserComponent;
