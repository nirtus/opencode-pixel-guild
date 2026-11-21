# 04: Viewport-Level Mobile Bottom-Sheet Modals (`#summon-adventurer-modal` & `#demolition-modal`)

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

Should we promote `#summon-adventurer-modal` and `#demolition-modal` out of `.canvas-container` to top-level `position: fixed; inset: 0; z-index: 100` mobile bottom-sheet dialogs with `grid-template-columns: minmax(0, 1fr)` containment, truncated project names in `#summon-directory-select` (eliminating the ~650px horizontal blowout), visible `<label>` headers, a `2×2` `44px`-tall agent role selector grid, a coarse-pointer focus guard (no immediate keyboard pop-up on modal open), and backdrop/Escape dismissal?

## Answer

Locked:
- Promote `#summon-adventurer-modal` and `#demolition-modal` out of `.canvas-container` to top-level children of `<body>` in `src/web/app.html` (`position: fixed; inset: 0; z-index: 100`).
- Style `.modal-dialog` with `grid-template-columns: minmax(0, 1fr)`, `max-width: min(460px, calc(100vw - 24px))`, `max-height: 90dvh`, `overflow-y: auto`, and visible `<label>` headers.
- Format `#summon-directory-select` options with concise project labels (`🏰 ${r.projectName}`) and `width: 100%; max-width: 100%; min-width: 0; text-overflow: ellipsis;` so long paths never overflow horizontally.
- Guard `promptEl?.focus()` in `openSummonAdventurerModal()` with `window.matchMedia("(pointer: fine)").matches` and bind backdrop click + `Escape` key to `closeSummonAdventurerModal()`.
