# 04: Redact OS Home Paths & Remote Tunnel Subdomains at the View-Model Seam

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: None

## Question

How should the scene and HUD view-models (`src/scene/guild-scene-model.ts`, `src/hud/SpectatorHudModel.ts`, `src/web/operator-modal-views.ts`, and `src/web/top-bar-reconciler.ts`) format filesystem paths and remote tunnel URLs so the **Workshop Room** wall banner and **OpenCode Machine Pairing** UI never expose raw OS usernames or full tunnel subdomain tokens on screen?

## Answer

Confirmed in Grilling Round 1 (`Q7`):
- Introduce shared view-model formatting helpers (`formatPublicSafePath` and `formatPublicSafeEndpoint`):
  - `formatPublicSafePath` replaces OS user home prefixes (`/c/Users/<user>/`, `/mnt/c/Users/<user>/`, `/Users/<user>/`, `/home/<user>/`, `C:\Users\<user>\`) with `~/`, so **Workshop Room** wall banners and room tooltips render `~/Documents/Development/opencode-game-visualizer` instead of `/c/Users/<user>/...`.
  - `formatPublicSafeEndpoint` masks middle characters of remote tunnel hostnames (`*.opentunnel.xyz`, `*.lhr.life`, `*.ngrok-free.app`, `*.trycloudflare.com`) as `https://2a1a•••556.opentunnel.xyz` in top-bar status badges and machine cards while preserving the raw `daemonUrl` in internal connection state.

## Acceptance Criteria

- [x] `formatPublicSafePath` redacts `/c/Users/<user>/`, `/mnt/c/Users/<user>/`, `/Users/<user>/`, `/home/<user>/`, and `C:\Users\<user>\` to `~/` on **Workshop Room** banners and HUD labels.
- [x] `formatPublicSafeEndpoint` masks remote tunnel subdomain hashes in HUD display badges while keeping raw URLs intact for daemon HTTP/SSE requests.
- [x] Unit tests verify both path redaction across Windows/WSL/macOS/Linux formats and tunnel URL masking.
