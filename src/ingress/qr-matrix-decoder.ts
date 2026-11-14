const ECC_CODEWORDS_PER_BLOCK: ReadonlyArray<ReadonlyArray<number>> = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28],
];

const NUM_ERROR_CORRECTION_BLOCKS: ReadonlyArray<ReadonlyArray<number>> = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25],
];

function hasFinderPatternAt(modules: ReadonlyArray<ReadonlyArray<boolean>>, ox: number, oy: number): boolean {
  for (let dy = 0; dy < 7; dy++) {
    for (let dx = 0; dx < 7; dx++) {
      const dist = Math.max(Math.abs(dx - 3), Math.abs(dy - 3));
      const expected = dist !== 2;
      if (Boolean(modules[oy + dy]?.[ox + dx]) !== expected) return false;
    }
  }
  return true;
}

export function decodeQrBooleanMatrix(rawModules: ReadonlyArray<ReadonlyArray<boolean>>): string | null {
  const size = rawModules.length;
  const version = Math.round((size - 17) / 4);
  if (version < 1 || version > 20 || size !== version * 4 + 17) return null;
  if (
    !hasFinderPatternAt(rawModules, 0, 0) ||
    !hasFinderPatternAt(rawModules, size - 7, 0) ||
    !hasFinderPatternAt(rawModules, 0, size - 7)
  ) {
    return null;
  }

  const modules = rawModules.map((r) => r.slice());
  const isFunc = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const markRect = (cx: number, cy: number, r: number) => {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (cy + dy >= 0 && cy + dy < size && cx + dx >= 0 && cx + dx < size) {
          isFunc[cy + dy][cx + dx] = true;
        }
      }
    }
  };
  for (let i = 0; i < size; i++) {
    isFunc[6][i] = true;
    isFunc[i][6] = true;
  }
  markRect(3, 3, 4);
  markRect(size - 4, 3, 4);
  markRect(3, size - 4, 4);

  if (version >= 2) {
    const numAlign = Math.floor(version / 7) + 2;
    const step = Math.ceil((version * 4 + 4) / (numAlign * 2 - 2)) * 2;
    const pos = [6];
    for (let p = size - 7; pos.length < numAlign; p -= step) pos.splice(1, 0, p);
    for (let i = 0; i < numAlign; i++) {
      for (let j = 0; j < numAlign; j++) {
        if (!((i === 0 && j === 0) || (i === 0 && j === numAlign - 1) || (i === numAlign - 1 && j === 0))) {
          markRect(pos[i], pos[j], 2);
        }
      }
    }
  }
  for (let i = 0; i <= 8; i++) {
    isFunc[i][8] = true;
    isFunc[8][i] = true;
  }
  for (let i = 0; i < 8; i++) {
    isFunc[8][size - 1 - i] = true;
    isFunc[size - 1 - i][8] = true;
  }
  if (version >= 7) {
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 3; j++) {
        isFunc[j][size - 11 + i] = true;
        isFunc[size - 11 + i][j] = true;
      }
    }
  }

  let fmt = 0;
  const setBit = (idx: number, val: boolean) => {
    if (val) fmt |= 1 << idx;
  };
  for (let o = 0; o <= 5; o++) setBit(o, modules[o][8]);
  setBit(6, modules[7][8]);
  setBit(7, modules[8][8]);
  setBit(8, modules[8][7]);
  for (let o = 9; o < 15; o++) setBit(o, modules[8][14 - o]);

  const unmaskedFmt = fmt ^ 21522;
  const mask = (unmaskedFmt >> 10) & 7;
  const eccTableIdx = [1, 0, 3, 2][(unmaskedFmt >> 13) & 3] ?? 0;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isFunc[y][x]) continue;
      let invert = false;
      switch (mask) {
        case 0: invert = (x + y) % 2 === 0; break;
        case 1: invert = y % 2 === 0; break;
        case 2: invert = x % 3 === 0; break;
        case 3: invert = (x + y) % 3 === 0; break;
        case 4: invert = (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; break;
        case 5: invert = ((x * y) % 2) + ((x * y) % 3) === 0; break;
        case 6: invert = (((x * y) % 2) + ((x * y) % 3)) % 2 === 0; break;
        case 7: invert = (((x + y) % 2) + ((x * y) % 3)) % 2 === 0; break;
      }
      if (invert) modules[y][x] = !modules[y][x];
    }
  }

  const rawBits: number[] = [];
  for (let e = size - 1; e >= 1; e -= 2) {
    if (e === 6) e = 5;
    for (let s = 0; s < size; s++) {
      for (let o = 0; o < 2; o++) {
        const r = e - o;
        const a = ((e + 1) & 2) === 0 ? size - 1 - s : s;
        if (!isFunc[a][r]) rawBits.push(modules[a][r] ? 1 : 0);
      }
    }
  }

  const totalCodewords = Math.floor(rawBits.length / 8);
  const codewords: number[] = [];
  for (let i = 0; i < totalCodewords; i++) {
    let b = 0;
    for (let j = 0; j < 8; j++) b = (b << 1) | rawBits[i * 8 + j];
    codewords.push(b);
  }

  const numBlocks = NUM_ERROR_CORRECTION_BLOCKS[eccTableIdx]?.[version] || 1;
  const eccPerBlock = ECC_CODEWORDS_PER_BLOCK[eccTableIdx]?.[version] || 7;
  const shortBlockTotal = Math.floor(totalCodewords / numBlocks);
  const numShortBlocks = numBlocks - (totalCodewords % numBlocks);
  const shortDataLen = shortBlockTotal - eccPerBlock;

  const blocks: number[][] = Array.from({ length: numBlocks }, () => []);
  let cwIdx = 0;
  for (let col = 0; col <= shortDataLen; col++) {
    for (let blk = 0; blk < numBlocks; blk++) {
      if (col < shortDataLen || blk >= numShortBlocks) {
        blocks[blk].push(codewords[cwIdx++] ?? 0);
      }
    }
  }

  const dataBytes = blocks.flat();
  const dataBits: number[] = [];
  for (const b of dataBytes) {
    for (let j = 7; j >= 0; j--) dataBits.push((b >> j) & 1);
  }
  const readBits = (offset: number, len: number): number => {
    let v = 0;
    for (let i = 0; i < len; i++) v = (v << 1) | (dataBits[offset + i] || 0);
    return v;
  };

  const mode = readBits(0, 4);
  if (mode !== 4) return null;
  const countBits = version <= 9 ? 8 : 16;
  const numChars = readBits(4, countBits);
  if (numChars <= 0 || 4 + countBits + numChars * 8 > dataBits.length) return null;

  const outBytes = new Uint8Array(numChars);
  let ptr = 4 + countBits;
  for (let i = 0; i < numChars; i++) {
    outBytes[i] = readBits(ptr, 8);
    ptr += 8;
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(outBytes);
  } catch {
    return null;
  }
}

export function decodeUnicodeHalfBlockQr(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => /^[█▀▄ ]+$/.test(l) && l.length >= 21);
  if (lines.length === 0) return null;
  const rawW = lines[0].length;
  const grid: boolean[][] = [];
  for (const line of lines) {
    const topRow: boolean[] = [];
    const botRow: boolean[] = [];
    for (const ch of line) {
      if (ch === "█") {
        topRow.push(false);
        botRow.push(false);
      } else if (ch === "▀") {
        topRow.push(false);
        botRow.push(true);
      } else if (ch === "▄") {
        topRow.push(true);
        botRow.push(false);
      } else {
        topRow.push(true);
        botRow.push(true);
      }
    }
    grid.push(topRow, botRow);
  }
  let border = 0;
  while (border < 6 && !grid[border]?.[border]) border++;
  const size = rawW - border * 2;
  if (size < 21) return null;
  const modules = Array.from({ length: size }, (_, y) =>
    Array.from({ length: size }, (_, x) => Boolean(grid[border + y]?.[border + x])),
  );
  return decodeQrBooleanMatrix(modules);
}

export function normalizeQrPayloadToPairingUrl(payload: string): string | null {
  const trimmed = (payload || "").trim();
  if (!trimmed) return null;

  const urlMatch = /(https?:\/\/[^/?#\s]+\/auth\/connect\/[^/?#\s]+)/i.exec(trimmed);
  if (urlMatch) return urlMatch[1];

  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    try {
      const parsed = JSON.parse(trimmed) as { code?: string; urls?: string[] };
      const code = typeof parsed?.code === "string" ? parsed.code.trim() : "";
      const firstUrl = Array.isArray(parsed?.urls) ? parsed.urls.find((u) => typeof u === "string" && u.trim()) : "";
      if (code && firstUrl) {
        return `${firstUrl.trim().replace(/\/+$/, "")}/auth/connect/${encodeURIComponent(code)}`;
      }
    } catch {
      // Not valid JSON
    }
  }

  const decodedUnicode = decodeUnicodeHalfBlockQr(trimmed);
  if (decodedUnicode) {
    return normalizeQrPayloadToPairingUrl(decodedUnicode);
  }

  if (/^https?:\/\/[^/?#\s]+$/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}
