import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { inspectPngChunks } from "./png-metadata.ts";

export const PUBLIC_ASSET_MANIFEST_SCHEMA_VERSION = 1;
export const CANONICAL_FIXTURE_SET = "synthetic-guild-v1";
export const ASSETS_IMAGES_REL_DIR = "assets/images";
export const ASSETS_MANIFEST_REL_PATH = "assets/images/manifest.json";

export type PublicAssetGeneratorKind = "docs-showcase" | "intro-demo-video";

export interface PublicAssetViewportSpec {
  readonly width: number;
  readonly height: number;
  readonly dpr: number;
}

export interface PublicAssetManifestEntry {
  readonly generator: PublicAssetGeneratorKind;
  readonly sceneId: string;
  readonly viewport: PublicAssetViewportSpec;
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
  readonly metadataStripped: boolean;
  readonly ocrChecked: boolean;
}

export interface PublicAssetManifest {
  readonly schemaVersion: number;
  readonly fixtureSet: string;
  readonly assets: Record<string, PublicAssetManifestEntry>;
}

export interface ManifestValidationResult {
  readonly ok: boolean;
  readonly errors: string[];
  readonly checkedFiles: string[];
}

export function computeSha256Hex(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

export function readPublicAssetManifest(projectRoot: string): PublicAssetManifest | null {
  const manifestPath = resolve(projectRoot, ASSETS_MANIFEST_REL_PATH);
  if (!existsSync(manifestPath)) return null;
  return JSON.parse(readFileSync(manifestPath, "utf8")) as PublicAssetManifest;
}

export function writePublicAssetManifest(
  projectRoot: string,
  manifest: PublicAssetManifest,
): void {
  const sortedAssets: Record<string, PublicAssetManifestEntry> = {};
  for (const key of Object.keys(manifest.assets).sort()) {
    sortedAssets[key] = manifest.assets[key]!;
  }
  const normalized: PublicAssetManifest = {
    schemaVersion: PUBLIC_ASSET_MANIFEST_SCHEMA_VERSION,
    fixtureSet: manifest.fixtureSet || CANONICAL_FIXTURE_SET,
    assets: sortedAssets,
  };
  writeFileSync(
    resolve(projectRoot, ASSETS_MANIFEST_REL_PATH),
    `${JSON.stringify(normalized, null, 2)}\n`,
    "utf8",
  );
}

export function validatePublicAssetManifest(
  projectRoot: string,
  options: { onlyFiles?: readonly string[] } = {},
): ManifestValidationResult {
  const errors: string[] = [];
  const checkedFiles: string[] = [];
  const imagesDir = resolve(projectRoot, ASSETS_IMAGES_REL_DIR);
  const manifestPath = resolve(projectRoot, ASSETS_MANIFEST_REL_PATH);

  if (!existsSync(imagesDir)) {
    return { ok: false, errors: ["Missing assets/images/ directory"], checkedFiles };
  }
  if (!existsSync(manifestPath)) {
    return { ok: false, errors: ["Missing assets/images/manifest.json"], checkedFiles };
  }

  let manifest: PublicAssetManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PublicAssetManifest;
  } catch (err) {
    return {
      ok: false,
      errors: [`Invalid JSON in assets/images/manifest.json: ${String(err)}`],
      checkedFiles,
    };
  }

  if (manifest.schemaVersion !== PUBLIC_ASSET_MANIFEST_SCHEMA_VERSION) {
    errors.push(`Unsupported manifest schemaVersion: ${String(manifest.schemaVersion)}`);
  }
  if (!manifest.fixtureSet || typeof manifest.fixtureSet !== "string") {
    errors.push("Manifest fixtureSet must be a non-empty string");
  }
  if (!manifest.assets || typeof manifest.assets !== "object") {
    return { ok: false, errors: [...errors, "Manifest assets map is missing"], checkedFiles };
  }

  const diskImages = readdirSync(imagesDir)
    .filter((f) => f !== "manifest.json" && /\.(png|gif|jpe?g|webp)$/i.test(f))
    .sort();
  const manifestKeys = Object.keys(manifest.assets).sort();

  const diskSet = new Set(diskImages);
  const manifestSet = new Set(manifestKeys);

  for (const file of diskImages) {
    if (!manifestSet.has(file)) {
      errors.push(`Unmanifested asset in assets/images/: ${file} (must be generated via npm run docs:screenshots or npm run demo:video)`);
    }
  }
  for (const key of manifestKeys) {
    if (!diskSet.has(key)) {
      errors.push(`Manifest entry missing on disk: assets/images/${key}`);
    }
  }

  const targetFiles = options.onlyFiles?.length
    ? diskImages.filter((f) => options.onlyFiles!.includes(f))
    : diskImages;

  for (const file of targetFiles) {
    const entry = manifest.assets[file];
    if (!entry) continue;
    checkedFiles.push(file);
    if (entry.generator !== "docs-showcase" && entry.generator !== "intro-demo-video") {
      errors.push(`${file}: invalid generator '${String(entry.generator)}'`);
    }
    if (!entry.sceneId || typeof entry.sceneId !== "string") {
      errors.push(`${file}: missing sceneId`);
    }
    if (!/^[a-f0-9]{64}$/.test(entry.sha256 || "")) {
      errors.push(`${file}: invalid sha256 digest in manifest`);
    }
    if (entry.metadataStripped !== true) {
      errors.push(`${file}: metadataStripped must be true`);
    }
    if (entry.ocrChecked !== true) {
      errors.push(`${file}: ocrChecked must be true`);
    }

    const buf = readFileSync(join(imagesDir, file));
    const actualSha = computeSha256Hex(buf);
    if (actualSha !== entry.sha256) {
      errors.push(`${file}: SHA-256 mismatch (manifest=${entry.sha256.slice(0, 12)}..., disk=${actualSha.slice(0, 12)}...)`);
    }

    if (file.toLowerCase().endsWith(".png")) {
      const inspection = inspectPngChunks(buf);
      if (!inspection.valid) {
        errors.push(`${file}: invalid PNG structure (${inspection.error})`);
      } else {
        if (inspection.forbiddenChunks.length > 0) {
          errors.push(`${file}: contains unstripped PNG metadata chunks (${inspection.forbiddenChunks.join(", ")})`);
        }
        if (inspection.width !== entry.width || inspection.height !== entry.height) {
          errors.push(`${file}: dimension mismatch (manifest=${entry.width}x${entry.height}, disk=${inspection.width}x${inspection.height})`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, checkedFiles };
}
