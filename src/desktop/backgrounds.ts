export type DesktopBackground = {
  id: string;
  name: string;
  description: string;
  image: string;
};

export const DEFAULT_BACKGROUND_ID = "soft-nebula";

export const backgrounds: DesktopBackground[] = [
  {
    id: DEFAULT_BACKGROUND_ID,
    name: "Soft Nebula",
    description: "Muted radial glow with layered dots",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80",
  },
  {
    id: "Moonrise-over-half-dome",
    name: "Moonrise over half dome",
    description: "Subtle paper grain and angled gradients",
    image:
      "https://unsplash.com/photos/O0R5XZfKUGQ/download?ixid=M3wxMjA3fDB8MXxhbGx8fHx8fHx8fHwxNzY0MDYxMDI1fA&force=true&w=2400",
  },
  {
      id: "Bedroom-Simplicity",
      name: "Bedroom-Simplicity",
      description: "Bedroom-Simplicity by Samantha Gades photography",
      image: "https://unsplash.com/photos/BlIhVfXbi9s/download?ixid=M3wxMjA3fDB8MXxhbGx8fHx8fHx8fHwxNzY0MDYzOTMxfA&force=true&w=2400"
  }
];
