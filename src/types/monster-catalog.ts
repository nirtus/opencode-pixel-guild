export interface BugMonsterSeverityTier {
  readonly tier: 1 | 2 | 3 | 4;
  readonly name: "Slime" | "Goblin" | "Cyclops" | "Troll Boss";
  readonly scale: number;
  readonly role: "minor-warning" | "unit-failure" | "suite-failure" | "critical-crash";
}

export const BUG_MONSTER_SEVERITY_TIERS: readonly BugMonsterSeverityTier[] = Object.freeze([
  Object.freeze({ tier: 1, name: "Slime", scale: 0.85, role: "minor-warning" }),
  Object.freeze({ tier: 2, name: "Goblin", scale: 1.08, role: "unit-failure" }),
  Object.freeze({ tier: 3, name: "Cyclops", scale: 1.42, role: "suite-failure" }),
  Object.freeze({ tier: 4, name: "Troll Boss", scale: 1.82, role: "critical-crash" }),
]);

export function resolveBugMonsterTier(
  warningCount: number,
  retryCount: number,
  isCrashLoop: boolean,
): 1 | 2 | 3 | 4 {
  if (isCrashLoop || retryCount >= 5) return 4;
  if (retryCount >= 2 || warningCount >= 5) return 3;
  if (retryCount >= 1 || warningCount >= 1) return 2;
  return 1;
}

export interface MonsterProfile {
  readonly name: string;
  readonly file: string;
  readonly scale: number;
  readonly auraHex: string;
}

export interface MonsterLineageSet {
  readonly slime: MonsterProfile;
  readonly goblin: MonsterProfile;
  readonly cyclops: MonsterProfile;
  readonly troll: MonsterProfile;
}

export const MONSTER_LINEAGE_SETS: Readonly<Record<string, MonsterLineageSet>> = Object.freeze({
  "01": Object.freeze({
    slime: Object.freeze({ name: "Gloop", file: "set01-slime-gloop.png", scale: 0.85, auraHex: "#22c55e" }),
    goblin: Object.freeze({ name: "Snik", file: "set01-goblin-snik.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Polybrute", file: "set01-cyclops-polybrute.png", scale: 1.42, auraHex: "#f97316" }),
    troll: Object.freeze({ name: "Grumbold", file: "set01-troll-grumbold.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "02": Object.freeze({
    slime: Object.freeze({ name: "Dripsy", file: "set02-slime-dripsy.png", scale: 0.85, auraHex: "#38bdf8" }),
    goblin: Object.freeze({ name: "Grubnose", file: "set02-goblin-grubnose.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Oculon", file: "set02-cyclops-oculon.png", scale: 1.42, auraHex: "#f97316" }),
    troll: Object.freeze({ name: "Mossback", file: "set02-troll-mossback.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "03": Object.freeze({
    slime: Object.freeze({ name: "Lil Imp", file: "set03-slime-lil-imp.png", scale: 0.85, auraHex: "#c084fc" }),
    goblin: Object.freeze({ name: "Ratchet", file: "set03-goblin-ratchet.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Brontes", file: "set03-cyclops-brontes.png", scale: 1.42, auraHex: "#a855f7" }),
    troll: Object.freeze({ name: "Thudd", file: "set03-troll-thudd.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "04": Object.freeze({
    slime: Object.freeze({ name: "Wobbleton", file: "set04-slime-wobbleton.png", scale: 0.85, auraHex: "#34d399" }),
    goblin: Object.freeze({ name: "Fizzwick", file: "set04-goblin-fizzwick.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Glare", file: "set04-cyclops-glare.png", scale: 1.42, auraHex: "#f97316" }),
    troll: Object.freeze({ name: "Bramblejaw", file: "set04-troll-bramblejaw.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "05": Object.freeze({
    slime: Object.freeze({ name: "Glimmer", file: "set05-slime-glimmer.png", scale: 0.85, auraHex: "#60a5fa" }),
    goblin: Object.freeze({ name: "Nogg", file: "set05-goblin-nogg.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Monocle Mo", file: "set05-cyclops-monocle-mo.png", scale: 1.42, auraHex: "#f97316" }),
    troll: Object.freeze({ name: "Ogg", file: "set05-troll-ogg.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "06": Object.freeze({
    slime: Object.freeze({ name: "Trioculus", file: "set06-slime-trioculus.png", scale: 0.85, auraHex: "#4ade80" }),
    goblin: Object.freeze({ name: "Skrank", file: "set06-goblin-skrank.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Steropes", file: "set06-cyclops-steropes.png", scale: 1.42, auraHex: "#2dd4bf" }),
    troll: Object.freeze({ name: "Stonehide", file: "set06-troll-stonehide.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "07": Object.freeze({
    slime: Object.freeze({ name: "Coinbelly", file: "set07-slime-coinbelly.png", scale: 0.85, auraHex: "#facc15" }),
    goblin: Object.freeze({ name: "Pip", file: "set07-goblin-pip.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Uno", file: "set07-cyclops-uno.png", scale: 1.42, auraHex: "#f97316" }),
    troll: Object.freeze({ name: "Gurk", file: "set07-troll-gurk.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "08": Object.freeze({
    slime: Object.freeze({ name: "Honeydrop", file: "set08-slime-honeydrop.png", scale: 0.85, auraHex: "#fbbf24" }),
    goblin: Object.freeze({ name: "Weaselbit", file: "set08-goblin-weaselbit.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Ironbrow", file: "set08-cyclops-ironbrow.png", scale: 1.42, auraHex: "#f97316" }),
    troll: Object.freeze({ name: "Bogwarden", file: "set08-troll-bogwarden.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "09": Object.freeze({
    slime: Object.freeze({ name: "Gazey", file: "set09-slime-gazey.png", scale: 0.85, auraHex: "#f472b6" }),
    goblin: Object.freeze({ name: "Grizzle", file: "set09-goblin-grizzle.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Arges", file: "set09-cyclops-arges.png", scale: 1.42, auraHex: "#f97316" }),
    troll: Object.freeze({ name: "Rumblegut", file: "set09-troll-rumblegut.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
  "10": Object.freeze({
    slime: Object.freeze({ name: "Cap'n Gel", file: "set10-slime-cap-n-gel.png", scale: 0.85, auraHex: "#38bdf8" }),
    goblin: Object.freeze({ name: "Mukk", file: "set10-goblin-mukk.png", scale: 1.08, auraHex: "#eab308" }),
    cyclops: Object.freeze({ name: "Blinky", file: "set10-cyclops-blinky.png", scale: 1.42, auraHex: "#f97316" }),
    troll: Object.freeze({ name: "Old Knuckles", file: "set10-troll-old-knuckles.png", scale: 1.82, auraHex: "#ef4444" }),
  }),
});
