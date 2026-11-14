import type {
  ArticulatedRigPoseKind,
  CanonicalPartyRoster,
  CombatWeaponArchetypeKind,
} from "./hero-party-catalog.ts";
import { HERO_RIG_INK } from "./hero-rig-anatomy.ts";

export function buildSpellcastBackMandala(party: CanonicalPartyRoster): string {
  const acc = party.accent;
  return `
    <g class="fx-pillar">
      <rect x="64" y="16" width="92" height="226" rx="46" fill="${acc}" opacity="0.16" />
      <rect x="78" y="24" width="64" height="216" rx="32" fill="#7ce8ff" opacity="0.18" />
      <line x1="70" y1="34" x2="70" y2="236" stroke="#7ce8ff" stroke-width="2" stroke-dasharray="8 6" opacity="0.75" />
      <line x1="150" y1="34" x2="150" y2="236" stroke="${acc}" stroke-width="2" stroke-dasharray="8 6" opacity="0.75" />
    </g>
    <g transform="translate(110, 132)">
      <circle cx="0" cy="0" r="88" fill="#00bbf9" opacity="0.12" />
      <g class="fx-rune-spin">
        <circle cx="0" cy="0" r="84" fill="none" stroke="#7ce8ff" stroke-width="2.6" />
        <circle cx="0" cy="0" r="72" fill="none" stroke="#7ce8ff" stroke-width="2" />
        <circle cx="0" cy="0" r="78" fill="none" stroke="#7ce8ff" stroke-width="6" stroke-dasharray="3.2 6.4" />
        <path d="M 0,-71 L 42,57 L -67,-22 L 67,-22 L -42,57 Z" fill="none" stroke="#7ce8ff" stroke-width="2.2" stroke-linejoin="round" />
        <circle cx="0" cy="-71" r="5" fill="#ffffff" stroke="#00bbf9" stroke-width="2.2" />
        <circle cx="67" cy="-22" r="5" fill="#ffffff" stroke="#00bbf9" stroke-width="2.2" />
        <circle cx="42" cy="57" r="5" fill="#ffffff" stroke="#00bbf9" stroke-width="2.2" />
        <circle cx="-42" cy="57" r="5" fill="#ffffff" stroke="#00bbf9" stroke-width="2.2" />
        <circle cx="-67" cy="-22" r="5" fill="#ffffff" stroke="#00bbf9" stroke-width="2.2" />
      </g>
      <g class="fx-rune-rev">
        <circle cx="0" cy="0" r="54" fill="none" stroke="${acc}" stroke-width="2" stroke-dasharray="6 4" />
        <polygon points="0,-52 45,26 -45,26" fill="none" stroke="${acc}" stroke-width="1.6" opacity="0.85" />
        <polygon points="0,52 45,-26 -45,-26" fill="none" stroke="${acc}" stroke-width="1.6" opacity="0.85" />
      </g>
    </g>
    <g transform="translate(110, 238) scale(1, 0.32)">
      <circle cx="0" cy="0" r="82" fill="#7ce8ff" opacity="0.22" />
      <g class="fx-rune-spin">
        <circle cx="0" cy="0" r="78" fill="none" stroke="#7ce8ff" stroke-width="4" />
        <circle cx="0" cy="0" r="64" fill="none" stroke="${acc}" stroke-width="3" stroke-dasharray="8 5" />
        <path d="M 0,-64 L 38,52 L -61,-20 L 61,-20 L -38,52 Z" fill="none" stroke="#ffffff" stroke-width="3" />
      </g>
    </g>
  `;
}

export function buildActionAndCombatFxOverlay(
  party: CanonicalPartyRoster,
  poseMode: ArticulatedRigPoseKind,
  weaponType: CombatWeaponArchetypeKind,
  animPhase = 0,
): string {
  const INK = HERO_RIG_INK;
  const acc = party.accent;
  const normPhase = ((animPhase % 1) + 1) % 1;

  if (poseMode === "spellcast") {
    return `
      <circle cx="97" cy="98" r="10" fill="#7ce8ff" opacity="0.38" />
      <circle cx="123" cy="98" r="10" fill="#7ce8ff" opacity="0.38" />
      <circle cx="97" cy="98" r="3.5" fill="#e0fbfc" />
      <circle cx="123" cy="98" r="3.5" fill="#e0fbfc" />
      <path d="M 38,224 C 66,188 154,196 182,150" fill="none" stroke="#00bbf9" stroke-width="7" stroke-linecap="round" opacity="0.38" />
      <path d="M 38,224 C 66,188 154,196 182,150" fill="none" stroke="#e0fbfc" stroke-width="2.6" stroke-linecap="round" />
      <path d="M 42,158 C 72,122 148,132 178,86" fill="none" stroke="${acc}" stroke-width="6.5" stroke-linecap="round" opacity="0.42" />
      <path d="M 42,158 C 72,122 148,132 178,86" fill="none" stroke="#fff3b0" stroke-width="2.4" stroke-linecap="round" />
      <g transform="translate(48, 152) rotate(-12)">
        <g class="fx-float-1">
          <circle cx="0" cy="0" r="28" fill="#7ce8ff" opacity="0.26" />
          <rect x="-24" y="-17" width="48" height="34" rx="3" fill="#6b2d5c" stroke="${INK}" stroke-width="2.3" />
          <rect x="-20" y="-13" width="40" height="26" fill="#fbf6e8" stroke="${INK}" stroke-width="1.6" />
          <line x1="0" y1="-13" x2="0" y2="13" stroke="${INK}" stroke-width="1.8" />
          <line x1="-15" y1="-6" x2="-4" y2="-6" stroke="#00bbf9" stroke-width="2" />
          <line x1="-15" y1="0" x2="-4" y2="0" stroke="${acc}" stroke-width="2" />
          <line x1="-15" y1="6" x2="-6" y2="6" stroke="#00bbf9" stroke-width="2" />
          <polygon points="10,-5 15,2 5,2" fill="none" stroke="#7c3aed" stroke-width="1.8" />
          <circle cx="10" cy="6" r="2.5" fill="${acc}" />
          <polygon points="-6,-26 0,-36 6,-26" fill="none" stroke="#7ce8ff" stroke-width="2" />
          <polygon points="10,-32 12,-27 17,-25 12,-23 10,-18 8,-23 3,-25 8,-27" fill="#fde047" />
        </g>
      </g>
      <g transform="translate(152, 48)">
        <circle cx="0" cy="0" r="36" fill="${acc}" opacity="0.28" />
        <circle cx="0" cy="0" r="24" fill="#7ce8ff" opacity="0.38" />
        <g class="fx-nova">
          <circle cx="0" cy="0" r="26" fill="none" stroke="#7ce8ff" stroke-width="2.2" stroke-dasharray="5 4" />
          <polygon points="0,-34 5,-9 24,-24 9,-5 34,0 9,5 24,24 5,9 0,34 -5,9 -24,24 -9,5 -34,0 -9,-5 -24,-24 -5,-9" fill="#fef08a" stroke="${acc}" stroke-width="1.4" />
          <polygon points="0,-20 4,-4 20,0 4,4 0,20 -4,4 -20,0 -4,-4" fill="#ffffff" />
          <circle cx="0" cy="0" r="6.5" fill="#e0fbfc" stroke="#00bbf9" stroke-width="2" />
        </g>
      </g>
      <g class="fx-bolt">
        <polyline points="152,48 122,74 128,92 88,116 56,136" fill="none" stroke="#7ce8ff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.55" />
        <polyline points="152,48 122,74 128,92 88,116 56,136" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="152,48 134,26 110,18 82,30 52,54" fill="none" stroke="${acc}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity="0.6" />
        <polyline points="152,48 134,26 110,18 82,30 52,54" fill="none" stroke="#fef9c3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
        <polyline points="152,48 176,96 164,138 184,182 170,232" fill="none" stroke="#7ce8ff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.7" />
      </g>
      <g class="fx-float-2">
        <circle cx="48" cy="62" r="11" fill="#1e1b4b" stroke="#7ce8ff" stroke-width="2.2" />
        <polygon points="48,54 55,66 41,66" fill="none" stroke="#fde047" stroke-width="1.8" />
        <polygon points="32,96 35,103 42,106 35,109 32,116 29,109 22,106 29,103" fill="#7ce8ff" stroke="#ffffff" stroke-width="1" />
        <polygon points="184,116 187,123 194,126 187,129 184,136 181,129 174,126 181,123" fill="#fde047" stroke="${INK}" stroke-width="1" />
      </g>
    `;
  }

  if (poseMode === "combat") {
    if (weaponType === "sword") {
      const isWindup = normPhase < 0.16;
      const isUpperCleave = normPhase >= 0.16 && normPhase < 0.52;
      const isImpactCleave = normPhase >= 0.52 && normPhase < 0.82;
      const outerPath = isWindup
        ? "M 118,16 C 154,14 186,34 198,66 C 184,58 172,52 162,48 C 150,30 134,20 118,16 Z"
        : isUpperCleave
          ? "M 114,18 C 194,20 258,98 238,184 C 216,174 202,162 192,148 C 212,96 172,42 114,18 Z"
          : isImpactCleave
            ? "M 136,48 C 208,58 262,132 232,216 C 212,204 198,192 188,178 C 216,128 184,74 136,48 Z"
            : "M 164,96 C 214,112 246,158 226,214 C 214,204 206,194 200,184 C 214,152 194,118 164,96 Z";
      const corePath = isWindup
        ? "M 128,22 C 156,22 180,38 190,62 C 180,56 172,50 164,46 C 152,32 140,26 128,22 Z"
        : isUpperCleave
          ? "M 132,32 C 198,38 248,104 232,178 C 220,168 210,158 204,146 C 218,100 184,52 132,32 Z"
          : isImpactCleave
            ? "M 152,64 C 212,74 252,136 228,208 C 216,198 208,188 202,176 C 222,132 194,86 152,64 Z"
            : "M 176,112 C 214,126 238,162 222,208 C 214,200 208,192 204,182 C 216,156 198,128 176,112 Z";
      const tipX = isWindup ? 192 : isUpperCleave ? 232 : 216;
      const tipY = isWindup ? 60 : isUpperCleave ? 176 : 184;
      const speedWisp = isWindup
        ? ""
        : `<path d="M 148,20 C 216,32 266,108 246,192" fill="none" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round" opacity="${isImpactCleave ? "0.9" : "0.65"}" />`;
      const impactShards = isImpactCleave
        ? `<line x1="216" y1="184" x2="246" y2="168" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" /><line x1="216" y1="184" x2="244" y2="206" stroke="#fde047" stroke-width="2.6" stroke-linecap="round" /><circle cx="248" cy="176" r="3" fill="#fef08a" />`
        : !isWindup && !isUpperCleave
          ? `<circle cx="222" cy="168" r="2.8" fill="#fde047" opacity="0.75" /><circle cx="236" cy="196" r="2.2" fill="#f97316" opacity="0.65" />`
          : "";
      return `
        <defs>
          <linearGradient id="fx-sword-outer" x1="${tipX}" y1="${tipY}" x2="118" y2="22" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="28%" stop-color="#fde047" stop-opacity="0.95" />
            <stop offset="70%" stop-color="${acc}" stop-opacity="0.52" />
            <stop offset="100%" stop-color="${acc}" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="fx-sword-core" x1="${tipX}" y1="${tipY}" x2="132" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="45%" stop-color="#fef08a" stop-opacity="0.9" />
            <stop offset="100%" stop-color="#ef4444" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="fx-slash">
          <path d="${outerPath}" fill="url(#fx-sword-outer)" />
          <path d="${corePath}" fill="url(#fx-sword-core)" />
          ${speedWisp}
          ${impactShards}
          <g transform="translate(${tipX}, ${tipY}) rotate(24)">
            <polygon points="0,-24 4,-4 28,0 4,4 0,24 -4,4 -28,0 -4,-4" fill="#ffffff" stroke="#fde047" stroke-width="1.3" />
            <polygon points="-12,-12 -2,-3 12,-12 3,-2 12,12 2,3 -12,12 -3,2" fill="#fef08a" />
          </g>
        </g>
      `;
    }
    if (weaponType === "staff") {
      return `
        <defs>
          <linearGradient id="fx-staff-grad" x1="86" y1="0" x2="-12" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="38%" stop-color="#7ce8ff" stop-opacity="0.88" />
            <stop offset="100%" stop-color="${acc}" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g transform="translate(152, 56)">
          <circle cx="0" cy="0" r="20" fill="${acc}" opacity="0.32" />
          <circle cx="0" cy="0" r="16" fill="none" stroke="#7ce8ff" stroke-width="2" stroke-dasharray="4 3" class="fx-rune-spin" />
          <g class="fx-staff-beam">
            <path d="M -8,-14 L 58,-22 C 76,-12 76,12 58,22 L -8,14 C 14,8 14,-8 -8,-14 Z" fill="url(#fx-staff-grad)" />
            <path d="M 46,-26 C 72,-16 86,0 72,26 C 64,14 60,6 56,0 C 60,-6 64,-14 46,-26 Z" fill="#ffffff" stroke="#7ce8ff" stroke-width="1.5" />
            <polyline points="0,0 24,-10 42,6 68,-4" fill="none" stroke="#fef08a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
            <polygon points="70,-18 73,-3 88,0 73,3 70,18 67,3 52,0 67,-3" fill="#ffffff" stroke="#7ce8ff" stroke-width="1.2" />
          </g>
        </g>
      `;
    }
    if (weaponType === "bow") {
      return `
        <defs>
          <linearGradient id="fx-bow-grad" x1="74" y1="0" x2="-24" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="45%" stop-color="#6ee7b7" stop-opacity="0.85" />
            <stop offset="100%" stop-color="#fde047" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g transform="translate(158, 168)">
          <ellipse cx="-14" cy="0" rx="4" ry="26" fill="none" stroke="#fef08a" stroke-width="2" opacity="0.7" />
          <g class="fx-arrow-shot">
            <polygon class="fx-wind-cone" points="74,0 18,-16 32,0 18,16" fill="url(#fx-bow-grad)" />
            <line x1="-22" y1="0" x2="68" y2="0" stroke="url(#fx-bow-grad)" stroke-width="5.5" stroke-linecap="round" />
            <line x1="-16" y1="-10" x2="48" y2="-6" stroke="#6ee7b7" stroke-width="2.2" stroke-linecap="round" opacity="0.85" />
            <line x1="-16" y1="10" x2="48" y2="6" stroke="#6ee7b7" stroke-width="2.2" stroke-linecap="round" opacity="0.85" />
            <polygon points="76,0 58,-7 63,0 58,7" fill="#ffffff" stroke="#10b981" stroke-width="1.4" />
          </g>
        </g>
      `;
    }
    if (weaponType === "pickaxe") {
      const isHeavyImpact = normPhase >= 0.42;
      const shockRx = isHeavyImpact ? 42 : 26;
      const shockRy = isHeavyImpact ? 14 : 9;
      return `
        <defs>
          <linearGradient id="fx-pick-grad" x1="208" y1="208" x2="138" y2="26" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
            <stop offset="35%" stop-color="#fde047" stop-opacity="0.92" />
            <stop offset="78%" stop-color="#f97316" stop-opacity="0.52" />
            <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
          </linearGradient>
        </defs>
        <g class="fx-slash">
          <path d="M 136,26 C 192,46 232,124 216,208 L 186,204 C 196,132 172,66 136,26 Z" fill="url(#fx-pick-grad)" />
          <path d="M 150,40 C 194,60 222,128 210,204 L 194,202 C 202,134 180,74 150,40 Z" fill="#ffffff" opacity="0.78" />
          <g transform="translate(204, 208)" class="fx-impact-flash">
            <ellipse class="fx-shockwave-ring" cx="0" cy="0" rx="${shockRx}" ry="${shockRy}" fill="none" stroke="#f97316" stroke-width="3.4" opacity="0.88" />
            <ellipse cx="0" cy="0" rx="${Math.round(shockRx * 0.64)}" ry="${Math.round(shockRy * 0.64)}" fill="#fde047" fill-opacity="0.35" stroke="#ffffff" stroke-width="2.4" />
            <polygon points="-34,0 -16,-26 -6,-6 0,-36 8,-6 22,-24 34,0 10,4 0,14 -10,4" fill="#ffffff" stroke="#ea580c" stroke-width="1.5" />
            <polygon points="-36,-20 -24,-32 -20,-16" fill="#94a3b8" stroke="${INK}" stroke-width="1.8" />
            <polygon points="28,-26 40,-16 26,-10" fill="#cbd5e1" stroke="${INK}" stroke-width="1.8" />
          </g>
        </g>
      `;
    }
    return `
      <defs>
        <linearGradient id="fx-dagger-grad" x1="254" y1="172" x2="150" y2="172" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="1" />
          <stop offset="40%" stop-color="#fde047" stop-opacity="0.92" />
          <stop offset="80%" stop-color="${acc}" stop-opacity="0.48" />
          <stop offset="100%" stop-color="${acc}" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g class="fx-slash">
        <ellipse class="fx-sonic-ring" cx="174" cy="172" rx="7" ry="22" fill="none" stroke="#7ce8ff" stroke-width="2.5" opacity="0.85" />
        <polygon points="152,158 254,172 152,186 168,172" fill="url(#fx-dagger-grad)" />
        <polygon points="164,166 250,172 164,178" fill="#ffffff" opacity="0.95" />
        <line x1="144" y1="152" x2="224" y2="152" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round" opacity="0.82" />
        <line x1="144" y1="192" x2="224" y2="192" stroke="#fef08a" stroke-width="2.2" stroke-linecap="round" opacity="0.82" />
        <g transform="translate(250, 172)">
          <polygon points="0,-18 3,-3 22,0 3,3 0,18 -3,3 -22,0 -3,-3" fill="#ffffff" stroke="#fde047" stroke-width="1.2" />
        </g>
      </g>
    `;
  }

  if (poseMode === "forge") {
    return `
      <g transform="translate(174, 212)">
        <rect x="-16" y="12" width="32" height="16" rx="3" fill="#8a5632" stroke="${INK}" stroke-width="2.2" />
        <path d="M -28,2 L -12,-5 L 24,-7 L 24,13 L -12,11 Z" fill="#5c646d" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" />
        <rect x="-14" y="-12" width="30" height="7" rx="3" fill="#ff6b00" stroke="#dc2626" stroke-width="1.8" />
        <rect x="-8" y="-10" width="18" height="3.5" rx="1.5" fill="#fef08a" />
        <g transform="translate(0, -12)">
          <g class="fx-impact-flash">
            <circle cx="0" cy="0" r="22" fill="#ff9f1c" opacity="0.42" />
            <circle cx="0" cy="0" r="13" fill="#fef08a" opacity="0.72" />
            <polygon points="0,-22 5,-5 22,0 5,5 0,22 -5,5 -22,0 -5,-5" fill="#fef08a" stroke="#f97316" stroke-width="1.5" />
            <polygon points="0,-12 3,-3 12,0 3,3 0,12 -3,3 -12,0 -3,-3" fill="#ffffff" />
          </g>
        </g>
        <g transform="translate(0, -12)">
          <g class="fx-spark-a">
            <line x1="-4" y1="-6" x2="-26" y2="-38" stroke="#fef08a" stroke-width="3.2" stroke-linecap="round" />
            <line x1="0" y1="-10" x2="-4" y2="-48" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" />
            <line x1="6" y1="-8" x2="28" y2="-42" stroke="#f97316" stroke-width="3.2" stroke-linecap="round" />
            <line x1="10" y1="-2" x2="36" y2="-18" stroke="#fde047" stroke-width="2.8" stroke-linecap="round" />
            <line x1="-8" y1="-2" x2="-32" y2="-16" stroke="#fb923c" stroke-width="2.8" stroke-linecap="round" />
            <polygon points="-28,-42 -25,-35 -18,-33 -25,-31 -28,-24 -31,-31 -38,-33 -31,-35" fill="#fef08a" stroke="#ea580c" stroke-width="1" />
            <polygon points="30,-46 33,-39 40,-37 33,-35 30,-28 27,-35 20,-37 27,-39" fill="#ffffff" stroke="#f97316" stroke-width="1" />
            <circle cx="-8" cy="-52" r="3.5" fill="#fde047" stroke="#ea580c" stroke-width="1" />
            <circle cx="38" cy="-22" r="3.5" fill="#f97316" />
          </g>
        </g>
        <g transform="translate(0, -12)">
          <g class="fx-spark-b">
            <line x1="-4" y1="-8" x2="-18" y2="-46" stroke="#f97316" stroke-width="3" stroke-linecap="round" />
            <line x1="6" y1="-10" x2="16" y2="-50" stroke="#fef08a" stroke-width="3.2" stroke-linecap="round" />
            <line x1="8" y1="-4" x2="34" y2="-30" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" />
            <line x1="-6" y1="-4" x2="-28" y2="-28" stroke="#fde047" stroke-width="2.8" stroke-linecap="round" />
            <polygon points="16,-54 19,-47 26,-45 19,-43 16,-36 13,-45 6,-47 13,-49" fill="#fef08a" stroke="#ea580c" stroke-width="1" />
            <polygon points="-20,-50 -17,-43 -10,-41 -17,-39 -20,-32 -23,-39 -30,-41 -23,-43" fill="#fb923c" stroke="#ffffff" stroke-width="1" />
            <circle cx="36" cy="-34" r="3.5" fill="#fde047" />
            <circle cx="-30" cy="-32" r="3.5" fill="#f97316" />
          </g>
        </g>
      </g>
    `;
  }

  if (poseMode === "tinker") {
    return `
      <g transform="translate(172, 208)">
        <g class="fx-rune-spin">
          <circle cx="0" cy="0" r="18" fill="#d49b35" stroke="${INK}" stroke-width="2.3" />
          <circle cx="0" cy="0" r="14" fill="none" stroke="${INK}" stroke-width="4.5" stroke-dasharray="3.5 3.5" />
          <circle cx="0" cy="0" r="5.5" fill="#334155" stroke="${INK}" stroke-width="1.8" />
        </g>
        <g transform="translate(0, -12)">
          <g class="fx-spark-a">
            <line x1="-4" y1="0" x2="-22" y2="-28" stroke="#7ce8ff" stroke-width="3" stroke-linecap="round" />
            <line x1="4" y1="0" x2="24" y2="-30" stroke="#fde047" stroke-width="3" stroke-linecap="round" />
            <polygon points="0,-18 4,-4 18,0 4,4 0,18 -4,4 -18,0 -4,-4" fill="#e0fbfc" stroke="#00bbf9" stroke-width="1.4" />
            <circle cx="-24" cy="-30" r="3.5" fill="#7ce8ff" />
            <circle cx="26" cy="-32" r="3.5" fill="#fde047" />
          </g>
        </g>
        <g transform="translate(0, -12)">
          <g class="fx-spark-b">
            <line x1="-2" y1="-4" x2="-14" y2="-34" stroke="#fde047" stroke-width="2.8" stroke-linecap="round" />
            <line x1="6" y1="-2" x2="20" y2="-36" stroke="#7ce8ff" stroke-width="2.8" stroke-linecap="round" />
            <circle cx="-16" cy="-36" r="3" fill="#fde047" />
            <circle cx="22" cy="-38" r="3" fill="#7ce8ff" />
          </g>
        </g>
      </g>
    `;
  }

  if (poseMode === "library") {
    return `
      <g transform="translate(168, 156)">
        <g class="fx-float-2">
          <circle cx="0" cy="8" r="18" fill="#fef08a" opacity="0.28" />
          <polygon points="-10,-18 -7,-11 0,-9 -7,-7 -10,0 -13,-7 -20,-9 -13,-11" fill="#fbbf24" stroke="${INK}" stroke-width="1" />
          <polygon points="14,-28 17,-21 24,-19 17,-17 14,-10 11,-17 4,-19 11,-21" fill="#38bdf8" stroke="${INK}" stroke-width="1" />
          <circle cx="2" cy="-36" r="3.5" fill="#fde047" />
        </g>
      </g>
    `;
  }

  if (poseMode === "spyglass") {
    return `
      <g transform="translate(180, 148)">
        <polygon points="0,0 38,-28 38,16" fill="#7ce8ff" opacity="0.28" />
        <path d="M 18,-14 A 22,22 0 0,1 18,9" fill="none" stroke="#38bdf8" stroke-width="2.4" stroke-dasharray="4 3" />
        <path d="M 30,-22 A 34,34 0 0,1 30,14" fill="none" stroke="#fde047" stroke-width="2.4" stroke-dasharray="5 4" />
        <polygon points="0,-14 3,-3 14,0 3,3 0,14 -3,3 -14,0 -3,-3" fill="#ffffff" stroke="#38bdf8" stroke-width="1.2" />
      </g>
    `;
  }

  if (poseMode === "alchemy") {
    return `
      <g transform="translate(172, 214)">
        <ellipse cx="0" cy="8" rx="26" ry="11" fill="#2b2628" stroke="${INK}" stroke-width="2.4" />
        <ellipse cx="0" cy="6" rx="20" ry="7.5" fill="#52e388" stroke="${INK}" stroke-width="1.8" />
        <circle cx="-6" cy="-12" r="5.5" fill="#52e388" stroke="${INK}" stroke-width="1.6" class="anim-bubble-1" />
        <circle cx="8" cy="-20" r="7" fill="#c76be8" stroke="${INK}" stroke-width="1.6" class="anim-bubble-2" />
        <circle cx="0" cy="-30" r="4.5" fill="#a8f7c6" stroke="${INK}" stroke-width="1.4" class="anim-bubble-1" />
      </g>
    `;
  }

  if (poseMode === "exhale") {
    return `
      <g transform="translate(110, 108)">
        <g class="anim-breath-1">
          <ellipse cx="0" cy="-14" rx="22" ry="12" fill="#bae6fd" opacity="0.78" stroke="#38bdf8" stroke-width="1.5"/>
          <circle cx="-12" cy="-18" r="9" fill="#e0f2fe" opacity="0.85"/>
          <circle cx="14" cy="-16" r="10" fill="#e0f2fe" opacity="0.85"/>
        </g>
        <g class="anim-breath-2">
          <ellipse cx="6" cy="-24" rx="18" ry="10" fill="#e0f2fe" opacity="0.7"/>
          <circle cx="-8" cy="-28" r="4" fill="#ffffff"/>
          <circle cx="12" cy="-32" r="3" fill="#38bdf8"/>
        </g>
      </g>
    `;
  }

  return "";
}
