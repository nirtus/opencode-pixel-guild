import type { GuildSnapshot, ProjectTaskProgress } from "../types/domain.ts";

export interface SseGitRefreshContext {
  readonly delta: {
    readonly kind?: string;
    readonly roomId?: string | null;
    readonly locationDirectory?: string | null;
    readonly changedRoomIds?: readonly string[];
  } | null | undefined;
  readonly prevSnapshot: GuildSnapshot | null | undefined;
  readonly nextSnapshot: GuildSnapshot | null | undefined;
  readonly selectedRoomId: string | null | undefined;
  readonly hasCachedGitState: boolean;
  readonly wasRoomMutatedRecently: (roomId: string) => boolean;
}

export type SseGitRefreshAction =
  | { readonly action: "none" }
  | { readonly action: "refresh"; readonly roomId: string }
  | { readonly action: "invalidate"; readonly roomId: string };

export function buildRoomTaskProgressSignature(
  taskProgress: ProjectTaskProgress | null | undefined,
): string {
  if (!taskProgress) return "";
  const tasksSig = (taskProgress.tasks ?? [])
    .map((t) => `${t.id}:${t.slug}:${t.status}`)
    .join(",");
  return `${taskProgress.source}:${taskProgress.featureSlug ?? ""}:${taskProgress.resolvedTasks}/${taskProgress.totalTasks}:${tasksSig}`;
}

export function resolveSseGitRefreshAction(ctx: SseGitRefreshContext): SseGitRefreshAction {
  const kind = ctx.delta?.kind;
  if (kind !== "tasks.hydrated" && kind !== "stream.reconnected" && kind !== "session.idle") {
    return { action: "none" };
  }

  const changedRooms = Array.isArray(ctx.delta?.changedRoomIds) ? ctx.delta.changedRoomIds : [];
  const selectedRoomId = ctx.selectedRoomId ?? null;
  const deltaRoomId =
    ctx.delta?.roomId ||
    ctx.delta?.locationDirectory ||
    (changedRooms.length === 1 ? changedRooms[0] : null) ||
    (kind === "stream.reconnected" ? selectedRoomId : null);

  const affectsSelectedRoom = Boolean(
    selectedRoomId && (deltaRoomId === selectedRoomId || changedRooms.includes(selectedRoomId)),
  );
  const isEchoFromMutation =
    kind === "tasks.hydrated" && deltaRoomId !== null && ctx.wasRoomMutatedRecently(deltaRoomId);
  if (isEchoFromMutation) return { action: "none" };

  if (kind === "stream.reconnected") {
    if (!selectedRoomId || !affectsSelectedRoom || ctx.wasRoomMutatedRecently(selectedRoomId)) {
      return { action: "none" };
    }
    if (!ctx.hasCachedGitState) {
      return { action: "refresh", roomId: selectedRoomId };
    }
    const prevRoom = ctx.prevSnapshot?.rooms?.[selectedRoomId];
    const nextRoom = ctx.nextSnapshot?.rooms?.[selectedRoomId];
    const prevSig = buildRoomTaskProgressSignature(prevRoom?.taskProgress);
    const nextSig = buildRoomTaskProgressSignature(nextRoom?.taskProgress);
    if (prevSig !== nextSig) {
      return { action: "refresh", roomId: selectedRoomId };
    }
    const prevActiveSig = [...(prevRoom?.activeSessionIds ?? [])].sort().join(",");
    const nextActiveSig = [...(nextRoom?.activeSessionIds ?? [])].sort().join(",");
    if (prevActiveSig !== nextActiveSig) {
      return { action: "refresh", roomId: selectedRoomId };
    }
    return { action: "none" };
  }

  if (selectedRoomId && affectsSelectedRoom && !ctx.wasRoomMutatedRecently(selectedRoomId)) {
    return { action: "refresh", roomId: selectedRoomId };
  }
  if (deltaRoomId) {
    return { action: "invalidate", roomId: deltaRoomId };
  }
  return { action: "none" };
}

export function shouldRefreshSelectedRoomGitOnSseDelta(ctx: SseGitRefreshContext): boolean {
  return resolveSseGitRefreshAction(ctx).action === "refresh";
}
