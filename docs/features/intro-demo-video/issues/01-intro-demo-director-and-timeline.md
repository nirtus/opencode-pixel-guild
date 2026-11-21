# Ticket 01: Client-Side `?demo=intro-tour` Showcase Director & 4-Scene Timeline

Type: `task`
Label: `ready-for-agent`
Status: `resolved`
Blocked by: none

## Question / Deliverable

Build the modular client-side `?demo=intro-tour` **Intro Demo Director** (`src/web/intro-demo-timeline.ts` and `src/web/intro-demo-director.ts`) and wire it into `src/web/app-main.ts` so opening `/?demo=intro-tour` runs the deterministic 35-second 4-scene sizzle reel in full-bleed canvas mode (`isGamemasterCollapsed: true`) with synchronized RPG chapter cards and OpenCode-to-Pixel-Guild callout banners, without mutating `./data/`.

## Answer

Implemented `src/web/intro-demo-timeline.ts` and `src/web/intro-demo-director.ts` and wired them into `src/web/app-main.ts`:
- `isIntroDemoModeActive` activates on `?demo=intro-tour`, `?demo=1`, or `?demo=sizzle`, collapsing the right-hand `Spectator Drawer` for full-bleed 2D canvas rendering without touching server-side `./data/`.
- `buildIntroDemoFrameState` steps deterministically across all 4 scenes (`0..35,000ms`), and `paintIntroDemoOverlay` renders the unified lower-third RPG chapter & OpenCode-to-Pixel-Guild callout banner.
