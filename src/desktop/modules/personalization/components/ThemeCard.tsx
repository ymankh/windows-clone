import { Check, SwatchBook } from "lucide-react";
import type { ThemeDefinition } from "../../../themes";
import { cn } from "@/lib/utils";

type ThemeCardProps = {
  theme: ThemeDefinition;
  active: boolean;
  onSelect: (id: string) => void;
};

const ThemeCard = ({ theme, active, onSelect }: ThemeCardProps) => (
  <button
    type="button"
    onClick={() => onSelect(theme.id)}
    className={cn(
      "group relative flex flex-col gap-3 rounded-xl border p-3 text-left transition",
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

export default ThemeCard;
