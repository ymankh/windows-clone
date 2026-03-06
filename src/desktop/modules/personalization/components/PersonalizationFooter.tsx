import useThemeStore from "../store/ThemeStore";
import { themes } from "../../../themes";

const PersonalizationFooter = () => {
  const { themeId } = useThemeStore();
  const selectedThemeName =
    themes.find((theme) => theme.id === themeId)?.name ?? "Pick a theme";

  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 pb-1">
      <div className="text-xs text-muted-foreground">
        Active theme: {selectedThemeName}
      </div>
    </footer>
  );
};

export default PersonalizationFooter;
