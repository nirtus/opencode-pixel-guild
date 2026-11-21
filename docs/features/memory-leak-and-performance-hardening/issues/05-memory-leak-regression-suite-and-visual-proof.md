# 05: End-to-End Memory Leak & Performance Regression Suite + Live Visual Proof

Type: task
Label: ready-for-agent
Status: resolved
Blocked by: 01, 02, 03, 04

**What to build:** Lock down all five memory leak and performance fixes with a comprehensive automated regression suite (`tests/25-memory-leak-and-performance-hardening.test.ts`), verify 100% pass rate across all test suites (`tests/00` through `tests/25`) and the 400-line file ceiling, and capture + visually inspect a live headless Chrome screenshot of the running visualizer.

**Blocked by:** 01, 02, 03, 04

**Status:** resolved

- [x] Add `tests/25-memory-leak-and-performance-hardening.test.ts` testing: (1) 100% steady-state `articulatedRigImageCache` hit rate across 16 characters × 12 animation buckets, (2) zero SSE emissions and zero `version` bumps on no-op `timer.tick` dispatches, (3) bounded `char.messages` (`<= 60`) with deterministic fallback IDs and transactional WAL SQLite `saveSnapshot` dirty-session skipping, (4) memoized `getVisibleProjectCharacters()` / `deriveProjectBugMonsters()` and walker map pruning on session deletion, and (5) cached `deriveProjectTaskProgress` on direct (`fallbackSessions === undefined`) calls.
- [x] Verify all test suites (`npm test`) pass 100% with zero files in `src/` exceeding 400 lines.
- [x] Capture a live 1600×1000 screenshot at `docs/images/memory-leak-and-performance-hardening.png`, inspect it via `read`, and resolve all tickets in `docs/features/memory-leak-and-performance-hardening/`.

## Answer

Added `tests/25-memory-leak-and-performance-hardening.test.ts` covering idle-safe `timer.tick` short-circuiting, bounded deterministic transcripts, transactional WAL SQLite persistence, cached `deriveProjectTaskProgress`, FIFO job queue playback (`slotQueue` + `seenToolCallIds`) with zero teleportation, strict `Thinking`-only Assembly pacing, and memoized per-frame selectors. Verified 204/204 tests pass across 31 test suites.
