/**
 * Pure helpers for sizing a single-row skill badge track.
 *
 * Badges are sized to their own text (no flex-grow stretching) and only badges
 * that fully fit inside the available row width are kept; trailing badges that
 * would overflow are dropped instead of being shown partially or truncated.
 */

/** Horizontal gap between adjacent badges (`.skill-browser-badges { gap }`). */
export const SKILL_BADGE_GAP_PX = 4;

/**
 * Number of leading badges (in the given order) that fully fit within
 * `availableWidthPx`, counting `gapPx` between adjacent badges.
 *
 * Returns 0 when the first badge alone does not fully fit (a badge that cannot
 * be shown completely is not shown at all).
 */
export function selectFittingSkillCount(
  widthsPx: readonly number[],
  availableWidthPx: number,
  gapPx: number = SKILL_BADGE_GAP_PX,
): number {
  if (!(availableWidthPx > 0)) return 0;
  let usedPx = 0;
  let count = 0;
  for (const rawWidth of widthsPx) {
    const widthPx = Number.isFinite(rawWidth) && rawWidth > 0 ? rawWidth : 0;
    const needPx = count === 0 ? widthPx : usedPx + gapPx + widthPx;
    if (needPx <= availableWidthPx + 0.5) {
      usedPx = needPx;
      count += 1;
    } else {
      break;
    }
  }
  return count;
}

/** Filtered skills ordered from `offset`, wrapping circularly. */
export function orderedSkillsFrom(
  skills: readonly string[],
  offset: number,
): readonly string[] {
  const total = skills.length;
  if (total === 0) return [];
  const normalizedOffset = (((Math.trunc(offset) % total) + total) % total) || 0;
  const ordered: string[] = [];
  for (let i = 0; i < total; i += 1) {
    ordered.push(skills[(normalizedOffset + i) % total]!);
  }
  return ordered;
}

/**
 * Remove trailing rendered badge children so every remaining badge fully fits
 * inside `badgesWrap`'s inner width. No-op when measurements are unavailable
 * (e.g. detached/mocked elements) so callers stay safe outside a live layout.
 */
export function trimRenderedBadgesToFit(
  badgesWrap: HTMLElement | null | undefined,
  gapPx: number = SKILL_BADGE_GAP_PX,
): void {
  if (!badgesWrap) return;
  const availablePx = badgesWrap.clientWidth ?? 0;
  if (!(availablePx > 0)) return;
  const children = badgesWrap.children
    ? Array.from(badgesWrap.children) as HTMLElement[]
    : [];
  if (children.length === 0) return;
  const widthsPx = children.map(
    (child) => child.offsetWidth || child.scrollWidth || child.getBoundingClientRect?.().width || 0,
  );
  const keep = selectFittingSkillCount(widthsPx, availablePx, gapPx);
  for (let i = children.length - 1; i >= keep; i -= 1) {
    children[i]?.remove();
  }
}
