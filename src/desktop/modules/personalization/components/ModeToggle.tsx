import { Moon, Sun } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import useThemeStore from "../store/ThemeStore";

const ModeToggle = () => {
  const { mode, setMode } = useThemeStore();

  return (
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
  );
};

export default ModeToggle;
