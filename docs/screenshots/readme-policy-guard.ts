/**
 * Shared static policy guard for README.md (User Features & End-User Setup Only).
 * Imported by tests/00-architecture-invariants.test.ts and docs/screenshots/pre-commit-guard.ts
 * so unambiguous technical-data leaks and broken TOC anchors are enforced from one canonical place.
 */

export type ReadmePolicyViolationKind =
  | "prohibited-path"
  | "raw-api-route"
  | "dom-css-internal"
  | "runtime-internal"
  | "dev-command"
  | "prohibited-heading"
  | "broken-toc-anchor";

export interface ReadmePolicyViolation {
  readonly kind: ReadmePolicyViolationKind;
  readonly summary: string;
}

interface PatternRule {
  readonly kind: Exclude<ReadmePolicyViolationKind, "prohibited-heading" | "broken-toc-anchor">;
  readonly regex: RegExp;
  readonly label: string;
}

const README_PATTERN_RULES: readonly PatternRule[] = [
  {
    kind: "prohibited-path",
    regex: /(?:^|[\s(`"'])(?:\.\/)?(?:src|tests|docs\/adr|docs\/features|docs\/screenshots)\/[A-Za-z0-9_./-]+/g,
    label: "internal repository path",
  },
  {
    kind: "prohibited-path",
    regex: /(?:^|[\s(`"'])(?:\.\/)?docs\/awesome-opencode-submission\.md\b/g,
    label: "internal directory submission path",
  },
  {
    kind: "prohibited-path",
    regex: /(?:^|[\s(`"'])(?:\.\/)?docs\/video\/(?![A-Za-z0-9_.-]+\.(?:mp4|webm)(?=$|[\s)`"']))[A-Za-z0-9_./-]+/g,
    label: "non-video file under docs/video/",
  },
  {
    kind: "raw-api-route",
    regex: /\b(?:GET|POST|PUT|PATCH|DELETE)\s+\/api\/[A-Za-z0-9_/{}:.-]+/g,
    label: "raw HTTP API route",
  },
  {
    kind: "raw-api-route",
    regex: /(?:^|[\s(`"'])\/api\/(?:guild|session|model|provider|question|form)\b[A-Za-z0-9_/{}:.-]*/g,
    label: "internal /api/ endpoint path",
  },
  {
    kind: "dom-css-internal",
    regex: /(?:^|[\s(`"'])#(?:btn|summon|command-scroll|operator|demolition|add-world)-[a-z0-9-]+/g,
    label: "internal DOM #id selector",
  },
  {
    kind: "dom-css-internal",
    regex: /\bCSS\s+ellipsis\b|\by\s*=\s*0\b|(?:>=?\s*(?:600|960)px|\b480px\b)/g,
    label: "CSS/pixel layout threshold",
  },
  {
    kind: "runtime-internal",
    regex: /\b(?:WeakMap|SQLite|EventSource|visibilitychange|backpressure|coalesced\s+SSE)\b|\bevent:\s*heartbeat\b|\b(?:tabs|session)\.json\b/g,
    label: "runtime/protocol/storage internal",
  },
  {
    kind: "dev-command",
    regex: /\bnpm\s+(?:test|run\s+(?:demo:video|docs:screenshots|docs:verify-assets|hooks:install))\b/g,
    label: "contributor/dev npm script",
  },
];

const PROHIBITED_HEADING_RE = /\b(?:Architecture|Internals|Contributors|Directory\s+Submissions)\b/i;

function stripFencedCodeBlocks(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const out: string[] = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      out.push("");
      continue;
    }
    out.push(inFence ? "" : line);
  }
  return out.join("\n");
}

export function slugifyGithubHeading(rawHeading: string): string {
  const plain = rawHeading
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/[*_~]/g, "")
    .trim()
    .toLowerCase();
  return plain
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s/g, "-");
}

function collectHeadingSlugs(markdownOutsideFences: string): {
  readonly slugs: Set<string>;
  readonly rawHeadings: string[];
} {
  const slugs = new Set<string>();
  const counts = new Map<string, number>();
  const rawHeadings: string[] = [];

  for (const match of markdownOutsideFences.matchAll(/^#{1,6}\s+(.+)$/gm)) {
    const raw = match[1]!.trim();
    rawHeadings.push(raw);
    const base = slugifyGithubHeading(raw);
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    slugs.add(seen === 0 ? base : `${base}-${seen}`);
  }

  return { slugs, rawHeadings };
}

export function findReadmePolicyViolations(markdown: string): ReadmePolicyViolation[] {
  const violations: ReadmePolicyViolation[] = [];
  const seenSummaries = new Set<string>();

  const pushUnique = (kind: ReadmePolicyViolationKind, summary: string): void => {
    const key = `${kind}:${summary}`;
    if (seenSummaries.has(key)) return;
    seenSummaries.add(key);
    violations.push({ kind, summary });
  };

  for (const rule of README_PATTERN_RULES) {
    rule.regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = rule.regex.exec(markdown)) !== null) {
      const token = match[0].trim().replace(/^[(`"']+/, "");
      pushUnique(rule.kind, `Prohibited ${rule.label} in README.md: '${token}'`);
    }
  }

  const outsideFences = stripFencedCodeBlocks(markdown);
  const { slugs, rawHeadings } = collectHeadingSlugs(outsideFences);

  for (const heading of rawHeadings) {
    if (PROHIBITED_HEADING_RE.test(heading)) {
      pushUnique("prohibited-heading", `Prohibited technical/contributor heading in README.md: '${heading}'`);
    }
  }

  for (const match of outsideFences.matchAll(/\[[^\]]+\]\(#([^)\s]+)\)/g)) {
    const anchor = match[1]!.trim().toLowerCase();
    if (!slugs.has(anchor)) {
      pushUnique("broken-toc-anchor", `Broken internal anchor link in README.md: '#${anchor}'`);
    }
  }

  return violations;
}
