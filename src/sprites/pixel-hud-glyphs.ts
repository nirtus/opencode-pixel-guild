import type { QuestGateKind } from "../types/domain.ts";
import type {
  ContextManaSeverity,
  MonogramGlyphBitmap,
  OverheadGrimoireEmblemPip,
  OverheadHudCueInput,
  OverheadHudCueResult,
  OverheadZoomLodTier,
} from "./pixel-types-and-palettes.ts";

export const PERMISSION_LOCK_TEMPLATE: readonly string[] = [
  "...OOO...",
  "..OAAAO..",
  "..OA.AO..",
  ".OOOOOOO.",
  ".OPPPPPO.",
  ".OPPAPPO.",
  ".OPPAPPO.",
  ".OPPPPPO.",
  ".OOOOOOO.",
];

export const QUESTION_SCROLL_TEMPLATE: readonly string[] = [
  ".OOOOOOO.",
  "OAAAAAAAO",
  ".OPAAAPO.",
  ".OPPPAPO.",
  ".OPPAAOO.",
  ".OPPPPO..",
  ".OPPAPO..",
  "OAAAAAAAO",
  ".OOOOOOO.",
];

export const MONOGRAM_FONT_3X5: Record<
  string,
  readonly [string, string, string, string, string]
> = {
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["..#", "..#", "..#", "#.#", ".#."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#.#", "###", "###", "#.#", "#.#"],
  N: ["#.#", "###", "###", "###", "#.#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."],
  Q: [".#.", "#.#", "#.#", ".##", "..#"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", "###"],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  W: ["#.#", "#.#", "###", "###", "#.#"],
  X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", ".##", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
};

export function buildQuestGateMatrix(
  template: readonly string[],
  primaryHex: string,
  accentHex: string,
): (string | null)[][] {
  return template.map((row) =>
    row.split("").map((ch) => {
      if (ch === "O") return "#0f172a";
      if (ch === "P") return primaryHex;
      if (ch === "A") return accentHex;
      return null;
    }),
  );
}

export function resolveContextManaRatio(input: OverheadHudCueInput): number {
  if (typeof input.contextMana === "number") {
    return Math.max(0, Math.min(1, input.contextMana));
  }
  if (input.contextMana && typeof input.contextMana === "object") {
    if (typeof input.contextMana.fillRatio === "number") {
      return Math.max(0, Math.min(1, input.contextMana.fillRatio));
    }
    const used = input.contextMana.usedTokens ?? 0;
    const limit = input.contextMana.limitTokens ?? 200_000;
    if (limit > 0) {
      return Math.max(0, Math.min(1, used / limit));
    }
  }
  if (typeof input.contextManaRatio === "number") {
    return Math.max(0, Math.min(1, input.contextManaRatio));
  }
  return 0.15;
}

export function stampMonogramGlyphs(
  pixels: (string | null)[][],
  monogram: string,
): MonogramGlyphBitmap[] {
  const monogramGlyphs: MonogramGlyphBitmap[] = [];
  for (let i = 0; i < 3; i += 1) {
    const ch = monogram[i];
    const bitmap = MONOGRAM_FONT_3X5[ch] ?? MONOGRAM_FONT_3X5.X;
    const offsetX = 1 + i * 4;
    const offsetY = 1;
    monogramGlyphs.push({ char: ch, offsetX, offsetY, bitmap });
    for (let gy = 0; gy < 5; gy += 1) {
      for (let gx = 0; gx < 3; gx += 1) {
        if (bitmap[gy][gx] === "#") {
          pixels[offsetY + gy][offsetX + gx] = "#f8fafc";
        }
      }
    }
  }
  return monogramGlyphs;
}

export function computeOverheadHudCue(
  input: OverheadHudCueInput,
): OverheadHudCueResult {
  const zoom = Math.max(0.1, input.zoom ?? 1.0);
  const lodTier: OverheadZoomLodTier =
    zoom >= 0.85 ? "full" : zoom >= 0.5 ? "compact" : "minimal";

  const fillRatio = resolveContextManaRatio(input);
  const isDistilling = input.lifecycleState === "DistillingContextMana";
  const severity: ContextManaSeverity = isDistilling
    ? "distilling"
    : fillRatio >= 0.85
      ? "critical"
      : fillRatio >= 0.6
        ? "elevated"
        : "normal";

  const fillHex =
    severity === "distilling"
      ? "#22d3ee"
      : severity === "critical"
        ? "#ef4444"
        : severity === "elevated"
          ? "#f59e0b"
          : "#38bdf8";

  const trackHex = "#1e293b";
  const borderHex = "#0f172a";

  const showManaBar = lodTier !== "minimal";
  const totalSegments =
    lodTier === "full" ? 8 : lodTier === "compact" ? 6 : 0;
  const filledSegments = showManaBar
    ? Math.max(0, Math.min(totalSegments, Math.round(fillRatio * totalSegments)))
    : 0;
  const widthPx = lodTier === "full" ? 12 : lodTier === "compact" ? 8 : 0;
  const heightPx = lodTier === "full" ? 3 : lodTier === "compact" ? 2 : 0;

  const manaPixels: (string | null)[][] = [];
  if (showManaBar && widthPx > 0 && heightPx > 0) {
    for (let y = 0; y < heightPx; y += 1) {
      const row: (string | null)[] = [];
      for (let x = 0; x < widthPx; x += 1) {
        const isBorder =
          x === 0 ||
          x === widthPx - 1 ||
          (heightPx === 3 && (y === 0 || y === heightPx - 1));
        if (isBorder) {
          row.push(borderHex);
        } else {
          const innerIdx = x - 1;
          const innerWidth = widthPx - 2;
          const segIdx = Math.floor((innerIdx / innerWidth) * totalSegments);
          row.push(segIdx < filledSegments ? fillHex : trackHex);
        }
      }
      manaPixels.push(row);
    }
  }

  const emblems: OverheadGrimoireEmblemPip[] = [];
  const timestampMs = input.timestampMs ?? 0;
  const bobOffsetY = Math.floor(timestampMs / 200) % 2 === 1 ? -1 : 0;

  let questGateBadge: OverheadHudCueResult["questGateBadge"];
  if (!input.questGate) {
    questGateBadge = {
      visible: false,
      kind: null,
      marker: null,
      shape: null,
      title: null,
      primaryHex: null,
      accentHex: null,
      beaconMode: false,
      bobOffsetY: 0,
      offsetY: -14,
      pixels: [],
    };
  } else {
    const kind: QuestGateKind = input.questGate.kind;
    const marker: "!" | "?" =
      input.questGate.marker ?? (kind === "permission" ? "!" : "?");
    const isPermission = kind === "permission" || marker === "!";
    const primaryHex = isPermission ? "#f59e0b" : "#38bdf8";
    const accentHex = isPermission ? "#fef08a" : "#e0f2fe";
    const shape = isPermission ? "padlock-shield" : "unfurled-scroll";
    const template = isPermission
      ? PERMISSION_LOCK_TEMPLATE
      : QUESTION_SCROLL_TEMPLATE;

    questGateBadge = {
      visible: true,
      kind,
      marker,
      shape,
      title: input.questGate.title ?? null,
      primaryHex,
      accentHex,
      beaconMode: lodTier === "minimal",
      bobOffsetY,
      offsetY: -14 + bobOffsetY,
      pixels: buildQuestGateMatrix(template, primaryHex, accentHex),
    };
  }

  return {
    lodTier,
    zoom,
    contextManaBar: {
      visible: showManaBar,
      fillRatio,
      totalSegments,
      filledSegments,
      widthPx,
      heightPx,
      offsetY: -4,
      severity,
      fillHex,
      trackHex,
      borderHex,
      pixels: manaPixels,
    },
    grimoireEmblemRow: {
      visible: false,
      maxVisibleEmblems: 0,
      emblems,
      overflowCount: 0,
    },
    questGateBadge,
  };
}
