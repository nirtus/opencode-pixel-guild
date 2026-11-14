import { deriveVisualTraits } from "../capability/classifier.ts";
import type {
  ComposeCharacterSpriteInput,
  Pass2SkillGrimoireResult,
  PixelPointHex,
  ResolvedSkillGrimoireBadge,
  SkillGrimoireInputItem,
} from "./pixel-types-and-palettes.ts";

export function resolveSkillGrimoireList(
  items: SkillGrimoireInputItem[] | undefined,
): ResolvedSkillGrimoireBadge[] {
  if (!items || items.length === 0) {
    return [];
  }
  return items.map((item) => {
    const skillId = (item.skillId ?? item.skillID ?? "skill").trim() || "skill";
    const traits = deriveVisualTraits(skillId, item.emblemHex ?? null);
    return {
      skillId,
      name: item.name ?? skillId,
      monogram: item.monogram ?? traits.monogram,
      emblemHex: item.emblemHex ?? traits.primaryHex,
    };
  });
}

export function applyPass2SkillGrimoire(
  pixels: (string | null)[][],
  input: ComposeCharacterSpriteInput,
): Pass2SkillGrimoireResult {
  const badges = resolveSkillGrimoireList(input.skillGrimoires);
  const equippedCount = badges.length;

  let auraVisibility: "full" | "dormant-emblem" | "none" = "none";
  if (equippedCount > 0 && input.grimoireAuraVisibility !== "none") {
    if (
      input.grimoireAuraVisibility === "dormant-emblem" ||
      input.lifecycleState === "Archived"
    ) {
      auraVisibility = "dormant-emblem";
    } else {
      auraVisibility = "full";
    }
  }

  if (equippedCount === 0 || auraVisibility === "none") {
    return {
      equippedCount,
      auraVisibility: "none",
      primaryGrimoire: badges[0] ?? null,
      floatingTome: {
        visible: false,
        dormant: false,
        offsetX: 13,
        offsetY: 5,
        emblemHex: null,
        pageHex: null,
        badgeCount: 0,
        tier: 0,
        pixelCoords: [],
      },
      runeAura: { visible: false, colorHex: null, alpha: 0, pixelCoords: [] },
      orbitingSparks: [],
      overflowSparkCount: 0,
    };
  }

  const primary = badges[0];
  const timestampMs = input.timestampMs ?? 0;
  const tomeTier = Math.min(3, equippedCount) as 0 | 1 | 2 | 3;

  if (auraVisibility === "dormant-emblem") {
    const tomePixels: PixelPointHex[] = [
      { x: 13, y: 8, hex: primary.emblemHex },
      { x: 14, y: 8, hex: "#475569" },
      { x: 13, y: 9, hex: primary.emblemHex },
      { x: 14, y: 9, hex: "#94a3b8" },
      { x: 13, y: 10, hex: primary.emblemHex },
      { x: 14, y: 10, hex: "#475569" },
    ];
    for (const pt of tomePixels) {
      pixels[pt.y][pt.x] = pt.hex;
    }
    return {
      equippedCount,
      auraVisibility: "dormant-emblem",
      primaryGrimoire: primary,
      floatingTome: {
        visible: true,
        dormant: true,
        offsetX: 13,
        offsetY: 8,
        emblemHex: primary.emblemHex,
        pageHex: null,
        badgeCount: equippedCount,
        tier: tomeTier,
        pixelCoords: tomePixels,
      },
      runeAura: { visible: false, colorHex: null, alpha: 0, pixelCoords: [] },
      orbitingSparks: [],
      overflowSparkCount: 0,
    };
  }

  const bobY = Math.floor(timestampMs / 250) % 2 === 1 ? -1 : 0;
  const tomeBaseY = 5 + bobY;
  const pageHex = "#fef3c7";
  const tomePixels: PixelPointHex[] = [
    { x: 13, y: tomeBaseY, hex: primary.emblemHex },
    { x: 14, y: tomeBaseY, hex: pageHex },
    { x: 15, y: tomeBaseY, hex: primary.emblemHex },
    { x: 13, y: tomeBaseY + 1, hex: primary.emblemHex },
    { x: 14, y: tomeBaseY + 1, hex: pageHex },
    { x: 15, y: tomeBaseY + 1, hex: pageHex },
    { x: 13, y: tomeBaseY + 2, hex: primary.emblemHex },
    { x: 14, y: tomeBaseY + 2, hex: primary.emblemHex },
    { x: 15, y: tomeBaseY + 2, hex: primary.emblemHex },
  ];
  for (const pt of tomePixels) {
    pixels[pt.y][pt.x] = pt.hex;
  }

  return {
    equippedCount,
    auraVisibility: "full",
    primaryGrimoire: primary,
    floatingTome: {
      visible: true,
      dormant: false,
      offsetX: 13,
      offsetY: tomeBaseY,
      emblemHex: primary.emblemHex,
      pageHex,
      badgeCount: equippedCount,
      tier: tomeTier,
      pixelCoords: tomePixels,
    },
    runeAura: { visible: false, colorHex: null, alpha: 0, pixelCoords: [] },
    orbitingSparks: [],
    overflowSparkCount: 0,
  };
}
