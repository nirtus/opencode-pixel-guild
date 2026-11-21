export const MAX_NAMEPLATE_LABEL_CACHE_ENTRIES = 512;

const contextNameplateCache = new WeakMap<object, Map<string, string>>();

function getContextCache(ctx: CanvasRenderingContext2D): Map<string, string> {
  let cache = contextNameplateCache.get(ctx);
  if (!cache) {
    cache = new Map<string, string>();
    contextNameplateCache.set(ctx, cache);
  }
  return cache;
}

export function resolveTruncatedNameplateRow2(
  c: CanvasRenderingContext2D,
  name: string,
  row1TextW: number,
  fontKey = c.font || "bold 8px monospace",
  maxEntries = MAX_NAMEPLATE_LABEL_CACHE_ENTRIES,
): string {
  const cache = getContextCache(c);
  const key = `${fontKey}:${Math.round(row1TextW * 2)}:${name}`;
  const cached = cache.get(key);
  if (cached !== undefined) {
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  let row2Label = name;
  if (c.measureText(row2Label).width > row1TextW) {
    const chars = Array.from(row2Label);
    let k = chars.length - 1;
    while (k > 1 && c.measureText(`${chars.slice(0, k).join("")}…`).width > row1TextW) {
      k--;
    }
    row2Label = `${chars.slice(0, Math.max(1, k)).join("")}…`;
  }

  const cap = Math.max(1, Math.floor(maxEntries));
  if (cache.size >= cap) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) cache.delete(oldestKey);
  }
  cache.set(key, row2Label);
  return row2Label;
}
