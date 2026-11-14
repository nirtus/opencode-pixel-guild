import type {
  ArticulatedRigPoseKind,
  CanonicalHeroDef,
  CanonicalPartyRoster,
  HeroEquipmentLoadoutMode,
} from "./hero-party-catalog.ts";
import { HERO_RIG_INK } from "./hero-rig-anatomy.ts";

export interface HandGrippedArmsResult {
  readonly leftArmLayer: string;
  readonly rightArmLayer: string;
  readonly cargoOverlay: string;
}

function buildCombatDaggerSvg(x: number, y: number): string {
  const INK = HERO_RIG_INK;
  return `<g transform="translate(${x}, ${y}) rotate(90)"><rect x="-3" y="-10" width="6" height="20" rx="2" fill="#78350f" stroke="${INK}" stroke-width="2"/><polygon points="0,-54 5.5,-38 5.5,-10 -5.5,-10 -5.5,-38" fill="#e6edf5" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/><rect x="-11" y="-12" width="22" height="5" rx="2" fill="#d49b35" stroke="${INK}" stroke-width="2"/></g>`;
}

function buildCrystalStaffSvg(acc: string): string {
  const INK = HERO_RIG_INK;
  return `<path d="M -3,-106 L -3,52 L 3,52 L 3,-106 C 14,-110 16,-130 8,-140 C 12,-128 8,-116 0,-114 C -8,-116 -12,-128 -8,-140 C -16,-130 -14,-110 -3,-106 Z" fill="#9c5a25" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/><polygon points="0,-146 11,-128 0,-112 -11,-128" fill="${acc}" stroke="${INK}" stroke-width="2.2"/>`;
}

export function buildHandGrippedArmsAndCargo(
  hero: CanonicalHeroDef,
  party: CanonicalPartyRoster,
  loadout: HeroEquipmentLoadoutMode,
  poseMode: ArticulatedRigPoseKind,
): HandGrippedArmsResult {
  const INK = HERO_RIG_INK;
  const { primary: p, secondary: s, accent: acc, metal: met, metalDark: metD } = party;

  const baseSleeveL = `<rect x="73" y="142" width="14" height="42" rx="6" fill="${p}" stroke="${INK}" stroke-width="2.4"/>`;
  const baseSleeveR = `<rect x="133" y="142" width="14" height="42" rx="6" fill="${p}" stroke="${INK}" stroke-width="2.4"/>`;
  const pauldronL =
    hero.role === "WARRIOR"
      ? `<ellipse cx="83" cy="144" rx="14" ry="10" fill="${metD}" stroke="${INK}" stroke-width="2.4"/>`
      : "";
  const pauldronR =
    hero.role === "WARRIOR"
      ? `<ellipse cx="137" cy="144" rx="14" ry="10" fill="${metD}" stroke="${INK}" stroke-width="2.4"/>`
      : "";

  // 0. Two-Handed Cargo / Report Scroll Hauling Override (stows weapons, draws two hands on cargoOverlay)
  if (loadout === "CARGO" || loadout === "SCROLL") {
    const leftArmLayer = `<g class="limb-arm-l">${baseSleeveL}${pauldronL}</g>`;
    const rightArmLayer = `<g class="limb-arm-r">${baseSleeveR}${pauldronR}</g>`;
    const cargoOverlay =
      loadout === "SCROLL"
        ? `<g transform="translate(110, 176)"><rect x="-26" y="-8" width="52" height="16" rx="8" fill="#fbf6e8" stroke="${INK}" stroke-width="2.3"/><rect x="-7" y="-9" width="14" height="18" rx="2" fill="#dc2626" stroke="${INK}" stroke-width="1.8"/><circle cx="0" cy="0" r="4.5" fill="#fbbf24" stroke="${INK}" stroke-width="1.5"/><circle cx="-20" cy="4" r="6.5" fill="${hero.skin}" stroke="${INK}" stroke-width="2.2"/><circle cx="20" cy="4" r="6.5" fill="${hero.skin}" stroke="${INK}" stroke-width="2.2"/></g>`
        : `<g transform="translate(110, 176)"><rect x="-26" y="-14" width="52" height="30" rx="4" fill="#d97706" stroke="${INK}" stroke-width="2.4"/><line x1="-26" y1="0" x2="26" y2="0" stroke="${INK}" stroke-width="2"/><rect x="-8" y="-14" width="16" height="30" fill="#fbbf24" stroke="${INK}" stroke-width="1.8"/><circle cx="-22" cy="4" r="6.5" fill="${hero.skin}" stroke="${INK}" stroke-width="2.2"/><circle cx="22" cy="4" r="6.5" fill="${hero.skin}" stroke="${INK}" stroke-width="2.2"/></g>`;
    return { leftArmLayer, rightArmLayer, cargoOverlay };
  }

  let leftArmLayer = "";
  let rightArmLayer = "";

  // 1. Station Work Tool Override (Zero Combat Weapons During Work!)
  const isStationWork =
    poseMode === "forge" ||
    poseMode === "tinker" ||
    poseMode === "library" ||
    poseMode === "spyglass" ||
    poseMode === "alchemy" ||
    poseMode === "spellcast";

  if (isStationWork) {
    if (poseMode === "forge") {
      leftArmLayer = `<g class="limb-arm-l">${baseSleeveL}${pauldronL}<g transform="translate(80, 186)"><line x1="4" y1="0" x2="-24" y2="8" stroke="#475569" stroke-width="4.5" stroke-linecap="round"/><line x1="4" y1="4" x2="-24" y2="4" stroke="#334155" stroke-width="4.5" stroke-linecap="round"/><rect x="-36" y="1" width="16" height="8" rx="2" fill="#ff9f1c" stroke="#dc2626" stroke-width="1.8"/></g><circle cx="80" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
      rightArmLayer = `<g class="limb-arm-r">${baseSleeveR}${pauldronR}<g transform="translate(140, 186)"><line x1="-8" y1="0" x2="34" y2="0" stroke="${INK}" stroke-width="8.5" stroke-linecap="round"/><line x1="-8" y1="0" x2="34" y2="0" stroke="#8c5220" stroke-width="4.5" stroke-linecap="round"/><g transform="translate(34, 0)"><path d="M -9,-14 L 9,-14 L 11,14 L -11,14 Z" fill="#cbd5e1" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><rect x="-7" y="-9" width="14" height="18" rx="2" fill="#94a3b8"/></g></g><circle cx="140" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    } else if (poseMode === "tinker") {
      leftArmLayer = `<g class="limb-arm-l">${baseSleeveL}${pauldronL}<g transform="translate(80, 186) rotate(-8)"><rect x="-36" y="-18" width="38" height="28" rx="3" fill="#1d4e89" stroke="${INK}" stroke-width="2.3"/><rect x="-32" y="-14" width="30" height="20" fill="none" stroke="#93c5fd" stroke-width="1.4" stroke-dasharray="3 2"/><circle cx="-17" cy="-4" r="6" fill="none" stroke="#ffffff" stroke-width="1.5"/></g><circle cx="80" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
      rightArmLayer = `<g class="limb-arm-r">${baseSleeveR}${pauldronR}<g transform="translate(140, 186)"><line x1="-6" y1="0" x2="30" y2="0" stroke="${INK}" stroke-width="8" stroke-linecap="round"/><line x1="-6" y1="0" x2="30" y2="0" stroke="#d97706" stroke-width="4.5" stroke-linecap="round"/><g transform="translate(32, 4)"><path d="M -9,-8 A 9,9 0 1,1 9,-8 L 5,8 L -5,8 Z" fill="#cbd5e1" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="-4" r="4" fill="#2a201c"/></g></g><circle cx="140" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    } else if (poseMode === "library") {
      leftArmLayer = `<g class="limb-arm-l">${baseSleeveL}${pauldronL}<g transform="translate(80, 186) rotate(-8)"><rect x="-40" y="-20" width="44" height="30" rx="3" fill="#6e4427" stroke="${INK}" stroke-width="2.3"/><rect x="-36" y="-16" width="36" height="22" fill="#fbf6e8" stroke="${INK}" stroke-width="1.6"/><line x1="-18" y1="-16" x2="-18" y2="6" stroke="${INK}" stroke-width="1.8"/><line x1="-32" y1="-9" x2="-22" y2="-9" stroke="#8c7a6b" stroke-width="1.8"/><line x1="-32" y1="-3" x2="-22" y2="-3" stroke="#8c7a6b" stroke-width="1.8"/><line x1="-14" y1="-9" x2="-4" y2="-9" stroke="#8c7a6b" stroke-width="1.8"/><line x1="-14" y1="-3" x2="-4" y2="-3" stroke="#8c7a6b" stroke-width="1.8"/></g><circle cx="80" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
      rightArmLayer = `<g class="limb-arm-r">${baseSleeveR}${pauldronR}<g transform="translate(140, 186)"><line x1="-4" y1="4" x2="18" y2="-10" stroke="${INK}" stroke-width="7" stroke-linecap="round"/><line x1="-4" y1="4" x2="18" y2="-10" stroke="#78350f" stroke-width="4" stroke-linecap="round"/><circle cx="26" cy="-16" r="12" fill="#e0f2fe" fill-opacity="0.72" stroke="#d97706" stroke-width="3"/><circle cx="26" cy="-16" r="12" fill="none" stroke="${INK}" stroke-width="1.8"/></g><circle cx="140" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    } else if (poseMode === "spyglass") {
      leftArmLayer = `<g class="limb-arm-l">${baseSleeveL}${pauldronL}<g transform="translate(80, 186)"><circle cx="-10" cy="0" r="12" fill="#fbbf24" stroke="${INK}" stroke-width="2.2"/><circle cx="-10" cy="0" r="8" fill="#fef3c7" stroke="${INK}" stroke-width="1.5"/><polygon points="-10,-6 -7,0 -10,6 -13,0" fill="#ef4444"/></g><circle cx="80" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
      rightArmLayer = `<g class="limb-arm-r">${baseSleeveR}${pauldronR}<g transform="translate(140, 186) rotate(-14)"><rect x="-14" y="-5" width="16" height="10" rx="2" fill="#b45309" stroke="${INK}" stroke-width="2.2"/><rect x="0" y="-6.5" width="20" height="13" rx="2" fill="#d97706" stroke="${INK}" stroke-width="2.2"/><rect x="18" y="-8" width="20" height="16" rx="2" fill="#f59e0b" stroke="${INK}" stroke-width="2.2"/><ellipse cx="38" cy="0" rx="4" ry="8" fill="#7ce8ff" stroke="${INK}" stroke-width="2"/></g><circle cx="140" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    } else if (poseMode === "alchemy") {
      leftArmLayer = `<g class="limb-arm-l">${baseSleeveL}${pauldronL}<g transform="translate(80, 186)"><polygon points="-13,-6 -3,-6 -3,2 10,26 -24,26 -13,2" fill="#e6f2ff" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/><polygon points="-19,12 3,12 8,24 -22,24" fill="#52e388"/></g><circle cx="80" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
      rightArmLayer = `<g class="limb-arm-r">${baseSleeveR}${pauldronR}<g transform="translate(140, 186)"><line x1="-4" y1="-6" x2="30" y2="22" stroke="${INK}" stroke-width="7.5" stroke-linecap="round"/><line x1="-4" y1="-6" x2="30" y2="22" stroke="#8c5832" stroke-width="4.5" stroke-linecap="round"/><ellipse cx="32" cy="24" rx="10" ry="7" fill="#6c757d" stroke="${INK}" stroke-width="2.2"/><ellipse cx="32" cy="24" rx="6.5" ry="4" fill="#52e388"/></g><circle cx="140" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    } else {
      leftArmLayer = `<g class="limb-arm-l">${baseSleeveL}${pauldronL}<circle cx="78" cy="184" r="12" fill="#7ce8ff" opacity="0.38"/><circle cx="78" cy="184" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
      rightArmLayer = `<g class="limb-arm-r">${baseSleeveR}${pauldronR}<g transform="translate(142, 184)">${buildCrystalStaffSvg(acc)}</g><circle cx="142" cy="184" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    }
  } else if (hero.role === "WARRIOR") {
    leftArmLayer = `<g class="limb-arm-l">${baseSleeveL}${pauldronL}<circle cx="80" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/>${
      loadout === "A" || poseMode === "combat"
        ? `<g transform="translate(76, 176)"><path d="M -22,-22 L 22,-22 L 22,2 Q 22,26 0,36 Q -22,26 -22,2 Z" fill="${s}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M -16,-16 L 16,-16 L 16,1 Q 16,20 0,28 Q -16,20 -16,1 Z" fill="${p}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><polygon points="0,-9 3,-2 10,-2 4,3 6,10 0,5 -6,10 -4,3 -10,-2 -3,-2" fill="${s}" stroke="${INK}" stroke-width="1.6"/></g>`
        : ""
    }</g>`;
    rightArmLayer = `<g class="limb-arm-r">${baseSleeveR}${pauldronR}${
      loadout === "B" && poseMode !== "combat"
        ? `<g transform="translate(140, 186)"><rect x="-3.5" y="-116" width="7" height="140" rx="2" fill="#8c5220" stroke="${INK}" stroke-width="2.4"/><path d="M 3,-106 Q 28,-112 32,-90 Q 32,-68 3,-74 Z" fill="#dce3eb" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/></g>`
        : `<g transform="translate(140, 186) ${poseMode === "combat" ? "rotate(52)" : ""}"><rect x="-3.5" y="-12" width="7" height="24" rx="2" fill="#78350f" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="14" r="4.5" fill="#d49b35" stroke="${INK}" stroke-width="2"/><polygon points="0,-130 7,-114 7,-12 -7,-12 -7,-114" fill="#e6edf5" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><line x1="0" y1="-116" x2="0" y2="-16" stroke="${INK}" stroke-width="1.8"/><rect x="-15" y="-15" width="30" height="7" rx="3.5" fill="#d49b35" stroke="${INK}" stroke-width="2.2"/></g>`
    }<circle cx="140" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
  } else if (hero.role === "MAGE") {
    leftArmLayer = `<g class="limb-arm-l"><path d="M 82,140 L 68,178 L 84,182 L 90,146 Z" fill="${p}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="76" cy="184" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    rightArmLayer = `<g class="limb-arm-r"><path d="M 138,140 L 152,178 L 136,182 L 130,146 Z" fill="${p}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>${
      loadout === "B" && poseMode !== "combat"
        ? `<g transform="translate(144, 184) rotate(8)"><rect x="-18" y="-12" width="26" height="32" rx="3" fill="${s}" stroke="${INK}" stroke-width="2.3"/><rect x="-16" y="14" width="24" height="5" fill="#ffffff" stroke="${INK}" stroke-width="1.8"/></g>`
        : `<g transform="translate(144, 184) ${poseMode === "combat" ? "rotate(42)" : ""}"><circle cx="0" cy="-124" r="20" fill="${acc}" opacity="0.25" class="anim-halo"/>${buildCrystalStaffSvg(acc)}</g>`
    }<circle cx="144" cy="184" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
  } else if (hero.role === "SCOUT") {
    leftArmLayer = `<g class="limb-arm-l"><rect x="72" y="142" width="15" height="42" rx="6" fill="${p}" stroke="${INK}" stroke-width="2.4"/>${
      poseMode === "combat"
        ? ""
        : loadout === "B"
          ? buildCombatDaggerSvg(79, 186)
          : `<g transform="translate(79, 186)"><line x1="-16" y1="-64" x2="-16" y2="60" stroke="#b8b2a8" stroke-width="1.8"/><path d="M -16,-64 Q 16,0 -16,60" fill="none" stroke="#7c4722" stroke-width="6.5" stroke-linecap="round"/><path d="M -16,-64 Q 16,0 -16,60" fill="none" stroke="${INK}" stroke-width="2"/><rect x="-4" y="-8" width="8" height="16" rx="2" fill="#d49b35" stroke="${INK}" stroke-width="1.8"/></g>`
    }<circle cx="79" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    rightArmLayer = `<g class="limb-arm-r"><rect x="133" y="142" width="15" height="42" rx="6" fill="${p}" stroke="${INK}" stroke-width="2.4"/>${
      poseMode === "combat"
        ? `<g transform="translate(141, 186)"><line x1="-14" y1="-54" x2="-14" y2="54" stroke="#b8b2a8" stroke-width="1.8"/><path d="M -14,-54 Q 18,0 -14,54" fill="none" stroke="#7c4722" stroke-width="6.5" stroke-linecap="round"/><path d="M -14,-54 Q 18,0 -14,54" fill="none" stroke="${INK}" stroke-width="2"/><rect x="-3" y="-8" width="8" height="16" rx="2" fill="#d49b35" stroke="${INK}" stroke-width="1.8"/><g class="fx-arrow-shot"><line x1="-16" y1="0" x2="36" y2="0" stroke="#78350f" stroke-width="3.4" stroke-linecap="round"/><polygon points="46,0 32,-6 35,0 32,6" fill="#6ee7b7" stroke="${INK}" stroke-width="1.5"/></g></g>`
        : loadout === "B"
          ? buildCombatDaggerSvg(141, 186)
          : ""
    }<circle cx="141" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
  } else if (hero.role === "ALCHEMIST") {
    leftArmLayer = `<g class="limb-arm-l"><rect x="73" y="142" width="15" height="42" rx="6" fill="${p}" stroke="${INK}" stroke-width="2.4"/>${
      poseMode !== "combat"
        ? loadout === "B"
          ? `<g transform="translate(80, 186)"><path d="M -14,2 L 14,2 L 10,18 L -10,18 Z" fill="#6c757d" stroke="${INK}" stroke-width="2.2"/><line x1="-4" y1="-10" x2="4" y2="6" stroke="#d49b35" stroke-width="4" stroke-linecap="round"/></g>`
          : `<g transform="translate(80, 186)"><polygon points="-5,-6 5,-6 5,2 18,28 -18,28 -5,2" fill="#e6f2ff" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/><polygon points="-11,14 11,14 16,26 -16,26" fill="${acc}"/></g>`
        : ""
    }<circle cx="80" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    rightArmLayer = `<g class="limb-arm-r"><rect x="132" y="142" width="15" height="42" rx="6" fill="${p}" stroke="${INK}" stroke-width="2.4"/>${
      poseMode === "combat" ? buildCombatDaggerSvg(140, 186) : ""
    }<circle cx="140" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
  } else if (hero.role === "CLERIC") {
    leftArmLayer = `<g class="limb-arm-l"><path d="M 80,140 L 68,182 L 84,184 L 90,146 Z" fill="${s}" stroke="${INK}" stroke-width="2.4"/><g transform="translate(76, 184)"><rect x="-16" y="-14" width="24" height="30" rx="2" fill="${p}" stroke="${INK}" stroke-width="2.3"/><rect x="-14" y="11" width="22" height="5" fill="#ffffff" stroke="${INK}" stroke-width="1.8"/><circle cx="-4" cy="-1" r="4" fill="${acc}"/></g><circle cx="76" cy="184" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    rightArmLayer = `<g class="limb-arm-r"><path d="M 140,140 L 152,182 L 136,184 L 130,146 Z" fill="${s}" stroke="${INK}" stroke-width="2.4"/>${
      poseMode === "combat"
        ? buildCombatDaggerSvg(144, 184)
        : loadout === "B"
          ? `<g transform="translate(144, 184)"><line x1="0" y1="0" x2="0" y2="22" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="28" r="9" fill="#d4a634" stroke="${INK}" stroke-width="2.2"/></g>`
          : `<g transform="translate(144, 184)"><rect x="-3" y="-76" width="6" height="126" fill="#8c5220" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="-80" r="12" fill="${met}" stroke="${INK}" stroke-width="2.3"/></g>`
    }<circle cx="144" cy="184" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
  } else {
    leftArmLayer = `<g class="limb-arm-l"><rect x="72" y="142" width="15" height="42" rx="6" fill="${p}" stroke="${INK}" stroke-width="2.4"/>${
      poseMode !== "combat"
        ? loadout === "B"
          ? `<g transform="translate(79, 186)"><rect x="-12" y="4" width="20" height="22" rx="2" fill="#b91c1c" stroke="${INK}" stroke-width="2.2"/><line x1="-2" y1="-8" x2="-2" y2="4" stroke="${INK}" stroke-width="2.4"/><line x1="-8" y1="-8" x2="4" y2="-8" stroke="#d49b35" stroke-width="3.5" stroke-linecap="round"/></g>`
          : `<g transform="translate(79, 186)"><circle cx="-6" cy="2" r="14" fill="#2b2d38" stroke="${INK}" stroke-width="2.4"/><rect x="-10" y="-16" width="8" height="5" fill="#6c757d" stroke="${INK}" stroke-width="2"/><polygon points="6,-29 8,-24 13,-22 8,-20 6,-15 4,-20 -1,-22 4,-24" fill="#ffbe0b" class="anim-spark"/></g>`
        : ""
    }<circle cx="79" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
    rightArmLayer = `<g class="limb-arm-r"><rect x="133" y="142" width="15" height="42" rx="6" fill="${p}" stroke="${INK}" stroke-width="2.4"/>${
      poseMode === "combat"
        ? `<g transform="translate(140, 186) rotate(56)"><rect x="-3.5" y="-86" width="7" height="98" rx="2" fill="#b87d4b" stroke="${INK}" stroke-width="2.3"/><path d="M -26,-80 Q 0,-94 26,-80 Q 10,-84 -3,-76 L 3,-76 Q -10,-84 -26,-80 Z" fill="${met}" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/></g>`
        : `<g transform="translate(141, 186) rotate(6)"><rect x="-3.5" y="-96" width="7" height="128" rx="2" fill="#b87d4b" stroke="${INK}" stroke-width="2.3"/><path d="M -28,-90 Q 0,-104 28,-90 Q 10,-94 -3,-86 L 3,-86 Q -10,-94 -28,-90 Z" fill="${met}" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round"/></g>`
    }<circle cx="141" cy="186" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/></g>`;
  }

  return { leftArmLayer, rightArmLayer, cargoOverlay: "" };
}
