# Feature Map: 50% Gamemaster Spectator Drawer, Unclipped Hero Chat, On-Demand Command Scroll & World Focus Aura

Label: wayfinder:map

## Destination

Deliver the complete specification in [Specification: 50% Gamemaster Spectator Drawer, Unclipped Hero Chat, On-Demand Command Scroll & World Focus Aura](./spec.md) and its 6 sequenced implementation tickets:

1. **[01: Fix Missing Overhead Question Mark (`?`) on Conversational & Long Questions](./issues/01-fix-missing-overhead-question-mark-on-conversational-and-long-questions.md)** (`Blocked by: None`)
2. **[02: Unclipped Hero Chat & Full Quest Gate Option Descriptions](./issues/02-unclipped-hero-chat-and-full-quest-gate-option-descriptions.md)** (`Blocked by: 01`)
3. **[03: Top-Bar World Focus Aura & Compact Utility Controls](./issues/03-top-bar-world-focus-aura-and-compact-utility-controls.md)** (`Blocked by: None`)
4. **[04: Desktop 50% Spectator Drawer & Single-Row Navigation Consolidation](./issues/04-desktop-50-percent-spectator-drawer-and-single-row-navigation.md)** (`Blocked by: 02`)
5. **[05: On-Demand Command Scroll Composer & Situational HUD Cards](./issues/05-on-demand-command-scroll-composer-and-situational-hud-cards.md)** (`Blocked by: 04`)
6. **[06: Prune Dead Scene Painters, Consolidate Client State & Verify Live Visual Proof](./issues/06-prune-dead-scene-painters-and-verify-live-visual-proof.md)** (`Blocked by: 01, 02, 03, 04, 05`)

## Notes

- **Domain**: **Spectator Drawer**, **Character Sheet**, **Guild Master Ledger**, **Category Subtab Deck**, **Quest Gate**, **Command Scroll**, **Project Heraldry**, **World Focus Aura**, **Workshop Room**, **Dungeon Wilds**, **Goal Assembly Site**, **Assembly Commit Ledger**.
- **ADR**: [ADR-0001: Unified Host Workshop Room and Project Heraldry](../../adr/0001-unified-host-workshop-room-and-project-heraldry.md).
- **Architecture Review**: [Architecture & UX Review Report (2026-11-05)](../../architecture-review/architecture-review-20261105-gamemaster-ux-and-world-focus.html).
- **Specification**: [Feature Specification](./spec.md).
- **Skills Consulted**: `improve-codebase-architecture`, `codebase-design`, `grilling`, `domain-modeling`, `wayfinder`.
- **Standing Rules**: Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`. Every source file in `src/` must remain `<= 400` lines. Verify visually with live headless Chrome screenshots in `docs/images/`.

## Decisions so far

- [Specification: 50% Gamemaster Spectator Drawer, Unclipped Hero Chat, On-Demand Command Scroll & World Focus Aura](./spec.md): Settled all 6 breadth-first design decisions (`Q1`–`Q6`) and updated [`GLOSSARY.md`](../../../GLOSSARY.md) with **World Focus Aura**, 50% desktop **Spectator Drawer**, single-row **Category Subtab Deck**, unclipped **Character Sheet** chat, and on-demand **Command Scroll** composer.
- Root-caused the missing `?` overhead **Quest Gate** marker on conversational/grilling questions across `daemon-sse-mapper.ts` (4,000-char slice chopping off questions at the end of long messages), `daemon-location-state.ts` (`idleMessageHydrationCache` ignoring `time.idle` and caching `{}` on timeout), `daemon-message-hydration.ts` & `batch-reconciler.ts` (10-minute cutoff deleting unanswered questions and `handleStreamReconnected` wiping SSE-opened gates), `api-router.ts` (`GET /api/guild/session/:id/messages` discarding `pendingQuestion`), and `station-and-workflow-routing.ts` (`RestingInLounge` branch overriding `questMarker`). Captured in [01: Fix Missing Overhead Question Mark (`?`) on Conversational & Long Questions](./issues/01-fix-missing-overhead-question-mark-on-conversational-and-long-questions.md).

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..06 -->

## Out of scope

- Isolating projects into separate rooms that hide sibling projects' characters (forbidden by [ADR-0001](../../adr/0001-unified-host-workshop-room-and-project-heraldry.md)).
