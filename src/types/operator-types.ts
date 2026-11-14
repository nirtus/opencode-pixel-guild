import type { TelemetryAdapterKind } from "./core-types.ts";

export interface GuildOperatorPreferences {
  selectedProjectId: string | null;
  selectedRoomId: string | null;
  selectedSessionId?: string | null;
  rosterMode: "active-squads" | "full-lineage";
  visualStyleMode: "clean-cartoon" | "pixel-atlas";
  cameraFocusMode?: "auto" | "workshop" | "wilds" | "split";
  desktopWorldWidthRatio?: number;
  isWorldCollapsed?: boolean;
  isGamemasterCollapsed?: boolean;
  isTickerCollapsed?: boolean;
  activeDrawerTab: "ledger" | "character" | "ticker";
  mobileDrawerState?: "collapsed" | "peek" | "expanded";
  activeHeroSubtab: "details" | "chat" | "scrolls" | "tools";
  activeLedgerSubtab: "overview" | "assembly" | "roster";
  selectedCommitFilePath?: string | null;
  selectedToolCallId?: string | null;
  isSummonModalOpen?: boolean;
}

export type ClientOperatorPreferences = Partial<GuildOperatorPreferences>;

export interface PairedOpenCodeMachine {
  machineId: string;
  label: string;
  daemonUrl: string;
  daemonPassword?: string;
  reachable: boolean;
  isActive: boolean;
  lastSyncedAtMs: number | null;
  errorMessage: string | null;
}

export type ClientMachineRecord = Omit<PairedOpenCodeMachine, "daemonPassword">;

export interface GuildOperatorProfile {
  operatorId: string;
  username: string;
  passwordHash?: string;
  label: string;
  createdAtMs: number;
  updatedAtMs: number;
  paired: boolean;
  daemonUrl: string | null;
  reachable: boolean;
  lastSyncedAtMs: number | null;
  errorMessage: string | null;
  adapterMode: TelemetryAdapterKind;
  pairedMachines: PairedOpenCodeMachine[];
  preferences: GuildOperatorPreferences;
}

export interface ClientOperatorProfile {
  authenticated?: boolean;
  operatorId: string | null;
  username: string | null;
  label: string;
  paired: boolean;
  daemonUrl: string | null;
  reachable: boolean;
  pairedMachines: ClientMachineRecord[];
  preferences?: ClientOperatorPreferences;
}

const DEFAULT_OPERATOR_LABELS = new Set([
  "guest",
  "Guild Operator",
  "Default Guild Operator",
  "Unauthenticated",
]);

export function resolveOperatorDisplayAlias(
  profile?: {
    authenticated?: boolean;
    username?: string | null;
    label?: string | null;
  } | null,
): string | null {
  if (!profile || profile.authenticated === false) return null;
  const uname = profile.username?.trim() || "";
  if (!uname || uname === "guest") return null;
  const label = profile.label?.trim() || "";
  if (label && !DEFAULT_OPERATOR_LABELS.has(label)) return label;
  return uname;
}
