# 02: Deepen `GuildChronicleStore` Storage Seam & Delete Legacy Root Store Migration

Type: grilling
Label: wayfinder:grilling
Status: resolved
Blocked by: 01

## Question

How should `GuildChronicleStore` (`src/server/chronicle-sqlite-store.ts`) and `OperatorWorkspaceRegistry` (`src/server/operator-registry.ts`) structure their persistence seam so unit tests default to in-memory storage, disk persistence tests stay confined to `tests/.tmp/`, and host credentials in root `.opencode-guild-operators.json` can never contaminate test stores?

## Answer

Confirmed in Grilling Round 1 (`Q4`):
- Deepen `GuildChronicleStore` behind two explicit storage modes:
  1. **In-memory adapter (`:memory:`)**: Default when no `dataDirPath` or `operatorStorePath` is passed, creating zero disk directories or SQLite files during in-memory unit tests.
  2. **Confined directory adapter**: Uses `./data/` in production (`src/server/main.ts`) or `sandbox.dirPath` (`tests/.tmp/...`) in persistence tests.
- Remove `legacyOperatorStorePath` from `CreateGuildCompanionServerOptions`, `CreateOperatorRegistryOptions`, and `CreateGuildChronicleStoreOptions`, and delete the root `.opencode-guild-operators.json` auto-migration block from `src/server/chronicle-sqlite-store.ts` and `src/server/main.ts`.

## Acceptance Criteria

- [x] `src/server/chronicle-sqlite-store.ts`, `src/server/operator-registry.ts`, and `src/server/main.ts` no longer reference or auto-migrate `.opencode-guild-operators.json`.
- [x] `createGuildCompanionServer` uses in-memory storage when no directory/store path is configured and confines disk storage to `./data/` in production or `tests/.tmp/` in persistence tests.
