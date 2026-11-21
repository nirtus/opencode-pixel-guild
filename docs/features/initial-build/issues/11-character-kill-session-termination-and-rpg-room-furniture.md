# Add Character Kill Session Termination (`DELETE /api/session/{sessionID}`) and RPG Room Furniture Descriptors

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 05, 09, 10

## Description

1. Extend `OpenCodeDaemonClientPort` and `createHttpOpenCodeDaemonClient` with `deleteSession(sessionId, directory)` calling `DELETE /api/session/{sessionID}?location[directory]=...` on the live OpenCode V2 daemon.
2. Add the `session.deleted` event to `WorldStateReducer`, removing the terminated `CharacterState` and cascading removal to all child `Squad Subagent`s where `parentSessionId === sessionId`.
3. Expose `DELETE /api/guild/session/:sessionId` on `createGuildCompanionServer` (`src/server/main.ts`) and wire a **`☠ Kill Character (Delete Session)`** action in the `Character Sheet` with a confirmation prompt and a pixel soul-banish / gravestone animation on the canvas.
4. Populate `Workshop Room` layout with semantic RPG workshop furniture descriptors (`wallTorches`, `stationRugs`, `bookshelves`, `weaponRacks`, `forgeQuenchBarrel`, `hearthFireplace`, `banquetTable`, `resourceStockpileCrates`) ready for the parallel Graphics Overhaul specification.

## Answer

- Extended `OpenCodeDaemonClientPort` and `createHttpOpenCodeDaemonClient` (`src/ingress/adapters.ts`) with `deleteSession(sessionId, directory)` sending `DELETE /api/session/${encodeURIComponent(sessionId)}?location[directory]=${encodeURIComponent(directory)}` with Basic auth and `x-opencode-directory` headers.
- Added `SessionDeletedTelemetryEvent` (`type: "session.deleted"`) to `TelemetryEvent` (`src/types/domain.ts`) and implemented cascading session deletion in `createWorldStateReducer` (`src/state/world-reducer.ts`), removing the target `CharacterState` and all child `Squad Subagent`s (`parentSessionId === sessionId` / `parentId === sessionId`), clearing their open `QuestGate`s and `SummoningRitual`s, pruning their IDs from `room.characterIds`, `room.activeSessionIds`, and `alcove.activeCharacterIds`, and emitting a `session.deleted` delta.
- Exposed `DELETE /api/guild/session/:sessionId` on `createGuildCompanionServer` (`src/server/main.ts`), invoking `daemonClient.deleteSession(sessionId, locationDirectory)`, dispatching `session.deleted` to the reducer, and broadcasting the emission to connected SSE clients.
- Added `killAction` (`☠ Kill Character (Delete Session)`, confirmation prompt, `soul-banish-gravestone` `900ms` animation metadata) to `buildCharacterSheetViewModel` (`src/hud/spectator-hud.ts`) and wired the interactive confirmation step and `900ms` pixel soul-banish / gravestone dissolve animation in `src/web/app.html`.
- Populated `layoutWorkshopRoom` (`src/spatial/floorplan-layout.ts`) with semantic RPG workshop furniture descriptors (`wallTorches`, `stationRugs`, `bookshelves`, `weaponRacks`, `forgeQuenchBarrel`, `hearthFireplace`, `banquetTable`, `resourceStockpileCrates`) and multi-zone floor descriptors (`zones`).
