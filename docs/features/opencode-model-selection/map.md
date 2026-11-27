# Feature Map: Live OpenCode Model & Variant Selection in Command Scroll

Label: wayfinder:map

## Destination

Deliver the complete specification in [Feature Specification: Live OpenCode Model & Variant Selection in Command Scroll](./spec.md) through three vertical-slice tickets so every **Workshop Room** hydrates enabled chat **OpenCode Models** and its location default (`GET /api/model`, `GET /api/model/default`, `GET /api/provider`), and operators can switch a **Guild Adventurer**'s model (and optional `#variant`) exclusively inside the **Command Scroll** composer bar (`POST /api/session/{sessionID}/model`) with immediate **Context Mana** rescaling, error rollback, and **Demo Guild Simulator** parity:

1. **[01: Deep Model Catalog, Reference Module, Per-Room Hydration & Daemon Cache Scoping](./issues/01-deep-model-catalog-and-room-hydration.md)** (`Blocked by: None`)
2. **[02: Unified `model.switch` Command, Delta-Only Pre-Prompt Switching & Simulator Parity](./issues/02-daemon-model-switch-command-and-simulator-parity.md)** (`Blocked by: 01`)
3. **[03: Command Scroll Target Controls (Agent + Provider-Grouped Model + Conditional Variant) & Verification](./issues/03-command-scroll-model-and-variant-controls.md)** (`Blocked by: 01, 02`)

## Notes

- **Domain**: **OpenCode Model**, **OpenCode Agent Mode**, **Command Scroll**, **Character Sheet**, **Guild Adventurer**, **Squad Subagent**, **Workshop Room**, **Context Mana**, **Guild Chronicle Store**, **Demo Guild Simulator**.
- **Specification**: [Feature Specification: Live OpenCode Model & Variant Selection in Command Scroll](./spec.md).
- **ADR**: [ADR-0001: Single Canonical Home for OpenCode Model Selection in Command Scroll](../../adr/0001-single-home-command-scroll-model-selection.md).
- **Architecture Review**: [architecture-review-model-selection.html](../../architecture-review/architecture-review-model-selection.html).
- **Standing Rules**:
  - Work strictly inside the project root directory (`./`). Never create git worktrees or write files to `/tmp` or `/tmp/opencode`.
  - Keep every source file under `src/` `<= 400` lines and `src/web/app.html <= 150` lines (`tests/00-architecture-invariants.test.ts`).
  - Strict single UI home (`ADR-0001`): interactive model/variant switching lives **only** inside **Command Scroll** (no header pill, no editable `Details` row, no Summon modal model picker).
  - Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`), run `npm test`, and visually inspect a live screenshot before marking tickets resolved.

## Decisions so far

- [Architecture Review, Grilling (Option A + Q1–Q11), Glossary & ADR-0001](./spec.md): Settled strict single UI home in **Command Scroll** (`Option A`, recorded in `docs/adr/0001-single-home-command-scroll-model-selection.md`), conditional `#variant` selector (`Q1`), native provider-grouped `<select>` (`Q2`), enabled chat-model filtering + `GET /api/model/default` with removal of hardcoded `"google/gemini-4-argon"` (`Q3`), immediate `model.switch` with error rollback + delta-only `scroll.send` (`Q4`), daemon-scoped catalog cache + SQLite `rooms_json` persistence + **Demo Guild Simulator** parity (`Q5`), two-row **Command Scroll** compose layout (`Q6`), enabled-while-busy switching (`Q7`), fallback preservation for out-of-catalog active models (`Q8`), three deep modules (`src/types/model-catalog.ts`, `src/ingress/daemon-session-switches.ts`, `src/web/command-scroll-target-controls.ts`) (`Q9`), and 3-seam test coverage in `tests/60-opencode-model-selection.test.ts` (`Q10`). Added **OpenCode Model** and updated **Command Scroll** in `GLOSSARY.md`.
- [Tickets 01–03 Resolved, Code-Reviewed & Container-Verified](./issues/03-command-scroll-model-and-variant-controls.md): Shipped `src/types/model-catalog.ts`, `src/ingress/daemon-session-switches.ts`, and `src/web/command-scroll-target-controls.ts`, resolved all Standards and Spec code-review findings (preserving `#variant` in `/api/model/default`, focus-safe conditional `#command-scroll-variant-select` syncing, full 6-preset `Demo Guild Simulator` parity, `44px` mobile `.btn-send-scroll` target, and `44px` `.command-scroll-input` height), updated `README.md`, verified `452/452` tests passing, and captured live container visual proof in `assets/images/opencode-model-selection.png` on port `4310`.

## Not yet specified

<!-- All wayfinder fog has graduated into spec.md and tickets 01..03 -->

## Out of scope

- Adding interactive model switchers to the **Character Sheet** header, `Details` subtab, or `Summon New Guild Adventurer` modal ([ADR-0001](../../adr/0001-single-home-command-scroll-model-selection.md)).
- Switching models on child **Squad Subagents** (`parentID != null`).
- Editing OpenCode's `opencode.json(c)` default model configuration file from the visualizer.
