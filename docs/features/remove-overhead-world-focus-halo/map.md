# Wayfinder Map: Show Underfoot World Focus Circle Only on Selected Project Characters

Label: wayfinder:map

## Destination

Ensure the underfoot ground circle (`y = 16`) in `src/web/canvas-hero-painter.ts` is rendered **only** on characters belonging to a selected project (`worldFocus.isFocusedMember === true`), with no overhead halo circle above the head and no underfoot circle when `All` worlds is active or on characters of unselected projects (`docs/features/remove-overhead-world-focus-halo/spec.md`).

## Notes

- **Domain**: **World Focus Aura**, **Project Heraldry**, **Guild Adventurer**, **Squad Subagent**, **Workshop Room** (`GLOSSARY.md`).
- **Specification**: [Specification: Show Underfoot World Focus Circle Only on Selected Project Characters](./spec.md).
- **Implementation Ticket**: [01: Show Underfoot World Focus Circle Only on Selected Project Characters](./issues/01-remove-overhead-world-focus-halo.md).
- **Container Verification Rule**: Deploy and verify on the `opencode-pixel-guild-visualizer` Docker container (`npm run docker:up` on port `4310`) and capture visual proof in `docs/images/remove-overhead-world-focus-halo.png`.

## Decisions so far

- [Specification: Show Underfoot World Focus Circle Only on Selected Project Characters](./spec.md): Updated **Project Heraldry** and **World Focus Aura** in `GLOSSARY.md` so the underfoot circle is exclusively the **World Focus Aura** for a selected project (`worldFocus.isFocusedMember === true`), never drawn when `All` worlds is active or on unselected projects, and with no overhead halo circle above the head.
- [01: Show Underfoot World Focus Circle Only on Selected Project Characters](./issues/01-remove-overhead-world-focus-halo.md): Wrapped the entire underfoot circle block (`y = 16`, `ry = 7` and `ry = 9`) inside `if (worldFocus.isFocusedMember)` in `src/web/canvas-hero-painter.ts`, synchronized `targetState.isAllWorldsFocused = true` when `selectedProjectId` is `null` in `src/web/world-persistence.ts`, updated tests (`224/224` passing), and verified on the live Docker container (`docs/images/remove-overhead-world-focus-halo.png`).

## Not yet specified

*(None — all tickets resolved and verified on the live container.)*

## Out of scope

- Changing the two-segment `[CREST SHORT-TAG] Title` underfoot nameplate or `45%` opacity dimming of non-focused project characters.
