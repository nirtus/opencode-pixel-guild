import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { cpus } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ASSETS_IMAGES_REL_DIR, validatePublicAssetManifest } from "./manifest-contract.ts";
import { runVisualOcrHygieneScan } from "./ocr-runner.ts";
import { inspectPngChunks } from "./png-metadata.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const DOCKER_IMAGE_TAG = "opencode-pixel-guild-docs-capture:v1";
const DOCKERFILE_PATH = resolve(PROJECT_ROOT, "docs/screenshots/Dockerfile");

function ensureCaptureImage(): void {
  try {
    execFileSync("docker", ["image", "inspect", DOCKER_IMAGE_TAG], { stdio: "ignore" });
    return;
  } catch {
    execFileSync("docker", ["build", "-t", DOCKER_IMAGE_TAG, "-f", DOCKERFILE_PATH, PROJECT_ROOT], {
      stdio: "inherit",
    });
  }
}

async function runPool<T>(items: readonly T[], concurrency: number, fn: (item: T) => Promise<void>): Promise<void> {
  let idx = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (true) {
        const cur = idx++;
        if (cur >= items.length) break;
        await fn(items[cur]!);
      }
    }),
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const fastOnly = args.includes("--fast") || args.includes("--no-ocr");
  const jsonOutput = args.includes("--json");
  const inDocker = process.env.DOCS_VERIFY_IN_DOCKER === "1";
  const onlyFiles = args
    .filter((a) => a.startsWith("--file="))
    .map((a) => basename(a.slice("--file=".length)));

  const structural = validatePublicAssetManifest(PROJECT_ROOT, { onlyFiles });
  if (!structural.ok) {
    if (jsonOutput) {
      console.log(JSON.stringify({ ok: false, phase: "structural", errors: structural.errors }, null, 2));
    } else {
      console.error("[docs:verify-assets] Structural manifest check FAILED:");
      for (const err of structural.errors) console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  if (fastOnly) {
    if (jsonOutput) {
      console.log(JSON.stringify({ ok: true, phase: "fast", checkedFiles: structural.checkedFiles }, null, 2));
    } else {
      console.log(`[docs:verify-assets] Fast structural check PASSED (${structural.checkedFiles.length} assets verified).`);
    }
    return;
  }

  if (!inDocker) {
    ensureCaptureImage();
    execFileSync(
      "docker",
      [
        "run",
        "--rm",
        "--network",
        "none",
        "-e",
        "DOCS_VERIFY_IN_DOCKER=1",
        "-v",
        `${resolve(PROJECT_ROOT, "docs")}:/app/docs:ro`,
        "-v",
        `${resolve(PROJECT_ROOT, ASSETS_IMAGES_REL_DIR)}:/app/assets/images:ro`,
        "-w",
        "/app",
        DOCKER_IMAGE_TAG,
        "node",
        "--experimental-strip-types",
        "--no-warnings=ExperimentalWarning",
        "docs/screenshots/verify-docs-assets.ts",
        ...args,
      ],
      { stdio: "inherit" },
    );
    return;
  }

  const pngFiles = structural.checkedFiles.filter((f) => f.toLowerCase().endsWith(".png"));
  const ocrErrors: string[] = [];
  const workerCount = Math.max(1, Math.min(4, cpus().length));

  await runPool(pngFiles, workerCount, async (file) => {
    const abs = resolve(PROJECT_ROOT, ASSETS_IMAGES_REL_DIR, file);
    const buf = readFileSync(abs);
    const meta = inspectPngChunks(buf);
    const scan = await runVisualOcrHygieneScan(buf, { width: meta.width, isMobileDpr2: meta.width < 1000 });
    if (scan.violations.length > 0) {
      ocrErrors.push(`${file}: ${scan.violations.map((v) => v.summary).join("; ")}`);
    } else if (!jsonOutput) {
      console.log(`[docs:verify-assets] OCR CLEAN: ${file} (${scan.durationMs}ms)`);
    }
  });

  if (ocrErrors.length > 0) {
    if (jsonOutput) {
      console.log(JSON.stringify({ ok: false, phase: "ocr", errors: ocrErrors }, null, 2));
    } else {
      console.error("[docs:verify-assets] Visual OCR hygiene check FAILED:");
      for (const err of ocrErrors) console.error(`  - ${err}`);
    }
    process.exit(1);
  }

  if (jsonOutput) {
    console.log(JSON.stringify({ ok: true, phase: "full", checkedFiles: structural.checkedFiles, ocrScannedPngs: pngFiles.length }, null, 2));
  } else {
    console.log(`[docs:verify-assets] Full structural + OCR verification PASSED (${structural.checkedFiles.length} assets, ${pngFiles.length} OCR-scanned PNGs).`);
  }
}

main().catch((err) => {
  console.error("[docs:verify-assets] FAILED:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
