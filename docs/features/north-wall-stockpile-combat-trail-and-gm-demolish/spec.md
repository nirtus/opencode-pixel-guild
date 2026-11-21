# Feature Specification: Proportional North-Wall Stockpile, Weapon-Following Combat Trails, Resize-Aligned Wilds Trail & Gamemaster Demolish Button

## 1. Overview & Problem Statement

Four visual and spatial UX issues currently affect the **Workshop Room**, **Dungeon Wilds**, and **Guild Master Ledger**:

1. **Resource Stockpile Blocks the South Guild Door Entrance**:
   - The **Resource Stockpile** (`(368, 628)`) sits directly in front of the **South Swinging Guild Door** (`x = 368..432, y = 692`), forcing entering characters to detour around a crate table right inside the doorway while leaving a wide empty gap along the north wall between **Observatory Spyglass** (`x = 385`) and **Anvil Forge** (`x = 662`).
2. **Static Combat Slash FX Arc**:
   - During **Debugging Hunt** combat (`poseMode === "combat"`), `.limb-arm-r` swings the weapon with `animPhase`, but `buildActionAndCombatFxOverlay()` (`src/sprites/hero-rig-fx-and-combat.ts`) renders a static, uniform-opacity colored arc that does not follow the weapon's motion or taper/fade from the weapon blade toward its tail.
3. **Dungeon Wilds Brown Trail Disconnects from East Archway Door on Screen Resize**:
   - In `src/web/canvas-room-painter.ts:163`, the East Wall Iron Archway anchors its top at `y = 314` (`anchorChamberPoint(768, 314, w, h).y`) and adds an unscaled `38px` half-height, whereas in `src/web/canvas-wilds-painter.ts:46`, the brown trail anchors its start at `y = 352` (`anchorChamberPoint(0, 352, w, h).y`). When `chamberH` scales (`h !== 720`), `y = 314` and `y = 352` stretch by different amounts, causing the brown trail and the archway door to misalign vertically.
4. **In-Room Demolition Bomb Clutters the Workshop Room Floor**:
   - The **Demolition Bomb** is currently painted as a station fixture at `(74, 624)` on the **Workshop Room** floor (`paintCompactDemolitionBombStation`) with a canvas hitbox (`kind: "demolition-bomb"`), rather than living as an action button in the Gamemaster (`General` / **Guild Master Ledger**) section.

---

## 2. Requirements & Invariants

### 2.1 Proportional 4-Station North Wall & Unobstructed South Entrance (`src/web/station-geometry-catalog.ts`, `src/web/canvas-station-painter.ts`, `src/web/canvas-room-painter.ts`, `src/encounter/toil-queue.ts`)
- Position the four north-wall stations proportionally across the `800px` **Workshop Room** top wall (`y ≈ 82..86`):
  1. **Library Study Bookshelf (`Library`)**:
     - `painterOrigin: { x: 116, y: 84 }`, `focalCenter: { x: 136, y: 88 }`, `hitbox: { x: 52, y: 42, w: 148, h: 98 }`.
     - Perimeter slots surrounding its south/west/east sides facing inward (`{ x: 158, y: 135, facingDirection: "north" }`, `{ x: 64, y: 92, facingDirection: "east" }`, `{ x: 204, y: 92, facingDirection: "west" }`, `{ x: 116, y: 140, facingDirection: "north" }`, `{ x: 76, y: 118, facingDirection: "east" }`, `{ x: 196, y: 122, facingDirection: "west" }`).
     - `STATION_BASE_ANCHORS.Library = { x: 158, y: 135 }`.
  2. **Observatory Spyglass (`Spyglass`)**:
     - Shifted left to `painterOrigin: { x: 284, y: 82 }`, `focalCenter: { x: 284, y: 78 }`, `hitbox: { x: 222, y: 42, w: 132, h: 92 }`.
     - Perimeter slots facing inward (`{ x: 284, y: 112, facingDirection: "north" }`, `{ x: 218, y: 86, facingDirection: "east" }`, `{ x: 354, y: 86, facingDirection: "west" }`, `{ x: 252, y: 134, facingDirection: "north" }`, `{ x: 318, y: 134, facingDirection: "north" }`, `{ x: 224, y: 114, facingDirection: "east" }`).
     - `STATION_BASE_ANCHORS.Spyglass = { x: 284, y: 112 }`.
  3. **Resource Stockpile (`Stockpile`)**:
     - Moved between **Observatory Spyglass** and **Anvil Forge** at `painterOrigin: { x: 452, y: 84 }`, `focalCenter: { x: 452, y: 84 }`, `hitbox: { x: 388, y: 42, w: 132, h: 96 }`.
     - Perimeter slots facing inward (`{ x: 452, y: 138, facingDirection: "north" }`, `{ x: 382, y: 88, facingDirection: "east" }`, `{ x: 522, y: 88, facingDirection: "west" }`, `{ x: 418, y: 136, facingDirection: "north" }`, `{ x: 486, y: 136, facingDirection: "north" }`, `{ x: 388, y: 116, facingDirection: "east" }`).
     - `STATION_BASE_ANCHORS.Stockpile = { x: 452, y: 138 }`, `STOCKPILE_ANCHOR = { x: 452, y: 138 }` (`src/encounter/toil-queue.ts`), and `STATION_FOCAL_CENTERS.Stockpile = { x: 452, y: 84 }` (`src/sprites/hero-vector-rig.ts`).
  4. **Anvil Forge (`Forge`)**:
     - `painterOrigin: { x: 662, y: 86 }`, `focalCenter: { x: 645, y: 102 }`, `hitbox: { x: 560, y: 42, w: 176, h: 112 }`.
     - `STATION_BASE_ANCHORS.Forge = { x: 600, y: 155 }`.
- Update north wall daylight windows and ambient lighting pools in `src/web/canvas-room-painter.ts` to align with the proportional 4-station north wall (`Library` at `x=116`, `Spyglass` at `x=284`, `Stockpile` at `x=452`, `Forge` at `x=662`).
- With **Resource Stockpile** moved to the north wall, the southern entrance inside the **South Swinging Guild Door** (`(400, 692)`) is completely open; update `SOUTH_DOOR_FOYER_WAYPOINT` to `{ x: 400, y: 560, facingDirection: "north" }` and remove the old south-wall Stockpile obstacle box from `src/encounter/toil-queue.ts`.

### 2.2 Weapon-Following Combat Slash & Impact FX (`src/sprites/hero-rig-fx-and-combat.ts`, `src/sprites/hero-vector-rig.ts`, `src/web/canvas-wilds-painter.ts`)
- Pass `animPhase` into `buildActionAndCombatFxOverlay(party, poseMode, weaponType, animPhase)`.
- In `buildPhaseKeyframeStyles(phase)` (`src/sprites/hero-vector-rig.ts`) and `buildActionAndCombatFxOverlay` (`src/sprites/hero-rig-fx-and-combat.ts`):
  - Synchronize `.fx-slash` / `.fx-impact-flash` / `.fx-staff-beam` / `.fx-dagger-thrust` transforms with the active weapon swing (`swordY`, `swordRot`, `pickY`, `stabX`, `arrowX`) so the FX arc physically follows the moving weapon on every animation phase step.
  - Define an SVG `<linearGradient>` (and segmented trail strokes) along each combat arc/trail that is **brightest and most opaque right next to the weapon head/blade** (`#ffffff` / `#fef08a`, `stop-opacity="1.0"`, thickest stroke) and **fades smoothly to `stop-opacity="0"` at the trailing end**.
- In `src/web/canvas-wilds-painter.ts`:
  - Replace the static-width spinning circle on `bug.inCombat` with a segmented fading slash trail around the monster that is brightest at the leading weapon strike point (`#ffffff` / `#fef08a`, alpha `1.0`) and tapers + fades to transparent (`alpha -> 0`) along the trailing wake.

### 2.3 Align Dungeon Wilds Brown Trail with Workshop Room East Archway Across All Screen Sizes (`src/web/canvas-room-painter.ts`, `src/web/canvas-wilds-painter.ts`)
- In `src/web/canvas-room-painter.ts`:
  - Compute the East Wall Iron Archway center from `const eastGateCenterY = anchorChamberPoint(768, 352, w, h).y;` and draw the `76px` archway centered at `const eastGateY = eastGateCenterY - 38;`.
- In `src/web/canvas-wilds-painter.ts`:
  - Start the **Dungeon Wilds** brown trail (`p0`) and Fog of War gateway clearing at `const gateCenterY = anchorChamberPoint(0, 352, w, h).y;` (`p0 = { x: 0, y: gateCenterY }`, `p1 = { x: anchorChamberPoint(160, 352, w, h).x, y: gateCenterY }`) so the brown trail and the East Archway doorway share the exact same vertical coordinate at every `w × h` chamber size and aspect ratio.

### 2.4 Remove Canvas Demolition Bomb & Add Gamemaster (`General`) Demolish Button (`src/web/canvas-room-painter.ts`, `src/web/client-choreography.ts`, `src/web/ledger-panel-reconciler.ts`, `src/web/demolition-modal-controller.ts`)
- Remove `paintCompactDemolitionBombStation(c, t, w, h)` from `renderWorkshopRoom` (`src/web/canvas-room-painter.ts`).
- Remove the in-room `{ kind: "demolition-bomb", ... }` hitbox from `populateDualChamberSceneHitboxes()` (`src/web/client-choreography.ts`).
- In `renderGuildMasterLedgerPanel` (`src/web/ledger-panel-reconciler.ts`, `General` section):
  - Render a `💣 Demolish Room` button (`#btn-demolish-active-room` / `data-demolish-room-id`) in the **Guild Master Ledger** (`Overview & Roster` view) for the active/selected room (`activeRoom ?? getActiveRoom()`), wired to `openDemolitionModal(room.roomId)`.

### 2.5 Container Deployment & Visual Verification
- Deploy to `opencode-pixel-guild-visualizer` (`npm run docker:up` on port `4310`), verify `docker ps` and `npm test`, capture a headless Chrome screenshot (`docs/images/north-wall-stockpile-combat-trail-and-gm-demolish.png`), and inspect it with `read`.
