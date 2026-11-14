import { hashIdentifier } from "../capability/classifier.ts";

const nodeExistsSync: ((path: string) => boolean) | undefined =
  typeof process !== "undefined" && typeof process.getBuiltinModule === "function"
    ? (process.getBuiltinModule("node:fs") as { existsSync?: (path: string) => boolean } | undefined)?.existsSync
    : undefined;

const WSL_UNC_PREFIX_MATCH = /^(\/\/(?:wsl\.localhost|wsl\$)\/[^/]+)(\/.*)?$/i;

function resolveActiveWslUncPrefix(): string | null {
  if (typeof process === "undefined" || process.platform !== "win32" || !nodeExistsSync) {
    return null;
  }
  const envDistro = process.env.WSL_DISTRO_NAME?.trim();
  const distros = [
    ...(envDistro ? [envDistro] : []),
    "Ubuntu",
    "Ubuntu-24.04",
    "Ubuntu-22.04",
    "Debian",
    "Arch",
    "Fedora",
    "kali-linux",
    "openSUSE-Tumbleweed",
  ];
  for (const distro of distros) {
    const prefix = `//wsl.localhost/${distro}`;
    if (nodeExistsSync(`${prefix}/home`)) {
      return prefix;
    }
  }
  return null;
}

const ACTIVE_WSL_UNC_PREFIX = resolveActiveWslUncPrefix();
let knownVisualizerParentNorm: string | null = null;
const remoteDaemonDirs = new Set<string>();

export function markDirectoryDaemonScope(rawDir: string, daemonUrl?: string | null): void {
  if (!rawDir || !rawDir.trim() || !daemonUrl || !daemonUrl.trim()) return;
  const norm = normalizeLocationDirectory(rawDir).toLowerCase();
  if (!norm || norm === "/") return;
  if (!isLocalDaemonEndpoint(daemonUrl)) {
    remoteDaemonDirs.add(norm);
  } else {
    remoteDaemonDirs.delete(norm);
  }
}

export const SQUAD_LINEAGE_PALETTE = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
  "#84cc16",
] as const;

export function deriveSquadColor(sessionID: string): string {
  const index = hashIdentifier(sessionID) % SQUAD_LINEAGE_PALETTE.length;
  return SQUAD_LINEAGE_PALETTE[index];
}

export function normalizeLocationDirectory(rawDir: string): string {
  const trimmed = rawDir.trim().replace(/\\/g, "/");
  if (!trimmed) {
    return "/";
  }

  // Normalize WSL UNC path "//wsl.localhost/<distro>/...", Windows drive letter "C:/...", or WSL "/mnt/c/..."
  let normalized = trimmed;
  const wslUncMatch = WSL_UNC_PREFIX_MATCH.exec(normalized);
  if (wslUncMatch) {
    normalized = wslUncMatch[2] || "/";
  }
  const winDriveMatch = /^([A-Za-z]):(?:\/(.*))?$/.exec(normalized);
  if (winDriveMatch) {
    const drive = winDriveMatch[1].toLowerCase();
    const rest = winDriveMatch[2] ?? "";
    normalized = `/${drive}/${rest}`;
  } else {
    const wslMountMatch = /^\/mnt\/([A-Za-z])(?:\/(.*))?$/.exec(normalized);
    if (wslMountMatch) {
      const drive = wslMountMatch[1].toLowerCase();
      const rest = wslMountMatch[2] ?? "";
      normalized = `/${drive}/${rest}`;
    }
  }

  // Collapse multiple slashes and strip trailing slash unless root
  normalized = normalized.replace(/\/+/g, "/");
  if (normalized.length > 1 && normalized.endsWith("/")) {
    normalized = normalized.slice(0, -1);
  }
  if (
    normalized.toLowerCase().endsWith("/opencode-game-visualizer") &&
    normalized.split("/").filter(Boolean).length >= 3
  ) {
    knownVisualizerParentNorm = normalized.slice(0, normalized.lastIndexOf("/")).toLowerCase();
  }
  return normalized;
}

export function deriveProjectName(locationDir: string, explicitName?: string): string {
  if (explicitName && explicitName.trim()) {
    return explicitName.trim();
  }
  const normalized = normalizeLocationDirectory(locationDir);
  const segments = normalized.split("/").filter(Boolean);
  return segments[segments.length - 1] ?? "guild-room";
}

export function toPosixMountPath(rawDir: string): string {
  const trimmed = rawDir.trim().replace(/\\/g, "/");
  if (!trimmed) {
    return "/";
  }
  const winDriveMatch = /^([A-Za-z]):(?:\/(.*))?$/.exec(trimmed);
  if (winDriveMatch) {
    const drive = winDriveMatch[1].toLowerCase();
    const rest = winDriveMatch[2] ?? "";
    const joined = `/mnt/${drive}/${rest}`.replace(/\/+/g, "/");
    return joined.length > 1 && joined.endsWith("/") ? joined.slice(0, -1) : joined;
  }
  const cStyleMatch = /^\/([A-Za-z])(?:\/(.*))?$/.exec(trimmed);
  if (cStyleMatch && cStyleMatch[1].toLowerCase() !== "mnt") {
    const drive = cStyleMatch[1].toLowerCase();
    const rest = cStyleMatch[2] ?? "";
    const joined = `/mnt/${drive}/${rest}`.replace(/\/+/g, "/");
    return joined.length > 1 && joined.endsWith("/") ? joined.slice(0, -1) : joined;
  }
  return trimmed;
}

export function toDaemonDirectoryPath(rawDir: string): string {
  const trimmed = rawDir.trim().replace(/\\/g, "/");
  if (!trimmed) {
    return "/";
  }
  const winDriveMatch = /^([A-Za-z]):(?:\/(.*))?$/.exec(trimmed);
  if (winDriveMatch) {
    const drive = winDriveMatch[1].toUpperCase();
    const rest = winDriveMatch[2] ?? "";
    const joined = `${drive}:/${rest}`.replace(/\/+/g, "/");
    return joined.length > 3 && joined.endsWith("/") ? joined.slice(0, -1) : joined;
  }
  return toPosixMountPath(trimmed);
}

export function resolveLocalProjectDir(
  projectDir: string,
  checkExists?: (candidate: string) => boolean,
  daemonUrl?: string | null,
): string | null {
  if (!projectDir) return null;
  if (daemonUrl !== undefined && daemonUrl !== null && !isLocalDaemonEndpoint(daemonUrl)) {
    return null;
  }
  const trimmed = projectDir.trim();
  if (!trimmed) return null;
  const isDefaultFsCheck = !checkExists || checkExists === nodeExistsSync;
  if (isDefaultFsCheck && remoteDaemonDirs.has(normalizeLocationDirectory(trimmed).toLowerCase())) {
    return null;
  }

  const candidates: string[] = [trimmed];
  const posixMount = toPosixMountPath(trimmed);
  if (!candidates.includes(posixMount)) {
    candidates.push(posixMount);
  }
  const norm = normalizeLocationDirectory(trimmed);
  if (!candidates.includes(norm)) {
    candidates.push(norm);
  }
  const driveMatch = /^\/([a-z])\/(.*)$/i.exec(norm);
  if (driveMatch) {
    const drive = driveMatch[1];
    const rest = driveMatch[2];
    const winCandidate = `${drive.toUpperCase()}:/${rest}`;
    if (!candidates.includes(winCandidate)) {
      candidates.push(winCandidate);
    }
  }
  const incomingWslMatch = WSL_UNC_PREFIX_MATCH.exec(trimmed.replace(/\\/g, "/"));
  const wslPrefix = incomingWslMatch?.[1] ?? ACTIVE_WSL_UNC_PREFIX;
  if (wslPrefix && (norm.startsWith("/home/") || norm.startsWith("/tmp/"))) {
    const wslUnc = `${wslPrefix}${norm}`;
    if (!candidates.includes(wslUnc)) {
      candidates.push(wslUnc);
    }
  }
  if (
    norm.toLowerCase().endsWith("/opencode-game-visualizer") &&
    norm.split("/").filter(Boolean).length >= 3 &&
    typeof process !== "undefined" &&
    typeof process.cwd === "function"
  ) {
    const cwd = process.cwd();
    if (!candidates.includes(cwd)) {
      candidates.push(cwd);
    }
  }
  const parts = norm.split("/").filter(Boolean);
  if (!norm.startsWith("/home/") && !norm.startsWith("/tmp/")) {
    if (parts.length >= 1) {
      const ws1 = `/workspaces/${parts[parts.length - 1]}`;
      if (!candidates.includes(ws1)) candidates.push(ws1);
    }
    if (parts.length >= 2) {
      const ws2 = `/workspaces/${parts.slice(-2).join("/")}`;
      if (!candidates.includes(ws2)) candidates.push(ws2);
    }
  }
  const existsFn = checkExists ?? nodeExistsSync;
  if (
    knownVisualizerParentNorm !== null &&
    norm.toLowerCase() === knownVisualizerParentNorm &&
    existsFn?.("/workspaces/opencode-game-visualizer") &&
    !candidates.includes("/workspaces")
  ) {
    candidates.push("/workspaces");
  }

  if (!checkExists) {
    if (nodeExistsSync) {
      for (const candidate of candidates) {
        if (nodeExistsSync(candidate)) return candidate;
      }
    }
    return posixMount;
  }
  for (const candidate of candidates) {
    if (checkExists(candidate)) return candidate;
  }
  return null;
}

const SHARED_HOST_ROOT_REGEX =
  /^\/(?:[a-z]|mnt(?:\/[a-z])?|Users|home|[a-z]\/Users|tmp|var(?:\/folders)?)$/i;

export function isSystemRootOrHomeDirectory(normDir: string): boolean {
  if (!normDir || normDir === "/") return true;
  return /^\/(?:[a-z]|(?:[a-z]\/)?(?:home|Users)(?:\/[^/]+)?)$/i.test(normDir);
}

export function isLocalDaemonEndpoint(daemonUrl?: string | null): boolean {
  if (!daemonUrl || !daemonUrl.trim()) return true;
  try {
    const parsed = new URL(daemonUrl.trim());
    const h = parsed.hostname.toLowerCase();
    return (
      h === "127.0.0.1" ||
      h === "localhost" ||
      h === "0.0.0.0" ||
      h === "host.docker.internal" ||
      h === "::1" ||
      h === "[::1]"
    );
  } catch {
    return true;
  }
}

export function isDeletedHostDirectory(
  rawDir: string,
  checkExists: ((candidate: string) => boolean) | undefined = nodeExistsSync,
  daemonUrl?: string | null,
): boolean {
  if (!rawDir || !rawDir.trim()) return false;
  const trimmed = rawDir.trim();
  if (/^\/.*[A-Za-z]:[\\/]/.test(trimmed)) {
    return true;
  }
  if (daemonUrl !== undefined && daemonUrl !== null && !isLocalDaemonEndpoint(daemonUrl)) {
    return false;
  }
  if (!checkExists) {
    return false;
  }
  if (resolveLocalProjectDir(trimmed, checkExists) !== null) {
    return false;
  }
  const norm = normalizeLocationDirectory(trimmed);
  if (norm === "/" || SHARED_HOST_ROOT_REGEX.test(norm) || norm.includes("/.worktrees/") || norm.includes("/worktree/")) {
    return false;
  }
  const segments = norm.split("/").filter(Boolean);
  for (let len = segments.length - 1; len >= 1; len -= 1) {
    const ancestor = "/" + segments.slice(0, len).join("/");
    if (SHARED_HOST_ROOT_REGEX.test(ancestor)) {
      break;
    }
    if (resolveLocalProjectDir(ancestor, checkExists) !== null) {
      return true;
    }
  }
  return false;
}
