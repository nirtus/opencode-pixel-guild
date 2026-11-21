# 03: Station Routing & Overhead Question Mark Rendering

Type: task
Label: wayfinder:task
Status: resolved
Blocked by: 02

## Question

Building on [02: Waiting State Reducer & Quest Gate Reconciliation](./02-waiting-state-reducer-and-quest-gate-reconciliation.md), how should `src/web/station-and-workflow-routing.ts` and `src/web/canvas-hero-painter.ts` keep waiting characters at their Preparation Station (instead of the Break Lounge) and render the `?` over their head without a redundant text pill?

## Specification

- In `src/web/station-and-workflow-routing.ts`:
  - Recognize `c.lifecycleState === "BlockedAtQuestGate" || Boolean(c.questGate)` as an active/waiting character (not `RestingInLounge`).
  - Route a waiting character to their last active **Preparation Station** (derived from `c.activeWorkstation` or `c.recentTools[0]`, defaulting to `"Enchanter"` / **Arcane Lectern** if they have not visited a station yet) rather than `"Lounge"`.
  - Include `questMarker?: "?" | "!" | null` on `ResolvedCharacterSlot`.
  - When the character is waiting on a question (`questMarker === "?"`), set `overheadLabel: ""` on `ResolvedCharacterSlot` so the overhead `?` marker is shown cleanly over their head without a redundant overhead text pill (`"question mark is enough"`), while keeping `"Waiting"` for Character Sheet HUD display.
- In `src/web/canvas-hero-painter.ts`:
  - When `slot.questMarker` (`"?"` or `"!"`) is present, render a crisp, high-visibility bobbing `?` (or `!`) badge directly over the character's head.
- Add unit tests and capture a live headless Chrome screenshot (`docs/images/waiting-for-user-input-state.png`) verifying the character stands at their Preparation Station with `?` over their head instead of resting in the Break Lounge.

## Answer

Updated `resolveCharacterTargetSlot` and `resolveCharacterOverheadLabel` in `src/web/station-and-workflow-routing.ts` to keep characters in `BlockedAtQuestGate` (`questGate`) at their last active Preparation Station (defaulting to `"Enchanter"` / Arcane Lectern) with `questMarker: "?"` and `overheadLabel: ""` on the canvas (`"Waiting"` in the HUD), updated `drawCharacterHero` in `src/web/canvas-hero-painter.ts` to render the bobbing `?` badge over the character's head, and filtered question gates out of `deriveBugMonsterEncounter` in `src/encounter/bug-monsters.ts` and `src/web/canvas-wilds-painter.ts`.
