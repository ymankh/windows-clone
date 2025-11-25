import type { ThemeDefinition } from "../../../themes";
import ThemeCard from "./ThemeCard";

type ThemeSectionProps = {
  themes: ThemeDefinition[];
  activeThemeId: string;
  onSelect: (id: string) => void;
};

const ThemeSection = ({ themes, activeThemeId, onSelect }: ThemeSectionProps) => (
  <div className="grid grid-cols-1 auto-rows-min gap-3 md:grid-cols-2 xl:grid-cols-3">
    {themes.map((theme) => (
      <ThemeCard
        key={theme.id}
        theme={theme}
        active={activeThemeId === theme.id}
        onSelect={onSelect}
      />
    ))}
  </div>
);

export default ThemeSection;
