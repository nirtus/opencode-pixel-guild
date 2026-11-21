# Ticket 02: Dockerized 1080p MP4 + GIF Capture Pipeline, YouTube Guide & README Integration

Type: `task`
Label: `ready-for-agent`
Status: `resolved`
Blocked by: 01

## Question / Deliverable

Create the reproducible Dockerized Headless Chromium + FFmpeg capture workflow (`npm run demo:video`), render `docs/video/opencode-pixel-guild-intro.mp4` (`1920×1080` @ 30 FPS) and `docs/images/opencode-pixel-guild-intro-preview.gif`, write `docs/video/youtube-publish-guide.md`, embed the demo video and preview at the top of `README.md`, update `GLOSSARY.md`, and verify on the live `opencode-pixel-guild-visualizer` container.

## Answer

Created `docs/video/record-intro-demo.ts` (`npm run demo:video`) and rendered:
- `docs/video/opencode-pixel-guild-intro.mp4` (`1920×1080`, `30 FPS`, `H.264 yuv420p`, `35.0s`),
- `docs/images/opencode-pixel-guild-intro-preview.gif` (`920×518` animated loop embedded at the top of `README.md`),
- `docs/video/youtube-publish-guide.md` (ready-to-paste YouTube title, description, tags, and chapter timestamps), and
- `docs/images/intro-demo-video.png` (visual verification screenshot inspected via `read`).
