# 04: Deep Server OperatorWorkspaceRegistry Seam & Centralized Pairing Redemption

**What to build:** Deepen the server's `OperatorWorkspaceRegistry` so its interface owns **Guild Operator** registration, login authentication, profile/preference updates, and **OpenCode Machine Pairing** link/QR redemption, activation, and removal—enforcing the single-active-machine invariant and deriving top-level connection status in one place while reducing the HTTP routes module to a thin transport adapter.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] `OperatorWorkspaceRegistry` exposes domain methods for operator registration, login verification, profile/preference updates, machine pairing, machine activation/update, machine removal, and account deletion.
- [x] Pairing link / QR URL redemption (`resolveAndRedeemOpenCodePairing`), single-active-machine enforcement (`isActive`), and derivation of top-level profile connection fields (`paired`, `daemonUrl`, `reachable`, `lastSyncedAtMs`, `errorMessage`) from `pairedMachines` are implemented once inside `OperatorWorkspaceRegistry`.
- [x] The operator HTTP routes module acts strictly as a thin HTTP adapter that parses request bodies, invokes `OperatorWorkspaceRegistry` methods, and serializes responses, with zero direct mutations of the operators map or `pairedMachines` arrays.
- [x] Direct in-process unit tests exercise the `OperatorWorkspaceRegistry` domain seam alongside existing HTTP endpoint tests, with all source files `<= 400` lines.
