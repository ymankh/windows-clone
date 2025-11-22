import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Aperture,
  Camera,
  Check,
  Clock3,
  Heart,
  Image as ImageIcon,
  LayoutGrid,
  MapPin,
  Pause,
  Play,
  RotateCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Orientation = "landscape" | "portrait";
type SortOrder = "recent" | "vibe";

type Photo = {
  id: string;
  title: string;
  album: string;
  src: string;
  location: string;
  takenAt: string;
  tags: string[];
  orientation: Orientation;
  camera: string;
  lens: string;
  aperture: string;
  shutter: string;
  iso: number;
  rating: number;
  mood: string;
  accent: [string, string];
  favorite?: boolean;
};

type PhotosCommand =
  | { type: "reset" }
  | { type: "shuffle" }
  | { type: "play" }
  | { type: "pause" };

const photoLibrary: Photo[] = [
  {
    id: "wadi-rum",
    title: "Desert Lines",
    album: "Travel",
    src: "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1600&q=80",
    location: "Wadi Rum, Jordan",
    takenAt: "2024-03-02",
    tags: ["desert", "sunset", "travel", "warmth"],
    orientation: "landscape",
    camera: "Sony A7 IV",
    lens: "24-70mm",
    aperture: "f/2.8",
    shutter: "1/400s",
    iso: 100,
    rating: 4.8,
    mood: "Golden dusk across the dunes",
    accent: ["#f9d976", "#f39f86"],
    favorite: true,
  },
  {
    id: "city-lights",
    title: "Night Arteries",
    album: "City",
    src: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
    location: "Tokyo, Japan",
    takenAt: "2024-07-18",
    tags: ["city", "neon", "streets", "night"],
    orientation: "portrait",
    camera: "Fujifilm X100V",
    lens: "23mm",
    aperture: "f/2.0",
    shutter: "1/60s",
    iso: 640,
    rating: 4.7,
    mood: "Neon chaos and rain reflections",
    accent: ["#1a2a6c", "#b21f1f"],
    favorite: true,
  },
  {
    id: "fjord",
    title: "Northbound",
    album: "Nature",
    src: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1600&q=80",
    location: "Nærøyfjord, Norway",
    takenAt: "2023-10-11",
    tags: ["fjord", "mountains", "mist", "water"],
    orientation: "landscape",
    camera: "Canon R6",
    lens: "16-35mm",
    aperture: "f/5.6",
    shutter: "1/250s",
    iso: 200,
    rating: 4.9,
    mood: "Quiet water framed by sheer cliffs",
    accent: ["#274046", "#5982a1"],
  },
  {
    id: "forest",
    title: "Forest Ribbon",
    album: "Nature",
    src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1600&q=80",
    location: "British Columbia, Canada",
    takenAt: "2024-05-07",
    tags: ["forest", "river", "drone", "green"],
    orientation: "portrait",
    camera: "DJI Air 3",
    lens: "24mm",
    aperture: "f/2.8",
    shutter: "1/200s",
    iso: 100,
    rating: 4.6,
    mood: "Emerald water slicing the pines",
    accent: ["#0f2027", "#2c5364"],
  },
  {
    id: "portrait-bridge",
    title: "Suspension",
    album: "People",
    src: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
    location: "Brooklyn, USA",
    takenAt: "2024-01-19",
    tags: ["portrait", "bridge", "city", "soft light"],
    orientation: "portrait",
    camera: "Canon R5",
    lens: "50mm",
    aperture: "f/1.8",
    shutter: "1/320s",
    iso: 125,
    rating: 4.4,
    mood: "Calm glance over steel cables",
    accent: ["#f7cac9", "#92a8d1"],
    favorite: true,
  },
  {
    id: "solitude",
    title: "Solitude Lake",
    album: "Travel",
    src: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80",
    location: "Hallstatt, Austria",
    takenAt: "2023-12-03",
    tags: ["lake", "fog", "travel", "boats"],
    orientation: "landscape",
    camera: "Nikon Z7 II",
    lens: "35mm",
    aperture: "f/4.0",
    shutter: "1/160s",
    iso: 200,
    rating: 4.5,
    mood: "Pale morning on glassy water",
    accent: ["#8e9eab", "#eef2f3"],
  },
  {
    id: "steps",
    title: "Terracotta Steps",
    album: "Architecture",
    src: "https://images.unsplash.com/photo-1505761671935-60b3a7427bad?auto=format&fit=crop&w=1200&q=80",
    location: "Lisbon, Portugal",
    takenAt: "2024-02-14",
    tags: ["architecture", "stairs", "pattern", "city"],
    orientation: "portrait",
    camera: "Fujifilm XT-5",
    lens: "35mm",
    aperture: "f/4.0",
    shutter: "1/200s",
    iso: 160,
    rating: 4.3,
    mood: "Pastel geometry at midday",
    accent: ["#fbd3e9", "#bb377d"],
  },
  {
    id: "canyon",
    title: "Layered Earth",
    album: "Travel",
    src: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1400&q=80",
    location: "Antelope Canyon, USA",
    takenAt: "2024-08-27",
    tags: ["canyon", "texture", "sandstone", "travel"],
    orientation: "landscape",
    camera: "Sony A7R V",
    lens: "16-35mm",
    aperture: "f/8.0",
    shutter: "1/60s",
    iso: 200,
    rating: 4.6,
    mood: "Sunlight carving the stone",
    accent: ["#ef8e38", "#f45d6c"],
  },
  {
    id: "studio",
    title: "Studio Glow",
    album: "People",
    src: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1100&q=80",
    location: "Berlin, Germany",
    takenAt: "2024-06-06",
    tags: ["portrait", "studio", "color", "editorial"],
    orientation: "portrait",
    camera: "Hasselblad X2D",
    lens: "80mm",
    aperture: "f/2.0",
    shutter: "1/250s",
    iso: 64,
    rating: 4.7,
    mood: "Clean lines and cyan glow",
    accent: ["#34e89e", "#0f3443"],
  },
  {
    id: "summit",
    title: "Summit Light",
    album: "Nature",
    src: "https://images.unsplash.com/photo-1500534310687-4b56e0c7c3e9?auto=format&fit=crop&w=1600&q=80",
    location: "Dolomites, Italy",
    takenAt: "2024-09-04",
    tags: ["mountains", "sunrise", "travel", "ridge"],
    orientation: "landscape",
    camera: "Nikon Z8",
    lens: "70-200mm",
    aperture: "f/5.6",
    shutter: "1/500s",
    iso: 320,
    rating: 4.8,
    mood: "First light across jagged stone",
    accent: ["#f8b500", "#c02425"],
    favorite: true,
  },
  {
    id: "market",
    title: "Color Market",
    album: "City",
    src: "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1400&q=80",
    location: "Marrakesh, Morocco",
    takenAt: "2024-04-22",
    tags: ["market", "color", "people", "travel"],
    orientation: "landscape",
    camera: "Sony A7C II",
    lens: "35mm",
    aperture: "f/2.8",
    shutter: "1/320s",
    iso: 200,
    rating: 4.2,
    mood: "Spice haze and woven textiles",
    accent: ["#ef473a", "#cb2d3e"],
  },
  {
    id: "night-trail",
    title: "Night Trails",
    album: "City",
    src: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80",
    location: "Hong Kong, China",
    takenAt: "2024-10-01",
    tags: ["long exposure", "lights", "traffic", "city"],
    orientation: "landscape",
    camera: "Sony A7 IV",
    lens: "24-70mm",
    aperture: "f/11",
    shutter: "8s",
    iso: 50,
    rating: 4.5,
    mood: "Electric veins through the hills",
    accent: ["#141e30", "#243b55"],
  },
];

const dateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const PhotosComponent = () => {
  const [activeAlbum, setActiveAlbum] = useState<string>("all");
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [orientation, setOrientation] = useState<Orientation | "any">("any");
  const [sort, setSort] = useState<SortOrder>("recent");
  const [favorites, setFavorites] = useState<Set<string>>(
    () =>
      new Set(photoLibrary.filter((photo) => photo.favorite).map((photo) => photo.id))
  );
  const [selectedId, setSelectedId] = useState<string>(photoLibrary[0]?.id ?? "");
  const [isPlaying, setIsPlaying] = useState(false);

  const albums = useMemo(() => {
    const counts = photoLibrary.reduce<Record<string, number>>((acc, photo) => {
      acc[photo.album] = (acc[photo.album] ?? 0) + 1;
      return acc;
    }, {});
    return [
      { id: "all", label: "All Photos", count: photoLibrary.length },
      ...Object.entries(counts).map(([id, count]) => ({
        id,
        label: id,
        count,
      })),
    ];
  }, []);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = (photo: Photo) => {
      if (!normalizedQuery) return true;
      const haystack = [
        photo.title,
        photo.location,
        photo.album,
        photo.mood,
        ...photo.tags,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalizedQuery);
    };

    const sorted = [...photoLibrary]
      .filter((photo) => activeAlbum === "all" || photo.album === activeAlbum)
      .filter((photo) => (onlyFavorites ? favorites.has(photo.id) : true))
      .filter((photo) => (orientation === "any" ? true : photo.orientation === orientation))
      .filter(matchesQuery)
      .sort((a, b) => {
        if (sort === "recent") {
          return new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime();
        }
        return b.rating - a.rating;
      });

    return sorted;
  }, [activeAlbum, favorites, onlyFavorites, orientation, query, sort]);

  const effectiveSelectedId = useMemo(() => {
    if (filtered.some((photo) => photo.id === selectedId)) return selectedId;
    return filtered[0]?.id ?? selectedId;
  }, [filtered, selectedId]);

  useEffect(() => {
    if (!isPlaying || filtered.length === 0) return;
    const id = window.setInterval(() => {
      setSelectedId((current) => {
        if (!filtered.length) return current;
        const index = filtered.findIndex((photo) => photo.id === current);
        const next = filtered[(index + 1) % filtered.length];
        return next?.id ?? current;
      });
    }, 2600);
    return () => window.clearInterval(id);
  }, [filtered, isPlaying]);

  const resetFilters = useCallback(() => {
    setActiveAlbum("all");
    setQuery("");
    setOrientation("any");
    setOnlyFavorites(false);
    setSort("recent");
  }, []);

  useEffect(() => {
    const handleCommand = (event: Event) => {
      const detail = (event as CustomEvent<PhotosCommand>).detail;
      if (!detail) return;
      if (detail.type === "reset") resetFilters();
      if (detail.type === "shuffle" && filtered.length) {
        const random = filtered[Math.floor(Math.random() * filtered.length)];
        setSelectedId(random.id);
      }
      if (detail.type === "play") setIsPlaying(true);
      if (detail.type === "pause") setIsPlaying(false);
    };

    window.addEventListener("photos-command", handleCommand as EventListener);
    return () => {
      window.removeEventListener("photos-command", handleCommand as EventListener);
    };
  }, [filtered, resetFilters]);

  const selectedPhoto =
    filtered.find((photo) => photo.id === effectiveSelectedId) ??
    filtered[0] ??
    photoLibrary[0];

  const toggleFavorite = (photoId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) {
        next.delete(photoId);
      } else {
        next.add(photoId);
      }
      return next;
    });
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
  };

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-gradient-to-br from-background via-background to-background/80">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
          <Sparkles className="h-4 w-4" />
          Curated moments
        </div>
        <div className="relative min-w-[240px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="w-full rounded-lg border border-border/70 bg-background/70 px-10 py-2 text-sm shadow-sm outline-none transition focus:border-primary/70 focus:ring-2 focus:ring-primary/30"
            placeholder="Search by location, tag, album, or mood"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
              isPlaying
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border/70 bg-background/80 text-foreground"
            )}
            onClick={() => setIsPlaying((prev) => !prev)}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {isPlaying ? "Pause" : "Slideshow"}
          </button>
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
              sort === "recent"
                ? "border-border bg-accent/60 text-accent-foreground"
                : "border-border bg-background/80 text-foreground"
            )}
            onClick={() => setSort((prev) => (prev === "recent" ? "vibe" : "recent"))}
          >
            <Clock3 className="h-4 w-4" />
            Sort: {sort === "recent" ? "Recent" : "Vibe"}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 px-3 py-1 text-xs font-medium text-foreground transition hover:border-primary/50 hover:text-primary"
            onClick={resetFilters}
          >
            <RotateCw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      <div className="flex h-full min-h-0 flex-1 overflow-hidden">
        <div className="hidden w-64 flex-shrink-0 border-r border-border/70 bg-muted/30 p-4 lg:block">
          <div className="mb-4 flex items-center justify-between text-xs font-semibold uppercase text-muted-foreground">
            <span>Albums</span>
            <LayoutGrid className="h-4 w-4" />
          </div>
          <div className="space-y-2">
            {albums.map((album) => (
              <button
                key={album.id}
                type="button"
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-sm",
                  activeAlbum === album.id
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/70 bg-background/60 text-foreground"
                )}
                onClick={() => setActiveAlbum(album.id)}
              >
                <span className="flex items-center gap-2 capitalize">
                  <ImageIcon className="h-4 w-4 text-muted-foreground" />
                  {album.label}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {album.count}
                </span>
              </button>
            ))}
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition",
                  onlyFavorites
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-background/70 text-foreground"
                )}
                onClick={() => setOnlyFavorites((prev) => !prev)}
              >
                <Heart className="h-4 w-4" />
                Favorites
              </button>
              {(["any", "portrait", "landscape"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
                    orientation === value
                      ? "border-primary/60 bg-primary/10 text-primary"
                      : "border-border/60 bg-background/70 text-foreground"
                  )}
                  onClick={() => setOrientation(value)}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <Tag className="h-4 w-4" />
              Trending tags
            </div>
            <div className="flex flex-wrap gap-2">
              {["mountains", "portrait", "neon", "travel", "patterns"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-primary/20 hover:text-primary"
                  onClick={() => handleTagClick(tag)}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className="grid h-full min-h-0 gap-4 p-4 lg:grid-cols-[minmax(420px,1.7fr)_minmax(320px,1fr)]">
            <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-card/60 shadow-sm">
              <div className="flex items-center justify-between border-b border-border/70 bg-muted/40 px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground">
                <span>{filtered.length ? `${filtered.length} shots` : "No matches"}</span>
                <span className="flex items-center gap-2 text-[11px] capitalize">
                  <Check className="h-3.5 w-3.5" />
                  {activeAlbum === "all" ? "All albums" : activeAlbum}
                </span>
              </div>
              {filtered.length === 0 ? (
                <div className="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">
                  No photos match the current filters.
                </div>
              ) : (
                <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-3 overflow-auto p-4">
                  {filtered.map((photo) => {
                    const isSelected = effectiveSelectedId === photo.id;
                    const isFavorite = favorites.has(photo.id);
                    return (
                      <button
                        key={photo.id}
                        type="button"
                        className={cn(
                          "group relative flex h-52 flex-col overflow-hidden rounded-xl border border-border/60 bg-background/80 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                          isSelected && "border-primary/70 ring-2 ring-primary/40"
                        )}
                        onClick={() => setSelectedId(photo.id)}
                      >
                        <img
                          src={photo.src}
                          alt={photo.title}
                          className="h-32 w-full flex-1 object-cover transition duration-300 group-hover:scale-[1.02]"
                          loading="lazy"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background/90 via-background/50 to-transparent p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">
                                {photo.title}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span className="truncate">{photo.location}</span>
                              </div>
                            </div>
                            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase text-muted-foreground">
                              {photo.album}
                            </span>
                          </div>
                        </div>
                        <div className="absolute right-2 top-2 flex gap-2">
                          <span className="rounded-full bg-background/80 px-2 py-0.5 text-[11px] text-muted-foreground">
                            {photo.orientation}
                          </span>
                          <button
                            type="button"
                            className={cn(
                              "rounded-full p-1 transition hover:bg-background/80",
                              isFavorite ? "bg-background/90 text-primary" : "bg-background/70"
                            )}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleFavorite(photo.id);
                            }}
                            aria-label="Toggle favorite"
                          >
                            <Heart
                              className={cn(
                                "h-4 w-4",
                                isFavorite ? "fill-current" : "text-muted-foreground"
                              )}
                            />
                          </button>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-border/70 bg-card/70 p-4 shadow-sm">
              {selectedPhoto ? (
                <>
                  <div
                    className="relative overflow-hidden rounded-xl border border-border/60"
                    style={{
                      background: `linear-gradient(135deg, ${selectedPhoto.accent[0]}, ${selectedPhoto.accent[1]})`,
                    }}
                  >
                    <img
                      src={selectedPhoto.src}
                      alt={selectedPhoto.title}
                      className="h-56 w-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-4 text-white">
                      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/80">
                        <Sparkles className="h-4 w-4" />
                        {selectedPhoto.album}
                      </div>
                      <div className="text-lg font-semibold leading-tight">
                        {selectedPhoto.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-white/80">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {selectedPhoto.location}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-4 w-4" />
                          {dateFormatter.format(new Date(selectedPhoto.takenAt))}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoChip icon={Camera} label="Camera" value={selectedPhoto.camera} />
                    <InfoChip icon={Aperture} label="Lens" value={selectedPhoto.lens} />
                    <InfoChip icon={Star} label="Rating" value={`${selectedPhoto.rating.toFixed(1)}/5`} />
                    <InfoChip icon={SlidersHorizontal} label="Exposure" value={`${selectedPhoto.aperture} • ${selectedPhoto.shutter} • ISO ${selectedPhoto.iso}`} />
                  </div>

                  <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm">
                    <div className="text-xs uppercase text-muted-foreground">Story</div>
                    <div className="mt-1 text-foreground">{selectedPhoto.mood}</div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {selectedPhoto.tags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground transition hover:bg-primary/20 hover:text-primary"
                        onClick={() => handleTagClick(tag)}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold transition",
                        favorites.has(selectedPhoto.id)
                          ? "border-primary/60 bg-primary/10 text-primary"
                          : "border-border/70 bg-background/70 text-foreground"
                      )}
                      onClick={() => toggleFavorite(selectedPhoto.id)}
                    >
                      <Heart
                        className={cn(
                          "h-4 w-4",
                          favorites.has(selectedPhoto.id) ? "fill-current" : "text-muted-foreground"
                        )}
                      />
                      Favorite
                    </button>
                    <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        {selectedPhoto.tags.slice(0, 2).join(" · ")}
                      </div>
                    </div>
                    <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        {selectedPhoto.orientation}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                  Select a photo to see details.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

type InfoChipProps = {
  icon: typeof Camera;
  label: string;
  value: string;
};

const InfoChip = ({ icon: Icon, label, value }: InfoChipProps) => (
  <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/40 px-3 py-2">
    <Icon className="h-4 w-4 text-muted-foreground" />
    <div className="min-w-0">
      <div className="text-[11px] uppercase text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  </div>
);

export default PhotosComponent;
