export const CORE_WORKSTATION_KINDS = [
  "Library Study Bookshelf",
  "Observatory Spyglass",
  "Anvil Forge",
  "Crafting Workbench",
  "Armory Wardrobe",
  "Arcane Lectern",
  "Alchemy Lab",
] as const;

export type CoreWorkstationKind = (typeof CORE_WORKSTATION_KINDS)[number];

export const WORKSTATION_KINDS = [
  ...CORE_WORKSTATION_KINDS,
  "Resource Stockpile",
  "Goal Assembly Site",
  "Dungeon Wilds",
] as const;

export type WorkstationKind = (typeof WORKSTATION_KINDS)[number];

export const ROOM_FIXTURE_KINDS = [
  ...WORKSTATION_KINDS,
  "Break Lounge",
  "Demolition Bomb",
] as const;

export type RoomFixtureKind = (typeof ROOM_FIXTURE_KINDS)[number];

export interface WorkstationCatalogEntry {
  readonly kind: RoomFixtureKind;
  readonly shortLabel: string;
  readonly toolsLabel: string;
  readonly mappedTools: readonly string[];
  readonly description: string;
  readonly accentHex: string;
  readonly primaryHex: string;
  readonly fixtureTile: { readonly x: number; readonly y: number };
  readonly anchorTile: { readonly x: number; readonly y: number };
}

export const WORKSTATION_CATALOG: Readonly<
  Record<RoomFixtureKind, WorkstationCatalogEntry>
> = Object.freeze({
  "Library Study Bookshelf": Object.freeze({
    kind: "Library Study Bookshelf",
    shortLabel: "LIB",
    toolsLabel: "read · grep · glob · list · lsp",
    mappedTools: Object.freeze([
      "read",
      "grep",
      "glob",
      "list",
      "ls",
      "lsp",
      "codesearch",
    ]),
    description:
      "Grand Library Archive for reading source files, directory listings, and searching symbols across the codebase.",
    accentHex: "#38bdf8",
    primaryHex: "#38bdf8",
    fixtureTile: Object.freeze({ x: 3, y: 2 }),
    anchorTile: Object.freeze({ x: 3, y: 3 }),
  }),
  "Observatory Spyglass": Object.freeze({
    kind: "Observatory Spyglass",
    shortLabel: "SPY",
    toolsLabel: "webfetch · websearch · recon",
    mappedTools: Object.freeze(["webfetch", "websearch", "fetch"]),
    description:
      "Observatory Recon Spyglass beside perimeter windows for live documentation fetches, web search, and codebase reconnaissance.",
    accentHex: "#10b981",
    primaryHex: "#10b981",
    fixtureTile: Object.freeze({ x: 7, y: 2 }),
    anchorTile: Object.freeze({ x: 7, y: 3 }),
  }),
  "Arcane Lectern": Object.freeze({
    kind: "Arcane Lectern",
    shortLabel: "LEC",
    toolsLabel: "subagent · task · todo",
    mappedTools: Object.freeze([
      "subagent",
      "task",
      "batch",
      "todowrite",
      "todoread",
    ]),
    description:
      "Ritual pentagram lectern where Guild Adventurers perform Summoning Rituals and orchestrate Squad Subagents.",
    accentHex: "#a855f7",
    primaryHex: "#a855f7",
    fixtureTile: Object.freeze({ x: 11, y: 2 }),
    anchorTile: Object.freeze({ x: 11, y: 3 }),
  }),
  "Anvil Forge": Object.freeze({
    kind: "Anvil Forge",
    shortLabel: "FRG",
    toolsLabel: "bash · shell · test",
    mappedTools: Object.freeze(["shell", "bash", "terminal", "test"]),
    description:
      "Forges builds, executes shell commands, and runs verification suites.",
    accentHex: "#f97316",
    primaryHex: "#f97316",
    fixtureTile: Object.freeze({ x: 3, y: 5 }),
    anchorTile: Object.freeze({ x: 3, y: 6 }),
  }),
  "Alchemy Lab": Object.freeze({
    kind: "Alchemy Lab",
    shortLabel: "ALC",
    toolsLabel: "execute · compact",
    mappedTools: Object.freeze(["execute", "compact", "compaction", "summarize"]),
    description:
      "Coiled Distillation Table & Cauldron for Code Mode multi-tool scripts and context distillation.",
    accentHex: "#06b6d4",
    primaryHex: "#06b6d4",
    fixtureTile: Object.freeze({ x: 8, y: 5 }),
    anchorTile: Object.freeze({ x: 8, y: 6 }),
  }),
  "Crafting Workbench": Object.freeze({
    kind: "Crafting Workbench",
    shortLabel: "WRK",
    toolsLabel: "edit · write · patch",
    mappedTools: Object.freeze([
      "edit",
      "write",
      "multiedit",
      "apply_patch",
      "notebookedit",
    ]),
    description:
      "Artificer's Tinker Bench & Blueprint Table for authoring source files, diffs, and patches in the workspace.",
    accentHex: "#eab308",
    primaryHex: "#eab308",
    fixtureTile: Object.freeze({ x: 12, y: 5 }),
    anchorTile: Object.freeze({ x: 12, y: 6 }),
  }),
  "Armory Wardrobe": Object.freeze({
    kind: "Armory Wardrobe",
    shortLabel: "ARM",
    toolsLabel: "skill · equip",
    mappedTools: Object.freeze(["skill"]),
    description:
      "Guild Armory Wardrobe where adventurers equip Skill Grimoire tomes and role-specific implements before action.",
    accentHex: "#ec4899",
    primaryHex: "#ec4899",
    fixtureTile: Object.freeze({ x: 11, y: 8 }),
    anchorTile: Object.freeze({ x: 11, y: 9 }),
  }),
  "Resource Stockpile": Object.freeze({
    kind: "Resource Stockpile",
    shortLabel: "STK",
    toolsLabel: "cargo · mcp · plugin",
    mappedTools: Object.freeze([
      "mcp:*",
      "plugin:*",
      "execute(tools.<ns>)",
      "write",
      "edit",
      "read",
      "glob",
      "grep",
      "shell",
      "execute",
      "skill",
      "webfetch",
    ]),
    description:
      "In-room supply depot stocked with Timber Planks, Stone Blocks, Iron Bars, Arcane Crystals, and Scroll Bundles representing external MCPs, plugins, and workspace cargo.",
    accentHex: "#d97706",
    primaryHex: "#d97706",
    fixtureTile: Object.freeze({ x: 13, y: 8 }),
    anchorTile: Object.freeze({ x: 12, y: 8 }),
  }),
  "Goal Assembly Site": Object.freeze({
    kind: "Goal Assembly Site",
    shortLabel: "ASM",
    toolsLabel: "tasks · assembly · commit",
    mappedTools: Object.freeze(["todowrite", "todoread"]),
    description:
      "Central construction platform where crafted Assembly Parts are fitted into the rising project artifact.",
    accentHex: "#fbbf24",
    primaryHex: "#d97706",
    fixtureTile: Object.freeze({ x: 8, y: 5 }),
    anchorTile: Object.freeze({ x: 8, y: 4 }),
  }),
  "Dungeon Wilds": Object.freeze({
    kind: "Dungeon Wilds",
    shortLabel: "WLD",
    toolsLabel: "hunt · diagnosing-bugs · combat",
    mappedTools: Object.freeze(["hunt", "test"]),
    description:
      "Untamed wilderness expanse outside the Workshop Room walls where adventurers scout tracks and fight Bug Monsters.",
    accentHex: "#ef4444",
    primaryHex: "#ef4444",
    fixtureTile: Object.freeze({ x: 15, y: 5 }),
    anchorTile: Object.freeze({ x: 14, y: 5 }),
  }),
  "Break Lounge": Object.freeze({
    kind: "Break Lounge",
    shortLabel: "LNG",
    toolsLabel: "session.idle · Hearth & Bench",
    mappedTools: Object.freeze(["session.idle"]),
    description:
      "Houses recently-idle sessions at the Hearth Table, historical sessions on the Session Bench, and Squad Subagent trophy scrolls.",
    accentHex: "#f59e0b",
    primaryHex: "#b45309",
    fixtureTile: Object.freeze({ x: 3, y: 9 }),
    anchorTile: Object.freeze({ x: 3, y: 9 }),
  }),
  "Demolition Bomb": Object.freeze({
    kind: "Demolition Bomb",
    shortLabel: "BMB",
    toolsLabel: "DELETE /api/session · /api/worktree · /api/debug/location",
    mappedTools: Object.freeze([
      "DELETE /api/session/{sessionID}",
      "DELETE /api/pty/{ptyID}",
      "DELETE /api/shell/{id}",
      "DELETE /api/worktree",
      "DELETE /api/debug/location",
    ]),
    description:
      "Interactive in-room bomb fixture that demolishes the Workshop Room and tears down all OpenCode V2 sessions, PTYs, running shells, git worktrees, and cached daemon locations.",
    accentHex: "#ef4444",
    primaryHex: "#ef4444",
    fixtureTile: Object.freeze({ x: 14, y: 10 }),
    anchorTile: Object.freeze({ x: 13, y: 10 }),
  }),
});

export const COMPACTION_EXHALATION_CONFIG = Object.freeze({
  durationMs: 900,
  inPlace: true,
  cloudRadius: 28,
  vaporStyle: "misty-breath" as const,
  reliefRatio: 0.75,
});

export const CANONICAL_PREPARATION_STATION_IDS = [
  "Library",
  "Spyglass",
  "Forge",
  "Tinker",
  "Armory",
  "Enchanter",
  "Alchemy",
  "Stockpile",
  "Assembly",
  "Lounge",
  "WildsSearch",
  "Combat",
] as const;

export type CanonicalPreparationStationId =
  (typeof CANONICAL_PREPARATION_STATION_IDS)[number];

export const PREPARATION_STATION_DISPLAY_NAMES = Object.freeze({
  Library: "Library Study Bookshelf",
  Spyglass: "Observatory Spyglass",
  Forge: "Anvil Forge",
  Tinker: "Crafting Workbench",
  Armory: "Armory Wardrobe",
  Enchanter: "Arcane Lectern",
  Alchemy: "Alchemy Lab",
  Stockpile: "Resource Stockpile",
  Assembly: "Goal Assembly Site",
  Lounge: "Break Lounge",
  WildsSearch: "Dungeon Wilds",
  Combat: "Dungeon Wilds",
} as const satisfies Record<CanonicalPreparationStationId, WorkstationKind | RoomFixtureKind>);

export type PreparationStationDisplayName =
  (typeof PREPARATION_STATION_DISPLAY_NAMES)[CanonicalPreparationStationId];
