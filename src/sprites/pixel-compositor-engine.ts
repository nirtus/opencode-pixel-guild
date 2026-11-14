import { deriveVisualTraits } from "../capability/classifier.ts";
import {
  LIFECYCLE_TIMERS_MS,
  type CharacterErrorState,
  type CharacterLifecycleState,
  type ReportScrollState,
  type RoomFixtureKind,
} from "../types/domain.ts";
import {
  applyPass3SquadLineage,
  HEADGEAR_ROWS,
  mapTemplateTokenToHex,
  OUTFIT_BODY_ROWS,
  resolvePass1ClassSilhouette,
} from "./pixel-class-matrices.ts";
import { applyPass2SkillGrimoire } from "./pixel-gear-matrices.ts";
import { computeOverheadHudCue } from "./pixel-hud-glyphs.ts";
import {
  FRAME_DURATION_MS,
  SPRITE_GRID_SIZE,
  type ComposeCharacterSpriteInput,
  type OverheadHudCueResult,
  type Pass1ClassSilhouetteResult,
  type Pass2SkillGrimoireResult,
  type Pass3SquadLineageResult,
  type RisingRuneGlyph,
  type SmokeParticleVisual,
  type StationAnimationEffectKind,
  type StationEffectFrameResult,
  type TelemetryBeamAnimationInput,
  type TelemetryBeamPulseState,
  type ToolSparkParticle,
} from "./pixel-types-and-palettes.ts";

export type {
  StationAnimationEffectKind,
  StationEffectFrameResult,
  TelemetryBeamAnimationInput,
  TelemetryBeamPulseState,
  ToolSparkParticle,
};

const STATION_EFFECT_MAP: Partial<Record<string, StationAnimationEffectKind>> = {
  "Anvil Forge": "forge-sparks",
  "Library Study Bookshelf": "page-flips",
  "Crafting Workbench": "page-flips",
  "Observatory Spyglass": "radar-sweep",
  "Arcane Lectern": "lectern-rune-study",
  "Armory Wardrobe": "lectern-rune-study",
  "Alchemy Lab": "reactor-telemetry-beams",
  "Resource Stockpile": "alcove-channeling",
};

function computeStationEffectState(input: {
  isWorking: boolean;
  workstation: RoomFixtureKind | null;
  timestampMs: number;
  spriteSheetFrame: 0 | 1 | 2 | 3;
  stateEnteredAtMs?: number;
  dwellUntilMs?: number | null;
  secondaryAlcoveTargets?: string[];
  telemetryBeams?: TelemetryBeamAnimationInput[];
  accentHex: string;
}): StationEffectFrameResult {
  const { isWorking, workstation, timestampMs, spriteSheetFrame, accentHex } = input;
  const effectKind: StationAnimationEffectKind =
    isWorking && workstation ? (STATION_EFFECT_MAP[workstation] ?? "none") : "none";
  const enteredAt = input.stateEnteredAtMs ?? 0;
  const lecternTotalDwell =
    input.dwellUntilMs && input.dwellUntilMs > enteredAt
      ? input.dwellUntilMs - enteredAt
      : LIFECYCLE_TIMERS_MS.ARCANE_LECTERN_MIN_DWELL_MS;
  const pageFlipFrame = (Math.floor(timestampMs / 120) % 4) as 0 | 1 | 2 | 3;
  const runeYShift = pageFlipFrame % 2;
  const risingRunes: RisingRuneGlyph[] =
    effectKind === "lectern-rune-study"
      ? [
          { glyph: "*", x: 5, y: 2 - runeYShift, colorHex: accentHex, alpha: 0.9 },
          { glyph: "+", x: 8, y: 1 + runeYShift, colorHex: accentHex, alpha: 0.9 },
          { glyph: "^", x: 11, y: 3 - runeYShift, colorHex: accentHex, alpha: 0.9 },
        ]
      : [];
  const beamInputs: TelemetryBeamAnimationInput[] =
    input.telemetryBeams && input.telemetryBeams.length > 0
      ? input.telemetryBeams
      : (input.secondaryAlcoveTargets ?? []).map((ns, idx) => ({
          beamId: `beam:${ns}`,
          targetNamespace: ns,
          sourceTile: { x: 8, y: 5 },
          targetTile: { x: 17 + idx * 3, y: 3 },
          colorHex: deriveVisualTraits(ns).primaryHex,
        }));

  return {
    active: isWorking,
    workstation,
    effectKind,
    toolSparks:
      effectKind === "forge-sparks"
        ? [
            { x: 5 - (spriteSheetFrame % 2), y: 6 - spriteSheetFrame, vx: -1.2, vy: -2.0, colorHex: "#fde047", alpha: 0.95 },
            { x: 8, y: 5 - (spriteSheetFrame % 3), vx: 0.4, vy: -2.4, colorHex: "#f97316", alpha: 0.9 },
            { x: 11 + (spriteSheetFrame % 2), y: 6 - spriteSheetFrame, vx: 1.5, vy: -1.8, colorHex: "#fef08a", alpha: 0.85 },
          ]
        : [],
    pageFlipFrame,
    radarSweepAngleDeg: effectKind === "radar-sweep" ? Number(((timestampMs * 0.24) % 360).toFixed(2)) : 0,
    lecternStudy: {
      active: effectKind === "lectern-rune-study",
      dwellProgress:
        effectKind === "lectern-rune-study"
          ? Number(Math.max(0, Math.min(1, (timestampMs - enteredAt) / lecternTotalDwell)).toFixed(4))
          : 0,
      pageFlipFrame: effectKind === "lectern-rune-study" ? pageFlipFrame : 0,
      risingRunes,
    },
    telemetryBeamPulses:
      effectKind === "reactor-telemetry-beams"
        ? beamInputs.map((b, idx) => {
            const pulsePhase = Number((((timestampMs / 800 + idx * 0.25) % 1 + 1) % 1).toFixed(4));
            return {
              beamId: b.beamId ?? `beam:${b.targetNamespace}`,
              targetNamespace: b.targetNamespace,
              pulsePhase,
              packetTile: {
                x: Number((b.sourceTile.x + (b.targetTile.x - b.sourceTile.x) * pulsePhase).toFixed(2)),
                y: Number((b.sourceTile.y + (b.targetTile.y - b.sourceTile.y) * pulsePhase).toFixed(2)),
              },
              colorHex: b.colorHex ?? deriveVisualTraits(b.targetNamespace).primaryHex,
            };
          })
        : [],
  };
}

export interface ComputeAnimationFrameStateInput {
  lifecycleState: CharacterLifecycleState;
  timestampMs: number;
  stateEnteredAtMs?: number;
  dwellUntilMs?: number | null;
  activeWorkstation?: RoomFixtureKind | null;
  secondaryAlcoveTargets?: string[];
  telemetryBeams?: TelemetryBeamAnimationInput[];
  reportScroll?: ReportScrollState | null;
  hasReportScroll?: boolean;
  errorState?: CharacterErrorState | null;
  accentHex?: string;
}

export interface AnimationFrameStateResult {
  fps: 60;
  frameDurationMs: number;
  frame60Index: number;
  spriteSheetFrame: 0 | 1 | 2 | 3;
  bobOffsetY: -1 | 0 | 1;
  thinkingAura: {
    active: boolean;
    pulsePhase: number;
    ringRadiusPx: number;
    alpha: number;
    thoughtRunes: Array<{ x: number; y: number; colorHex: string }>;
  };
  stationEffect: StationEffectFrameResult;
  distillingCrystalEffect: {
    active: boolean;
    progress: number;
    crystalRotationDeg: number;
    risingShards: Array<{ x: number; y: number; colorHex: string; alpha: number }>;
  };
  reportScrollEffect: {
    active: boolean;
    scrollBobOffsetY: number;
    ribbonFlutterFrame: 0 | 1 | 2 | 3;
    sealGlowAlpha: number;
    handoffSparkles: Array<{ x: number; y: number; colorHex: string }>;
  };
  errorSmokeEffect: {
    active: boolean;
    retryCount: number;
    mode: "error-smoke" | "retry-amber-sparks" | "none";
    puffs: SmokeParticleVisual[];
  };
}

export interface ComposedCharacterSprite {
  width: number;
  height: number;
  characterId: string;
  sessionId: string;
  pixels: (string | null)[][];
  templateRows: string[];
  passes: {
    pass1ClassSilhouette: Pass1ClassSilhouetteResult;
    pass2SkillGrimoire: Pass2SkillGrimoireResult;
    pass3SquadLineage: Pass3SquadLineageResult;
    pass4OverheadCue: OverheadHudCueResult;
  };
  animation: AnimationFrameStateResult;
}

export function composeCharacterSprite(
  input: ComposeCharacterSpriteInput,
): ComposedCharacterSprite {
  const sessionId = input.sessionId ?? input.characterId ?? "ses_default";
  const characterId = input.characterId ?? sessionId;
  const pass1 = resolvePass1ClassSilhouette(input);
  const templateRows: string[] = [
    "................",
    ...HEADGEAR_ROWS[pass1.headgear],
    ...OUTFIT_BODY_ROWS[pass1.outfitArchetype],
    "................",
  ];
  const pixels: (string | null)[][] = templateRows.map((row) =>
    row.split("").map((ch) => mapTemplateTokenToHex(ch, pass1.palette)),
  );
  const pass2 = applyPass2SkillGrimoire(pixels, input);
  const pass3 = applyPass3SquadLineage(pixels, templateRows, input);
  const pass4 = computeOverheadHudCue({
    zoom: input.zoom,
    lifecycleState: input.lifecycleState,
    contextMana: input.contextMana,
    contextManaRatio: input.contextManaRatio,
    skillGrimoires: input.skillGrimoires,
    questGate: input.questGate,
    timestampMs: input.timestampMs,
  });
  const animation = computeAnimationFrameState({
    lifecycleState: input.lifecycleState ?? "RestingInLounge",
    timestampMs: input.timestampMs ?? 0,
    stateEnteredAtMs: input.stateEnteredAtMs,
    dwellUntilMs: input.dwellUntilMs,
    activeWorkstation: input.activeWorkstation,
    secondaryAlcoveTargets: input.secondaryAlcoveTargets,
    reportScroll: input.reportScroll,
    hasReportScroll: input.hasReportScroll,
    errorState: input.errorState,
    accentHex: pass2.primaryGrimoire?.emblemHex ?? pass1.palette.auraHex,
  });

  return {
    width: SPRITE_GRID_SIZE,
    height: SPRITE_GRID_SIZE,
    characterId,
    sessionId,
    pixels,
    templateRows,
    passes: {
      pass1ClassSilhouette: pass1,
      pass2SkillGrimoire: pass2,
      pass3SquadLineage: pass3,
      pass4OverheadCue: pass4,
    },
    animation,
  };
}

export function computeAnimationFrameState(
  input: ComputeAnimationFrameStateInput,
): AnimationFrameStateResult {
  const timestampMs = Math.max(0, input.timestampMs);
  const frame60Index = Math.round(timestampMs / FRAME_DURATION_MS);
  const spriteSheetFrame = (Math.floor(frame60Index / 6) % 4) as 0 | 1 | 2 | 3;
  const bobCycle = Math.floor(frame60Index / 15) % 4;
  const bobOffsetY: -1 | 0 | 1 = bobCycle === 1 ? -1 : bobCycle === 3 ? 1 : 0;
  const isThinking = input.lifecycleState === "Thinking";
  const thinkingPulsePhase = Number(((timestampMs % 1000) / 1000).toFixed(4));
  const thinkingSine = Math.sin(thinkingPulsePhase * Math.PI * 2);
  const accentHex = input.accentHex ?? "#60a5fa";
  const isWorking = input.lifecycleState === "WorkingAtStation";
  const workstation = input.activeWorkstation ?? null;
  const enteredAt = input.stateEnteredAtMs ?? 0;

  const stationEffect = computeStationEffectState({
    isWorking,
    workstation,
    timestampMs,
    spriteSheetFrame,
    stateEnteredAtMs: input.stateEnteredAtMs,
    dwellUntilMs: input.dwellUntilMs,
    secondaryAlcoveTargets: input.secondaryAlcoveTargets,
    telemetryBeams: input.telemetryBeams,
    accentHex,
  });

  const isDistilling =
    input.lifecycleState === "DistillingContextMana" || stationEffect.effectKind === "mana-distillation";
  const isReportingScroll =
    input.lifecycleState === "ReportingScroll" || Boolean(input.reportScroll) || Boolean(input.hasReportScroll);
  const hasError = Boolean(input.errorState);
  const retryCount = input.errorState?.retryCount ?? 0;
  const errorMode: AnimationFrameStateResult["errorSmokeEffect"]["mode"] =
    !hasError ? "none" : retryCount > 0 ? "retry-amber-sparks" : "error-smoke";

  return {
    fps: 60,
    frameDurationMs: Number(FRAME_DURATION_MS.toFixed(4)),
    frame60Index,
    spriteSheetFrame,
    bobOffsetY,
    thinkingAura: {
      active: isThinking,
      pulsePhase: thinkingPulsePhase,
      ringRadiusPx: isThinking ? Number((6.5 + 1.5 * thinkingSine).toFixed(3)) : 0,
      alpha: isThinking ? Number((0.7 + 0.25 * Math.abs(thinkingSine)).toFixed(3)) : 0,
      thoughtRunes: isThinking
        ? [
            { x: 3, y: 2 + (spriteSheetFrame % 2), colorHex: accentHex },
            { x: 12, y: 3 - (spriteSheetFrame % 2), colorHex: "#fef08a" },
          ]
        : [],
    },
    stationEffect,
    distillingCrystalEffect: {
      active: isDistilling,
      progress: isDistilling
        ? Number(Math.max(0, Math.min(1, (timestampMs - enteredAt) / LIFECYCLE_TIMERS_MS.DISTILLING_CONTEXT_MANA_DWELL_MS)).toFixed(4))
        : 0,
      crystalRotationDeg: isDistilling ? Number(((timestampMs * 0.3) % 360).toFixed(2)) : 0,
      risingShards: isDistilling
        ? [
            { x: 5, y: 4 - (spriteSheetFrame % 2), colorHex: "#22d3ee", alpha: 0.95 },
            { x: 8, y: 2 - (spriteSheetFrame % 2), colorHex: "#f472b6", alpha: 0.9 },
            { x: 11, y: 4 - (spriteSheetFrame % 2), colorHex: "#67e8f9", alpha: 0.85 },
          ]
        : [],
    },
    reportScrollEffect: {
      active: isReportingScroll,
      scrollBobOffsetY: isReportingScroll ? bobOffsetY : 0,
      ribbonFlutterFrame: isReportingScroll ? spriteSheetFrame : 0,
      sealGlowAlpha: isReportingScroll ? 0.9 : 0,
      handoffSparkles: isReportingScroll ? [{ x: 4, y: 4, colorHex: "#fde047" }, { x: 12, y: 5, colorHex: "#34d399" }] : [],
    },
    errorSmokeEffect: {
      active: hasError,
      retryCount,
      mode: errorMode,
      puffs: !hasError
        ? []
        : errorMode === "retry-amber-sparks"
          ? [
              { x: 5, y: 2 - (spriteSheetFrame % 2), hex: "#f59e0b", alpha: 0.9 },
              { x: 8, y: 1, hex: "#fde047", alpha: 0.85 },
              { x: 11, y: 2 - (spriteSheetFrame % 2), hex: "#f97316", alpha: 0.8 },
            ]
          : [
              { x: 5, y: 2 - (spriteSheetFrame % 2), hex: "#ef4444", alpha: 0.85 },
              { x: 8, y: 1 - (spriteSheetFrame % 2), hex: "#64748b", alpha: 0.75 },
              { x: 10, y: 2, hex: "#475569", alpha: 0.7 },
            ],
    },
  };
}
