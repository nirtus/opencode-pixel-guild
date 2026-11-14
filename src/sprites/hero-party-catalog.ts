import type { GuildRoleArchetype } from "../types/domain.ts";

export type DirectionalTurnaround = "south" | "east" | "west" | "north";

export type ArticulatedRigPoseKind =
  | "idle"
  | "walk"
  | "forge"
  | "tinker"
  | "library"
  | "spyglass"
  | "alchemy"
  | "spellcast"
  | "combat"
  | "exhale";

export type HeroEquipmentLoadoutMode = "A" | "B" | "OPENCODE" | "CARGO" | "SCROLL";

export type CombatWeaponArchetypeKind =
  | "sword"
  | "staff"
  | "bow"
  | "pickaxe"
  | "dagger";

export interface CanonicalHeroDef {
  readonly name: string;
  readonly role: GuildRoleArchetype;
  readonly skin: string;
  readonly hair: string;
  readonly eyes: string;
  readonly beard: boolean;
  readonly mustache: boolean;
  readonly helm:
    | "headband"
    | "horned"
    | "hat"
    | "hood"
    | "bun"
    | "hair"
    | "circlet"
    | "circlet-bald"
    | "bun-circlet"
    | "hardhat";
  readonly expr: "smile" | "grin" | "frown" | "stoic";
}

export interface CanonicalPartyRoster {
  readonly id: string;
  readonly key: string;
  readonly name: string;
  readonly motto: string;
  readonly bg: string;
  readonly cardBg: string;
  readonly textCol: string;
  readonly aura: string;
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly metal: string;
  readonly metalDark: string;
  readonly heroes: readonly CanonicalHeroDef[];
}

export const CANONICAL_PARTY_ROSTERS: Readonly<Record<string, CanonicalPartyRoster>> = Object.freeze({
  "01": {
    id: "I", key: "01", name: "EMBERFALL VANGUARD", motto: "First into the fire.",
    bg: "#efe2d6", cardBg: "#fbf6f1", textCol: "#3b2316", aura: "#f9dcc4",
    primary: "#c83d28", secondary: "#e6a82e", accent: "#f27324", metal: "#c2cbd4", metalDark: "#8c96a1",
    heroes: [
      { name: "Brann Emberfist", role: "WARRIOR", skin: "#c8966e", hair: "#7c3215", eyes: "#5a3821", beard: true, mustache: true, helm: "headband", expr: "stoic" },
      { name: "Ilsa Cinderveil", role: "MAGE", skin: "#f4d2bc", hair: "#cc4425", eyes: "#2a7b4c", beard: false, mustache: false, helm: "hat", expr: "smile" },
      { name: "Kael Ashstride", role: "SCOUT", skin: "#a16e4b", hair: "#2b1d16", eyes: "#8c5220", beard: false, mustache: false, helm: "hood", expr: "smile" },
      { name: "Pip Sparkwhistle", role: "ALCHEMIST", skin: "#f4d2bc", hair: "#e0b354", eyes: "#2563eb", beard: false, mustache: false, helm: "bun", expr: "grin" },
      { name: "Sister Marra Flameheart", role: "CLERIC", skin: "#784f33", hair: "#1f1815", eyes: "#3b281e", beard: false, mustache: false, helm: "circlet", expr: "smile" },
      { name: "Gorrik Blastbeard", role: "SAPPER", skin: "#e0b596", hair: "#888c94", eyes: "#5a3821", beard: true, mustache: true, helm: "hardhat", expr: "grin" },
    ],
  },
  "02": {
    id: "II", key: "02", name: "FROSTMERE WARDENS", motto: "The cold keeps watch.",
    bg: "#dce8f2", cardBg: "#f5f9fc", textCol: "#162d47", aura: "#d9effc",
    primary: "#2b547e", secondary: "#8eb8d9", accent: "#62b6ea", metal: "#d0dae5", metalDark: "#8f9fad",
    heroes: [
      { name: "Sigrun Icemantle", role: "WARRIOR", skin: "#f4d2bc", hair: "#e8d8c0", eyes: "#3b5978", beard: false, mustache: false, helm: "horned", expr: "frown" },
      { name: "Eiran Frostweave", role: "MAGE", skin: "#c9dce8", hair: "#ffffff", eyes: "#1b7a7c", beard: false, mustache: false, helm: "hat", expr: "smile" },
      { name: "Tova Whitepine", role: "SCOUT", skin: "#ecc3a5", hair: "#d49b4b", eyes: "#2563eb", beard: false, mustache: false, helm: "hood", expr: "smile" },
      { name: "Olen Rimeglass", role: "ALCHEMIST", skin: "#a87654", hair: "#472916", eyes: "#5a3821", beard: true, mustache: true, helm: "hair", expr: "grin" },
      { name: "Father Haldor", role: "CLERIC", skin: "#f2ccb3", hair: "#b5bcc4", eyes: "#2563eb", beard: true, mustache: true, helm: "circlet-bald", expr: "grin" },
      { name: "Nissa Coldforge", role: "SAPPER", skin: "#a6724f", hair: "#2b1d16", eyes: "#3b2316", beard: false, mustache: false, helm: "hardhat", expr: "frown" },
    ],
  },
  "03": {
    id: "III", key: "03", name: "VERDANT THORN", motto: "Root, branch and blade.",
    bg: "#e1ecd8", cardBg: "#f6faf2", textCol: "#1a3a22", aura: "#dff0cf",
    primary: "#34673d", secondary: "#a79267", accent: "#7ce04b", metal: "#c4c9be", metalDark: "#878f81",
    heroes: [
      { name: "Thorne Oakhart", role: "WARRIOR", skin: "#94b87b", hair: "#282623", eyes: "#8c5220", beard: false, mustache: false, helm: "headband", expr: "frown" },
      { name: "Willow Mossweaver", role: "MAGE", skin: "#dcb08e", hair: "#1f7a7c", eyes: "#226b42", beard: false, mustache: false, helm: "hat", expr: "smile" },
      { name: "Fen Quickbriar", role: "SCOUT", skin: "#f0c9ad", hair: "#7c3215", eyes: "#2a7b4c", beard: false, mustache: false, helm: "hood", expr: "grin" },
      { name: "Bramble Toadwick", role: "ALCHEMIST", skin: "#a87654", hair: "#472916", eyes: "#5a3821", beard: false, mustache: false, helm: "bun", expr: "grin" },
      { name: "Elder Rowan", role: "CLERIC", skin: "#734a2e", hair: "#ffffff", eyes: "#3b2316", beard: true, mustache: true, helm: "circlet-bald", expr: "smile" },
      { name: "Mudge Rootdigger", role: "SAPPER", skin: "#ecc3a5", hair: "#52321b", eyes: "#5a3821", beard: true, mustache: true, helm: "hardhat", expr: "smile" },
    ],
  },
  "04": {
    id: "IV", key: "04", name: "DUSKBORNE CIRCLE", motto: "We walk where light forgets.",
    bg: "#e6dff0", cardBg: "#f9f6fc", textCol: "#271b3d", aura: "#eadcf8",
    primary: "#4d387a", secondary: "#a97ee8", accent: "#b784f7", metal: "#c6c0d4", metalDark: "#857d99",
    heroes: [
      { name: "Vex Nightblade", role: "WARRIOR", skin: "#f4d2bc", hair: "#241d26", eyes: "#6d3eb8", beard: false, mustache: false, helm: "headband", expr: "smile" },
      { name: "Morwen Duskwhisper", role: "MAGE", skin: "#784f33", hair: "#6d3eb8", eyes: "#6d3eb8", beard: false, mustache: false, helm: "hat", expr: "smile" },
      { name: "Shade Ravenlock", role: "SCOUT", skin: "#dcb08e", hair: "#1f1815", eyes: "#3b5978", beard: false, mustache: false, helm: "hood", expr: "frown" },
      { name: "Nyx Vialroot", role: "ALCHEMIST", skin: "#ecc3a5", hair: "#5e3ea1", eyes: "#2a7b4c", beard: false, mustache: false, helm: "bun", expr: "grin" },
      { name: "Brother Umbral", role: "CLERIC", skin: "#a16e4b", hair: "#241d26", eyes: "#3b2316", beard: true, mustache: true, helm: "circlet", expr: "frown" },
      { name: "Grim Fusewright", role: "SAPPER", skin: "#b0a9bd", hair: "#5e3ea1", eyes: "#6d3eb8", beard: false, mustache: false, helm: "hardhat", expr: "smile" },
    ],
  },
  "05": {
    id: "V", key: "05", name: "SUNSPIRE ORDER", motto: "Light the way.",
    bg: "#f2ead6", cardBg: "#fcf9f2", textCol: "#3d2c12", aura: "#f9ecc7",
    primary: "#d4a634", secondary: "#f7f3e6", accent: "#f5c23b", metal: "#e8d292", metalDark: "#b89b4a",
    heroes: [
      { name: "Dame Aurelia", role: "WARRIOR", skin: "#f4d2bc", hair: "#dca442", eyes: "#2563eb", beard: false, mustache: false, helm: "headband", expr: "frown" },
      { name: "Solan Brightquill", role: "MAGE", skin: "#784f33", hair: "#241d26", eyes: "#5a3821", beard: false, mustache: false, helm: "hat", expr: "smile" },
      { name: "Lark Goldwind", role: "SCOUT", skin: "#f4d2bc", hair: "#7c3215", eyes: "#2a7b4c", beard: false, mustache: false, helm: "hood", expr: "grin" },
      { name: "Master Calix", role: "ALCHEMIST", skin: "#c8966e", hair: "#888c94", eyes: "#5a3821", beard: true, mustache: true, helm: "hair", expr: "smile" },
      { name: "High Priestess Seraphine", role: "CLERIC", skin: "#784f33", hair: "#f7f3e6", eyes: "#8c5220", beard: false, mustache: false, helm: "bun-circlet", expr: "smile" },
      { name: "Dunkel Brasshammer", role: "SAPPER", skin: "#ecc3a5", hair: "#b53c20", eyes: "#5a3821", beard: true, mustache: true, helm: "hardhat", expr: "grin" },
    ],
  },
  "06": {
    id: "VI", key: "06", name: "TIDECALL CREW", motto: "Ride the storm, keep the tide.",
    bg: "#d8eee9", cardBg: "#f4fbf9", textCol: "#103738", aura: "#d5f2ed",
    primary: "#1c7274", secondary: "#f08265", accent: "#4ad6d1", metal: "#c2d4d6", metalDark: "#829c9e",
    heroes: [
      { name: "Captain Rook Saltblade", role: "WARRIOR", skin: "#825536", hair: "#1f1815", eyes: "#3b2316", beard: true, mustache: true, helm: "headband", expr: "grin" },
      { name: "Marina Deepcurrent", role: "MAGE", skin: "#c8966e", hair: "#1a7a7c", eyes: "#1b7a7c", beard: false, mustache: false, helm: "hat", expr: "smile" },
      { name: "Gull Swiftwave", role: "SCOUT", skin: "#ecc3a5", hair: "#d49b4b", eyes: "#2563eb", beard: false, mustache: false, helm: "hood", expr: "smile" },
      { name: "Coral Brinewick", role: "ALCHEMIST", skin: "#784f33", hair: "#d1548f", eyes: "#5a3821", beard: false, mustache: false, helm: "bun", expr: "grin" },
      { name: "Sister Pearl", role: "CLERIC", skin: "#f4d2bc", hair: "#e8dfd1", eyes: "#1b7a7c", beard: false, mustache: false, helm: "circlet", expr: "smile" },
      { name: "Barnacle Bix", role: "SAPPER", skin: "#c8966e", hair: "#8a3319", eyes: "#5a3821", beard: true, mustache: true, helm: "hardhat", expr: "smile" },
    ],
  },
  "07": {
    id: "VII", key: "07", name: "IRONVALE COMPANY", motto: "Forged, not born.",
    bg: "#e6e1da", cardBg: "#f9f7f4", textCol: "#282624", aura: "#f4e3cc",
    primary: "#434a54", secondary: "#d96b27", accent: "#f59e0b", metal: "#b8c0c8", metalDark: "#7a828a",
    heroes: [
      { name: "Hilda Steelborn", role: "WARRIOR", skin: "#f0c9ad", hair: "#9c4122", eyes: "#3b5978", beard: false, mustache: false, helm: "horned", expr: "frown" },
      { name: "Torvin Gearmage", role: "MAGE", skin: "#a87654", hair: "#888c94", eyes: "#5a3821", beard: true, mustache: true, helm: "hat", expr: "smile" },
      { name: "Rivet Quickshot", role: "SCOUT", skin: "#dcb08e", hair: "#241d26", eyes: "#5a3821", beard: false, mustache: false, helm: "hood", expr: "grin" },
      { name: "Greta Coalbrew", role: "ALCHEMIST", skin: "#f4d2bc", hair: "#472916", eyes: "#2a7b4c", beard: false, mustache: false, helm: "bun", expr: "smile" },
      { name: "Father Anvil", role: "CLERIC", skin: "#825536", hair: "#1f1815", eyes: "#3b2316", beard: true, mustache: true, helm: "circlet-bald", expr: "frown" },
      { name: "Boom Ironsides", role: "SAPPER", skin: "#ecc3a5", hair: "#b53c20", eyes: "#5a3821", beard: true, mustache: true, helm: "hardhat", expr: "grin" },
    ],
  },
  "09": {
    id: "IX", key: "09", name: "SANDREACH NOMADS", motto: "The dunes remember.",
    bg: "#efe4cc", cardBg: "#fbf7ef", textCol: "#3d2b18", aura: "#d8f0e8",
    primary: "#1e7e7a", secondary: "#d49137", accent: "#38bdf8", metal: "#d8c49e", metalDark: "#a68e63",
    heroes: [
      { name: "Zahir Duneblade", role: "WARRIOR", skin: "#784f33", hair: "#1f1815", eyes: "#3b2316", beard: true, mustache: true, helm: "headband", expr: "frown" },
      { name: "Samira Mirage", role: "MAGE", skin: "#a87654", hair: "#1f1815", eyes: "#8c5220", beard: false, mustache: false, helm: "hat", expr: "smile" },
      { name: "Kesh Sandrunner", role: "SCOUT", skin: "#c8966e", hair: "#472916", eyes: "#5a3821", beard: false, mustache: false, helm: "hood", expr: "smile" },
      { name: "Old Tariq", role: "ALCHEMIST", skin: "#825536", hair: "#ffffff", eyes: "#3b2316", beard: true, mustache: true, helm: "circlet-bald", expr: "grin" },
      { name: "Aya Sunwell", role: "CLERIC", skin: "#c8966e", hair: "#5c3820", eyes: "#5a3821", beard: false, mustache: false, helm: "circlet", expr: "smile" },
      { name: "Dusty Kettlebomb", role: "SAPPER", skin: "#f4d2bc", hair: "#a66c38", eyes: "#2a7b4c", beard: false, mustache: false, helm: "hardhat", expr: "grin" },
    ],
  },
  "10": {
    id: "X", key: "10", name: "STORMCREST LEGION", motto: "Thunder answers.",
    bg: "#dfe4ee", cardBg: "#f6f8fc", textCol: "#192642", aura: "#dde5f7",
    primary: "#233c78", secondary: "#e3b430", accent: "#60a5fa", metal: "#c6d0de", metalDark: "#8592a6",
    heroes: [
      { name: "Commander Varek", role: "WARRIOR", skin: "#c8966e", hair: "#241d26", eyes: "#5a3821", beard: true, mustache: true, helm: "horned", expr: "frown" },
      { name: "Tempest Voss", role: "MAGE", skin: "#f4d2bc", hair: "#e8dfd1", eyes: "#2563eb", beard: false, mustache: false, helm: "hat", expr: "grin" },
      { name: "Wren Galeheart", role: "SCOUT", skin: "#f4d2bc", hair: "#241d26", eyes: "#3b5978", beard: false, mustache: false, helm: "hood", expr: "frown" },
      { name: "Quill Sparkvial", role: "ALCHEMIST", skin: "#784f33", hair: "#1f1815", eyes: "#8c5220", beard: false, mustache: false, helm: "hair", expr: "grin" },
      { name: "Sister Halcyon", role: "CLERIC", skin: "#c8966e", hair: "#d49b4b", eyes: "#2563eb", beard: false, mustache: false, helm: "circlet", expr: "smile" },
      { name: "Thud Boltworth", role: "SAPPER", skin: "#dcb08e", hair: "#888c94", eyes: "#5a3821", beard: true, mustache: true, helm: "hardhat", expr: "grin" },
    ],
  },
});

export const PARTY_KEY_ORDER: readonly string[] = Object.freeze(Object.keys(CANONICAL_PARTY_ROSTERS));
