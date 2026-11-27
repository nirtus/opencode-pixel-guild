import type {
  ClientOperatorPreferences,
  ClientOperatorProfile,
} from "../types/domain.ts";
import { clientState } from "./client-state.ts";
import {
  applyPreferencesToStateTarget,
  getBrowserStorage,
  type KeyValueStoragePort,
  OPERATOR_ID_STORAGE_KEY,
  syncProjectUrlQueryParam,
  writeSavedProjectId,
} from "./world-persistence.ts";

export type { ClientOperatorPreferences, ClientOperatorProfile };

let cachedProfile: ClientOperatorProfile | null = null;
let profileMutationEpoch = 0;

export function getCachedOperatorProfile(): ClientOperatorProfile | null {
  return cachedProfile;
}

export function setCachedOperatorProfile(
  profile: ClientOperatorProfile | null,
): void {
  cachedProfile = profile;
}

export function bumpOperatorProfileMutationEpoch(): number {
  profileMutationEpoch += 1;
  return profileMutationEpoch;
}

export function getSavedOperatorId(): string | null {
  if (clientState.operatorId) return clientState.operatorId;
  if (typeof window !== "undefined" && window.location?.search) {
    const qOp = new URLSearchParams(window.location.search)
      .get("operatorId")
      ?.trim();
    if (qOp) return (clientState.operatorId = qOp);
  }
  try {
    const val = getBrowserStorage()?.getItem(OPERATOR_ID_STORAGE_KEY)?.trim();
    if (val) return (clientState.operatorId = val);
  } catch {
    /* ignore */
  }
  return null;
}

export function setSavedOperatorId(operatorId: string | null): void {
  clientState.operatorId = operatorId;
  const store = getBrowserStorage();
  if (!store) return;
  try {
    if (operatorId?.trim()) {
      store.setItem(OPERATOR_ID_STORAGE_KEY, operatorId.trim());
    } else {
      store.removeItem?.(OPERATOR_ID_STORAGE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function getOperatorHeaders(
  extra: Record<string, string> = {},
): Record<string, string> {
  const opId = getSavedOperatorId();
  return opId ? { ...extra, "X-Guild-Operator-Id": opId } : { ...extra };
}

export function withOperatorQuery(path: string): string {
  const opId = getSavedOperatorId();
  return opId
    ? `${path}${path.includes("?") ? "&" : "?"}operatorId=${encodeURIComponent(opId)}`
    : path;
}

export function applyOperatorPreferencesToClientState(
  prefs: Partial<ClientOperatorPreferences> | null | undefined,
  options: { searchString?: string; storage?: KeyValueStoragePort | null } = {},
): void {
  applyPreferencesToStateTarget(clientState, prefs, options);
}

export async function syncOperatorPreferences(
  partial: Partial<ClientOperatorPreferences>,
  fetchImpl?: typeof fetch,
  storage?: KeyValueStoragePort | null,
): Promise<void> {
  if ("selectedProjectId" in partial) {
    clientState.selectedProjectId = partial.selectedProjectId ?? null;
    writeSavedProjectId(clientState.selectedProjectId, storage);
    syncProjectUrlQueryParam(clientState.selectedProjectId);
  }
  applyPreferencesToStateTarget(clientState, partial, {
    searchString: "",
    storage,
  });
  if (cachedProfile) {
    cachedProfile.preferences = {
      ...(cachedProfile.preferences ?? {}),
      ...partial,
    };
  }
  const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fn || storage) return;
  try {
    await fn("/api/guild/users/me", {
      method: "PATCH",
      headers: getOperatorHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ preferences: partial }),
    });
  } catch {
    /* ignore */
  }
}

export async function refreshCachedOperatorProfile(
  fetchImpl?: typeof fetch,
): Promise<ClientOperatorProfile | null> {
  const fn = fetchImpl ?? (typeof fetch === "function" ? fetch : undefined);
  if (!fn) return cachedProfile;
  const startEpoch = profileMutationEpoch;
  try {
    const res = await fn("/api/guild/users/me", {
      headers: getOperatorHeaders(),
    });
    if (res.ok) {
      const next = (await res.json()) as ClientOperatorProfile;
      if (startEpoch === profileMutationEpoch) {
        cachedProfile = next;
      }
    }
  } catch {
    /* ignore */
  }
  return cachedProfile;
}
