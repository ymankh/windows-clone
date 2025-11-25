import { Palette } from "lucide-react";
import ModeToggle from "./ModeToggle";

const PersonalizationHeader = () => (
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
    <ModeToggle />
  </header>
);

export default PersonalizationHeader;
