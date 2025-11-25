import { useEffect, useMemo } from "react";
import { themes } from "../../../themes";
import { backgrounds } from "../../../backgrounds";
import useThemeStore from "../store/ThemeStore";
import ThemeSection from "./ThemeSection";
import BackgroundSection from "./BackgroundSection";
import PersonalizationHeader from "./PersonalizationHeader";
import usePersonalizationStore from "../../../stores/PersonalizationStore";
import PersonalizationFooter from "./PersonalizationFooter";

const PersonalizationWindow = () => {
  const { themeId } = useThemeStore();
  const { backgroundUrl, setBackground } = useThemeStore();
  const {
    pendingThemeId,
    setPendingThemeId,
    customBackgrounds,
    bgName,
    bgUrl,
    setBgName,
    setBgUrl,
    addCustomBackground,
  } = usePersonalizationStore();

  const handleAddBackground = () => {
    const entry = addCustomBackground();
    if (entry) setBackground(entry.url);
  };

  const allBackgrounds = useMemo(
    () => [
      ...backgrounds.map((bg) => ({ id: bg.id, name: bg.name, description: bg.description, url: bg.image })),
      ...customBackgrounds.map((bg) => ({ ...bg, description: "Custom image" })),
    ],
    [customBackgrounds]
  );

  useEffect(() => {
    setPendingThemeId(themeId);
  }, [themeId, setPendingThemeId]);

  return (
    <div className="flex h-full flex-col bg-[radial-gradient(circle_at_10%_10%,rgba(255,255,255,0.08),transparent_30%),radial-gradient(circle_at_80%_0%,rgba(0,0,0,0.08),transparent_28%)] p-6">
      <PersonalizationHeader />

      <div className="flex flex-1 min-h-0 flex-col gap-6 overflow-auto pr-1">
        <ThemeSection
          themes={themes}
          activeThemeId={pendingThemeId}
          onSelect={setPendingThemeId}
        />

        <BackgroundSection
          backgrounds={allBackgrounds}
          activeUrl={backgroundUrl}
          onSelect={setBackground}
          name={bgName}
          url={bgUrl}
          onNameChange={setBgName}
          onUrlChange={setBgUrl}
          onAdd={handleAddBackground}
        />

        <PersonalizationFooter />
      </div>
    </div>
  );
};

export default PersonalizationWindow;
