import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type {
  GuildOperatorPreferences,
  GuildOperatorProfile,
  GuildSnapshot,
  PairedOpenCodeMachine,
} from "../types/domain.ts";

export type {
  GuildOperatorPreferences,
  GuildOperatorProfile,
  PairedOpenCodeMachine,
};

export function createDefaultPreferences(
  partial?: Partial<GuildOperatorPreferences>,
): GuildOperatorPreferences {
  const base: GuildOperatorPreferences = {
    selectedProjectId: partial?.selectedProjectId ?? null,
    selectedRoomId: partial?.selectedRoomId ?? null,
    rosterMode: partial?.rosterMode ?? "active-squads",
    visualStyleMode: partial?.visualStyleMode ?? "clean-cartoon",
    cameraFocusMode: partial?.cameraFocusMode ?? "auto",
    activeDrawerTab: partial?.activeDrawerTab ?? "ledger",
    activeHeroSubtab: partial?.activeHeroSubtab ?? "details",
    activeLedgerSubtab: partial?.activeLedgerSubtab ?? "overview",
  };
  if (partial?.selectedSessionId !== undefined) base.selectedSessionId = partial.selectedSessionId;
  if (partial?.desktopWorldWidthRatio !== undefined) base.desktopWorldWidthRatio = partial.desktopWorldWidthRatio;
  if (partial?.isWorldCollapsed !== undefined) base.isWorldCollapsed = partial.isWorldCollapsed;
  if (partial?.isGamemasterCollapsed !== undefined) base.isGamemasterCollapsed = partial.isGamemasterCollapsed;
  if (partial?.isTickerCollapsed !== undefined) base.isTickerCollapsed = partial.isTickerCollapsed;
  if (partial?.mobileDrawerState !== undefined) base.mobileDrawerState = partial.mobileDrawerState;
  if (partial?.selectedCommitFilePath !== undefined) base.selectedCommitFilePath = partial.selectedCommitFilePath;
  if (partial?.selectedToolCallId !== undefined) base.selectedToolCallId = partial.selectedToolCallId;
  if (partial?.isSummonModalOpen !== undefined) base.isSummonModalOpen = partial.isSummonModalOpen;
  return base;
}

export function createInitialOperatorProfile(
  operatorId: string,
  input: {
    username?: string;
    passwordHash?: string;
    label?: string;
    daemonUrl?: string | null;
    daemonPassword?: string;
    pairedMachines?: PairedOpenCodeMachine[];
    preferences?: Partial<GuildOperatorPreferences>;
  } = {},
): GuildOperatorProfile {
  const now = Date.now();
  const initialDaemonUrl = typeof input.daemonUrl === "string" && input.daemonUrl.trim() ? input.daemonUrl.trim() : null;
  const machines: PairedOpenCodeMachine[] = input.pairedMachines
    ? [...input.pairedMachines]
    : initialDaemonUrl
      ? [{ machineId: `mach_${randomBytes(6).toString("hex")}`, label: "Primary OpenCode", daemonUrl: initialDaemonUrl, daemonPassword: input.daemonPassword, reachable: false, isActive: true, lastSyncedAtMs: null, errorMessage: null }]
      : [];

  return {
    operatorId,
    username: input.username?.trim() || operatorId,
    passwordHash: input.passwordHash,
    label: input.label?.trim() || input.username?.trim() || "Guild Operator",
    createdAtMs: now,
    updatedAtMs: now,
    paired: Boolean(initialDaemonUrl || machines.length > 0),
    daemonUrl: initialDaemonUrl ?? (machines.find((m) => m.isActive)?.daemonUrl || null),
    reachable: false,
    lastSyncedAtMs: null,
    errorMessage: null,
    adapterMode: initialDaemonUrl || machines.length > 0 ? "opencode-client" : "demo-simulator",
    pairedMachines: machines,
    preferences: createDefaultPreferences(input.preferences),
  };
}

export function buildFallbackOperatorResponse(
  requireAuth: boolean | undefined,
  getDefaultSnapshot: () => GuildSnapshot,
): Record<string, unknown> {
  if (requireAuth) {
    return {
      authenticated: false,
      operatorId: null,
      username: null,
      label: "Unauthenticated",
      paired: false,
      daemonUrl: null,
      reachable: false,
      lastSyncedAtMs: null,
      errorMessage: null,
      adapterMode: "opencode-client",
      pairedMachines: [],
      preferences: createDefaultPreferences(),
    };
  }
  const snap = getDefaultSnapshot();
  return {
    authenticated: true,
    operatorId: "op_default",
    username: "guest",
    label: "Default Guild Operator",
    createdAtMs: snap.timestampMs,
    updatedAtMs: snap.timestampMs,
    paired: snap.activeAdapter === "opencode-client",
    daemonUrl: snap.daemonUrl,
    reachable: snap.activeAdapter === "opencode-client",
    lastSyncedAtMs: snap.timestampMs,
    errorMessage: null,
    adapterMode: snap.activeAdapter,
    pairedMachines: snap.daemonUrl
      ? [{ machineId: "mach_default", label: "Local OpenCode Daemon", daemonUrl: snap.daemonUrl, reachable: snap.activeAdapter === "opencode-client", isActive: true, lastSyncedAtMs: snap.timestampMs, errorMessage: null }]
      : [],
    preferences: createDefaultPreferences(),
  };
}

export function hashOperatorPassword(password: string): string {
  const salt = randomBytes(12).toString("hex");
  const derived = scryptSync(password, salt, 32).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyOperatorPassword(
  password: string,
  storedHash: string | undefined,
): boolean {
  if (!storedHash || !storedHash.includes(":")) return false;
  const [salt, hexHash] = storedHash.split(":");
  if (!salt || !hexHash) return false;
  const derived = scryptSync(password, salt, 32);
  const expected = Buffer.from(hexHash, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function syncProfileActiveMachineState(
  profile: GuildOperatorProfile,
  preferredMachineId?: string | null,
): PairedOpenCodeMachine | null {
  const machines = profile.pairedMachines;
  if (machines.length === 0) {
    profile.paired = false;
    profile.daemonUrl = null;
    profile.reachable = false;
    profile.lastSyncedAtMs = null;
    profile.errorMessage = null;
    return null;
  }
  const target =
    (preferredMachineId ? machines.find((m) => m.machineId === preferredMachineId) : undefined) ??
    machines.find((m) => m.isActive) ??
    machines[0];
  for (const m of machines) m.isActive = m.machineId === target.machineId;
  profile.paired = true;
  profile.daemonUrl = target.daemonUrl;
  profile.reachable = target.reachable;
  profile.lastSyncedAtMs = target.lastSyncedAtMs;
  profile.errorMessage = target.errorMessage;
  profile.adapterMode = "opencode-client";
  return target;
}

export function stripPrivateOperatorFields(
  profile: GuildOperatorProfile,
): Omit<GuildOperatorProfile, "passwordHash"> & { authenticated: boolean } {
  const { passwordHash: _ignored, ...publicProfile } = profile;
  return {
    authenticated: true,
    ...publicProfile,
    pairedMachines: (profile.pairedMachines || []).map((m) => ({
      machineId: m.machineId,
      label: m.label,
      daemonUrl: m.daemonUrl,
      reachable: m.reachable,
      isActive: m.isActive,
      lastSyncedAtMs: m.lastSyncedAtMs,
      errorMessage: m.errorMessage,
    })),
  };
}
