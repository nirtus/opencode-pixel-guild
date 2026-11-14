import type { CanonicalHeroDef, CanonicalPartyRoster } from "./hero-party-catalog.ts";

export const HERO_RIG_INK = "#2b211d";

export interface DirectionalAnatomyLayers {
  readonly backGearLayer: string;
  readonly legsLayer: string;
  readonly torsoLayer: string;
  readonly headLayer: string;
}

export function buildSouthAnatomyLayers(
  hero: CanonicalHeroDef,
  party: CanonicalPartyRoster,
): DirectionalAnatomyLayers {
  const INK = HERO_RIG_INK;
  const { primary: p, secondary: s, accent: acc, metal: met } = party;

  let backGearLayer = "";
  if (hero.role === "WARRIOR") {
    backGearLayer = `<path class="rig-cape" d="M 74,142 L 146,142 L 154,230 Q 110,236 66,230 Z" fill="${s}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" />`;
  } else if (hero.role === "SCOUT") {
    backGearLayer = `<g transform="translate(132, 105) rotate(-14)"><rect x="-10" y="0" width="22" height="68" rx="4" fill="#8c5832" stroke="${INK}" stroke-width="2.4"/><line x1="-10" y1="14" x2="12" y2="14" stroke="${INK}" stroke-width="2"/></g><path class="rig-cape" d="M 68,100 L 152,100 L 160,152 L 60,152 Z" fill="${p}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  } else if (hero.role === "ALCHEMIST") {
    backGearLayer = `<rect x="66" y="118" width="88" height="62" rx="6" fill="#8c5832" stroke="${INK}" stroke-width="2.5"/><rect x="57" y="102" width="12" height="36" rx="3" fill="#e6edf5" stroke="${INK}" stroke-width="2.2"/><rect x="59" y="114" width="8" height="22" fill="${acc}"/><rect x="59" y="97" width="8" height="6" fill="#a6724f" stroke="${INK}" stroke-width="2"/><rect x="151" y="102" width="12" height="36" rx="3" fill="#e6edf5" stroke="${INK}" stroke-width="2.2"/><rect x="153" y="112" width="8" height="24" fill="#9b5de5"/><rect x="153" y="97" width="8" height="6" fill="#a6724f" stroke="${INK}" stroke-width="2"/><circle cx="152" cy="166" r="14" fill="#e6edf5" stroke="${INK}" stroke-width="2.2"/><path d="M 139,166 A 13,13 0 0,0 165,166 Z" fill="${acc}"/>`;
  } else if (hero.role === "CLERIC") {
    backGearLayer = `<circle cx="110" cy="96" r="44" fill="${acc}" opacity="0.18" class="anim-halo"/><circle cx="110" cy="96" r="42" fill="none" stroke="${acc}" stroke-width="3" class="anim-halo"/>`;
  } else if (hero.role === "SAPPER") {
    backGearLayer = `<g transform="translate(64, 96)"><path d="M 4,0 Q 2,-12 10,-14" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/><rect x="0" y="0" width="8" height="38" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="8" y="0" width="8" height="38" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="16" y="0" width="8" height="38" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="-1" y="14" width="26" height="5" fill="#2b211d"/><rect x="-1" y="26" width="26" height="5" fill="#2b211d"/></g>`;
  }

  const legsLayer = `<g class="limb-leg-l"><rect x="91" y="198" width="17" height="32" fill="#5c3a24" stroke="${INK}" stroke-width="2.4"/><path d="M 84,226 Q 84,214 98,214 L 108,214 L 108,238 L 84,238 Z" fill="#4f3320" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g><g class="limb-leg-r"><rect x="112" y="198" width="17" height="32" fill="#5c3a24" stroke="${INK}" stroke-width="2.4"/><path d="M 112,214 L 122,214 Q 136,214 136,226 L 136,238 L 112,238 Z" fill="#4f3320" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`;

  let torsoLayer = "";
  if (hero.role === "WARRIOR") {
    torsoLayer = `<rect x="84" y="182" width="52" height="24" rx="2" fill="${p}" stroke="${INK}" stroke-width="2.4"/><line x1="110" y1="182" x2="110" y2="206" stroke="${INK}" stroke-width="2.2"/><rect x="84" y="138" width="52" height="48" rx="6" fill="${met}" stroke="${INK}" stroke-width="2.5"/><line x1="110" y1="138" x2="110" y2="186" stroke="${INK}" stroke-width="2"/><rect x="83" y="176" width="54" height="10" fill="#7c4d2b" stroke="${INK}" stroke-width="2.3"/><rect x="104" y="174" width="12" height="14" rx="2" fill="#dce3eb" stroke="${INK}" stroke-width="2.2"/>`;
  } else if (hero.role === "MAGE") {
    torsoLayer = `<polygon points="82,138 138,138 148,236 72,236" fill="${p}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="101,138 119,138 122,236 98,236" fill="${s}" stroke="${INK}" stroke-width="2.3"/><rect x="81" y="174" width="58" height="8" rx="3" fill="#8c5832" stroke="${INK}" stroke-width="2.3"/><path d="M 86,204 L 88,209 L 93,211 L 88,213 L 86,218 L 84,213 L 79,211 L 84,209 Z" fill="${acc}"/><path d="M 132,208 L 134,212 L 138,214 L 134,216 L 132,220 L 130,216 L 126,214 L 130,212 Z" fill="${acc}"/>`;
  } else if (hero.role === "SCOUT") {
    torsoLayer = `<rect x="84" y="138" width="52" height="62" rx="4" fill="${p}" stroke="${INK}" stroke-width="2.4"/><rect x="84" y="140" width="20" height="54" rx="3" fill="#8c5832" stroke="${INK}" stroke-width="2.3"/><rect x="116" y="140" width="20" height="54" rx="3" fill="#8c5832" stroke="${INK}" stroke-width="2.3"/><path d="M 92,136 Q 110,148 128,136 L 124,148 Q 110,156 96,148 Z" fill="${acc}" stroke="${INK}" stroke-width="2.3"/><line x1="92" y1="142" x2="132" y2="194" stroke="#6e4223" stroke-width="7" stroke-linecap="round"/><line x1="92" y1="142" x2="132" y2="194" stroke="${INK}" stroke-width="2"/>`;
  } else if (hero.role === "ALCHEMIST") {
    torsoLayer = `<rect x="85" y="138" width="50" height="68" rx="4" fill="#f7f3eb" stroke="${INK}" stroke-width="2.4"/><rect x="100" y="182" width="20" height="14" rx="2" fill="#efe9dc" stroke="${INK}" stroke-width="2.1"/><line x1="132" y1="140" x2="86" y2="188" stroke="#7c4722" stroke-width="7"/><rect x="115" y="150" width="7" height="12" rx="2" transform="rotate(44 118 156)" fill="#e6a82e" stroke="${INK}" stroke-width="1.8"/><rect x="106" y="159" width="7" height="12" rx="2" transform="rotate(44 109 165)" fill="#52b788" stroke="${INK}" stroke-width="1.8"/><rect x="97" y="168" width="7" height="12" rx="2" transform="rotate(44 100 174)" fill="#9b5de5" stroke="${INK}" stroke-width="1.8"/>`;
  } else if (hero.role === "CLERIC") {
    torsoLayer = `<polygon points="80,138 140,138 148,236 72,236" fill="${s}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="78" y="176" width="64" height="9" fill="#8c5832" stroke="${INK}" stroke-width="2.2"/><polygon points="94,138 126,138 128,236 92,236" fill="${p}" stroke="${INK}" stroke-width="2.4"/><circle cx="110" cy="166" r="8" fill="${acc}" stroke="${INK}" stroke-width="1.8"/>`;
  } else {
    torsoLayer = `<rect x="84" y="138" width="52" height="58" rx="4" fill="#8c6239" stroke="${INK}" stroke-width="2.5"/><rect x="89" y="150" width="16" height="14" rx="2" fill="#6e4927" stroke="${INK}" stroke-width="2"/><rect x="115" y="150" width="16" height="14" rx="2" fill="#6e4927" stroke="${INK}" stroke-width="2"/><rect x="84" y="168" width="52" height="7" fill="#e6a82e" stroke="${INK}" stroke-width="2"/>`;
  }

  let headLayer = `
    ${!hero.helm.includes("bald") ? `<path d="M 76,84 Q 72,130 82,144 L 138,144 Q 148,130 144,84 Z" fill="${hero.hair}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` : ""}
    <circle cx="77" cy="100" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/>
    <circle cx="143" cy="100" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/>
    <rect x="80" y="64" width="60" height="66" rx="28" fill="${hero.skin}" stroke="${INK}" stroke-width="2.5"/>
    ${!hero.helm.includes("bald") ? `<path d="M 80,88 Q 95,72 110,82 Q 125,72 140,88 Q 140,64 110,64 Q 80,64 80,88 Z" fill="${hero.hair}" stroke="${INK}" stroke-width="2.3"/>` : ""}
    <ellipse cx="90" cy="107" rx="5.5" ry="3.2" fill="#e57373" opacity="0.45"/>
    <ellipse cx="130" cy="107" rx="5.5" ry="3.2" fill="#e57373" opacity="0.45"/>
    <g transform="translate(97, 98)"><ellipse cx="0" cy="0" rx="7.5" ry="8.5" fill="#ffffff" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="0.5" r="5" fill="${hero.eyes}"/><circle cx="0" cy="0.5" r="2.6" fill="${INK}"/><circle cx="-2" cy="-2" r="1.8" fill="#ffffff"/><circle cx="1.8" cy="2" r="0.9" fill="#ffffff"/></g>
    <g transform="translate(123, 98)"><ellipse cx="0" cy="0" rx="7.5" ry="8.5" fill="#ffffff" stroke="${INK}" stroke-width="2.2"/><circle cx="0" cy="0.5" r="5" fill="${hero.eyes}"/><circle cx="0" cy="0.5" r="2.6" fill="${INK}"/><circle cx="-2" cy="-2" r="1.8" fill="#ffffff"/><circle cx="1.8" cy="2" r="0.9" fill="#ffffff"/></g>
    ${hero.expr === "frown" ? `<line x1="89" y1="86" x2="104" y2="89" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><line x1="131" y1="86" x2="116" y2="89" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>` : `<path d="M 89,88 Q 97,84 104,88" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><path d="M 116,88 Q 123,84 131,88" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`}
    <path d="M 108,105 Q 110,108 112,105" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
  `;
  if (hero.beard) {
    headLayer += `<path d="M 80,104 Q 80,138 110,140 Q 140,138 140,104 Q 132,118 110,118 Q 88,118 80,104 Z" fill="${hero.hair}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M 98,112 Q 110,107 122,112" fill="none" stroke="${hero.hair}" stroke-width="5" stroke-linecap="round"/><path d="M 104,115 Q 110,120 116,115 Z" fill="#ffffff" stroke="${INK}" stroke-width="1.8"/>`;
  } else if (hero.expr === "grin") {
    headLayer += `<path d="M 102,113 Q 110,122 118,113 Z" fill="#ffffff" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>`;
  } else if (hero.expr === "frown") {
    headLayer += `<line x1="104" y1="116" x2="116" y2="116" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>`;
  } else {
    headLayer += `<path d="M 103,113 Q 110,119 117,113" fill="none" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>`;
  }
  headLayer += buildHeadgearSvg(hero, party, "south");
  return { backGearLayer, legsLayer, torsoLayer, headLayer };
}

export function buildNorthAnatomyLayers(
  hero: CanonicalHeroDef,
  party: CanonicalPartyRoster,
): DirectionalAnatomyLayers {
  const INK = HERO_RIG_INK;
  const { primary: p, secondary: s, accent: acc, metal: met, metalDark: metD } = party;

  const legsLayer = `<g class="limb-leg-l"><rect x="91" y="198" width="17" height="32" fill="#4f3320" stroke="${INK}" stroke-width="2.4"/><rect x="88" y="216" width="22" height="22" rx="5" fill="#3d2616" stroke="${INK}" stroke-width="2.5"/></g><g class="limb-leg-r"><rect x="112" y="198" width="17" height="32" fill="#4f3320" stroke="${INK}" stroke-width="2.4"/><rect x="110" y="216" width="22" height="22" rx="5" fill="#3d2616" stroke="${INK}" stroke-width="2.5"/></g>`;

  let torsoLayer = "";
  if (hero.role === "WARRIOR") {
    torsoLayer = `<rect x="84" y="138" width="52" height="58" rx="6" fill="${met}" stroke="${INK}" stroke-width="2.5"/><ellipse cx="83" cy="144" rx="14" ry="10" fill="${metD}" stroke="${INK}" stroke-width="2.4"/><ellipse cx="137" cy="144" rx="14" ry="10" fill="${metD}" stroke="${INK}" stroke-width="2.4"/><path class="rig-cape" d="M 74,142 L 146,142 L 154,230 Q 110,238 66,230 Z" fill="${s}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" /><path class="rig-cape" d="M 86,144 L 134,144 L 140,222 Q 110,228 80,222 Z" fill="${p}" stroke="${INK}" stroke-width="2" stroke-linejoin="round" />`;
  } else if (hero.role === "MAGE") {
    torsoLayer = `<polygon points="82,138 138,138 148,236 72,236" fill="${p}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="96,138 124,138 130,236 90,236" fill="${s}" stroke="${INK}" stroke-width="2.2"/><rect x="81" y="174" width="58" height="8" rx="3" fill="#8c5832" stroke="${INK}" stroke-width="2.3"/><path d="M 86,204 L 88,209 L 93,211 L 88,213 L 86,218 L 84,213 L 79,211 L 84,209 Z" fill="${acc}"/><path d="M 132,208 L 134,212 L 138,214 L 134,216 L 132,220 L 130,216 L 126,214 L 130,212 Z" fill="${acc}"/>`;
  } else if (hero.role === "SCOUT") {
    torsoLayer = `<rect x="84" y="138" width="52" height="62" rx="4" fill="#8c5832" stroke="${INK}" stroke-width="2.4"/><path class="rig-cape" d="M 72,134 L 148,134 L 156,184 Q 110,192 64,184 Z" fill="${p}" stroke="${INK}" stroke-width="2.5"/><g transform="translate(116, 132) rotate(-20)"><rect x="-12" y="0" width="24" height="64" rx="4" fill="#6e4223" stroke="${INK}" stroke-width="2.4"/><line x1="-6" y1="-12" x2="-6" y2="2" stroke="#f7f1e1" stroke-width="3"/><line x1="0" y1="-14" x2="0" y2="2" stroke="#f7f1e1" stroke-width="3"/><line x1="6" y1="-12" x2="6" y2="2" stroke="#f7f1e1" stroke-width="3"/></g>`;
  } else if (hero.role === "ALCHEMIST") {
    torsoLayer = `<rect x="84" y="138" width="52" height="64" rx="4" fill="${p}" stroke="${INK}" stroke-width="2.4"/><rect x="68" y="122" width="84" height="64" rx="6" fill="#8c5832" stroke="${INK}" stroke-width="2.5"/><rect x="76" y="130" width="68" height="22" rx="3" fill="#6e4223" stroke="${INK}" stroke-width="2"/><rect x="57" y="106" width="12" height="36" rx="3" fill="#e6edf5" stroke="${INK}" stroke-width="2.2"/><rect x="59" y="118" width="8" height="22" fill="${acc}"/><rect x="151" y="106" width="12" height="36" rx="3" fill="#e6edf5" stroke="${INK}" stroke-width="2.2"/><rect x="153" y="116" width="8" height="24" fill="#9b5de5"/><circle cx="110" cy="172" r="14" fill="#e6edf5" stroke="${INK}" stroke-width="2.2"/><path d="M 97,172 A 13,13 0 0,0 123,172 Z" fill="#52b788"/>`;
  } else if (hero.role === "CLERIC") {
    torsoLayer = `<circle cx="110" cy="96" r="44" fill="${acc}" opacity="0.18" class="anim-halo"/><circle cx="110" cy="96" r="42" fill="none" stroke="${acc}" stroke-width="3" class="anim-halo"/><polygon points="80,138 140,138 148,236 72,236" fill="${s}" stroke="${INK}" stroke-width="2.5"/><polygon points="92,138 128,138 132,236 88,236" fill="${p}" stroke="${INK}" stroke-width="2.4"/><circle cx="110" cy="172" r="10" fill="${acc}" stroke="${INK}" stroke-width="2"/>`;
  } else {
    torsoLayer = `<rect x="84" y="138" width="52" height="58" rx="4" fill="#8c6239" stroke="${INK}" stroke-width="2.5"/><rect x="84" y="168" width="52" height="7" fill="#e6a82e" stroke="${INK}" stroke-width="2"/><g transform="translate(96, 134)"><rect x="0" y="0" width="9" height="42" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="9" y="0" width="9" height="42" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="18" y="0" width="9" height="42" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="-2" y="14" width="31" height="5" fill="#2b211d"/><rect x="-2" y="28" width="31" height="5" fill="#2b211d"/></g>`;
  }

  const headLayer = `
    <circle cx="77" cy="100" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/>
    <circle cx="143" cy="100" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/>
    <rect x="80" y="64" width="60" height="66" rx="28" fill="${hero.skin}" stroke="${INK}" stroke-width="2.5"/>
    ${!hero.helm.includes("bald") ? `<path d="M 78,68 Q 74,132 82,144 L 138,144 Q 146,132 142,68 Q 110,58 78,68 Z" fill="${hero.hair}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` : ""}
    ${buildHeadgearSvg(hero, party, "north")}
  `;

  return { backGearLayer: "", legsLayer, torsoLayer, headLayer };
}

export function buildProfileAnatomyLayers(
  hero: CanonicalHeroDef,
  party: CanonicalPartyRoster,
): DirectionalAnatomyLayers {
  const INK = HERO_RIG_INK;
  const { primary: p, secondary: s, accent: acc, metal: met } = party;

  let backGearLayer = "";
  if (hero.role === "WARRIOR") {
    backGearLayer = `<path class="rig-cape" d="M 92,138 L 56,228 Q 78,236 98,228 L 104,142 Z" fill="${s}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" />`;
  } else if (hero.role === "SCOUT") {
    backGearLayer = `<g transform="translate(78, 106) rotate(-22)"><rect x="-10" y="0" width="20" height="64" rx="4" fill="#8c5832" stroke="${INK}" stroke-width="2.4"/><line x1="-10" y1="14" x2="10" y2="14" stroke="${INK}" stroke-width="2"/><line x1="-5" y1="-12" x2="-5" y2="2" stroke="#f7f1e1" stroke-width="2.8" stroke-linecap="round"/><line x1="0" y1="-14" x2="0" y2="2" stroke="#f7f1e1" stroke-width="2.8" stroke-linecap="round"/><line x1="5" y1="-12" x2="5" y2="2" stroke="#f7f1e1" stroke-width="2.8" stroke-linecap="round"/></g><path class="rig-cape" d="M 84,98 L 60,154 L 106,154 Z" fill="${p}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`;
  } else if (hero.role === "ALCHEMIST") {
    backGearLayer = `<rect x="58" y="116" width="38" height="62" rx="5" fill="#8c5832" stroke="${INK}" stroke-width="2.5"/><rect x="50" y="102" width="12" height="36" rx="3" fill="#e6edf5" stroke="${INK}" stroke-width="2.2"/><rect x="52" y="114" width="8" height="22" fill="${acc}"/><rect x="52" y="97" width="8" height="6" fill="#a6724f" stroke="${INK}" stroke-width="2"/><circle cx="62" cy="166" r="13" fill="#e6edf5" stroke="${INK}" stroke-width="2.2"/><path d="M 50,166 A 12,12 0 0,0 74,166 Z" fill="#9b5de5"/>`;
  } else if (hero.role === "CLERIC") {
    backGearLayer = `<circle cx="108" cy="96" r="44" fill="${acc}" opacity="0.18" class="anim-halo"/><circle cx="108" cy="96" r="42" fill="none" stroke="${acc}" stroke-width="3" class="anim-halo"/>`;
  } else if (hero.role === "SAPPER") {
    backGearLayer = `<g transform="translate(62, 100) rotate(-8)"><rect x="0" y="0" width="8" height="38" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="8" y="0" width="8" height="38" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="16" y="0" width="8" height="38" rx="3" fill="#d6402b" stroke="${INK}" stroke-width="2.2"/><rect x="-1" y="14" width="26" height="5" fill="#2b211d"/><rect x="-1" y="26" width="26" height="5" fill="#2b211d"/></g>`;
  }

  const legsLayer = `<g class="limb-leg-back"><rect x="96" y="196" width="16" height="32" fill="#4f3320" stroke="${INK}" stroke-width="2.4"/><path d="M 94,214 L 114,214 Q 126,214 126,226 L 126,238 L 94,238 Z" fill="#3d2616" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g><g class="limb-leg-front"><rect x="106" y="196" width="16" height="32" fill="#5c3a24" stroke="${INK}" stroke-width="2.4"/><path d="M 104,214 L 124,214 Q 138,214 138,226 L 138,238 L 104,238 Z" fill="#4f3320" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/></g>`;

  let torsoLayer = "";
  if (hero.role === "WARRIOR") {
    torsoLayer = `<rect x="88" y="182" width="44" height="24" rx="2" fill="${p}" stroke="${INK}" stroke-width="2.4"/><line x1="116" y1="182" x2="116" y2="206" stroke="${INK}" stroke-width="2.2"/><rect x="88" y="138" width="44" height="48" rx="6" fill="${met}" stroke="${INK}" stroke-width="2.5"/><line x1="116" y1="138" x2="116" y2="186" stroke="${INK}" stroke-width="2"/><rect x="87" y="176" width="46" height="10" fill="#7c4d2b" stroke="${INK}" stroke-width="2.3"/><rect x="112" y="174" width="12" height="14" rx="2" fill="#dce3eb" stroke="${INK}" stroke-width="2.2"/>`;
  } else if (hero.role === "MAGE") {
    torsoLayer = `<polygon points="88,138 132,138 142,236 78,236" fill="${p}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="108,138 124,138 128,236 108,236" fill="${s}" stroke="${INK}" stroke-width="2.3"/><rect x="86" y="174" width="48" height="8" rx="3" fill="#8c5832" stroke="${INK}" stroke-width="2.3"/><path d="M 92,204 L 94,209 L 99,211 L 94,213 L 92,218 L 90,213 L 85,211 L 90,209 Z" fill="${acc}"/><path d="M 131,208 L 133,212 L 137,214 L 133,216 L 131,220 L 129,216 L 125,214 L 129,212 Z" fill="${acc}"/>`;
  } else if (hero.role === "SCOUT") {
    torsoLayer = `<rect x="88" y="138" width="44" height="62" rx="4" fill="${p}" stroke="${INK}" stroke-width="2.4"/><rect x="90" y="140" width="18" height="54" rx="3" fill="#8c5832" stroke="${INK}" stroke-width="2.3"/><rect x="114" y="140" width="16" height="54" rx="3" fill="#8c5832" stroke="${INK}" stroke-width="2.3"/><path d="M 90,136 Q 114,148 130,136 L 128,148 Q 112,156 92,148 Z" fill="${acc}" stroke="${INK}" stroke-width="2.3"/><line x1="94" y1="142" x2="128" y2="194" stroke="#6e4223" stroke-width="6.5" stroke-linecap="round"/><line x1="94" y1="142" x2="128" y2="194" stroke="${INK}" stroke-width="2"/>`;
  } else if (hero.role === "ALCHEMIST") {
    torsoLayer = `<rect x="88" y="138" width="44" height="66" rx="4" fill="#f7f3eb" stroke="${INK}" stroke-width="2.4"/><rect x="104" y="180" width="18" height="14" rx="2" fill="#efe9dc" stroke="${INK}" stroke-width="2.1"/><line x1="128" y1="140" x2="90" y2="188" stroke="#7c4722" stroke-width="6.5"/><rect x="114" y="149" width="7" height="12" rx="2" transform="rotate(42 117 155)" fill="#e6a82e" stroke="${INK}" stroke-width="1.8"/><rect x="105" y="158" width="7" height="12" rx="2" transform="rotate(42 108 164)" fill="#52b788" stroke="${INK}" stroke-width="1.8"/><rect x="96" y="167" width="7" height="12" rx="2" transform="rotate(42 99 173)" fill="#9b5de5" stroke="${INK}" stroke-width="1.8"/>`;
  } else if (hero.role === "CLERIC") {
    torsoLayer = `<polygon points="86,138 134,138 142,236 78,236" fill="${s}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><rect x="85" y="176" width="50" height="9" fill="#8c5832" stroke="${INK}" stroke-width="2.2"/><polygon points="104,138 128,138 130,236 102,236" fill="${p}" stroke="${INK}" stroke-width="2.4"/><circle cx="116" cy="164" r="7.5" fill="${acc}" stroke="${INK}" stroke-width="1.8"/>`;
  } else {
    torsoLayer = `<rect x="88" y="138" width="44" height="58" rx="4" fill="#8c6239" stroke="${INK}" stroke-width="2.5"/><rect x="92" y="150" width="14" height="14" rx="2" fill="#6e4927" stroke="${INK}" stroke-width="2"/><rect x="112" y="150" width="16" height="14" rx="2" fill="#6e4927" stroke="${INK}" stroke-width="2"/><rect x="88" y="168" width="44" height="7" fill="#e6a82e" stroke="${INK}" stroke-width="2"/>`;
  }

  let headLayer = `
    ${!hero.helm.includes("bald") ? `<path d="M 76,82 Q 66,128 76,144 L 114,144 L 114,82 Z" fill="${hero.hair}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>` : ""}
    <circle cx="84" cy="102" r="7" fill="${hero.skin}" stroke="${INK}" stroke-width="2.3"/>
    <rect x="82" y="64" width="58" height="66" rx="27" fill="${hero.skin}" stroke="${INK}" stroke-width="2.5"/>
    ${!hero.helm.includes("bald") ? `<path d="M 82,90 Q 102,72 118,82 Q 130,72 140,86 Q 140,64 110,64 Q 82,64 82,90 Z" fill="${hero.hair}" stroke="${INK}" stroke-width="2.3"/>` : ""}
    <ellipse cx="102" cy="108" rx="5.5" ry="3.2" fill="#e57373" opacity="0.48"/>
    <g transform="translate(109, 98)"><ellipse cx="0" cy="0" rx="7" ry="8.5" fill="#ffffff" stroke="${INK}" stroke-width="2.2"/><circle cx="1.4" cy="0.5" r="4.8" fill="${hero.eyes}"/><circle cx="1.8" cy="0.5" r="2.5" fill="${INK}"/><circle cx="-0.6" cy="-2" r="1.8" fill="#ffffff"/><circle cx="2.4" cy="2" r="0.9" fill="#ffffff"/></g>
    <g transform="translate(129, 98)"><ellipse cx="0" cy="0" rx="5.5" ry="8" fill="#ffffff" stroke="${INK}" stroke-width="2.1"/><circle cx="1.2" cy="0.5" r="4.2" fill="${hero.eyes}"/><circle cx="1.5" cy="0.5" r="2.2" fill="${INK}"/><circle cx="-0.4" cy="-2" r="1.5" fill="#ffffff"/><circle cx="2.0" cy="2" r="0.8" fill="#ffffff"/></g>
    ${hero.expr === "frown" ? `<line x1="101" y1="85" x2="115" y2="89" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/><line x1="135" y1="85" x2="123" y2="89" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>` : `<path d="M 101,87 Q 109,83 116,87" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><path d="M 123,87 Q 129,83 135,87" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`}
    <path d="M 120,101 L 126,106 L 119,108" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
  `;
  if (hero.beard) {
    headLayer += `<path d="M 88,104 Q 90,138 118,140 Q 142,136 140,106 Q 130,118 114,118 Q 96,118 88,104 Z" fill="${hero.hair}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M 106,112 Q 118,107 130,112" fill="none" stroke="${hero.hair}" stroke-width="4.8" stroke-linecap="round"/><path d="M 112,115 Q 119,120 125,115 Z" fill="#ffffff" stroke="${INK}" stroke-width="1.8"/>`;
  } else if (hero.expr === "grin") {
    headLayer += `<path d="M 111,113 Q 119,122 127,113 Z" fill="#ffffff" stroke="${INK}" stroke-width="2.1" stroke-linejoin="round"/>`;
  } else if (hero.expr === "frown") {
    headLayer += `<line x1="113" y1="116" x2="125" y2="116" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>`;
  } else {
    headLayer += `<path d="M 112,113 Q 120,119 126,113" fill="none" stroke="${INK}" stroke-width="2.3" stroke-linecap="round"/>`;
  }
  headLayer += buildHeadgearSvg(hero, party, "profile");
  return { backGearLayer, legsLayer, torsoLayer, headLayer };
}

function buildHeadgearSvg(
  hero: CanonicalHeroDef,
  party: CanonicalPartyRoster,
  view: "south" | "north" | "profile",
): string {
  const INK = HERO_RIG_INK;
  const { primary: p, secondary: s, accent: acc, metal: met, metalDark: metD } = party;

  if (hero.helm === "headband") {
    if (view === "north") return `<rect x="80" y="77" width="60" height="7" rx="3" fill="${acc}" stroke="${INK}" stroke-width="2.3"/><polygon points="110,82 102,98 108,98 110,86 114,98 120,98" fill="${acc}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
    if (view === "profile") return `<polygon points="82,79 68,73 72,82 67,88 82,83" fill="${acc}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><rect x="82" y="77" width="58" height="7" rx="3" fill="${acc}" stroke="${INK}" stroke-width="2.3"/>`;
    return `<rect x="80" y="77" width="60" height="7" rx="3" fill="${acc}" stroke="${INK}" stroke-width="2.3"/><polygon points="140,79 152,73 149,82 153,87 140,83" fill="${acc}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  }
  if (hero.helm === "horned") {
    const noseGuard = view === "north" ? "" : `<rect x="${view === "profile" ? 118 : 107}" y="77" width="6" height="19" rx="2" fill="${met}" stroke="${INK}" stroke-width="2.2"/>`;
    return `<path d="M 78,80 Q 60,72 58,54 Q 68,66 82,70 Z" fill="#f7f3eb" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M 142,80 Q 160,72 162,54 Q 152,66 138,70 Z" fill="#f7f3eb" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M 78,82 Q 78,56 110,56 Q 142,56 142,82 Z" fill="${met}" stroke="${INK}" stroke-width="2.5"/><rect x="76" y="77" width="68" height="7" rx="3" fill="${metD}" stroke="${INK}" stroke-width="2.3"/>${noseGuard}`;
  }
  if (hero.helm === "hat") {
    const star = view === "north" ? "" : `<polygon points="110,48 112,53 117,53 113,56 115,61 110,58 105,61 107,56 103,53 108,53" fill="${acc}" stroke="${INK}" stroke-width="1.5"/>`;
    return `<path d="M 80,74 L 106,32 Q 116,22 126,30 L 118,42 L 140,74 Z" fill="${p}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><polygon points="84,68 136,68 138,75 82,75" fill="${s}" stroke="${INK}" stroke-width="2"/><ellipse cx="110" cy="75" rx="44" ry="8" fill="${p}" stroke="${INK}" stroke-width="2.5"/>${star}`;
  }
  if (hero.helm === "hood") {
    if (view === "north") return `<path d="M 74,116 Q 72,52 110,52 Q 148,52 146,116 Z" fill="${p}" stroke="${INK}" stroke-width="2.5"/>`;
    return `<path d="M 74,104 Q 72,52 110,52 Q 148,52 146,104 Q 142,76 110,76 Q 78,76 74,104 Z" fill="${p}" stroke="${INK}" stroke-width="2.5"/><path d="M 79,82 Q 110,72 141,82" fill="none" stroke="${INK}" stroke-width="2.3"/>`;
  }
  if (hero.helm === "bun" || hero.helm === "hair") {
    const bun = hero.helm === "bun" ? `<circle cx="${view === "profile" ? 96 : 110}" cy="49" r="14" fill="${hero.hair}" stroke="${INK}" stroke-width="2.4"/>` : "";
    if (view === "north") return `${bun}<rect x="80" y="75" width="60" height="7" fill="#7c4722" stroke="${INK}" stroke-width="2.2"/>`;
    const g1x = view === "profile" ? 108 : 98;
    const g2x = view === "profile" ? 129 : 122;
    return `${bun}<rect x="80" y="73" width="60" height="6" fill="#7c4722" stroke="${INK}" stroke-width="2"/><circle cx="${g1x}" cy="76" r="10" fill="#e6dcd2" stroke="${INK}" stroke-width="2.3"/><circle cx="${g1x}" cy="76" r="6.5" fill="${acc}" stroke="${INK}" stroke-width="1.8"/><circle cx="${g1x - 2}" cy="74" r="2" fill="#ffffff"/><circle cx="${g2x}" cy="76" r="10" fill="#e6dcd2" stroke="${INK}" stroke-width="2.3"/><circle cx="${g2x}" cy="76" r="6.5" fill="${acc}" stroke="${INK}" stroke-width="1.8"/><circle cx="${g2x - 2}" cy="74" r="2" fill="#ffffff"/>`;
  }
  if (hero.helm.includes("circlet")) {
    const bun = hero.helm === "bun-circlet" ? `<circle cx="${view === "profile" ? 98 : 110}" cy="50" r="13" fill="${hero.hair}" stroke="${INK}" stroke-width="2.4"/>` : "";
    const gem = view === "north" ? "" : `<polygon points="${view === "profile" ? "122,70 128,77.5 122,85 116,77.5" : "110,70 116,77.5 110,85 104,77.5"}" fill="${acc}" stroke="${INK}" stroke-width="2"/>`;
    return `${bun}<rect x="80" y="75" width="60" height="5" fill="#d4a634" stroke="${INK}" stroke-width="2"/>${gem}`;
  }
  const lamp = view === "north" ? "" : `<circle cx="${view === "profile" ? 124 : 110}" cy="67" r="7.5" fill="#fff3c4" stroke="${INK}" stroke-width="2.2"/>`;
  return `<path d="M 78,80 Q 78,52 110,52 Q 142,52 142,80 Z" fill="#f5b82e" stroke="${INK}" stroke-width="2.5"/><rect x="72" y="77" width="76" height="6" rx="3" fill="#f5b82e" stroke="${INK}" stroke-width="2.4"/>${lamp}`;
}
