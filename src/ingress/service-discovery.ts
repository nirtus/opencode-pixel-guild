import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export interface DiscoveredOpenCodeService {
  url: string;
  password?: string;
  headers: Record<string, string>;
}

export interface DiscoverOpenCodeServiceOptions {
  readonly serviceFilePath?: string;
  readonly userRoots?: ReadonlyArray<string>;
  readonly dockerHost?: string;
  readonly skipWslFallback?: boolean;
  readonly readWslServiceJson?: () => string | null;
  readonly fetchImpl?: typeof fetch;
}

function defaultReadWslServiceJson(): string | null {
  if (typeof process !== "undefined" && process.platform !== "win32") {
    return null;
  }
  try {
    return execFileSync(
      "wsl.exe",
      ["sh", "-c", "cat ~/.local/state/opencode/service.json"],
      { encoding: "utf8", timeout: 4000, stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch {
    return null;
  }
}

function parseServiceJson(
  rawJson: string,
): { url: string; password?: string } | null {
  const parsed = JSON.parse(rawJson) as { url?: string; password?: string };
  if (!parsed || typeof parsed.url !== "string" || !parsed.url.trim()) {
    return null;
  }
  return {
    url: parsed.url.trim(),
    password:
      typeof parsed.password === "string" && parsed.password.trim()
        ? parsed.password.trim()
        : undefined,
  };
}

export function syncWslServiceStateToHost(options?: {
  readonly targetFilePath?: string;
  readonly readWslServiceJson?: () => string | null;
}): boolean {
  try {
    const raw = (options?.readWslServiceJson ?? defaultReadWslServiceJson)();
    if (!raw || !parseServiceJson(raw)) return false;
    const targetPath =
      options?.targetFilePath ??
      resolve(homedir(), ".local", "state", "opencode", "service.json");
    mkdirSync(dirname(targetPath), { recursive: true });
    const existing = existsSync(targetPath)
      ? readFileSync(targetPath, "utf8")
      : "";
    if (existing !== raw) {
      writeFileSync(targetPath, raw, "utf8");
    }
    return true;
  } catch {
    return false;
  }
}

function pushUniqueCandidate(
  candidates: Array<{ url: string; password?: string }>,
  url: string,
  password: string | undefined,
): void {
  if (!candidates.some((c) => c.url === url && c.password === password)) {
    candidates.push({ url, password });
  }
}

function appendCandidateWithDockerHostFallback(
  candidates: Array<{ url: string; password?: string }>,
  rawUrl: string,
  password: string | undefined,
  dockerHost: string,
): void {
  const trimmedUrl = rawUrl.trim().replace(/\/+$/, "");
  if (!trimmedUrl) return;
  pushUniqueCandidate(candidates, trimmedUrl, password);

  const loopbackMatch = trimmedUrl.match(
    /^(https?:\/\/)(?:127\.0\.0\.1|localhost|0\.0\.0\.0)(:\d+.*)?$/i,
  );
  if (loopbackMatch) {
    const localUrl = `${loopbackMatch[1]}127.0.0.1${loopbackMatch[2] ?? ""}`;
    if (localUrl !== trimmedUrl) {
      pushUniqueCandidate(candidates, localUrl, password);
    }
    if (dockerHost) {
      const rewrittenUrl = `${loopbackMatch[1]}${dockerHost}${loopbackMatch[2] ?? ""}`;
      if (rewrittenUrl !== trimmedUrl) {
        pushUniqueCandidate(candidates, rewrittenUrl, password);
      }
    }
  }
}

function appendParsedServiceJsonCandidate(
  candidates: Array<{ url: string; password?: string }>,
  rawJson: string,
  dockerHost: string,
): void {
  const parsed = parseServiceJson(rawJson);
  if (parsed) {
    appendCandidateWithDockerHostFallback(
      candidates,
      parsed.url,
      parsed.password,
      dockerHost,
    );
  }
}

function discoverUserProfileServiceFiles(
  userRoots: ReadonlyArray<string> = [
    dirname(homedir()),
    "/Users",
    "C:/Users",
    "/mnt/c/Users",
    "/home",
  ],
): string[] {
  const found: string[] = [];
  for (const rootDir of userRoots) {
    try {
      if (!rootDir || !existsSync(rootDir)) continue;
      for (const entry of readdirSync(rootDir)) {
        const candidate = join(
          rootDir,
          entry,
          ".local",
          "state",
          "opencode",
          "service.json",
        );
        if (existsSync(candidate) && !found.includes(candidate)) {
          found.push(candidate);
        }
      }
    } catch {
      // Ignore unreadable user root
    }
  }
  return found;
}

export async function discoverLocalOpenCodeService(
  options?: DiscoverOpenCodeServiceOptions,
): Promise<DiscoveredOpenCodeService> {
  const dockerHost = (
    options?.dockerHost ??
    process.env.OPENCODE_DOCKER_HOST ??
    "host.docker.internal"
  ).trim();
  const fetchFn = options?.fetchImpl ?? fetch;
  const candidates: Array<{ url: string; password?: string }> = [];

  if (process.env.OPENCODE_SERVICE_URL?.trim()) {
    appendCandidateWithDockerHostFallback(
      candidates,
      process.env.OPENCODE_SERVICE_URL.trim(),
      process.env.OPENCODE_SERVICE_PASSWORD?.trim() || undefined,
      dockerHost,
    );
  }

  if (!options?.skipWslFallback) {
    try {
      const wslRaw = (
        options?.readWslServiceJson ?? defaultReadWslServiceJson
      )();
      if (wslRaw) {
        appendParsedServiceJsonCandidate(candidates, wslRaw, dockerHost);
      }
    } catch {
      // Ignore when not running on Windows/WSL or wsl.exe unavailable
    }
  }

  const candidateServiceFiles = [
    options?.serviceFilePath,
    process.env.OPENCODE_SERVICE_FILE?.trim(),
    resolve(homedir(), ".local", "state", "opencode", "service.json"),
    "/opencode-state/service.json",
    ...(options?.serviceFilePath
      ? []
      : discoverUserProfileServiceFiles(options?.userRoots)),
  ].filter((p): p is string => Boolean(p));

  for (const serviceFilePath of candidateServiceFiles) {
    try {
      if (existsSync(serviceFilePath)) {
        appendParsedServiceJsonCandidate(
          candidates,
          readFileSync(serviceFilePath, "utf8"),
          dockerHost,
        );
      }
    } catch {
      // Ignore unreadable service.json candidate and continue
    }
  }

  for (const candidate of candidates) {
    const url = candidate.url.replace(/\/+$/, "");
    const headers: Record<string, string> = {};
    if (candidate.password) {
      headers.Authorization =
        "Basic " +
        Buffer.from(`opencode:${candidate.password}`).toString("base64");
    }
    try {
      const res = await fetchFn(`${url}/api/info`, {
        headers: {
          Accept: "application/json",
          ...headers,
        },
      });
      if (res.ok) {
        return {
          url,
          password: candidate.password,
          headers,
        };
      }
    } catch {
      // Try next candidate
    }
  }

  throw new Error(
    "No live OpenCode V2 daemon is reachable (/api/info failed). Start OpenCode V2 or set OPENCODE_SERVICE_URL / OPENCODE_SERVICE_PASSWORD.",
  );
}
