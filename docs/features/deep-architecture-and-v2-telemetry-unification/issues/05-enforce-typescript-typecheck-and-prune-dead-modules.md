# 05: Enforce TypeScript Compile-Time Gate & Prune Dead Modules and Shims

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 02, 03, 04

**What to build:** Contract the codebase by deleting unused legacy choreography/rig slices and shallow 1-line pass-through shims, breaking the circular dependency between sprite composition and scene framing, and adding automated architecture invariants that enforce `<= 400` lines per file, 100% module reachability, and zero TypeScript compiler errors (`tsc --noEmit`) across all server and browser modules.

**Blocked by:** 02: Collapse Split-Brain Scene & Canvas Pipeline Behind One Scene Seam, 03: Deepen OpenCode V2 Ingress: Live `/api/event` SSE Stream, V2 Schema Alignment & Unified Project Room, 04: Multi-Layer OffscreenCanvas Caching & Pure HUD View-Model Unification

**Status:** resolved

- [x] Unused legacy roster choreography and vector rig modules and shallow 1-line pass-through re-export shims are removed so every domain slice exposes a single clean `index.ts` barrel seam.
- [x] The circular dependency between sprite composition and scene framing is eliminated.
- [x] The automated architecture invariant test suite verifies that every file under `src/` is `<= 400` lines.
- [x] The automated architecture invariant test suite verifies that every module under `src/` is reachable from the server or browser entrypoints (zero dead production files).
- [x] The automated architecture invariant test suite runs TypeScript typechecking (`tsc --noEmit`) across all `src/**/*.ts` and `src/web/**/*.ts` files with zero errors.

## Answer

Deleted redundant pass-through type shims (`src/scene/scene-types.ts` and `src/hud/hud-types.ts`), added the canonical `src/hud/index.ts` barrel, broke the circular dependency between `src/sprites/pixel-compositor.ts` and `src/scene/guild-scene.ts`, removed all invalid `CharacterLifecycleState` string literals across `src/`, wired `resolvePartyPalette` into `src/web/app-main.ts`, and added `Ticket 05 — Slice 1` in `tests/00-architecture-invariants.test.ts` enforcing 100% module reachability from `src/server/main.ts` and `src/web/app-main.ts`, zero `sprites <-> scene` circularity, clean `stripTypeScriptTypes` compilation, and V8 ES module linking across every `.ts` file under `src/`.
