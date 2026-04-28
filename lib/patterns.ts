export interface SlotDefinition {
  role: "article" | "headline" | "image" | "media";
  label: string;
}

export interface PatternDefinition {
  id: string;
  name: string;
  column: "main" | "sidebar" | "full";
  slots: SlotDefinition[];
  description: string;
}

export const PATTERNS: Record<string, PatternDefinition> = {
  hero: {
    id: "hero",
    name: "Hero + Headlines",
    column: "main",
    description: "Featured article with large image, plus headline-only articles below",
    slots: [
      { role: "article", label: "Featured Article" },
      { role: "image", label: "Hero Image" },
      { role: "headline", label: "Headline 1" },
      { role: "headline", label: "Headline 2" },
    ],
  },
  "four-grid": {
    id: "four-grid",
    name: "Four Articles Grid",
    column: "main",
    description: "2x2 grid — text-only top row, thumbnails bottom row",
    slots: [
      { role: "article", label: "Top Left Article" },
      { role: "article", label: "Top Right Article" },
      { role: "article", label: "Bottom Left Article" },
      { role: "article", label: "Bottom Right Article" },
    ],
  },
  "text-images": {
    id: "text-images",
    name: "Article + Two Images",
    column: "main",
    description: "Article text on left, two tall images on right",
    slots: [
      { role: "article", label: "Article" },
      { role: "image", label: "Image 1" },
      { role: "image", label: "Image 2" },
    ],
  },
  "headline-stack": {
    id: "headline-stack",
    name: "Headline Stack",
    column: "main",
    description: "Bold headlines separated by thick rules, text-only",
    slots: [
      { role: "headline", label: "Headline 1" },
      { role: "headline", label: "Headline 2" },
      { role: "headline", label: "Headline 3" },
    ],
  },
  "two-thumbnails": {
    id: "two-thumbnails",
    name: "Two with Images",
    column: "main",
    description: "Side-by-side articles with images on top",
    slots: [
      { role: "article", label: "Left Article" },
      { role: "article", label: "Right Article" },
    ],
  },
  "single-feature": {
    id: "single-feature",
    name: "Single Feature",
    column: "main",
    description: "Full-width image above, big headline and excerpt below",
    slots: [
      { role: "article", label: "Featured Article" },
    ],
  },
  "sb-feature": {
    id: "sb-feature",
    name: "Sidebar Feature",
    column: "sidebar",
    description: "Image on top, headline + excerpt below",
    slots: [
      { role: "article", label: "Article" },
    ],
  },
  "sb-two-small": {
    id: "sb-two-small",
    name: "Two Small",
    column: "sidebar",
    description: "Side-by-side articles with images",
    slots: [
      { role: "article", label: "Left Article" },
      { role: "article", label: "Right Article" },
    ],
  },
  "sb-headlines": {
    id: "sb-headlines",
    name: "Headline List",
    column: "sidebar",
    description: "Text-only stacked headlines with light dividers",
    slots: [
      { role: "headline", label: "Headline 1" },
      { role: "headline", label: "Headline 2" },
      { role: "headline", label: "Headline 3" },
    ],
  },
  "sb-thumbnails": {
    id: "sb-thumbnails",
    name: "Thumbnail List",
    column: "sidebar",
    description: "Small thumbnails with headlines stacked vertically",
    slots: [
      { role: "article", label: "Article 1" },
      { role: "article", label: "Article 2" },
      { role: "article", label: "Article 3" },
    ],
  },
  "round-table": {
    id: "round-table",
    name: "Round Table",
    column: "main",
    description: "This issue's Round Table debate, with prompt and sides",
    slots: [],
  },
  "sb-round-table": {
    id: "sb-round-table",
    name: "Round Table",
    column: "sidebar",
    description: "Compact Round Table teaser",
    slots: [],
  },
  "round-table-full": {
    id: "round-table-full",
    name: "Round Table — Full Row",
    column: "full",
    description: "Round Table debate spanning the full width of the page",
    slots: [],
  },
};

export function getMainPatterns(): PatternDefinition[] {
  return Object.values(PATTERNS).filter((p) => p.column === "main");
}

export function getSidebarPatterns(): PatternDefinition[] {
  return Object.values(PATTERNS).filter((p) => p.column === "sidebar");
}

export function getFullPatterns(): PatternDefinition[] {
  return Object.values(PATTERNS).filter((p) => p.column === "full");
}
