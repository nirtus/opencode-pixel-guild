# Wayfinder Map: Introduction Demo Video (`intro-demo-video`)

Label: `wayfinder:map`

## Destination

Deliver a deterministic **35-second 4-scene introduction sizzle reel** (`1920×1080` @ `30 FPS`) for YouTube and GitHub `README.md`, driven by an isolated in-memory client-side `?demo=intro-tour` **Intro Demo Director** (full-bleed 2D floorplan with `Spectator Drawer` collapsed and synchronized RPG chapter/callout banners) and rendered reproducibly via a Dockerized Headless Chromium + FFmpeg capture pipeline (`npm run demo:video`) into:
1. `docs/video/opencode-pixel-guild-intro.mp4` (1080p H.264 YouTube video),
2. `docs/images/opencode-pixel-guild-intro-preview.gif` (animated hero preview embedded at the top of `README.md`), and
3. `docs/video/youtube-publish-guide.md` (YouTube title, description, tags, and chapter timestamps).

## Notes

- **Domain**: 2D Canvas choreography (`Workshop Room` & `Dungeon Wilds`), client-side showcase director (`?demo=intro-tour`), headless frame-stepped video capture, and documentation (`README.md`, `GLOSSARY.md`).
- **Skills**: `wayfinder`, `grilling`, `domain-modeling`, `tdd`, `verification-before-completion`.
- **Invariants**:
  - Zero server-side mutation of `./data/guild-operators.json` or `./data/guild-chronicle.sqlite`.
  - All files under `src/` must remain strictly `<= 400` lines and 100% reachable from `src/server/main.ts` or `src/web/app-main.ts`.
  - No personal hostnames, usernames, or private paths in any tracked file.

## Decisions so far

- [Ticket 01: Client-Side `?demo=intro-tour` Showcase Director & 4-Scene Timeline](./issues/01-intro-demo-director-and-timeline.md): Built `src/web/intro-demo-timeline.ts` and `src/web/intro-demo-director.ts` to run a deterministic 35-second 4-scene sizzle tour in full-bleed canvas mode (`isGamemasterCollapsed: true`) with synchronized lower-third RPG chapter and OpenCode-to-Pixel-Guild callout banners.
- [Ticket 02: Dockerized 1080p MP4 + GIF Capture Pipeline, YouTube Guide & README Integration](./issues/02-dockerized-video-capture-and-readme-embed.md): Added `docs/video/record-intro-demo.ts` (`npm run demo:video`), rendered `docs/video/opencode-pixel-guild-intro.mp4` (`1920×1080` @ 30 FPS) and `docs/images/opencode-pixel-guild-intro-preview.gif`, authored `docs/video/youtube-publish-guide.md`, and embedded the demo video and preview at the top of `README.md`.

## Not yet specified

*(None — all tickets resolved.)*

## Out of scope

- Stepping through right-hand **Character Sheet** or **Guild Master Ledger** subtabs during the sizzle reel (ruled out in favor of a fast 35-second full-bleed floorplan showcase).
- Embedded TTS voiceover or synthesized background music tracks.
