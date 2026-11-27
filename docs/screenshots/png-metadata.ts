import { crc32, inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const ALLOWED_PNG_CHUNKS: ReadonlySet<string> = new Set([
  "IHDR",
  "PLTE",
  "IDAT",
  "IEND",
  "tRNS",
  "gAMA",
  "cHRM",
  "sRGB",
  "iCCP",
  "pHYs",
]);

export interface PngChunkInspectionResult {
  readonly valid: boolean;
  readonly error?: string;
  readonly width: number;
  readonly height: number;
  readonly chunkTypes: string[];
  readonly forbiddenChunks: string[];
}

export interface PngStripResult {
  readonly buffer: Buffer;
  readonly width: number;
  readonly height: number;
  readonly keptChunks: string[];
  readonly strippedChunks: string[];
}

interface ParsedChunk {
  readonly type: string;
  readonly raw: Buffer;
  readonly data: Buffer;
}

function parsePngChunks(input: Buffer): {
  chunks: ParsedChunk[];
  width: number;
  height: number;
  error?: string;
} {
  if (input.length < 8 || !input.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { chunks: [], width: 0, height: 0, error: "Invalid PNG signature" };
  }

  const chunks: ParsedChunk[] = [];
  let offset = 8;
  let width = 0;
  let height = 0;

  while (offset < input.length) {
    if (offset + 12 > input.length) {
      return { chunks: [], width: 0, height: 0, error: "Truncated PNG chunk header" };
    }
    const length = input.readUInt32BE(offset);
    const chunkEnd = offset + 12 + length;
    if (chunkEnd > input.length) {
      return { chunks: [], width: 0, height: 0, error: "Truncated PNG chunk payload" };
    }
    const type = input.subarray(offset + 4, offset + 8).toString("ascii");
    const data = input.subarray(offset + 8, offset + 8 + length);
    const storedCrc = input.readUInt32BE(offset + 8 + length);
    const computedCrc = crc32(input.subarray(offset + 4, offset + 8 + length)) >>> 0;
    if (storedCrc !== computedCrc) {
      return { chunks: [], width: 0, height: 0, error: `CRC mismatch in chunk ${type}` };
    }

    chunks.push({ type, raw: input.subarray(offset, chunkEnd), data });
    if (type === "IHDR") {
      if (length !== 13) {
        return { chunks: [], width: 0, height: 0, error: "Invalid IHDR length" };
      }
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
    }

    offset = chunkEnd;
    if (type === "IEND") {
      if (length !== 0) {
        return { chunks: [], width: 0, height: 0, error: "Invalid IEND length" };
      }
      if (offset !== input.length) {
        return { chunks: [], width: 0, height: 0, error: "Trailing bytes after IEND" };
      }
      break;
    }
  }

  if (chunks.length < 2 || chunks[0]?.type !== "IHDR" || chunks[chunks.length - 1]?.type !== "IEND") {
    return { chunks: [], width: 0, height: 0, error: "Missing IHDR or IEND chunk" };
  }

  return { chunks, width, height };
}

export function inspectPngChunks(input: Buffer): PngChunkInspectionResult {
  const parsed = parsePngChunks(input);
  if (parsed.error) {
    return {
      valid: false,
      error: parsed.error,
      width: 0,
      height: 0,
      chunkTypes: [],
      forbiddenChunks: [],
    };
  }
  const chunkTypes = parsed.chunks.map((c) => c.type);
  const forbiddenChunks = chunkTypes.filter((t) => !ALLOWED_PNG_CHUNKS.has(t));
  return {
    valid: true,
    width: parsed.width,
    height: parsed.height,
    chunkTypes,
    forbiddenChunks,
  };
}

export function stripPngMetadata(input: Buffer): PngStripResult {
  const parsed = parsePngChunks(input);
  if (parsed.error) {
    throw new Error(`Cannot strip invalid PNG: ${parsed.error}`);
  }
  const kept: Buffer[] = [PNG_SIGNATURE];
  const keptChunks: string[] = [];
  const strippedChunks: string[] = [];
  for (const chunk of parsed.chunks) {
    if (ALLOWED_PNG_CHUNKS.has(chunk.type)) {
      kept.push(chunk.raw);
      keptChunks.push(chunk.type);
    } else {
      strippedChunks.push(chunk.type);
    }
  }
  return {
    buffer: Buffer.concat(kept),
    width: parsed.width,
    height: parsed.height,
    keptChunks,
    strippedChunks,
  };
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

/**
 * Decodes an 8-bit RGB/RGBA PNG into an inverted grayscale binary PGM (P5) buffer,
 * optionally upscaled 2x via nearest-neighbor for dramatically higher Tesseract OCR
 * recall on dark-mode UI banners and small pixel-art labels.
 */
export function decodePngToInvertedGrayscalePgm(input: Buffer, scale: 1 | 2 = 2): Buffer | null {
  const parsed = parsePngChunks(input);
  if (parsed.error) return null;
  const ihdr = parsed.chunks[0]?.data;
  if (!ihdr || ihdr.length < 13) return null;
  const width = parsed.width;
  const height = parsed.height;
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  const interlace = ihdr[12];
  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 2 && colorType !== 6)) {
    return null;
  }

  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const compressed = Buffer.concat(parsed.chunks.filter((c) => c.type === "IDAT").map((c) => c.data));
  const raw = inflateSync(compressed);
  if (raw.length < height * (stride + 1)) return null;

  const pixels = new Uint8Array(height * stride);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (stride + 1);
    const filter = raw[rowStart];
    const outRow = y * stride;
    const prevRow = (y - 1) * stride;
    for (let x = 0; x < stride; x += 1) {
      const byte = raw[rowStart + 1 + x]!;
      const left = x >= bpp ? pixels[outRow + x - bpp]! : 0;
      const up = y > 0 ? pixels[prevRow + x]! : 0;
      const upLeft = y > 0 && x >= bpp ? pixels[prevRow + x - bpp]! : 0;
      let val = byte;
      if (filter === 1) val = (byte + left) & 0xff;
      else if (filter === 2) val = (byte + up) & 0xff;
      else if (filter === 3) val = (byte + ((left + up) >> 1)) & 0xff;
      else if (filter === 4) val = (byte + paethPredictor(left, up, upLeft)) & 0xff;
      pixels[outRow + x] = val;
    }
  }

  const outW = width * scale;
  const outH = height * scale;
  const header = Buffer.from(`P5\n${outW} ${outH}\n255\n`, "ascii");
  const gray = Buffer.allocUnsafe(outW * outH);

  for (let y = 0; y < height; y += 1) {
    const srcRow = y * stride;
    for (let x = 0; x < width; x += 1) {
      const idx = srcRow + x * bpp;
      const r = pixels[idx]!;
      const g = pixels[idx + 1]!;
      const b = pixels[idx + 2]!;
      const inv = 255 - Math.round(0.299 * r + 0.587 * g + 0.114 * b);
      if (scale === 1) {
        gray[y * outW + x] = inv;
      } else {
        const dy = y * 2;
        const dx = x * 2;
        const r0 = dy * outW + dx;
        const r1 = (dy + 1) * outW + dx;
        gray[r0] = inv;
        gray[r0 + 1] = inv;
        gray[r1] = inv;
        gray[r1 + 1] = inv;
      }
    }
  }

  return Buffer.concat([header, gray]);
}
