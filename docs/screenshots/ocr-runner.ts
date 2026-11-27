import { spawn } from "node:child_process";
import { decodePngToInvertedGrayscalePgm } from "./png-metadata.ts";
import { findPublicHygieneViolations, type PublicHygieneViolation } from "./public-hygiene-rules.ts";

export interface OcrScanResult {
  readonly extractedText: string;
  readonly violations: PublicHygieneViolation[];
  readonly durationMs: number;
}

function runTesseractStdin(input: Buffer, psm: string): Promise<string> {
  return new Promise((resolvePromise, rejectPromise) => {
    const proc = spawn("tesseract", ["stdin", "stdout", "-l", "eng", "--psm", psm], {
      env: { ...process.env, OMP_THREAD_LIMIT: "1" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    const outChunks: Buffer[] = [];
    const errChunks: Buffer[] = [];
    proc.stdout.on("data", (d: Buffer) => outChunks.push(d));
    proc.stderr.on("data", (d: Buffer) => errChunks.push(d));
    proc.on("error", rejectPromise);
    proc.on("close", (code) => {
      if (code === 0) {
        resolvePromise(Buffer.concat(outChunks).toString("utf8"));
      } else {
        const stderr = Buffer.concat(errChunks).toString("utf8").trim();
        rejectPromise(new Error(`tesseract exited with code ${code}: ${stderr.slice(0, 200)}`));
      }
    });
    proc.stdin.end(input);
  });
}

export async function runVisualOcrHygieneScan(
  pngBuffer: Buffer,
  options: { width: number; isMobileDpr2?: boolean } = { width: 1600 },
): Promise<OcrScanResult> {
  const startMs = Date.now();
  const scale: 1 | 2 = options.isMobileDpr2 || options.width < 1000 ? 1 : 2;
  const invertedPgm = decodePngToInvertedGrayscalePgm(pngBuffer, scale);

  const passes: string[] = [];
  if (invertedPgm) {
    passes.push(await runTesseractStdin(invertedPgm, "11"));
  }
  passes.push(await runTesseractStdin(pngBuffer, "11"));

  const extractedText = passes.join("\n");
  const violations = findPublicHygieneViolations(extractedText, {
    checkPrivateIps: true,
    checkExternalUrls: true,
  });

  return {
    extractedText,
    violations,
    durationMs: Date.now() - startMs,
  };
}
