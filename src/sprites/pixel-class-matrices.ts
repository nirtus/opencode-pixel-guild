import {
  deriveMonogram,
  deriveVisualTraits,
} from "../capability/classifier.ts";
import { deriveSquadColor } from "../state/world-reducer.ts";
import type { BuiltInAgentClass, HeadgearSilhouette } from "../types/domain.ts";
import {
  SPRITE_GRID_SIZE,
  type CharacterSpritePalette,
  type ComposeCharacterSpriteInput,
  type OutfitArchetype,
  type Pass1ClassSilhouetteResult,
  type Pass3SquadLineageResult,
  type PixelPointHex,
} from "./pixel-types-and-palettes.ts";

export const BUILTIN_CLASS_CONFIG: Record<
  BuiltInAgentClass,
  {
    outfitArchetype: OutfitArchetype;
    headgear: HeadgearSilhouette;
    primaryHex: string;
    secondaryHex: string;
    trimHex: string;
    auraHex: string;
  }
> = {
  build: {
    outfitArchetype: "master-smith",
    headgear: "visored-helm",
    primaryHex: "#3b82f6",
    secondaryHex: "#1d4ed8",
    trimHex: "#93c5fd",
    auraHex: "#60a5fa",
  },
  plan: {
    outfitArchetype: "strategist-scholar",
    headgear: "arcane-circlet",
    primaryHex: "#f59e0b",
    secondaryHex: "#b45309",
    trimHex: "#fcd34d",
    auraHex: "#fbbf24",
  },
  explore: {
    outfitArchetype: "pathfinder-scout",
    headgear: "hood",
    primaryHex: "#10b981",
    secondaryHex: "#047857",
    trimHex: "#6ee7b7",
    auraHex: "#34d399",
  },
  general: {
    outfitArchetype: "guild-warden",
    headgear: "plumed-cap",
    primaryHex: "#8b5cf6",
    secondaryHex: "#5b21b6",
    trimHex: "#c4b5fd",
    auraHex: "#a78bfa",
  },
};

// 4 rows (y = 1..4) of 16-column headgear templates
export const HEADGEAR_ROWS: Record<
  HeadgearSilhouette,
  readonly [string, string, string, string]
> = {
  "visored-helm": [
    ".....OOOOOO.....",
    "....OMMMMMMO....",
    "....OTTTTTTO....",
    "....OMSSSSMO....",
  ],
  "arcane-circlet": [
    "......OAAO......",
    "....OOPPPPOO....",
    "....OTTTTTTO....",
    "....OSSSSSSO....",
  ],
  hood: [
    ".....OOOOOO.....",
    "....OPPPPPPO....",
    "...OPDDDDDDPO...",
    "...OPSSSSSSPO...",
  ],
  "plumed-cap": [
    "....TTTOOOO.....",
    "...TTPPPPPPPO...",
    "....ODDDDDDO....",
    "....OSSSSSSO....",
  ],
  "alchemist-goggles": [
    ".....OOOOOO.....",
    "....OPPPPPPO....",
    "....OTAOOATO....",
    "....OSSSSSSO....",
  ],
  "horned-crown": [
    "...TO..OO..OT...",
    "...TOOPPPPOOT...",
    "....OTTTTTTO....",
    "....OSSSSSSO....",
  ],
};

// 10 rows (y = 5..14) of 16-column outfit body templates (face + torso + legs + boots)
export const OUTFIT_BODY_ROWS: Record<
  OutfitArchetype,
  readonly [
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
    string,
  ]
> = {
  "master-smith": [
    "....OSEssESO....",
    "....OSSSSSSO....",
    "...OMTTTTTTMO...",
    "..OMPPPPPPPPMO..",
    "..OMPPDDDDPPMO..",
    "...OPDDDDDDPO...",
    "...OPDDDDDDPO...",
    "....OPPOO2PO....",
    "....OBBOOBBO....",
    "....OOOO.OOO....",
  ],
  "strategist-scholar": [
    "....OSEssESO....",
    "....OSSSSSSO....",
    "...OTPPPPPPTO...",
    "...OPPTAAtPPO...",
    "..OPPPTAATPPPO..",
    "..OPPPDDDDPPPO..",
    "...OPPDDDDPPO...",
    "...OPPPPPPPPO...",
    "....OBBOOBBO....",
    "....OOO..OOO....",
  ],
  "pathfinder-scout": [
    "....OSEssESO....",
    "....OSSSSSSO....",
    "...ODTTTTTTDO...",
    "..ODPPPPPPPPDO..",
    "..ODPPTDDTPPDO..",
    "...OPPPPPPPPO...",
    "....OPP..PPO....",
    "....ODP..PDO....",
    "....OBB..BBO....",
    "....OOO..OOO....",
  ],
  "guild-warden": [
    "....OSEssESO....",
    "....OSSSSSSO....",
    "...OTPPPPPPTO...",
    "..OPPPTAATPPPO..",
    "..OPPPTTTTPPPO..",
    "...OPPTAATPO....",
    "....OPPPPPPO....",
    "....OPP..PPO....",
    "....OBB..BBO....",
    "....OOO..OOO....",
  ],
  "custom-specialist": [
    "....OSEssESO....",
    "....OSSSSSSO....",
    "...OTPPPPPPTO...",
    "..OPPPTDDTPPPO..",
    "..OPPPTTTTPPPO..",
    "...OPPDDDDPPO...",
    "....OPPPPPPO....",
    "....OPP..PPO....",
    "....OBB..BBO....",
    "....OOO..OOO....",
  ],
};

export function isBuiltInAgentClass(value: string): value is BuiltInAgentClass {
  return value === "build" || value === "plan" || value === "explore" || value === "general";
}

export function resolvePass1ClassSilhouette(
  input: ComposeCharacterSpriteInput,
): Pass1ClassSilhouetteResult {
  const rawClass = input.agentClass.trim();
  const normalizedClass = rawClass.toLowerCase();
  const derivedTraits = deriveVisualTraits(
    rawClass || "general",
    input.agentColor ?? input.visualTraits?.primaryHex ?? null,
  );
  if (isBuiltInAgentClass(normalizedClass)) {
    const cfg = BUILTIN_CLASS_CONFIG[normalizedClass];
    const explicitColor = input.agentColor?.trim() || input.visualTraits?.primaryHex;
    return {
      agentClass: normalizedClass,
      isBuiltInClass: true,
      outfitArchetype: cfg.outfitArchetype,
      headgear: cfg.headgear,
      monogram: deriveMonogram(normalizedClass),
      palette: {
        primaryHex: explicitColor || cfg.primaryHex,
        secondaryHex: input.visualTraits?.secondaryHex ?? cfg.secondaryHex,
        trimHex: input.visualTraits?.trimHex ?? cfg.trimHex,
        auraHex: input.visualTraits?.auraHex ?? cfg.auraHex,
        skinHex: "#fcd5b5",
        outlineHex: "#0f172a",
        eyeHex: "#1e293b",
        bootHex: "#451a03",
        metalHex: "#94a3b8",
      },
    };
  }
  return {
    agentClass: rawClass,
    isBuiltInClass: false,
    outfitArchetype: "custom-specialist",
    headgear: input.visualTraits?.headgear ?? derivedTraits.headgear,
    monogram: input.visualTraits?.monogram ?? derivedTraits.monogram,
    palette: {
      primaryHex: input.visualTraits?.primaryHex ?? derivedTraits.primaryHex,
      secondaryHex: input.visualTraits?.secondaryHex ?? derivedTraits.secondaryHex,
      trimHex: input.visualTraits?.trimHex ?? derivedTraits.trimHex,
      auraHex: input.visualTraits?.auraHex ?? derivedTraits.auraHex,
      skinHex: "#fcd5b5",
      outlineHex: "#0f172a",
      eyeHex: "#1e293b",
      bootHex: "#451a03",
      metalHex: "#94a3b8",
    },
  };
}

export function mapTemplateTokenToHex(
  token: string,
  palette: CharacterSpritePalette,
): string | null {
  switch (token) {
    case ".": return null;
    case "O": return palette.outlineHex;
    case "S":
    case "s": return palette.skinHex;
    case "E": return palette.eyeHex;
    case "P":
    case "2": return palette.primaryHex;
    case "D": return palette.secondaryHex;
    case "T":
    case "t": return palette.trimHex;
    case "A": return palette.auraHex;
    case "M": return palette.metalHex;
    case "B": return palette.bootHex;
    default: return null;
  }
}

export function applyPass3SquadLineage(
  pixels: (string | null)[][],
  templateRows: string[],
  input: ComposeCharacterSpriteInput,
): Pass3SquadLineageResult {
  const isSubagent =
    input.role === "Squad Subagent" ||
    (input.parentId !== undefined && input.parentId !== null);

  if (!isSubagent) {
    return {
      isSubagent: false,
      parentSessionId: null,
      squadTrimHex: null,
      floorRuneRing: {
        visible: false,
        colorHex: null,
        pixelCoords: [],
      },
    };
  }

  const parentSessionId = input.parentId ?? "ses_parent";
  const squadTrimHex =
    input.squadColorHex?.trim() || deriveSquadColor(parentSessionId);

  for (let y = 0; y < SPRITE_GRID_SIZE; y += 1) {
    const row = templateRows[y];
    for (let x = 0; x < SPRITE_GRID_SIZE; x += 1) {
      if (row[x] === "T" || row[x] === "t") {
        pixels[y][x] = squadTrimHex;
      }
    }
  }

  const ringCoords: Array<{ x: number; y: number }> = [
    { x: 3, y: 14 },
    { x: 12, y: 14 },
    { x: 4, y: 15 },
    { x: 5, y: 15 },
    { x: 7, y: 15 },
    { x: 8, y: 15 },
    { x: 10, y: 15 },
    { x: 11, y: 15 },
  ];

  const pixelCoords: PixelPointHex[] = ringCoords.map((pt) => {
    pixels[pt.y][pt.x] = squadTrimHex;
    return { x: pt.x, y: pt.y, hex: squadTrimHex };
  });

  return {
    isSubagent: true,
    parentSessionId: input.parentId ?? null,
    squadTrimHex,
    floorRuneRing: {
      visible: true,
      colorHex: squadTrimHex,
      pixelCoords,
    },
  };
}
