import { useMemo, useState } from "react";
import { Check, Moon, Palette, Sun, SwatchBook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { themes } from "../themes";
import useThemeStore from "../stores/ThemeStore";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";

const PersonalizationWindow = () => {
  const { themeId, mode, setTheme, setMode } = useThemeStore();
  const [pendingThemeId, setPendingThemeId] = useState(themeId);

  const selectedTheme = useMemo(
    () => themes.find((theme) => theme.id === pendingThemeId),
    [pendingThemeId]
  );

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(0,0,0,0.08),transparent_28%)] p-6">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Palette className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Personalization</p>
            <p className="text-xs text-muted-foreground">Pick a theme and toggle light or dark</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-3 py-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Sun className="size-4" />
          </div>
          <Switch
            checked={mode === "dark"}
            onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
            aria-label="Toggle dark mode"
          />
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            <Moon className="size-4" />
          </div>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-3 overflow-auto pr-1 md:grid-cols-2 xl:grid-cols-3">
        {themes.map((theme) => {
          const active = pendingThemeId === theme.id;
          return (
            <button
              type="button"
              key={theme.id}
              onClick={() => setPendingThemeId(theme.id)}
              className={cn(
                "group relative flex h-full flex-col gap-3 rounded-xl border p-3 text-left transition",
                active
                  ? "border-primary/80 bg-primary/5 shadow-sm"
                  : "border-border/70 bg-card/70 hover:border-primary/40 hover:bg-primary/5"
              )}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5 rounded-lg bg-secondary/30 p-2 text-secondary-foreground">
                  <SwatchBook className="size-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{theme.name}</p>
                  <p className="text-xs text-muted-foreground">{theme.description}</p>
                </div>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full border text-xs",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground"
                  )}
                  aria-hidden
                >
                  {active ? <Check className="size-3.5" /> : ""}
                </span>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 p-2">
                <div
                  className="h-10 w-14 rounded-md border"
                  style={{
                    background: theme.swatch.background,
                    borderColor: "rgba(0,0,0,0.08)",
                  }}
                />
                <div className="flex gap-1">
                  <div
                    className="h-10 w-3 rounded-full"
                    style={{ background: theme.swatch.foreground }}
                  />
                  <div
                    className="h-10 w-3 rounded-full"
                    style={{ background: theme.swatch.primary }}
                  />
                  <div
                    className="h-10 w-3 rounded-full"
                    style={{ background: theme.swatch.accent ?? theme.swatch.primary }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {selectedTheme ? `Previewing: ${selectedTheme.name}` : "Pick a theme"}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setPendingThemeId(themeId)}>
            Reset selection
          </Button>
          <Button size="sm" onClick={() => setTheme(pendingThemeId)}>
            Apply theme
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default PersonalizationWindow;
