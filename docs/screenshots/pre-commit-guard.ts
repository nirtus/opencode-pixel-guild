import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validatePublicAssetManifest } from "./manifest-contract.ts";
import { findPublicHygieneViolations } from "./public-hygiene-rules.ts";
import { findReadmePolicyViolations } from "./readme-policy-guard.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");

const BINARY_EXT_RE = /\.(png|gif|jpe?g|webp|ico|mp4|webm|pdf|sqlite|db|woff2?|ttf)$/i;

function getStagedFiles(): string[] {
  const out = execFileSync("git", ["diff", "--cached", "--name-only", "--diff-filter=ACMR"], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
  });
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function readStagedContent(relPath: string): string {
  return execFileSync("git", ["show", `:${relPath}`], {
    cwd: PROJECT_ROOT,
    encoding: "utf8",
    maxBuffer: 10 * 1024 * 1024,
  });
}

export function collectPreCommitErrors(options: {
  readonly stagedFiles: readonly string[];
  readonly readStagedContent: (relPath: string) => string;
  readonly projectRoot?: string;
}): string[] {
  const { stagedFiles, readStagedContent, projectRoot = PROJECT_ROOT } = options;
  if (stagedFiles.length === 0) return [];

  const errors: string[] = [];

  // 1. Hard-block any staged file inside gitignored dev-only docs/images/
  const stagedDevImages = stagedFiles.filter((f) => f.startsWith("docs/images/"));
  if (stagedDevImages.length > 0) {
    errors.push(
      `Blocked staging dev-only Development Verification Captures under docs/images/: ${stagedDevImages.join(", ")} (docs/images/ is strictly local; public docs assets belong in assets/images/ via 'npm run docs:screenshots')`,
    );
  }

  // 2. If any assets/images/* file is staged, validate strict manifest bijection, SHA-256 & PNG chunks
  if (stagedFiles.some((f) => f.startsWith("assets/images/"))) {
    const manifestCheck = validatePublicAssetManifest(projectRoot);
    if (!manifestCheck.ok) {
      errors.push(...manifestCheck.errors.map((e) => `assets/images manifest gate: ${e}`));
    }
  }

  // 3. Scan staged text/markdown/code files against shared public-hygiene & README policy rules
  for (const relPath of stagedFiles) {
    const pathViolations = findPublicHygieneViolations(relPath);
    for (const v of pathViolations) {
      errors.push(`${relPath} (path): ${v.summary}`);
    }
    if (BINARY_EXT_RE.test(relPath)) continue;
    try {
      const content = readStagedContent(relPath);
      const contentViolations = findPublicHygieneViolations(content);
      for (const v of contentViolations) {
        errors.push(`${relPath}: ${v.summary}`);
      }
      if (relPath === "README.md") {
        const readmeViolations = findReadmePolicyViolations(content);
        for (const v of readmeViolations) {
          errors.push(`${relPath} (policy): ${v.summary}`);
        }
      }
    } catch {
      // Skip unreadable/non-UTF8 blobs
    }
  }

  return errors;
}

function main(): void {
  const stagedFiles = getStagedFiles();
  const errors = collectPreCommitErrors({
    stagedFiles,
    readStagedContent,
    projectRoot: PROJECT_ROOT,
  });

  if (errors.length > 0) {
    console.error("[pre-commit] Public asset, privacy & README policy guard BLOCKED commit:");
    for (const err of errors) console.error(`  - ${err}`);
    process.exit(1);
  }
}

const isDirectEntrypoint =
  typeof process.argv[1] === "string" &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectEntrypoint) {
  main();
}
