import { deflateSync } from "node:zlib";

/**
 * Canonical system-wide `Guild Crest` SVG emblem for the OpenCode Pixel Guild Visualizer:
 * - Bevelled dark-indigo heraldic shield (#1e1b4b / #312e81)
 * - Warm amber-gold trim & crossguards (#f59e0b / #fde68a / #b45309)
 * - Crossed forged steel blades (#e2e8f0 / #94a3b8)
 * - Central glowing cyan arcane telemetry crystal (#38bdf8 / #bae6fd / #0284c7)
 */
export const GUILD_CREST_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64" role="img" aria-label="OpenCode Pixel Guild Crest">
  <defs>
    <linearGradient id="shieldBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#312e81" />
      <stop offset="55%" stop-color="#1e1b4b" />
      <stop offset="100%" stop-color="#0f0d26" />
    </linearGradient>
    <linearGradient id="goldTrim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fde68a" />
      <stop offset="50%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#b45309" />
    </linearGradient>
    <linearGradient id="cyanGem" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bae6fd" />
      <stop offset="45%" stop-color="#38bdf8" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
  </defs>
  <!-- Outer Heraldic Shield -->
  <path d="M10 6 H54 L58 12 V32 C58 46 45 55 32 60 C19 55 6 46 6 32 V12 Z" fill="url(#shieldBg)" stroke="url(#goldTrim)" stroke-width="4" stroke-linejoin="round" />
  <!-- Inner Shield Filigree -->
  <path d="M14 11 H50 L53 15 V31 C53 42 42 50 32 54 C22 50 11 42 11 31 V15 Z" fill="none" stroke="#f59e0b" stroke-width="1.2" stroke-opacity="0.55" stroke-linejoin="round" />
  <!-- Crossed Blade 1 (Top-Left to Bottom-Right) -->
  <g stroke-linejoin="round" stroke-linecap="round">
    <path d="M15 14 L21 14 L45 38 L41 42 L15 18 Z" fill="#e2e8f0" stroke="#0f172a" stroke-width="1.5" />
    <path d="M17 16 L42 41" stroke="#94a3b8" stroke-width="1.4" />
    <path d="M37 45 L47 35" stroke="#f59e0b" stroke-width="3.5" />
    <path d="M43 41 L49 47" stroke="#b45309" stroke-width="3.5" />
    <circle cx="50" cy="48" r="2.6" fill="#fde68a" stroke="#b45309" stroke-width="1.2" />
  </g>
  <!-- Crossed Blade 2 (Top-Right to Bottom-Left) -->
  <g stroke-linejoin="round" stroke-linecap="round">
    <path d="M49 14 L43 14 L19 38 L23 42 L49 18 Z" fill="#f8fafc" stroke="#0f172a" stroke-width="1.5" />
    <path d="M47 16 L22 41" stroke="#94a3b8" stroke-width="1.4" />
    <path d="M17 35 L27 45" stroke="#f59e0b" stroke-width="3.5" />
    <path d="M21 41 L15 47" stroke="#b45309" stroke-width="3.5" />
    <circle cx="14" cy="48" r="2.6" fill="#fde68a" stroke="#b45309" stroke-width="1.2" />
  </g>
  <!-- Central Arcane Telemetry Gem & Gold Bezel -->
  <polygon points="32,16 42,28 32,40 22,28" fill="#1e1b4b" stroke="#f59e0b" stroke-width="2.5" stroke-linejoin="round" />
  <polygon points="32,18.5 39.5,28 32,37.5 24.5,28" fill="url(#cyanGem)" />
  <polygon points="32,18.5 39.5,28 32,28" fill="#e0f2fe" fill-opacity="0.65" />
  <polygon points="32,28 24.5,28 32,37.5" fill="#0369a1" fill-opacity="0.55" />
  <!-- Cardinal Pixel Sparks -->
  <rect x="30.5" y="10.5" width="3" height="3" fill="#fde68a" />
  <rect x="30.5" y="43.5" width="3" height="3" fill="#38bdf8" />
</svg>
`;

type RgbTuple = readonly [number, number, number];

const CREST_PALETTE = {
  indigoDark: [0x1e, 0x1b, 0x4b] as RgbTuple,
  indigoUpper: [0x31, 0x2e, 0x81] as RgbTuple,
  amberGold: [0xf5, 0x9e, 0x0b] as RgbTuple,
  amberGlint: [0xfd, 0xe6, 0x8a] as RgbTuple,
  steelLight: [0xe2, 0xe8, 0xf0] as RgbTuple,
  steelBright: [0xf8, 0xfa, 0xfc] as RgbTuple,
  steelEdge: [0x94, 0xa3, 0xb8] as RgbTuple,
  cyanCore: [0x38, 0xbd, 0xf8] as RgbTuple,
  cyanHighlight: [0xba, 0xe6, 0xfd] as RgbTuple,
} as const;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function makePngChunk(type: string, data: Uint8Array): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 4, "ascii");
  Buffer.from(data).copy(out, 8);
  const crc = crc32(out.subarray(4, 8 + data.length));
  out.writeUInt32BE(crc, 8 + data.length);
  return out;
}

function renderGuildCrestRgba32(): Uint8Array {
  const size = 32;
  const raw = new Uint8Array(size * (1 + size * 4));
  const setPx = (x: number, y: number, [r, g, b]: RgbTuple, a = 255) => {
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = y * (1 + size * 4) + 1 + x * 4;
    raw[idx] = r;
    raw[idx + 1] = g;
    raw[idx + 2] = b;
    raw[idx + 3] = a;
  };

  for (let y = 2; y <= 29; y++) {
    const halfWidth =
      y <= 15
        ? 12
        : Math.max(1, Math.round(12 * (1 - ((y - 15) / 15) ** 1.45)));
    const left = 16 - halfWidth;
    const right = 15 + halfWidth;
    for (let x = left; x <= right; x++) {
      const isBorder = y <= 3 || x <= left + 1 || x >= right - 1 || y >= 28;
      setPx(
        x,
        y,
        isBorder
          ? CREST_PALETTE.amberGold
          : y < 12
            ? CREST_PALETTE.indigoUpper
            : CREST_PALETTE.indigoDark,
      );
    }
  }

  for (let i = 7; i <= 22; i++) {
    setPx(i, i, CREST_PALETTE.steelLight);
    setPx(i + 1, i, CREST_PALETTE.steelEdge);
    setPx(31 - i, i, CREST_PALETTE.steelBright);
    setPx(30 - i, i, CREST_PALETTE.steelEdge);
  }
  setPx(23, 23, CREST_PALETTE.amberGlint);
  setPx(8, 23, CREST_PALETTE.amberGlint);

  for (let y = 9; y <= 19; y++) {
    const dy = Math.abs(y - 14);
    const span = 5 - dy;
    for (let dx = -span; dx <= span; dx++) {
      const x = 16 + dx;
      const color =
        Math.abs(dx) === span
          ? CREST_PALETTE.amberGold
          : y < 14 && dx <= 0
            ? CREST_PALETTE.cyanHighlight
            : CREST_PALETTE.cyanCore;
      setPx(x, y, color);
    }
  }

  return raw;
}

let cachedPngBuffer: Buffer | null = null;
let cachedIcoBuffer: Buffer | null = null;

export function getGuildCrestPngBuffer(): Buffer {
  if (cachedPngBuffer) return cachedPngBuffer;
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(32, 0);
  ihdr.writeUInt32BE(32, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;

  const idatData = deflateSync(renderGuildCrestRgba32());
  cachedPngBuffer = Buffer.concat([
    signature,
    makePngChunk("IHDR", ihdr),
    makePngChunk("IDAT", idatData),
    makePngChunk("IEND", new Uint8Array(0)),
  ]);
  return cachedPngBuffer;
}

export function getGuildCrestIcoBuffer(): Buffer {
  if (cachedIcoBuffer) return cachedIcoBuffer;
  const png = getGuildCrestPngBuffer();
  const header = Buffer.alloc(22);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  header[6] = 32;
  header[7] = 32;
  header.writeUInt16LE(1, 10);
  header.writeUInt16LE(32, 12);
  header.writeUInt32LE(png.length, 14);
  header.writeUInt32LE(22, 18);
  cachedIcoBuffer = Buffer.concat([header, png]);
  return cachedIcoBuffer;
}
