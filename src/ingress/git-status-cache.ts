import { existsSync } from "node:fs";
import {
  normalizeDaemonEndpointUrl,
  normalizeLocationDirectory,
  resolveLocalProjectDir,
} from "../state/location-normalization.ts";
import type { ScannedGitStatus } from "./git-status-scanner.ts";

let activeGitCacheScope = "local";
const gitStatusCache = new Map<string, { atMs: number; value: ScannedGitStatus }>();
const inFlightGitScans = new Map<string, Promise<ScannedGitStatus>>();
let globalGitCacheEpoch = 0;
const gitCacheEpochByKey = new Map<string, number>();

export function resolveGitCacheScope(daemonUrl?: string | null): string {
  const norm = normalizeDaemonEndpointUrl(daemonUrl);
  return norm || activeGitCacheScope;
}

export function getActiveGitCacheScope(): string {
  return activeGitCacheScope;
}

export function setActiveGitCacheScope(daemonUrl?: string | null): void {
  activeGitCacheScope = normalizeDaemonEndpointUrl(daemonUrl) || "local";
}

export function makeScopedGitKey(normDir: string, daemonUrl?: string | null): string {
  return `${resolveGitCacheScope(daemonUrl)}::${normDir}`;
}

export function getDirGitEpoch(scopedKey: string): number {
  return (gitCacheEpochByKey.get(scopedKey) ?? 0) + globalGitCacheEpoch;
}

export function bumpDirGitEpoch(scopedKey: string): void {
  if (!scopedKey) return;
  gitCacheEpochByKey.set(scopedKey, (gitCacheEpochByKey.get(scopedKey) ?? 0) + 1);
}

export function getInFlightGitScan(scopedKey: string): Promise<ScannedGitStatus> | undefined {
  return inFlightGitScans.get(scopedKey);
}

export function setInFlightGitScan(scopedKey: string, promise: Promise<ScannedGitStatus>): void {
  inFlightGitScans.set(scopedKey, promise);
}

export function deleteInFlightGitScanIfMatches(scopedKey: string, promise: Promise<ScannedGitStatus> | null): void {
  if (promise && inFlightGitScans.get(scopedKey) === promise) {
    inFlightGitScans.delete(scopedKey);
  }
}

export function storeCachedGitStatus(
  projectDir: string,
  resolved: string,
  value: ScannedGitStatus,
  daemonUrl?: string | null,
): void {
  const entry = { atMs: Date.now(), value };
  const scope = resolveGitCacheScope(daemonUrl);
  gitStatusCache.set(`${scope}::${normalizeLocationDirectory(projectDir)}`, entry);
  gitStatusCache.set(`${scope}::${normalizeLocationDirectory(resolved)}`, entry);
}

function lookupCachedGitStatus(
  projectDir: string,
  ttlMs: number,
  daemonUrl?: string | null,
): ScannedGitStatus | null {
  const now = Date.now();
  const scope = resolveGitCacheScope(daemonUrl);
  const isFresh = (entry: { atMs: number; value: ScannedGitStatus } | undefined): ScannedGitStatus | null =>
    entry && (ttlMs === Infinity || now - entry.atMs < ttlMs) ? entry.value : null;
  const direct = isFresh(gitStatusCache.get(`${scope}::${normalizeLocationDirectory(projectDir)}`));
  if (direct) return direct;
  if (scope === "local") {
    const resolved = resolveLocalProjectDir(projectDir, existsSync);
    if (resolved) return isFresh(gitStatusCache.get(`${scope}::${normalizeLocationDirectory(resolved)}`));
  }
  return null;
}

export function getCachedGitStatus(
  projectDir: string,
  ttlMs = 30_000,
  daemonUrl?: string | null,
): ScannedGitStatus | null {
  return lookupCachedGitStatus(projectDir, ttlMs, daemonUrl);
}

export function peekCachedGitStatus(
  projectDir: string,
  daemonUrl?: string | null,
): ScannedGitStatus | null {
  return lookupCachedGitStatus(projectDir, Infinity, daemonUrl);
}

export function invalidateGitStatusCache(resolvedDir?: string, daemonUrl?: string | null): void {
  if (resolvedDir) {
    const scope = resolveGitCacheScope(daemonUrl);
    const norm = normalizeLocationDirectory(resolvedDir);
    const key = `${scope}::${norm}`;
    bumpDirGitEpoch(key);
    gitStatusCache.delete(key);
    inFlightGitScans.delete(key);
    if (scope === "local") {
      const local = resolveLocalProjectDir(resolvedDir, existsSync);
      if (local) {
        const localKey = `${scope}::${normalizeLocationDirectory(local)}`;
        bumpDirGitEpoch(localKey);
        gitStatusCache.delete(localKey);
        inFlightGitScans.delete(localKey);
      }
    }
  } else if (daemonUrl) {
    const prefix = `${normalizeDaemonEndpointUrl(daemonUrl) || "local"}::`;
    for (const k of [...gitStatusCache.keys()]) if (k.startsWith(prefix)) gitStatusCache.delete(k);
    for (const k of [...inFlightGitScans.keys()]) if (k.startsWith(prefix)) inFlightGitScans.delete(k);
    for (const k of [...gitCacheEpochByKey.keys()]) if (k.startsWith(prefix)) bumpDirGitEpoch(k);
  } else {
    globalGitCacheEpoch += 1;
    gitCacheEpochByKey.clear();
    gitStatusCache.clear();
    inFlightGitScans.clear();
  }
}
