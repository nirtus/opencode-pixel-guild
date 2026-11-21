# 05: Spectator Deselection & 0.0.0.0 LAN Server Ingress

**What to build:**
Enable spectators to deselect the active character by clicking empty ground or pressing Escape, revealing the Guild Master Ledger (or entering full-screen cinema mode). Bind the server network listener to `0.0.0.0` by default so users can view the companion visualizer from phones, tablets, and LAN PCs.

**Blocked by:** 04: World Reducer Decomposition & In-Place Compaction Exhalation.

**Status:** resolved

- [x] Update `src/server/main.ts` to listen on `0.0.0.0` by default instead of `127.0.0.1`.
- [x] Display LAN-accessible URLs alongside `localhost` in console startup logs.
- [x] Allow `selectedSessionId` to be set to `null` on canvas background click or Escape key in `src/web/app.html`.
- [x] Implement `buildGuildMasterLedgerViewModel` in `src/hud/spectator-hud.ts` (<200 lines) showing active goal assembly, monster alert levels, and token consumption when deselected.
- [x] Add full-screen cinema canvas mode toggle button.

## Comments
Resolved with 0.0.0.0 default network binding, LAN URL detection, Escape/click deselection, Guild Master Ledger view model, and cinema mode toggle. All 70 automated tests pass green.
