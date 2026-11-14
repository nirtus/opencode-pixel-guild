import { deriveSquadColor } from "../state/world-reducer.ts";
import { WORKSTATION_CATALOG } from "../types/domain.ts";
import type {
  CharacterErrorState,
  CharacterLifecycleState,
  CharacterRole,
  HeadgearSilhouette,
  PluginAlcoveArchetype,
  PluginStatusKind,
  QuestGateKind,
  QuestGateState,
  ReportScrollState,
  RoomFixtureKind,
  VisualTraitPalette,
  WorkstationKind,
} from "../types/domain.ts";

export { deriveSquadColor, WORKSTATION_CATALOG };

export const SPRITE_GRID_SIZE = 16;
export const TARGET_FPS = 60;
export const FRAME_DURATION_MS = 1000 / TARGET_FPS;

export type OutfitArchetype =
  | "master-smith"
  | "strategist-scholar"
  | "pathfinder-scout"
  | "guild-warden"
  | "custom-specialist";

export interface PixelPointHex {
  x: number;
  y: number;
  hex: string;
}

export interface CharacterSpritePalette {
  primaryHex: string;
  secondaryHex: string;
  trimHex: string;
  auraHex: string;
  skinHex: string;
  outlineHex: string;
  eyeHex: string;
  bootHex: string;
  metalHex: string;
}

export interface Pass1ClassSilhouetteResult {
  agentClass: string;
  isBuiltInClass: boolean;
  outfitArchetype: OutfitArchetype;
  headgear: HeadgearSilhouette;
  monogram: string;
  palette: CharacterSpritePalette;
}

export interface SkillGrimoireInputItem {
  skillId?: string;
  skillID?: string;
  name?: string;
  emblemHex?: string;
  monogram?: string;
}

export interface ResolvedSkillGrimoireBadge {
  skillId: string;
  name: string;
  monogram: string;
  emblemHex: string;
}

export interface OrbitingGrimoireSpark {
  sparkIndex: number;
  skillId: string;
  monogram: string;
  colorHex: string;
  angleRad: number;
  x: number;
  y: number;
}

export interface Pass2SkillGrimoireResult {
  equippedCount: number;
  auraVisibility: "full" | "dormant-emblem" | "none";
  primaryGrimoire: ResolvedSkillGrimoireBadge | null;
  floatingTome: {
    visible: boolean;
    dormant: boolean;
    offsetX: number;
    offsetY: number;
    emblemHex: string | null;
    pageHex: string | null;
    badgeCount: number;
    tier: 0 | 1 | 2 | 3;
    pixelCoords: PixelPointHex[];
  };
  runeAura: {
    visible: boolean;
    colorHex: string | null;
    alpha: number;
    pixelCoords: PixelPointHex[];
  };
  orbitingSparks: OrbitingGrimoireSpark[];
  overflowSparkCount: number;
}

export interface Pass3SquadLineageResult {
  isSubagent: boolean;
  parentSessionId: string | null;
  squadTrimHex: string | null;
  floorRuneRing: {
    visible: boolean;
    colorHex: string | null;
    pixelCoords: PixelPointHex[];
  };
}

export type OverheadZoomLodTier = "full" | "compact" | "minimal";
export type ContextManaSeverity = "normal" | "elevated" | "critical" | "distilling";

export interface OverheadGrimoireEmblemPip {
  skillId: string;
  monogram: string;
  emblemHex: string;
  offsetX: number;
  offsetY: number;
}

export interface OverheadHudCueInput {
  zoom?: number;
  lifecycleState?: CharacterLifecycleState;
  contextMana?: { fillRatio?: number; usedTokens?: number; limitTokens?: number } | number;
  contextManaRatio?: number;
  skillGrimoires?: SkillGrimoireInputItem[];
  questGate?: QuestGateState | { kind: QuestGateKind; marker?: "!" | "?"; title?: string; reason?: string } | null;
  timestampMs?: number;
}

export interface OverheadHudCueResult {
  lodTier: OverheadZoomLodTier;
  zoom: number;
  contextManaBar: {
    visible: boolean;
    fillRatio: number;
    totalSegments: number;
    filledSegments: number;
    widthPx: number;
    heightPx: number;
    offsetY: number;
    severity: ContextManaSeverity;
    fillHex: string;
    trackHex: string;
    borderHex: string;
    pixels: (string | null)[][];
  };
  grimoireEmblemRow: {
    visible: boolean;
    maxVisibleEmblems: number;
    emblems: OverheadGrimoireEmblemPip[];
    overflowCount: number;
  };
  questGateBadge: {
    visible: boolean;
    kind: QuestGateKind | null;
    marker: "!" | "?" | null;
    shape: "padlock-shield" | "unfurled-scroll" | null;
    title: string | null;
    primaryHex: string | null;
    accentHex: string | null;
    beaconMode: boolean;
    bobOffsetY: number;
    offsetY: number;
    pixels: (string | null)[][];
  };
}

export interface ComposeCharacterSpriteInput {
  characterId?: string;
  sessionId?: string;
  parentId?: string | null;
  role?: CharacterRole;
  agentClass: string;
  agentColor?: string | null;
  visualTraits?: Partial<VisualTraitPalette>;
  lifecycleState?: CharacterLifecycleState;
  stateEnteredAtMs?: number;
  dwellUntilMs?: number | null;
  activeWorkstation?: WorkstationKind | null;
  secondaryAlcoveTargets?: string[];
  skillGrimoires?: SkillGrimoireInputItem[];
  grimoireAuraVisibility?: "full" | "dormant-emblem" | "none";
  squadColorHex?: string | null;
  contextMana?: { fillRatio?: number; usedTokens?: number; limitTokens?: number } | number;
  contextManaRatio?: number;
  questGate?: QuestGateState | { kind: QuestGateKind; marker?: "!" | "?"; title?: string; reason?: string } | null;
  reportScroll?: ReportScrollState | null;
  hasReportScroll?: boolean;
  errorState?: CharacterErrorState | null;
  zoom?: number;
  timestampMs?: number;
}

export interface MonogramGlyphBitmap {
  char: string;
  offsetX: number;
  offsetY: number;
  bitmap: readonly [string, string, string, string, string];
}

export interface SmokeParticleVisual {
  x: number;
  y: number;
  hex: string;
  alpha: number;
}

export interface ComposePluginAlcoveSpriteInput {
  namespace: string;
  archetype?: PluginAlcoveArchetype;
  monogram?: string;
  status?: PluginStatusKind;
  colorHex?: string;
  isOverflow?: boolean;
  active?: boolean;
  timestampMs?: number;
}

export interface ComposedPluginAlcoveSprite {
  width: number;
  height: number;
  namespace: string;
  archetype: PluginAlcoveArchetype;
  monogram: string;
  monogramGlyphs: MonogramGlyphBitmap[];
  status: PluginStatusKind;
  statusCrystal: {
    status: PluginStatusKind;
    effect: "lit-emerald" | "pulsing-amber-lock" | "red-smoke" | "unlit-stone";
    crystalHex: string;
    glowHex: string | null;
    pulseAlpha: number;
    hasLockGlyph: boolean;
    hasLockIcon: boolean;
    smokeParticles: SmokeParticleVisual[];
    pixelCoords: PixelPointHex[];
  };
  pixels: (string | null)[][];
}

export interface RisingRuneGlyph {
  glyph: string;
  x: number;
  y: number;
  colorHex: string;
  alpha: number;
}

export interface ComposeWorkstationSpriteInput {
  kind: RoomFixtureKind;
  active?: boolean;
  accentHex?: string;
  pluginNamespace?: string;
  timestampMs?: number;
}

export interface ComposedWorkstationSprite {
  width: number;
  height: number;
  kind: RoomFixtureKind;
  active: boolean;
  primaryHex: string;
  accentHex: string;
  pixels: (string | null)[][];
  arcaneLecternEffect: {
    active: boolean;
    pageFlipFrame: 0 | 1 | 2 | 3;
    illuminatedPageCoords: PixelPointHex[];
    risingRuneGlyphs: RisingRuneGlyph[];
  };
}

export type StationAnimationEffectKind =
  | "forge-sparks"
  | "page-flips"
  | "radar-sweep"
  | "lectern-rune-study"
  | "reactor-telemetry-beams"
  | "dish-signal-waves"
  | "mana-distillation"
  | "alcove-channeling"
  | "none";

export interface TelemetryBeamAnimationInput {
  beamId?: string;
  targetNamespace: string;
  sourceTile: { x: number; y: number };
  targetTile: { x: number; y: number };
  colorHex?: string;
}

export interface TelemetryBeamPulseState {
  beamId: string;
  targetNamespace: string;
  pulsePhase: number;
  packetTile: { x: number; y: number };
  colorHex: string;
}

export interface ToolSparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  colorHex: string;
  alpha: number;
}

export interface StationEffectFrameResult {
  active: boolean;
  workstation: RoomFixtureKind | null;
  effectKind: StationAnimationEffectKind;
  toolSparks: ToolSparkParticle[];
  pageFlipFrame: 0 | 1 | 2 | 3;
  radarSweepAngleDeg: number;
  lecternStudy: {
    active: boolean;
    dwellProgress: number;
    pageFlipFrame: 0 | 1 | 2 | 3;
    risingRunes: RisingRuneGlyph[];
  };
  telemetryBeamPulses: TelemetryBeamPulseState[];
}
