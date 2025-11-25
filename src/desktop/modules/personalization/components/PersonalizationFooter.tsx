import { Button } from "@/components/ui/button";
import useThemeStore from "../store/ThemeStore";
import usePersonalizationStore from "../store/PersonalizationStore";
import { themes } from "../../../themes";

const PersonalizationFooter = () => {
  const { themeId, setTheme } = useThemeStore();
  const { pendingThemeId, setPendingThemeId } = usePersonalizationStore();
  const selectedId = pendingThemeId && pendingThemeId !== "" ? pendingThemeId : themeId;
  const selectedThemeName =
    themes.find((theme) => theme.id === selectedId)?.name ?? "Pick a theme";

  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 pb-1">
      <div className="text-xs text-muted-foreground">
        {pendingThemeId ? `Previewing: ${selectedThemeName}` : "Pick a theme"}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => setPendingThemeId(themeId)}>
          Reset selection
        </Button>
        <Button size="sm" onClick={() => setTheme(selectedId)}>
          Apply theme
        </Button>
      </div>
    </footer>
  );
};

export default PersonalizationFooter;
