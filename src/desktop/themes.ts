export type ThemeDefinition = {
  id: string;
  name: string;
  description: string;
  css?: string;
  swatch: {
    background: string;
    foreground: string;
    primary: string;
    accent?: string;
  };
};

export const DEFAULT_THEME_ID = "default";

export const themes: ThemeDefinition[] = [
  {
    id: DEFAULT_THEME_ID,
    name: "Oxanium Default",
    description: "Current desktop look & feel",
    swatch: {
      background: "#d8d8d8",
      foreground: "#3d3d3d",
      primary: "#c46d3a",
      accent: "#778fd4",
    },
  },
  {
    id: "linen-citrus",
    name: "Linen Citrus",
    description: "Light linen base with citrus primaries",
    swatch: {
      background: "oklch(0.969 0.01 78.3)",
      foreground: "oklch(0.366 0.025 49.6)",
      primary: "oklch(0.555 0.1455 49)",
      accent: "oklch(0.9 0.05 75)",
    },
    css: `
:root {
  --background: oklch(0.9885 0.0057 84.5659);
  --foreground: oklch(0.3660 0.0251 49.6085);
  --card: oklch(0.9686 0.0091 78.2818);
  --card-foreground: oklch(0.3660 0.0251 49.6085);
  --popover: oklch(0.9686 0.0091 78.2818);
  --popover-foreground: oklch(0.3660 0.0251 49.6085);
  --primary: oklch(0.5553 0.1455 48.9975);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.8276 0.0752 74.4400);
  --secondary-foreground: oklch(0.4444 0.0096 73.6390);
  --muted: oklch(0.9363 0.0218 83.2637);
  --muted-foreground: oklch(0.5534 0.0116 58.0708);
  --accent: oklch(0.9000 0.0500 74.9889);
  --accent-foreground: oklch(0.4444 0.0096 73.6390);
  --destructive: oklch(0.4437 0.1613 26.8994);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.8866 0.0404 89.6994);
  --input: oklch(0.8866 0.0404 89.6994);
  --ring: oklch(0.5553 0.1455 48.9975);
  --chart-1: oklch(0.5553 0.1455 48.9975);
  --chart-2: oklch(0.5534 0.0116 58.0708);
  --chart-3: oklch(0.5538 0.1207 66.4416);
  --chart-4: oklch(0.5534 0.0116 58.0708);
  --chart-5: oklch(0.6806 0.1423 75.8340);
  --sidebar: oklch(0.9363 0.0218 83.2637);
  --sidebar-foreground: oklch(0.3660 0.0251 49.6085);
  --sidebar-primary: oklch(0.5553 0.1455 48.9975);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.5538 0.1207 66.4416);
  --sidebar-accent-foreground: oklch(1.0000 0 0);
  --sidebar-border: oklch(0.8866 0.0404 89.6994);
  --sidebar-ring: oklch(0.5553 0.1455 48.9975);
  --font-sans: Oxanium, sans-serif;
  --font-serif: Merriweather, serif;
  --font-mono: Fira Code, monospace;
  --radius: 0.3rem;
  --shadow-x: 0px;
  --shadow-y: 2px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.18;
  --shadow-color: hsl(28 18% 25%);
  --shadow-2xs: 0px 2px 3px 0px hsl(28 18% 25% / 0.09);
  --shadow-xs: 0px 2px 3px 0px hsl(28 18% 25% / 0.09);
  --shadow-sm: 0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 1px 2px -1px hsl(28 18% 25% / 0.18);
  --shadow: 0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 1px 2px -1px hsl(28 18% 25% / 0.18);
  --shadow-md: 0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 2px 4px -1px hsl(28 18% 25% / 0.18);
  --shadow-lg: 0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 4px 6px -1px hsl(28 18% 25% / 0.18);
  --shadow-xl: 0px 2px 3px 0px hsl(28 18% 25% / 0.18), 0px 8px 10px -1px hsl(28 18% 25% / 0.18);
  --shadow-2xl: 0px 2px 3px 0px hsl(28 18% 25% / 0.45);
  --tracking-normal: 0em;
  --spacing: 0.25rem;
}

.dark {
  --background: oklch(0.2161 0.0061 56.0434);
  --foreground: oklch(0.9699 0.0013 106.4238);
  --card: oklch(0.2685 0.0063 34.2976);
  --card-foreground: oklch(0.9699 0.0013 106.4238);
  --popover: oklch(0.2685 0.0063 34.2976);
  --popover-foreground: oklch(0.9699 0.0013 106.4238);
  --primary: oklch(0.7049 0.1867 47.6044);
  --primary-foreground: oklch(1.0000 0 0);
  --secondary: oklch(0.4444 0.0096 73.6390);
  --secondary-foreground: oklch(0.9232 0.0026 48.7171);
  --muted: oklch(0.2330 0.0073 67.4563);
  --muted-foreground: oklch(0.7161 0.0091 56.2590);
  --accent: oklch(0.3598 0.0497 229.3202);
  --accent-foreground: oklch(0.9232 0.0026 48.7171);
  --destructive: oklch(0.5771 0.2152 27.3250);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.3741 0.0087 67.5582);
  --input: oklch(0.3741 0.0087 67.5582);
  --ring: oklch(0.7049 0.1867 47.6044);
  --chart-1: oklch(0.7049 0.1867 47.6044);
  --chart-2: oklch(0.6847 0.1479 237.3225);
  --chart-3: oklch(0.7952 0.1617 86.0468);
  --chart-4: oklch(0.7161 0.0091 56.2590);
  --chart-5: oklch(0.5534 0.0116 58.0708);
  --sidebar: oklch(0.2685 0.0063 34.2976);
  --sidebar-foreground: oklch(0.9699 0.0013 106.4238);
  --sidebar-primary: oklch(0.7049 0.1867 47.6044);
  --sidebar-primary-foreground: oklch(1.0000 0 0);
  --sidebar-accent: oklch(0.6847 0.1479 237.3225);
  --sidebar-accent-foreground: oklch(0.2839 0.0734 254.5378);
  --sidebar-border: oklch(0.3741 0.0087 67.5582);
  --sidebar-ring: oklch(0.7049 0.1867 47.6044);
  --font-sans: Oxanium, sans-serif;
  --font-serif: Merriweather, serif;
  --font-mono: Fira Code, monospace;
  --radius: 0.3rem;
  --shadow-x: 0px;
  --shadow-y: 2px;
  --shadow-blur: 3px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.18;
  --shadow-color: hsl(0 0% 5%);
  --shadow-2xs: 0px 2px 3px 0px hsl(0 0% 5% / 0.09);
  --shadow-xs: 0px 2px 3px 0px hsl(0 0% 5% / 0.09);
  --shadow-sm: 0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 1px 2px -1px hsl(0 0% 5% / 0.18);
  --shadow: 0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 1px 2px -1px hsl(0 0% 5% / 0.18);
  --shadow-md: 0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 2px 4px -1px hsl(0 0% 5% / 0.18);
  --shadow-lg: 0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 4px 6px -1px hsl(0 0% 5% / 0.18);
  --shadow-xl: 0px 2px 3px 0px hsl(0 0% 5% / 0.18), 0px 8px 10px -1px hsl(0 0% 5% / 0.18);
  --shadow-2xl: 0px 2px 3px 0px hsl(0 0% 5% / 0.45);
}
`,
  },
  {
      id: "notebook",
      name: "notebook",
      description: "",
      swatch: {
          background: "#f9f9f9",
          foreground: "#f0f0f0",
          primary: "#606060",
          accent: "#f3eac8",
      },
      css: `
      :root {
  --background: oklch(0.9821 0 0);
  --foreground: oklch(0.3485 0 0);
  --card: oklch(1.0000 0 0);
  --card-foreground: oklch(0.3485 0 0);
  --popover: oklch(1.0000 0 0);
  --popover-foreground: oklch(0.3485 0 0);
  --primary: oklch(0.4891 0 0);
  --primary-foreground: oklch(0.9551 0 0);
  --secondary: oklch(0.9006 0 0);
  --secondary-foreground: oklch(0.3485 0 0);
  --muted: oklch(0.9158 0 0);
  --muted-foreground: oklch(0.4313 0 0);
  --accent: oklch(0.9354 0.0456 94.8549);
  --accent-foreground: oklch(0.4015 0.0436 37.9587);
  --destructive: oklch(0.6627 0.0978 20.0041);
  --destructive-foreground: oklch(1.0000 0 0);
  --border: oklch(0.5538 0.0025 17.2320);
  --input: oklch(1.0000 0 0);
  --ring: oklch(0.7058 0 0);
  --chart-1: oklch(0.3211 0 0);
  --chart-2: oklch(0.4495 0 0);
  --chart-3: oklch(0.5693 0 0);
  --chart-4: oklch(0.6830 0 0);
  --chart-5: oklch(0.7921 0 0);
  --sidebar: oklch(0.9551 0 0);
  --sidebar-foreground: oklch(0.3485 0 0);
  --sidebar-primary: oklch(0.4891 0 0);
  --sidebar-primary-foreground: oklch(0.9551 0 0);
  --sidebar-accent: oklch(0.9354 0.0456 94.8549);
  --sidebar-accent-foreground: oklch(0.4015 0.0436 37.9587);
  --sidebar-border: oklch(0.8078 0 0);
  --sidebar-ring: oklch(0.7058 0 0);
  --font-sans: Architects Daughter, sans-serif;
  --font-serif: "Times New Roman", Times, serif;
  --font-mono: "Courier New", Courier, monospace;
  --radius: 0.625rem;
  --shadow-x: 1px;
  --shadow-y: 4px;
  --shadow-blur: 5px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.03;
  --shadow-color: #000000;
  --shadow-2xs: 1px 4px 5px 0px hsl(0 0% 0% / 0.01);
  --shadow-xs: 1px 4px 5px 0px hsl(0 0% 0% / 0.01);
  --shadow-sm: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 1px 2px -1px hsl(0 0% 0% / 0.03);
  --shadow: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 1px 2px -1px hsl(0 0% 0% / 0.03);
  --shadow-md: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 2px 4px -1px hsl(0 0% 0% / 0.03);
  --shadow-lg: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 4px 6px -1px hsl(0 0% 0% / 0.03);
  --shadow-xl: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 8px 10px -1px hsl(0 0% 0% / 0.03);
  --shadow-2xl: 1px 4px 5px 0px hsl(0 0% 0% / 0.07);
  --tracking-normal: 0.5px;
  --spacing: 0.25rem;
}

.dark {
  --background: oklch(0.2891 0 0);
  --foreground: oklch(0.8945 0 0);
  --card: oklch(0.3211 0 0);
  --card-foreground: oklch(0.8945 0 0);
  --popover: oklch(0.3211 0 0);
  --popover-foreground: oklch(0.8945 0 0);
  --primary: oklch(0.7572 0 0);
  --primary-foreground: oklch(0.2891 0 0);
  --secondary: oklch(0.4676 0 0);
  --secondary-foreground: oklch(0.8078 0 0);
  --muted: oklch(0.3904 0 0);
  --muted-foreground: oklch(0.7058 0 0);
  --accent: oklch(0.9067 0 0);
  --accent-foreground: oklch(0.3211 0 0);
  --destructive: oklch(0.7915 0.0491 18.2410);
  --destructive-foreground: oklch(0.2891 0 0);
  --border: oklch(0.4276 0 0);
  --input: oklch(0.3211 0 0);
  --ring: oklch(0.8078 0 0);
  --chart-1: oklch(0.9521 0 0);
  --chart-2: oklch(0.8576 0 0);
  --chart-3: oklch(0.7572 0 0);
  --chart-4: oklch(0.6534 0 0);
  --chart-5: oklch(0.5452 0 0);
  --sidebar: oklch(0.2478 0 0);
  --sidebar-foreground: oklch(0.8945 0 0);
  --sidebar-primary: oklch(0.7572 0 0);
  --sidebar-primary-foreground: oklch(0.2478 0 0);
  --sidebar-accent: oklch(0.9067 0 0);
  --sidebar-accent-foreground: oklch(0.3211 0 0);
  --sidebar-border: oklch(0.4276 0 0);
  --sidebar-ring: oklch(0.8078 0 0);
  --font-sans: Architects Daughter, sans-serif;
  --font-serif: Georgia, serif;
  --font-mono: "Fira Code", "Courier New", monospace;
  --radius: 0.625rem;
  --shadow-x: 1px;
  --shadow-y: 4px;
  --shadow-blur: 5px;
  --shadow-spread: 0px;
  --shadow-opacity: 0.03;
  --shadow-color: #000000;
  --shadow-2xs: 1px 4px 5px 0px hsl(0 0% 0% / 0.01);
  --shadow-xs: 1px 4px 5px 0px hsl(0 0% 0% / 0.01);
  --shadow-sm: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 1px 2px -1px hsl(0 0% 0% / 0.03);
  --shadow: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 1px 2px -1px hsl(0 0% 0% / 0.03);
  --shadow-md: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 2px 4px -1px hsl(0 0% 0% / 0.03);
  --shadow-lg: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 4px 6px -1px hsl(0 0% 0% / 0.03);
  --shadow-xl: 1px 4px 5px 0px hsl(0 0% 0% / 0.03), 1px 8px 10px -1px hsl(0 0% 0% / 0.03);
  --shadow-2xl: 1px 4px 5px 0px hsl(0 0% 0% / 0.07);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);

  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-serif: var(--font-serif);

  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --shadow-2xs: var(--shadow-2xs);
  --shadow-xs: var(--shadow-xs);
  --shadow-sm: var(--shadow-sm);
  --shadow: var(--shadow);
  --shadow-md: var(--shadow-md);
  --shadow-lg: var(--shadow-lg);
  --shadow-xl: var(--shadow-xl);
  --shadow-2xl: var(--shadow-2xl);

  --tracking-tighter: calc(var(--tracking-normal) - 0.05em);
  --tracking-tight: calc(var(--tracking-normal) - 0.025em);
  --tracking-normal: var(--tracking-normal);
  --tracking-wide: calc(var(--tracking-normal) + 0.025em);
  --tracking-wider: calc(var(--tracking-normal) + 0.05em);
  --tracking-widest: calc(var(--tracking-normal) + 0.1em);
}

body {
  letter-spacing: var(--tracking-normal);
}`
  }
];
