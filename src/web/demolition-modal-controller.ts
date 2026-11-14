import { buildSceneObjectTooltip } from "../hud/spectator-hud.ts";
import {
  clientState,
  getActiveRoom,
  persistProjectWorldSelection,
  triggerPlatformSnapBurst,
} from "./client-state.ts";
import { getOperatorHeaders } from "./operator-pairing-controller.ts";
import {
  applyAuthoritativeSnapshot,
  markRoomDemolishing,
  recordClientDeletedRoom,
} from "./snapshot-gate.ts";

export function openDemolitionModal(
  roomId: string,
  modalEl?: HTMLElement | null,
): void {
  clientState.pendingDemolishRoomId = roomId;
  const el =
    modalEl ??
    (typeof document !== "undefined"
      ? document.getElementById("demolition-modal")
      : null);
  if (typeof document !== "undefined") {
    const activeRoom =
      clientState.currentSnapshot.rooms?.[roomId] ?? getActiveRoom();
    const titleEl = document.getElementById("demolish-modal-title");
    const bodyEl = document.getElementById("demolish-modal-body");
    if (titleEl && activeRoom) {
      titleEl.textContent = `💣 Demolish Workshop Room — ${activeRoom.projectName}`;
    }
    if (bodyEl) {
      const tipVm = buildSceneObjectTooltip(clientState.currentSnapshot, {
        kind: "demolition-bomb",
        roomId,
        room: activeRoom ?? undefined,
      });
      bodyEl.textContent =
        tipVm?.description ||
        `Confirm OpenCode V2 room resource teardown for ${roomId}?`;
    }
  }
  if (el) {
    el.style.display = "grid";
  }
}

export function closeDemolitionModal(modalEl?: HTMLElement | null): void {
  clientState.pendingDemolishRoomId = null;
  const el =
    modalEl ??
    (typeof document !== "undefined"
      ? document.getElementById("demolition-modal")
      : null);
  if (el) {
    el.style.display = "none";
  }
}

export async function confirmDemolishRoom(
  fetchImpl?: typeof fetch,
  onStateChanged: () => void = () => {},
  modalEl?: HTMLElement | null,
): Promise<boolean> {
  const invokeFetch: typeof fetch =
    !fetchImpl || fetchImpl === globalThis.fetch
      ? (input, init) => globalThis.fetch(input, init)
      : fetchImpl;
  const roomId =
    clientState.pendingDemolishRoomId || getActiveRoom()?.roomId || null;
  if (!roomId) {
    closeDemolitionModal(modalEl);
    return false;
  }
  const confirmBtn =
    typeof document !== "undefined"
      ? (document.getElementById("btn-confirm-demolish-room") as HTMLButtonElement | null)
      : null;
  markRoomDemolishing(roomId, true);
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = "⏳ Demolishing...";
  }
  onStateChanged();
  try {
    const res = await invokeFetch(
      `/api/guild/room?roomId=${encodeURIComponent(roomId)}`,
      { method: "DELETE", headers: getOperatorHeaders() },
    );
    if (res.ok) {
      recordClientDeletedRoom(roomId);
      const payload = await res.json();
      if (payload?.snapshot) {
        applyAuthoritativeSnapshot(payload.snapshot);
      }
      const remainingRooms = Object.values(clientState.currentSnapshot.rooms || {});
      const nextPrimaryRoom =
        remainingRooms.find((r) => !r.isWorktree && r.roomId !== roomId) ??
        remainingRooms.find((r) => r.roomId !== roomId) ??
        null;
      if (
        clientState.selectedRoomId === roomId ||
        (clientState.selectedRoomId && !clientState.currentSnapshot.rooms?.[clientState.selectedRoomId])
      ) {
        clientState.selectedRoomId = clientState.isAllWorldsFocused ? null : (nextPrimaryRoom?.roomId ?? null);
      }
      const selectedProjMatchesDeleted =
        clientState.selectedProjectId === roomId ||
        Boolean(
          clientState.selectedProjectId &&
            !remainingRooms.some(
              (r) =>
                r.roomId === clientState.selectedProjectId ||
                r.parentProjectDirectory === clientState.selectedProjectId,
            ),
        );
      if (selectedProjMatchesDeleted) {
        const nextProjectId = clientState.isAllWorldsFocused ? null : (nextPrimaryRoom?.roomId ?? null);
        persistProjectWorldSelection(nextProjectId);
      }
      triggerPlatformSnapBurst(76, 610);
    }
  } catch {
    // Ignore transient network failures
  } finally {
    markRoomDemolishing(roomId, false);
    if (confirmBtn) {
      confirmBtn.disabled = false;
      confirmBtn.textContent = "💣 Confirm Demolish";
    }
    closeDemolitionModal(modalEl);
    onStateChanged();
  }
  return true;
}
