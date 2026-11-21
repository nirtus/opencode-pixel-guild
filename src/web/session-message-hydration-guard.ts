import type { CharacterLifecycleState, CharacterState } from "../types/domain.ts";

export const MID_TURN_HYDRATION_COOLDOWN_MS = 4_000;

interface SessionHydrationRecord {
  lastFetchedAtMs: number;
  boundaryKey: string;
  activityKey: string;
}

let lastVisibleSelectedSessionId: string | null = null;
const hydratedBySession = new Map<string, SessionHydrationRecord>();

function isMidTurnLifecycleState(state: CharacterLifecycleState): boolean {
  return (
    state === "Entering" ||
    state === "Thinking" ||
    state === "WorkingAtStation" ||
    state === "DistillingContextMana" ||
    state === "ReportingScroll"
  );
}

function buildBoundaryKey(char: CharacterState): string {
  const phase = isMidTurnLifecycleState(char.lifecycleState)
    ? "active"
    : char.lifecycleState;
  return `${phase}:${char.idleAtMs ?? 0}:${char.questGate?.gateId ?? ""}`;
}

function buildActivityKey(char: CharacterState): string {
  const topTool = char.recentTools?.[0];
  return `${char.lastActivityAtMs}:${char.sequenceCursor}:${char.recentTools?.length ?? 0}:${topTool?.callId ?? ""}:${topTool?.status ?? ""}`;
}

export function buildCharHydrationDigest(c: CharacterState | null | undefined): string {
  if (!c) return "";
  const msgs = c.messages ?? [];
  const lastMsg = msgs[msgs.length - 1];
  return `${msgs.length}:${lastMsg?.messageId ?? ""}:${lastMsg?.text?.length ?? 0}:${(c.lastAssistantText || "").length}:${c.questGate?.gateId ?? ""}`;
}

export function resetSessionMessageHydrationGuard(): void {
  lastVisibleSelectedSessionId = null;
  hydratedBySession.clear();
}

export function markCharacterSheetHidden(): void {
  lastVisibleSelectedSessionId = null;
}

export function pruneSessionMessageHydrationGuard(
  snapshotChars: Readonly<Record<string, CharacterState>>,
): void {
  for (const sid of hydratedBySession.keys()) {
    if (!snapshotChars[sid]) hydratedBySession.delete(sid);
  }
  if (lastVisibleSelectedSessionId && !snapshotChars[lastVisibleSelectedSessionId]) {
    lastVisibleSelectedSessionId = null;
  }
}

export interface EvaluateSessionMessageHydrationInput {
  readonly char: CharacterState;
  readonly messageCount: number;
  readonly mobileActiveTab: string;
  readonly isSheetVisible: boolean;
  readonly isHeadlessBrowser: boolean;
  readonly nowMs?: number;
  readonly cooldownMs?: number;
}

export function evaluateSessionMessageHydration(
  input: EvaluateSessionMessageHydrationInput,
): boolean {
  if (input.mobileActiveTab !== "character" || !input.isSheetVisible) {
    lastVisibleSelectedSessionId = null;
    return false;
  }
  if (input.isHeadlessBrowser && input.messageCount > 0) {
    return false;
  }

  const sid = input.char.sessionId;
  const nowMs = input.nowMs ?? Date.now();
  const cooldownMs = input.cooldownMs ?? MID_TURN_HYDRATION_COOLDOWN_MS;
  const boundaryKey = buildBoundaryKey(input.char);
  const activityKey = buildActivityKey(input.char);
  const isNewlySelectedVisible = lastVisibleSelectedSessionId !== sid;
  lastVisibleSelectedSessionId = sid;

  const prev = hydratedBySession.get(sid);
  const elapsedMs = prev ? nowMs - prev.lastFetchedAtMs : Infinity;
  const shouldFetch =
    !prev ||
    prev.boundaryKey !== boundaryKey ||
    (isNewlySelectedVisible && (input.messageCount === 0 || elapsedMs >= cooldownMs)) ||
    (prev.activityKey !== activityKey && elapsedMs >= cooldownMs);

  if (!shouldFetch) return false;
  hydratedBySession.set(sid, { lastFetchedAtMs: nowMs, boundaryKey, activityKey });
  return true;
}

export interface MaybeHydrateSessionMessagesOptions {
  readonly char: CharacterState;
  readonly messageCount: number;
  readonly mobileActiveTab: string;
  readonly isSheetVisible: boolean;
  readonly getHeaders: () => Record<string, string>;
  readonly hasSessionInSnapshot: (sessionId: string) => boolean;
  readonly applySnapshot: (snapshot: unknown) => boolean;
  readonly onHydratedChanged: () => void;
}

export function maybeHydrateSessionMessagesOnDemand(
  opts: MaybeHydrateSessionMessagesOptions,
): void {
  if (typeof window === "undefined" || typeof fetch !== "function") return;
  const isHeadlessBrowser =
    typeof navigator !== "undefined" && /HeadlessChrome/i.test(navigator.userAgent || "");
  const sid = opts.char.sessionId;
  const prevRecord = hydratedBySession.get(sid);
  if (
    !evaluateSessionMessageHydration({
      char: opts.char,
      messageCount: opts.messageCount,
      mobileActiveTab: opts.mobileActiveTab,
      isSheetVisible: opts.isSheetVisible,
      isHeadlessBrowser,
    })
  ) {
    return;
  }

  const currentRecord = hydratedBySession.get(sid);
  const rollbackHydrationRecord = () => {
    if (hydratedBySession.get(sid) !== currentRecord) return;
    if (prevRecord) hydratedBySession.set(sid, prevRecord);
    else hydratedBySession.delete(sid);
  };
  const prevDigest = buildCharHydrationDigest(opts.char);
  const dirQ = opts.char.locationDirectory
    ? `?directory=${encodeURIComponent(opts.char.locationDirectory)}`
    : "";
  void fetch(`/api/guild/session/${encodeURIComponent(sid)}/messages${dirQ}`, {
    headers: opts.getHeaders(),
    signal: typeof AbortSignal?.timeout === "function" ? AbortSignal.timeout(6000) : undefined,
  })
    .then((r) => {
      if (!r.ok) {
        rollbackHydrationRecord();
        return null;
      }
      return r.json();
    })
    .then((payload) => {
      if (payload?.snapshot && opts.hasSessionInSnapshot(sid)) {
        const nextDigest = buildCharHydrationDigest(payload.snapshot.characters?.[sid]);
        if (opts.applySnapshot(payload.snapshot) && nextDigest !== prevDigest) {
          opts.onHydratedChanged();
        }
      }
    })
    .catch(() => {
      rollbackHydrationRecord();
    });
}
