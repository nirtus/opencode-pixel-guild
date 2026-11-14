import {
  HEADGEAR_SILHOUETTES,
  PLUGIN_ALCOVE_ARCHETYPES,
} from "../types/domain.ts";
import type {
  PluginAlcoveArchetype,
  VisualTraitPalette,
} from "../types/domain.ts";

export function hashIdentifier(input: string): number {
  let hash = 2166136261;
  const normalized = input.trim().toLowerCase();
  for (let i = 0; i < normalized.length; i += 1) {
    hash ^= normalized.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function deriveMonogram(identifier: string): string {
  const cleaned = identifier
    .replace(/^@/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .trim();
  if (!cleaned) {
    return "GLD";
  }
  const parts = cleaned.split(/[-_]+/).filter(Boolean);
  if (parts.length >= 3) {
    return `${parts[0][0]}${parts[1][0]}${parts[2][0]}`.toUpperCase();
  }
  if (parts.length === 2) {
    const first = parts[0].slice(0, 2);
    const second = parts[1].slice(0, 2);
    return `${first}${second}`.slice(0, 3).toUpperCase().padEnd(3, "X");
  }
  const consonants = cleaned.replace(/[aeiouAEIOU]/g, "");
  if (consonants.length >= 3) {
    return `${cleaned[0]}${consonants.slice(1, 3)}`.toUpperCase();
  }
  return cleaned.slice(0, 3).toUpperCase().padEnd(3, "X");
}

const PALETTE_SWATCHES = [
  { primary: "#10b981", secondary: "#047857", trim: "#6ee7b7", aura: "#34d399" },
  { primary: "#3b82f6", secondary: "#1d4ed8", trim: "#93c5fd", aura: "#60a5fa" },
  { primary: "#f59e0b", secondary: "#b45309", trim: "#fcd34d", aura: "#fbbf24" },
  { primary: "#8b5cf6", secondary: "#5b21b6", trim: "#c4b5fd", aura: "#a78bfa" },
  { primary: "#ec4899", secondary: "#be185d", trim: "#f9a8d4", aura: "#f472b6" },
  { primary: "#06b6d4", secondary: "#0e7490", trim: "#67e8f9", aura: "#22d3ee" },
  { primary: "#ef4444", secondary: "#b91c1c", trim: "#fca5a5", aura: "#f87171" },
  { primary: "#84cc16", secondary: "#4d7c0f", trim: "#bef264", aura: "#a3e635" },
] as const;

export function inferPluginAlcoveArchetype(
  identifier: string,
  seed: number,
): PluginAlcoveArchetype {
  const lower = identifier.toLowerCase();
  if (
    /(playwright|browser|chrome|puppeteer|web|fetch|scrape|http|cypress|selenium|dom)/.test(
      lower,
    )
  ) {
    return "Portal Mirror";
  }
  if (
    /(postgres|sql|sqlite|redis|supabase|mongo|prisma|drizzle|db|database|storage|s3|vault|notion|airtable|memory|vector)/.test(
      lower,
    )
  ) {
    return "Crystal Vault";
  }
  if (
    /(github|gitlab|linear|jira|slack|discord|asana|trello|issue|ticket|pr|board|sentry|pagerduty|figma)/.test(
      lower,
    )
  ) {
    return "War Table";
  }
  if (
    /(docker|k8s|kubernetes|exec|code|sandbox|opencode|mcp|lsp|runtime|wasm|worker|ci|build)/.test(
      lower,
    )
  ) {
    return "Arcane Conduit";
  }
  return PLUGIN_ALCOVE_ARCHETYPES[(seed >>> 6) % PLUGIN_ALCOVE_ARCHETYPES.length];
}

export function deriveVisualTraits(
  identifier: string,
  explicitColor?: string | null,
): VisualTraitPalette {
  const seed = hashIdentifier(identifier);
  const swatch = PALETTE_SWATCHES[seed % PALETTE_SWATCHES.length];
  const headgear =
    HEADGEAR_SILHOUETTES[(seed >>> 3) % HEADGEAR_SILHOUETTES.length];
  const alcoveArchetype = inferPluginAlcoveArchetype(identifier, seed);

  return {
    primaryHex: explicitColor && explicitColor.trim() ? explicitColor.trim() : swatch.primary,
    secondaryHex: swatch.secondary,
    trimHex: swatch.trim,
    auraHex: swatch.aura,
    monogram: deriveMonogram(identifier),
    headgear,
    alcoveArchetype,
    hashSeed: seed,
  };
}
