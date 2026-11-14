import type { DatabaseSync } from "node:sqlite";
import { mergeSessionTributeRecord, syncCharacterTributeRecord } from "../state/context-mana.ts";
import { normalizeLocationDirectory } from "../state/location-normalization.ts";
import type {
  CharacterState,
  GuildSnapshot,
  SessionTributeRecord,
  WorkshopRoomState,
} from "../types/domain.ts";

export const SESSION_TRIBUTE_LEDGER_SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS session_tribute_ledger (
    operator_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    room_id TEXT NOT NULL,
    location_directory TEXT NOT NULL,
    project_id TEXT NOT NULL,
    total_tokens INTEGER NOT NULL DEFAULT 0,
    input_tokens INTEGER NOT NULL DEFAULT 0,
    output_tokens INTEGER NOT NULL DEFAULT 0,
    cache_read_tokens INTEGER NOT NULL DEFAULT 0,
    cache_write_tokens INTEGER NOT NULL DEFAULT 0,
    total_cost_usd REAL NOT NULL DEFAULT 0,
    updated_at_ms INTEGER NOT NULL,
    PRIMARY KEY (operator_id, session_id)
  );
  CREATE INDEX IF NOT EXISTS idx_session_tribute_operator
    ON session_tribute_ledger (operator_id);
`;

const UPSERT_TRIBUTE_SQL = `
  INSERT INTO session_tribute_ledger (
    operator_id, session_id, room_id, location_directory, project_id,
    total_tokens, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
    total_cost_usd, updated_at_ms
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(operator_id, session_id) DO UPDATE SET
    room_id = CASE
      WHEN excluded.room_id != '' THEN excluded.room_id
      ELSE session_tribute_ledger.room_id
    END,
    location_directory = CASE
      WHEN excluded.location_directory != '' THEN excluded.location_directory
      ELSE session_tribute_ledger.location_directory
    END,
    project_id = CASE
      WHEN excluded.project_id != '' THEN excluded.project_id
      ELSE session_tribute_ledger.project_id
    END,
    total_tokens = MAX(session_tribute_ledger.total_tokens, excluded.total_tokens),
    input_tokens = MAX(session_tribute_ledger.input_tokens, excluded.input_tokens),
    output_tokens = MAX(session_tribute_ledger.output_tokens, excluded.output_tokens),
    cache_read_tokens = MAX(session_tribute_ledger.cache_read_tokens, excluded.cache_read_tokens),
    cache_write_tokens = MAX(session_tribute_ledger.cache_write_tokens, excluded.cache_write_tokens),
    total_cost_usd = MAX(session_tribute_ledger.total_cost_usd, excluded.total_cost_usd),
    updated_at_ms = MAX(session_tribute_ledger.updated_at_ms, excluded.updated_at_ms)
`;

export function collectSnapshotTributeRecords(
  snapshot: Partial<GuildSnapshot>,
): Record<string, SessionTributeRecord> {
  const merged: Record<string, SessionTributeRecord> = {};
  if (snapshot.tributeLedger && typeof snapshot.tributeLedger === "object") {
    for (const rec of Object.values(snapshot.tributeLedger)) {
      if (rec?.sessionId) {
        mergeSessionTributeRecord(merged, {
          ...rec,
          roomId: rec.roomId ? normalizeLocationDirectory(rec.roomId) : "",
          locationDirectory: rec.locationDirectory
            ? normalizeLocationDirectory(rec.locationDirectory)
            : "",
        });
      }
    }
  }
  if (snapshot.characters && typeof snapshot.characters === "object") {
    for (const ch of Object.values(snapshot.characters)) {
      if (ch?.sessionId) {
        syncCharacterTributeRecord(merged, ch, snapshot.rooms);
      }
    }
  }
  return merged;
}

export function upsertSnapshotTributeLedgerRows(
  db: DatabaseSync,
  operatorId: string,
  snapshot: Partial<GuildSnapshot>,
): Record<string, SessionTributeRecord> {
  const merged = collectSnapshotTributeRecords(snapshot);
  const records = Object.values(merged);
  if (records.length === 0) return merged;
  const stmt = db.prepare(UPSERT_TRIBUTE_SQL);
  const now = snapshot.timestampMs || Date.now();
  for (const r of records) {
    stmt.run(
      operatorId,
      r.sessionId,
      r.roomId || "",
      r.locationDirectory || "",
      r.projectId || r.locationDirectory || r.roomId || "",
      Math.max(0, Math.round(r.totalTokens || 0)),
      Math.max(0, Math.round(r.inputTokens || 0)),
      Math.max(0, Math.round(r.outputTokens || 0)),
      Math.max(0, Math.round(r.cacheReadTokens || 0)),
      Math.max(0, Math.round(r.cacheWriteTokens || 0)),
      Math.max(0, Number(r.totalCostUsd || 0)),
      r.updatedAtMs || now,
    );
  }
  return merged;
}

export function loadOperatorTributeLedger(
  db: DatabaseSync,
  operatorId: string,
  fallbackCharacters?: Record<string, CharacterState>,
  fallbackRooms?: Record<string, WorkshopRoomState>,
): Record<string, SessionTributeRecord> {
  const ledger: Record<string, SessionTributeRecord> = {};
  try {
    const rows = db
      .prepare(
        `SELECT session_id, room_id, location_directory, project_id,
                total_tokens, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens,
                total_cost_usd, updated_at_ms
         FROM session_tribute_ledger
         WHERE operator_id = ?`,
      )
      .all(operatorId) as Array<{
      session_id: string;
      room_id: string;
      location_directory: string;
      project_id: string;
      total_tokens: number;
      input_tokens: number;
      output_tokens: number;
      cache_read_tokens: number;
      cache_write_tokens: number;
      total_cost_usd: number;
      updated_at_ms: number;
    }>;
    for (const row of rows) {
      if (!row?.session_id) continue;
      const roomId = row.room_id ? normalizeLocationDirectory(row.room_id) : "";
      const locationDirectory = row.location_directory
        ? normalizeLocationDirectory(row.location_directory)
        : roomId;
      mergeSessionTributeRecord(ledger, {
        sessionId: row.session_id,
        roomId,
        locationDirectory,
        projectId: row.project_id || locationDirectory || roomId,
        totalTokens: Number(row.total_tokens || 0),
        inputTokens: Number(row.input_tokens || 0),
        outputTokens: Number(row.output_tokens || 0),
        cacheReadTokens: Number(row.cache_read_tokens || 0),
        cacheWriteTokens: Number(row.cache_write_tokens || 0),
        totalCostUsd: Number(row.total_cost_usd || 0),
        updatedAtMs: Number(row.updated_at_ms || 0),
      });
    }
  } catch {
    // ignore query error
  }
  if (fallbackCharacters && typeof fallbackCharacters === "object") {
    for (const ch of Object.values(fallbackCharacters)) {
      if (ch?.sessionId) {
        syncCharacterTributeRecord(ledger, ch, fallbackRooms);
      }
    }
  }
  return ledger;
}
