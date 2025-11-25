import { Image } from "lucide-react";
import { Button } from "@/components/ui/button";

type BackgroundEntry = { id: string; name: string; description: string; url: string };

type BackgroundSectionProps = {
  backgrounds: BackgroundEntry[];
  activeUrl: string;
  onSelect: (url: string) => void;
  name: string;
  url: string;
  onNameChange: (value: string) => void;
  onUrlChange: (value: string) => void;
  onAdd: () => void;
};

const BackgroundSection = ({
  backgrounds,
  activeUrl,
  onSelect,
  name,
  url,
  onNameChange,
  onUrlChange,
  onAdd,
}: BackgroundSectionProps) => (
  <div className="space-y-3">
    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
      <Image className="size-4" />
      Desktop background
    </div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {backgrounds.map((bg) => {
        const active = activeUrl === bg.url;
        return (
          <button
            key={bg.id}
            type="button"
            onClick={() => onSelect(bg.url)}
            className={`
              relative flex flex-col gap-2 rounded-xl border p-3 text-left transition
              ${active ? "border-primary bg-primary/5 shadow-sm" : "border-border/70 bg-card/70 hover:border-primary/40 hover:bg-primary/5"}
            `}
          >
            <div
              className="h-20 w-full rounded-lg border bg-cover bg-center"
              style={{ backgroundImage: `url("${bg.url}")`, borderColor: "rgba(0,0,0,0.08)" }}
            />
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{bg.name}</p>
                <p className="text-xs text-muted-foreground">{bg.description}</p>
              </div>
              {active ? (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Active
                </span>
              ) : null}
            </div>
          </button>
        );
      })}
    </div>

    <div className="rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm">
      <p className="mb-3 text-sm font-semibold text-foreground">Add custom background</p>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <input
          className="flex-1 rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
        />
        <input
          className="flex-[2] rounded-md border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none ring-0 focus:border-primary focus:ring-2 focus:ring-primary/30"
          placeholder="Image URL (required)"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        <Button size="sm" onClick={onAdd}>
          Save
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Paste a direct image link (e.g. from Unsplash or your CDN). It will be stored locally.
      </p>
    </div>
  </div>
);

export default BackgroundSection;
