import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
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


const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return HOME_URL;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const BrowserComponent = ({ windowId = "browser" }: AppWindowComponentProps) => {
  const [history, setHistory] = useState<string[]>([HOME_URL]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [address, setAddress] = useState<string>(HOME_URL);
  const [iframeKey, setIframeKey] = useState(0);

  const currentUrl = history[historyIndex] ?? HOME_URL;

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (
        event as CustomEvent<BrowserCommandDetail>
      ).detail;
      if (!detail) return;
      if (detail.windowId && detail.windowId !== windowId) return;

      if (detail.type === BrowserCommandTypes.back) {
          setHistoryIndex((value) => {
            const nextIndex = Math.max(0, value - 1);
            setAddress(history[nextIndex] ?? HOME_URL);
            return nextIndex;
          });
        }

      if (detail.type === BrowserCommandTypes.forward) {
          setHistoryIndex((value) => {
            const nextIndex = Math.min(history.length - 1, value + 1);
            setAddress(history[nextIndex] ?? HOME_URL);
            return nextIndex;
          });
        }

        if (detail.type === BrowserCommandTypes.reload) {
          setIframeKey((value) => value + 1);
        }

      if (detail.type === BrowserCommandTypes.home) {
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
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!canGoBack}
            aria-label="Back"
            onClick={() => {
              const nextIndex = Math.max(0, historyIndex - 1);
              setHistoryIndex(nextIndex);
              setAddress(history[nextIndex] ?? HOME_URL);
            }}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            disabled={!canGoForward}
            aria-label="Forward"
            onClick={() => {
              const nextIndex = Math.min(history.length - 1, historyIndex + 1);
              setHistoryIndex(nextIndex);
              setAddress(history[nextIndex] ?? HOME_URL);
            }}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Reload"
            onClick={() => setIframeKey((value) => value + 1)}
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Home"
            onClick={() => navigateTo(HOME_URL)}
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
              />
            </div>
            <Button type="submit">
              Go
            </Button>
          </form>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {quickLinks.map((link) => (
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
