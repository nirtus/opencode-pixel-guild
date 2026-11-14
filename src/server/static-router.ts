import { existsSync, readFileSync, statSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { stripTypeScriptTypes } from "node:module";
import { dirname, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  GUILD_CREST_SVG,
  getGuildCrestIcoBuffer,
  getGuildCrestPngBuffer,
} from "./guild-crest-assets.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC_ROOT_DIR = resolve(__dirname, "..");
const SERVER_SRC_DIR = resolve(SRC_ROOT_DIR, "server");
const APP_HTML_PATH = resolve(__dirname, "../web/app.html");
const SKETCHES_HTML_PATH = resolve(
  __dirname,
  "../../docs/features/ui-ux-and-craftpix-overhaul/sketches/craftpix-guild-hall-sketches.html",
);
const EXAMPLES_DIR = resolve(__dirname, "../../docs/examples");

interface CachedCompiledFile {
  mtimeMs: number;
  content: string;
}

const tsStripCache = new Map<string, CachedCompiledFile>();

export function tryServeStaticAsset(
  req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
): boolean {
  const method = req.method ?? "GET";
  if (method !== "GET" && method !== "HEAD") {
    return false;
  }

  if (pathname === "/" || pathname === "/guild") {
    const html = readFileSync(APP_HTML_PATH, "utf8");
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(method === "HEAD" ? "" : html);
    return true;
  }

  if (pathname === "/favicon.svg" || pathname === "/favicon.ico" || pathname === "/apple-touch-icon.png" || pathname === "/favicon.png") {
    const isSvg = pathname === "/favicon.svg";
    const isIco = pathname === "/favicon.ico";
    const contentType = isSvg
      ? "image/svg+xml; charset=utf-8"
      : isIco
        ? "image/x-icon"
        : "image/png";
    const body = isSvg
      ? GUILD_CREST_SVG
      : isIco
        ? getGuildCrestIcoBuffer()
        : getGuildCrestPngBuffer();
    res.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
    });
    res.end(method === "HEAD" ? "" : body);
    return true;
  }

  if (
    pathname === "/sketches" ||
    pathname === "/sketches/" ||
    pathname === "/craftpix-sketches"
  ) {
    if (existsSync(SKETCHES_HTML_PATH)) {
      const sketchHtml = readFileSync(SKETCHES_HTML_PATH, "utf8");
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(method === "HEAD" ? "" : sketchHtml);
      return true;
    }
  }

  if (pathname.includes("/examples/") || pathname.endsWith(".png")) {
    const match = pathname.match(/(?:examples\/)(.*)$/);
    const subPath = decodeURIComponent(
      match ? match[1] : pathname.replace(/^\/+/, ""),
    );
    const imgPath = resolve(EXAMPLES_DIR, subPath);
    if (
      imgPath.startsWith(EXAMPLES_DIR + sep) &&
      existsSync(imgPath) &&
      !statSync(imgPath).isDirectory()
    ) {
      const imgBuf = readFileSync(imgPath);
      res.writeHead(200, {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      });
      res.end(method === "HEAD" ? "" : imgBuf);
      return true;
    }
  }

  if (pathname.startsWith("/src/")) {
    const relPath = normalize(pathname.slice("/src/".length)).replace(
      /^(\.\.(\/|\\|$))+/,
      "",
    );
    const candidatePath = resolve(SRC_ROOT_DIR, relPath);
    if (
      !candidatePath.startsWith(SRC_ROOT_DIR + sep) ||
      candidatePath === SERVER_SRC_DIR ||
      candidatePath.startsWith(SERVER_SRC_DIR + sep)
    ) {
      return false;
    }

    if (candidatePath.endsWith(".css") && existsSync(candidatePath)) {
      const css = readFileSync(candidatePath, "utf8");
      res.writeHead(200, {
        "Content-Type": "text/css; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(method === "HEAD" ? "" : css);
      return true;
    }

    const tsPath = candidatePath.endsWith(".js")
      ? `${candidatePath.slice(0, -3)}.ts`
      : candidatePath;
    if (tsPath.endsWith(".ts") && existsSync(tsPath)) {
      try {
        const stat = statSync(tsPath);
        const cached = tsStripCache.get(tsPath);
        let jsCode: string;
        if (cached && cached.mtimeMs === stat.mtimeMs) {
          jsCode = cached.content;
        } else {
          const rawTs = readFileSync(tsPath, "utf8");
          jsCode = stripTypeScriptTypes(rawTs, { mode: "strip" });
          tsStripCache.set(tsPath, { mtimeMs: stat.mtimeMs, content: jsCode });
        }
        res.writeHead(200, {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(method === "HEAD" ? "" : jsCode);
        return true;
      } catch (err) {
        res.writeHead(500, {
          "Content-Type": "application/json; charset=utf-8",
        });
        res.end(
          JSON.stringify({
            error:
              err instanceof Error
                ? err.message
                : "Failed to compile TypeScript module",
          }),
        );
        return true;
      }
    }
  }

  return false;
}
