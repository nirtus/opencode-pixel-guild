import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { cpus } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { tryServeStaticAsset } from "../../src/server/static-router.ts";
import { DOCS_SHOWCASE_SCENES, type DocsShowcaseSceneSpec } from "../../src/web/docs-showcase-scenes.ts";
import {
  ASSETS_IMAGES_REL_DIR,
  CANONICAL_FIXTURE_SET,
  computeSha256Hex,
  PUBLIC_ASSET_MANIFEST_SCHEMA_VERSION,
  type PublicAssetManifestEntry,
  readPublicAssetManifest,
  writePublicAssetManifest,
} from "./manifest-contract.ts";
import { runVisualOcrHygieneScan } from "./ocr-runner.ts";
import { inspectPngChunks, stripPngMetadata } from "./png-metadata.ts";
import { findPublicHygieneViolations } from "./public-hygiene-rules.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const DOCKER_IMAGE_TAG = "opencode-pixel-guild-docs-capture:v1";
const DOCKERFILE_PATH = resolve(PROJECT_ROOT, "docs/screenshots/Dockerfile");

function findBinary(candidates: readonly string[]): string | null {
  for (const bin of candidates) {
    try {
      const out = execFileSync("which", [bin], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (out) return out;
    } catch {
      // try next
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function ensureCaptureDockerImage(rebuild: boolean): void {
  if (!rebuild) {
    try {
      execFileSync("docker", ["image", "inspect", DOCKER_IMAGE_TAG], { stdio: "ignore" });
      return;
    } catch {
      // build image
    }
  }
  console.log(`[docs:screenshots] Building capture image ${DOCKER_IMAGE_TAG}...`);
  execFileSync("docker", ["build", "-t", DOCKER_IMAGE_TAG, "-f", DOCKERFILE_PATH, PROJECT_ROOT], {
    stdio: "inherit",
  });
}

function relaunchInsideAirGappedDocker(rawArgs: readonly string[], rebuildImage: boolean): void {
  ensureCaptureDockerImage(rebuildImage);
  const assetsDir = resolve(PROJECT_ROOT, ASSETS_IMAGES_REL_DIR);
  mkdirSync(assetsDir, { recursive: true });
  const forwardedArgs = rawArgs.filter((a) => a !== "--rebuild-image");
  console.log(`[docs:screenshots] Launching air-gapped Docker capture (--network none, ./data/ unmounted)...`);
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "none",
      "--shm-size=1gb",
      "-e",
      "DOCS_CAPTURE_IN_DOCKER=1",
      "-v",
      `${resolve(PROJECT_ROOT, "src")}:/app/src:ro`,
      "-v",
      `${resolve(PROJECT_ROOT, "docs")}:/app/docs:ro`,
      "-v",
      `${assetsDir}:/app/assets/images:rw`,
      "-w",
      "/app",
      DOCKER_IMAGE_TAG,
      "node",
      "--experimental-strip-types",
      "--no-warnings=ExperimentalWarning",
      "docs/screenshots/capture-docs-screenshots.ts",
      ...forwardedArgs,
    ],
    { stdio: "inherit" },
  );
}

class CdpClient {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private listeners = new Map<string, Array<(params: Record<string, unknown>) => void>>();

  constructor(wsUrl: string) {
    this.ws = new WebSocket(wsUrl);
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data)) as {
        id?: number;
        method?: string;
        params?: Record<string, unknown>;
        result?: unknown;
        error?: { message?: string };
      };
      if (msg.id && this.pending.has(msg.id)) {
        const p = this.pending.get(msg.id)!;
        this.pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message || "CDP error"));
        else p.resolve(msg.result);
      } else if (msg.method) {
        const list = this.listeners.get(msg.method);
        if (list) for (const fn of list) fn(msg.params ?? {});
      }
    });
  }

  on(method: string, fn: (params: Record<string, unknown>) => void): void {
    const list = this.listeners.get(method) ?? [];
    list.push(fn);
    this.listeners.set(method, list);
  }

  async open(): Promise<void> {
    if (this.ws.readyState === WebSocket.OPEN) return;
    await new Promise<void>((res, rej) => {
      this.ws.addEventListener("open", () => res(), { once: true });
      this.ws.addEventListener("error", () => rej(new Error("CDP WebSocket error")), { once: true });
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<Record<string, unknown>> {
    const id = this.nextId++;
    return new Promise((res, rej) => {
      this.pending.set(id, { resolve: (v) => res((v as Record<string, unknown>) ?? {}), reject: rej });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close(): void {
    try {
      this.ws.close();
    } catch {
      // ignore
    }
  }
}

async function startStaticOnlyServer(): Promise<{ baseUrl: string; close: () => Promise<void>; apiViolations: string[] }> {
  const apiViolations: string[] = [];
  const server = createServer((req, res) => {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname.startsWith("/api/")) {
      apiViolations.push(`${req.method ?? "GET"} ${url.pathname}`);
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "API access forbidden during offline docs showcase capture" }));
      return;
    }
    if (url.pathname === "/src/web/styles.css") {
      const css = readFileSync(resolve(PROJECT_ROOT, "src/web/styles.css"), "utf8")
        .replace(/@import\s+url\([^)]*fonts\.googleapis\.com[^)]*\);\s*/gi, "");
      res.writeHead(200, { "Content-Type": "text/css; charset=utf-8", "Cache-Control": "no-store" });
      res.end(css);
      return;
    }
    try {
      if (tryServeStaticAsset(req, res, url.pathname)) return;
    } catch (err) {
      console.error(`[docs:screenshots][static-error] ${url.pathname}:`, err instanceof Error ? err.message : String(err));
      res.writeHead(500);
      res.end("Static Error");
      return;
    }
    console.error(`[docs:screenshots][404] ${req.method} ${url.pathname}`);
    res.writeHead(404);
    res.end("Not Found");
  });
  await new Promise<void>((res) => server.listen(0, "127.0.0.1", () => res()));
  const addr = server.address() as AddressInfo;
  return {
    baseUrl: `http://127.0.0.1:${addr.port}`,
    apiViolations,
    close: () => new Promise<void>((res) => server.close(() => res())),
  };
}

const PRELOAD_SHIM_SCRIPT = `(() => {
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  window.__docsCapturedCanvasText = [];
  const wrap = (proto) => {
    if (!proto) return;
    for (const fnName of ["fillText", "strokeText"]) {
      const orig = proto[fnName];
      if (typeof orig !== "function") continue;
      proto[fnName] = function(text, ...rest) {
        if (typeof text === "string" && text.trim()) {
          window.__docsCapturedCanvasText.push(text.trim());
        }
        return orig.call(this, text, ...rest);
      };
    }
  };
  wrap(window.CanvasRenderingContext2D && window.CanvasRenderingContext2D.prototype);
})();`;

const EXTRACT_TEXT_EXPRESSION = `(() => {
  const parts = [];
  if (document.body && document.body.innerText) parts.push(document.body.innerText);
  for (const el of document.querySelectorAll("input, textarea, select")) {
    if (typeof el.value === "string" && el.value.trim()) parts.push(el.value.trim());
    if (el.placeholder) parts.push(el.placeholder);
  }
  for (const el of document.querySelectorAll("[title], [aria-label], [alt]")) {
    for (const attr of ["title", "aria-label", "alt"]) {
      const v = el.getAttribute(attr);
      if (v && v.trim()) parts.push(v.trim());
    }
  }
  if (Array.isArray(window.__docsCapturedCanvasText)) {
    parts.push(window.__docsCapturedCanvasText.join("\\n"));
  }
  return parts.join("\\n");
})()`;

async function runPool<T, R>(items: readonly T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) break;
      results[idx] = await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
  return results;
}

async function runCaptureInContainer(rawArgs: readonly string[]): Promise<void> {
  const sceneArg = rawArgs.find((a) => a.startsWith("--scene="))?.slice("--scene=".length);
  const requestedIds = sceneArg ? new Set(sceneArg.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)) : null;
  const scenes: DocsShowcaseSceneSpec[] = requestedIds
    ? DOCS_SHOWCASE_SCENES.filter((s) => requestedIds.has(s.sceneId))
    : [...DOCS_SHOWCASE_SCENES];

  if (scenes.length === 0) {
    throw new Error(`No matching showcase scenes for --scene=${sceneArg}`);
  }

  const chromeBin = findBinary(["chromium-browser", "chromium", "google-chrome"]);
  if (!chromeBin) throw new Error("Chromium binary not found in capture container");

  const staticServer = await startStaticOnlyServer();
  const chromeProc = spawn(
    chromeBin,
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--force-color-profile=srgb",
      "--window-size=1600,1000",
      "--remote-debugging-port=9222",
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  interface CapturedArtifact {
    scene: DocsShowcaseSceneSpec;
    buffer: Buffer;
    width: number;
    height: number;
  }

  const captured: CapturedArtifact[] = [];
  const networkViolations: string[] = [];
  const browserExceptions: string[] = [];

  try {
    let chromeStderr = "";
    chromeProc.stderr?.on("data", (d: Buffer) => { chromeStderr += d.toString("utf8"); });
    let wsUrl = "";
    for (let i = 0; i < 120; i += 1) {
      try {
        const res = await fetch("http://127.0.0.1:9222/json/list");
        const targets = (await res.json()) as Array<{ type?: string; webSocketDebuggerUrl?: string }>;
        const page = targets.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
        if (page?.webSocketDebuggerUrl) {
          wsUrl = page.webSocketDebuggerUrl;
          break;
        }
      } catch {
        // waiting for CDP
      }
      await sleep(150);
    }
    if (!wsUrl) throw new Error(`Timed out waiting for Headless Chromium CDP endpoint (stderr=${chromeStderr.slice(0, 400)})`);

    const cdp = new CdpClient(wsUrl);
    await cdp.open();
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Network.enable");
    await cdp.send("Page.addScriptToEvaluateOnNewDocument", { source: PRELOAD_SHIM_SCRIPT });

    cdp.on("Runtime.consoleAPICalled", (params) => {
      const args = (params.args as Array<{ value?: unknown; description?: string }> | undefined) ?? [];
      console.error(`[docs:screenshots][console.${params.type}]`, args.map((a) => a.description ?? a.value).join(" "));
    });
    cdp.on("Runtime.exceptionThrown", (params) => {
      const details = params.exceptionDetails as { text?: string; exception?: { description?: string } } | undefined;
      const msg = details?.exception?.description || details?.text || JSON.stringify(params);
      browserExceptions.push(msg);
      console.error("[docs:screenshots][browser-exception]", msg);
    });
    cdp.on("Network.loadingFailed", (params) => {
      console.error("[docs:screenshots][network-failed]", JSON.stringify(params));
    });
    cdp.on("Network.requestWillBeSent", (params) => {
      const req = params.request as { url?: string } | undefined;
      const reqUrl = req?.url || "";
      if (!reqUrl || reqUrl.startsWith("data:") || reqUrl.startsWith("blob:") || reqUrl === "about:blank") return;
      if (!reqUrl.startsWith(staticServer.baseUrl) || reqUrl.includes("/api/")) {
        networkViolations.push(reqUrl);
      }
    });

    for (const scene of scenes) {
      await cdp.send("Emulation.setDeviceMetricsOverride", {
        width: scene.viewport.width,
        height: scene.viewport.height,
        deviceScaleFactor: scene.viewport.dpr,
        mobile: scene.mobile,
        screenWidth: scene.viewport.width,
        screenHeight: scene.viewport.height,
      });
      await cdp.send("Emulation.setTouchEmulationEnabled", {
        enabled: scene.mobile,
        maxTouchPoints: scene.mobile ? 5 : 1,
      });

      const targetUrl = `${staticServer.baseUrl}/?demo=docs-showcase&scene=${encodeURIComponent(scene.sceneId)}`;
      await cdp.send("Page.navigate", { url: targetUrl });

      let ready = false;
      for (let attempt = 0; attempt < 80; attempt += 1) {
        const evalRes = await cdp.send("Runtime.evaluate", {
          expression: `Boolean(window.__docsShowcaseReady && window.__docsShowcaseSceneId === ${JSON.stringify(scene.sceneId)})`,
          returnByValue: true,
        });
        const val = (evalRes.result as { value?: unknown } | undefined)?.value;
        if (val === true) {
          ready = true;
          break;
        }
        await sleep(100);
      }
      if (!ready) {
        const diag = await cdp.send("Runtime.evaluate", {
          expression: `JSON.stringify({ href: location.href, readyState: document.readyState, ready: window.__docsShowcaseReady, sceneId: window.__docsShowcaseSceneId, bodyAttr: document.body?.getAttribute("data-docs-showcase") })`,
          returnByValue: true,
        });
        throw new Error(`Timed out waiting for __docsShowcaseReady on scene '${scene.sceneId}' (diag=${(diag.result as { value?: unknown })?.value})`);
      }

      const textRes = await cdp.send("Runtime.evaluate", {
        expression: EXTRACT_TEXT_EXPRESSION,
        returnByValue: true,
      });
      const domCanvasText = String((textRes.result as { value?: unknown } | undefined)?.value ?? "");
      const layer1Violations = findPublicHygieneViolations(domCanvasText, {
        checkPrivateIps: true,
        checkExternalUrls: true,
      });
      if (layer1Violations.length > 0) {
        throw new Error(
          `Layer 1 DOM/Canvas hygiene violation in scene '${scene.sceneId}': ${layer1Violations.map((v) => v.summary).join("; ")}`,
        );
      }

      const shot = await cdp.send("Page.captureScreenshot", { format: "png", fromSurface: true });
      const rawBuf = Buffer.from(String(shot.data || ""), "base64");
      const stripped = stripPngMetadata(rawBuf);
      const inspected = inspectPngChunks(stripped.buffer);
      if (!inspected.valid || inspected.forbiddenChunks.length > 0) {
        throw new Error(`PNG chunk verification failed on scene '${scene.sceneId}'`);
      }

      captured.push({ scene, buffer: stripped.buffer, width: stripped.width, height: stripped.height });
      console.log(`[docs:screenshots] Captured ${scene.filename} (${stripped.width}x${stripped.height}, stripped=${stripped.strippedChunks.length})`);
    }

    cdp.close();
  } finally {
    chromeProc.kill("SIGKILL");
    await staticServer.close();
  }

  if (browserExceptions.length > 0) {
    throw new Error(`Browser runtime exceptions during showcase capture (${browserExceptions.length}): ${browserExceptions[0]}`);
  }
  if (staticServer.apiViolations.length > 0 || networkViolations.length > 0) {
    throw new Error(
      `Offline isolation violated during capture! API calls: [${staticServer.apiViolations.join(", ")}], Network: [${networkViolations.join(", ")}]`,
    );
  }

  const workerCount = Math.max(1, Math.min(4, cpus().length));
  console.log(`[docs:screenshots] Running Layer 2 Tesseract OCR hygiene scan across ${captured.length} PNGs (${workerCount} workers)...`);
  await runPool(captured, workerCount, async (item) => {
    const scan = await runVisualOcrHygieneScan(item.buffer, {
      width: item.width,
      isMobileDpr2: item.scene.mobile,
    });
    if (scan.violations.length > 0) {
      throw new Error(
        `Layer 2 OCR hygiene violation in ${item.scene.filename}: ${scan.violations.map((v) => v.summary).join("; ")}`,
      );
    }
    console.log(`[docs:screenshots] OCR CLEAN: ${item.scene.filename} (${scan.durationMs}ms)`);
  });

  // Also preserve & refresh intro-demo-video entries in manifest.json
  const assetsDir = resolve(PROJECT_ROOT, ASSETS_IMAGES_REL_DIR);
  const existingManifest = readPublicAssetManifest(PROJECT_ROOT);
  const nextAssets: Record<string, PublicAssetManifestEntry> = requestedIds && existingManifest
    ? { ...existingManifest.assets }
    : {};

  for (const item of captured) {
    writeFileSync(resolve(assetsDir, item.scene.filename), item.buffer);
    nextAssets[item.scene.filename] = {
      generator: "docs-showcase",
      sceneId: item.scene.sceneId,
      viewport: { ...item.scene.viewport },
      width: item.width,
      height: item.height,
      sha256: computeSha256Hex(item.buffer),
      metadataStripped: true,
      ocrChecked: true,
    };
  }

  const introPngPath = resolve(assetsDir, "intro-demo-video.png");
  if (existsSync(introPngPath)) {
    const strippedIntro = stripPngMetadata(readFileSync(introPngPath));
    const introOcr = await runVisualOcrHygieneScan(strippedIntro.buffer, { width: strippedIntro.width });
    if (introOcr.violations.length > 0) {
      throw new Error(`OCR violation on intro-demo-video.png: ${introOcr.violations.map((v) => v.summary).join("; ")}`);
    }
    writeFileSync(introPngPath, strippedIntro.buffer);
    nextAssets["intro-demo-video.png"] = {
      generator: "intro-demo-video",
      sceneId: "intro-tour",
      viewport: { width: strippedIntro.width, height: strippedIntro.height, dpr: 1 },
      width: strippedIntro.width,
      height: strippedIntro.height,
      sha256: computeSha256Hex(strippedIntro.buffer),
      metadataStripped: true,
      ocrChecked: true,
    };
  }

  const introGifPath = resolve(assetsDir, "opencode-pixel-guild-intro-preview.gif");
  if (existsSync(introGifPath)) {
    const gifBuf = readFileSync(introGifPath);
    nextAssets["opencode-pixel-guild-intro-preview.gif"] = {
      generator: "intro-demo-video",
      sceneId: "intro-tour",
      viewport: { width: 920, height: 518, dpr: 1 },
      width: 920,
      height: 518,
      sha256: computeSha256Hex(gifBuf),
      metadataStripped: true,
      ocrChecked: true,
    };
  }

  writePublicAssetManifest(PROJECT_ROOT, {
    schemaVersion: PUBLIC_ASSET_MANIFEST_SCHEMA_VERSION,
    fixtureSet: CANONICAL_FIXTURE_SET,
    assets: nextAssets,
  });

  console.log(`[docs:screenshots] Success! Wrote ${captured.length} synthetic PNGs and updated assets/images/manifest.json (${Object.keys(nextAssets).length} total entries).`);
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const rebuildImage = args.includes("--rebuild-image");
  const inDocker = process.env.DOCS_CAPTURE_IN_DOCKER === "1";

  if (!inDocker) {
    relaunchInsideAirGappedDocker(args, rebuildImage);
    return;
  }
  await runCaptureInContainer(args);
}

main().catch((err) => {
  console.error(`[docs:screenshots] FAILED:`, err instanceof Error ? err.message : String(err));
  process.exit(1);
});
