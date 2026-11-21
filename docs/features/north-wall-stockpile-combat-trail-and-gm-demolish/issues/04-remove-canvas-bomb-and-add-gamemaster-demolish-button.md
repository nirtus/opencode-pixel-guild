# Issue 04: Remove Canvas Demolition Bomb & Add Gamemaster Demolish Button

Type: task
Label: ready-for-agent
Status: resolved

## Goal

Remove the **Demolition Bomb** station fixture and hitbox from the **Workshop Room** canvas (`src/web/canvas-room-painter.ts`, `src/web/client-choreography.ts`) and add a `💣 Demolish Room` button in the Gamemaster (`General` / **Guild Master Ledger**) section (`src/web/ledger-panel-reconciler.ts`) that opens the confirmation modal (`#demolition-modal`).

## Acceptance Criteria

1. **Remove Bomb from Workshop Room Canvas & Hitboxes (`src/web/canvas-room-painter.ts`, `src/web/client-choreography.ts`)**:
   - Remove `paintCompactDemolitionBombStation(c, t, w, h)` call from `renderWorkshopRoom` in `src/web/canvas-room-painter.ts`.
   - Remove the `{ priority: 6, roomId, x: 42, y: 575, w: 68, h: 86, target: { kind: "demolition-bomb", ... } }` hitbox from `populateDualChamberSceneHitboxes` in `src/web/client-choreography.ts`.
2. **Add Demolish Room Button in Gamemaster (`General`) Section (`src/web/ledger-panel-reconciler.ts`)**:
   - In `renderGuildMasterLedgerPanel` (`Overview & Roster` subtab), render a `💣 Demolish` button (`#btn-demolish-active-room` with `data-demolish-room-id="${escapeHtml(targetRoom.roomId)}"`) in the room telemetry/header area whenever an active/selected room exists (`activeRoom ?? getActiveRoom()`).
   - Wire clicking `#btn-demolish-active-room` / `[data-demolish-room-id]` to call `openDemolitionModal(roomId)` (`src/web/demolition-modal-controller.ts`).
3. **Tests & Container Verification**:
   - Update unit tests so `populateDualChamberSceneHitboxes()` no longer emits a canvas `demolition-bomb` hitbox and verify that clicking `#btn-demolish-active-room` in the **Guild Master Ledger** opens `#demolition-modal` for the active room.
   - Deploy to `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), run `npm test`, and capture visual proof in `docs/images/north-wall-stockpile-combat-trail-and-gm-demolish.png`.
