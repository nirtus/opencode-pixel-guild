import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "../..");
const VIDEO_OUT_PATH = resolve(PROJECT_ROOT, "docs/video/opencode-pixel-guild-intro.mp4");
const GIF_OUT_PATH = resolve(PROJECT_ROOT, "docs/images/opencode-pixel-guild-intro-preview.gif");
const PROOF_PNG_PATH = resolve(PROJECT_ROOT, "docs/images/intro-demo-video.png");

const DURATION_MS = 35_000;
const CAPTURE_FPS = 20;
const OUTPUT_FPS = 30;
const TOTAL_FRAMES = Math.round((DURATION_MS / 1000) * CAPTURE_FPS);
const TARGET_URL = process.env.DEMO_TARGET_URL || "http://127.0.0.1:4310/?demo=intro-tour";

function findBinary(candidates: string[]): string | null {
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

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runInsideDockerIfNeeded(): Promise<boolean> {
  const chromeBin = findBinary(["chromium-browser", "chromium", "google-chrome"]);
  const ffmpegBin = findBinary(["ffmpeg"]);
  if (chromeBin && ffmpegBin) return false;

  console.log("[demo:video] Launching Dockerized Headless Chromium + FFmpeg recorder...");
  execFileSync(
    "docker",
    [
      "run",
      "--rm",
      "--network",
      "host",
      "--shm-size=1gb",
      "-v",
      `${PROJECT_ROOT}:/app`,
      "-w",
      "/app",
      "node:22-alpine",
      "sh",
      "-c",
      "apk add --no-cache chromium ffmpeg font-dejavu font-noto-emoji >/dev/null && node --experimental-strip-types docs/video/record-intro-demo.ts",
    ],
    { stdio: "inherit" },
  );
  return true;
}

class CdpSession {
  private ws: WebSocket;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }>();

  constructor(ws: WebSocket) {
    this.ws = ws;
    this.ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (typeof msg.id === "number") {
        const entry = this.pending.get(msg.id);
        if (entry) {
          this.pending.delete(msg.id);
          if (msg.error) entry.reject(new Error(msg.error.message || "CDP error"));
          else entry.resolve(msg.result);
        }
      }
    });
  }

  static async connect(wsUrl: string): Promise<CdpSession> {
    const ws = new WebSocket(wsUrl);
    await new Promise<void>((resolveConn, rejectConn) => {
      ws.addEventListener("open", () => resolveConn(), { once: true });
      ws.addEventListener("error", () => rejectConn(new Error(`Failed to connect CDP WebSocket: ${wsUrl}`)), { once: true });
    });
    return new CdpSession(ws);
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<any> {
    const id = this.nextId++;
    return new Promise((resolveCall, rejectCall) => {
      this.pending.set(id, { resolve: resolveCall, reject: rejectCall });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  close(): void {
    this.ws.close();
  }
}

async function waitForDebuggerWsUrl(port: number): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (res.ok) {
        const list = (await res.json()) as Array<{ type?: string; webSocketDebuggerUrl?: string }>;
        const page = list.find((item) => item.type === "page" && item.webSocketDebuggerUrl);
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch {
      // wait for Chromium to listen
    }
    await sleep(150);
  }
  throw new Error(`Timed out waiting for Chromium remote debugging port ${port}`);
}

async function main(): Promise<void> {
  if (await runInsideDockerIfNeeded()) return;

  const chromeBin = findBinary(["chromium-browser", "chromium", "google-chrome"])!;
  const ffmpegBin = findBinary(["ffmpeg"])!;
  mkdirSync(dirname(VIDEO_OUT_PATH), { recursive: true });
  mkdirSync(dirname(GIF_OUT_PATH), { recursive: true });

  const debugPort = 9222;
  const chromeProc = spawn(
    chromeBin,
    [
      "--headless",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--window-size=1920,1080",
      `--remote-debugging-port=${debugPort}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );

  try {
    const wsUrl = await waitForDebuggerWsUrl(debugPort);
    const cdp = await CdpSession.connect(wsUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await cdp.send("Page.navigate", { url: TARGET_URL });

    // Wait for __stepIntroDemoFrame to be registered on window
    let ready = false;
    for (let i = 0; i < 60; i++) {
      const check = await cdp.send("Runtime.evaluate", {
        expression: "typeof window.__stepIntroDemoFrame === 'function'",
        returnByValue: true,
      });
      if (check?.result?.value === true) {
        ready = true;
        break;
      }
      await sleep(150);
    }
    if (!ready) {
      throw new Error("Timed out waiting for window.__stepIntroDemoFrame on target page");
    }

    await cdp.send("Runtime.evaluate", {
      expression: "window.__preloadIntroDemoAssets ? window.__preloadIntroDemoAssets() : Promise.resolve()",
      awaitPromise: true,
    });
    await sleep(400);

    console.log(`[demo:video] Capturing ${TOTAL_FRAMES} frames at 1920x1080 (${CAPTURE_FPS} FPS)...`);

    const ffmpegProc = spawn(
      ffmpegBin,
      [
        "-y",
        "-f",
        "image2pipe",
        "-vcodec",
        "mjpeg",
        "-framerate",
        String(CAPTURE_FPS),
        "-i",
        "-",
        "-c:v",
        "libx264",
        "-r",
        String(OUTPUT_FPS),
        "-preset",
        "fast",
        "-crf",
        "20",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        VIDEO_OUT_PATH,
      ],
      { stdio: ["pipe", "ignore", "pipe"] },
    );

    for (let frameIdx = 0; frameIdx < TOTAL_FRAMES; frameIdx++) {
      const elapsedMs = (frameIdx / CAPTURE_FPS) * 1000;
      await cdp.send("Runtime.evaluate", {
        expression: `window.__stepIntroDemoFrame(${elapsedMs.toFixed(2)})`,
        returnByValue: true,
      });

      const shot = await cdp.send("Page.captureScreenshot", {
        format: "jpeg",
        quality: 92,
      });
      const buf = Buffer.from(shot.data, "base64");
      const canWrite = ffmpegProc.stdin.write(buf);
      if (!canWrite) {
        await new Promise<void>((r) => ffmpegProc.stdin.once("drain", () => r()));
      }

      // Capture high-res PNG visual proof during Scene 4 Dungeon Wilds combat (t = 30.5s)
      if (frameIdx === Math.round(30.5 * CAPTURE_FPS)) {
        const pngShot = await cdp.send("Page.captureScreenshot", { format: "png" });
        writeFileSync(PROOF_PNG_PATH, Buffer.from(pngShot.data, "base64"));
      }

      if ((frameIdx + 1) % 150 === 0 || frameIdx === TOTAL_FRAMES - 1) {
        console.log(`[demo:video] Rendered frame ${frameIdx + 1}/${TOTAL_FRAMES} (${(elapsedMs / 1000).toFixed(1)}s)`);
      }
    }

    ffmpegProc.stdin.end();
    await new Promise<void>((resolveFfmpeg, rejectFfmpeg) => {
      ffmpegProc.on("close", (code) => {
        if (code === 0) resolveFfmpeg();
        else rejectFfmpeg(new Error(`FFmpeg MP4 encode exited with code ${code}`));
      });
    });

    console.log("[demo:video] Encoding animated GIF preview for README.md...");
    execFileSync(
      ffmpegBin,
      [
        "-y",
        "-i",
        VIDEO_OUT_PATH,
        "-vf",
        "setpts=0.5*PTS,fps=10,scale=920:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=128:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle",
        "-loop",
        "0",
        GIF_OUT_PATH,
      ],
      { stdio: "inherit" },
    );

    cdp.close();
  } finally {
    chromeProc.kill("SIGKILL");
  }

  const mp4SizeMb = (statSync(VIDEO_OUT_PATH).size / (1024 * 1024)).toFixed(2);
  const gifSizeMb = (statSync(GIF_OUT_PATH).size / (1024 * 1024)).toFixed(2);
  console.log(`[demo:video] Complete!`);
  console.log(`  MP4: ${VIDEO_OUT_PATH} (${mp4SizeMb} MB)`);
  console.log(`  GIF: ${GIF_OUT_PATH} (${gifSizeMb} MB)`);
  console.log(`  PNG: ${PROOF_PNG_PATH} (${existsSync(PROOF_PNG_PATH) ? "saved" : "missing"})`);
}

main().catch((err) => {
  console.error("[demo:video] Failed:", err);
  process.exit(1);
});
