import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { reconcileCharacterMessages } from "../state/armory-and-workflow.ts";
import { isDeletedHostDirectory, normalizeLocationDirectory } from "../state/location-normalization.ts";
import type { CharacterState, GuildSnapshot, QuestGateState, SessionChatMessage, WorkshopRoomState } from "../types/domain.ts";
import { collectSnapshotTributeRecords, loadOperatorTributeLedger, SESSION_TRIBUTE_LEDGER_SCHEMA_SQL, upsertSnapshotTributeLedgerRows } from "./chronicle-tribute-ledger.ts";
import type { GuildOperatorProfile } from "./operator-store.ts";

export interface GuildChronicleStorePort {
  readonly sqlitePath: string;
  readonly operatorsFilePath: string;
  loadOperators(): GuildOperatorProfile[];
  saveOperators(profiles: Iterable<GuildOperatorProfile>): void;
  saveSnapshot(operatorId: string, snapshot: GuildSnapshot): void;
  loadSnapshot(operatorId: string): Partial<GuildSnapshot> | null;
  upsertSessionMessages(operatorId: string, sessionId: string, messages: ReadonlyArray<SessionChatMessage>): void;
  getSessionMessages(operatorId: string, sessionId: string): SessionChatMessage[];
  deleteSessionMessages(operatorId: string, sessionId: string): void;
  deleteOperatorData(operatorId: string): void;
  close(): void;
}

export interface CreateGuildChronicleStoreOptions {
  readonly dataDirPath?: string;
  readonly sqlitePath?: string;
  readonly operatorsFilePath?: string;
}

export function createGuildChronicleStore(options: CreateGuildChronicleStoreOptions = {}): GuildChronicleStorePort {
  const hasDiskDirectory = Boolean(options.dataDirPath || options.operatorsFilePath || (options.sqlitePath && options.sqlitePath !== ":memory:"));
  const defaultDataDir = options.dataDirPath
    ? resolve(options.dataDirPath)
    : options.operatorsFilePath
      ? dirname(resolve(options.operatorsFilePath))
      : options.sqlitePath && options.sqlitePath !== ":memory:"
        ? dirname(resolve(options.sqlitePath))
        : "";
  const isMemory = !hasDiskDirectory || options.sqlitePath === ":memory:";
  if (!isMemory && defaultDataDir) {
    try { mkdirSync(defaultDataDir, { recursive: true }); } catch { /* ignore */ }
  }
  const operatorsFilePath = options.operatorsFilePath ? resolve(options.operatorsFilePath) : isMemory ? "" : join(defaultDataDir, "guild-operators.json");
  const sqlitePath = isMemory ? ":memory:" : options.sqlitePath ? resolve(options.sqlitePath) : join(defaultDataDir, "guild-chronicle.sqlite");

  const initSchemaSql = `
    PRAGMA synchronous = NORMAL;
    CREATE TABLE IF NOT EXISTS operators (
      operator_id TEXT PRIMARY KEY, profile_json TEXT NOT NULL, updated_at_ms INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS world_snapshots (
      operator_id TEXT PRIMARY KEY, rooms_json TEXT NOT NULL, room_order_json TEXT NOT NULL,
      characters_json TEXT NOT NULL, quest_gates_json TEXT NOT NULL,
      deleted_sessions_json TEXT NOT NULL DEFAULT '[]', deleted_rooms_json TEXT NOT NULL DEFAULT '[]', updated_at_ms INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS session_messages (
      operator_id TEXT NOT NULL, session_id TEXT NOT NULL, message_id TEXT NOT NULL,
      role TEXT NOT NULL, text TEXT NOT NULL, attached_skills_json TEXT NOT NULL DEFAULT '[]',
      created_at_ms INTEGER NOT NULL, updated_at_ms INTEGER NOT NULL,
      PRIMARY KEY (operator_id, session_id, message_id)
    );
    CREATE INDEX IF NOT EXISTS idx_session_messages_lookup ON session_messages (operator_id, session_id, created_at_ms ASC);
    ${SESSION_TRIBUTE_LEDGER_SCHEMA_SQL}
  `;
  let db: DatabaseSync;
  try {
    db = new DatabaseSync(sqlitePath);
    db.exec("PRAGMA busy_timeout = 5000;");
    try { db.exec(isMemory ? "PRAGMA journal_mode = MEMORY;" : "PRAGMA journal_mode = WAL;"); } catch { db.exec("PRAGMA journal_mode = DELETE;"); }
    db.exec(initSchemaSql);
  } catch {
    try { db!?.close(); } catch { /* ignore */ }
    db = new DatabaseSync(sqlitePath);
    db.exec("PRAGMA busy_timeout = 5000;");
    try { db.exec(isMemory ? "PRAGMA journal_mode = MEMORY;" : "PRAGMA journal_mode = WAL;"); } catch { db.exec("PRAGMA journal_mode = DELETE;"); }
    db.exec(initSchemaSql);
  }
  try { db.exec("ALTER TABLE world_snapshots ADD COLUMN deleted_sessions_json TEXT NOT NULL DEFAULT '[]'"); } catch { /* column exists */ }
  try { db.exec("ALTER TABLE world_snapshots ADD COLUMN deleted_rooms_json TEXT NOT NULL DEFAULT '[]'"); } catch { /* column exists */ }

  let closed = false;
  const lastSnapshotSigByOp = new Map<string, string>();
  const lastSessionMsgSig = new Map<string, string>();

  function loadOperators(): GuildOperatorProfile[] {
    const mergedById = new Map<string, GuildOperatorProfile>();
    if (operatorsFilePath && existsSync(operatorsFilePath)) {
      try {
        const raw = JSON.parse(readFileSync(operatorsFilePath, "utf8"));
        if (Array.isArray(raw)) {
          for (const p of raw as GuildOperatorProfile[]) {
            if (p?.operatorId) mergedById.set(p.operatorId, p);
          }
        }
      } catch { /* fall through to SQLite */ }
    }
    if (!closed) {
      try {
        const rows = db.prepare("SELECT profile_json FROM operators ORDER BY updated_at_ms ASC").all() as Array<{ profile_json: string }>;
        for (const r of rows) {
          try {
            const p = JSON.parse(r.profile_json) as GuildOperatorProfile;
            if (!p?.operatorId) continue;
            const prev = mergedById.get(p.operatorId);
            if (!prev || (p.updatedAtMs ?? 0) >= (prev.updatedAtMs ?? 0)) mergedById.set(p.operatorId, p);
          } catch { /* ignore invalid row */ }
        }
      } catch { /* ignore query error */ }
    }
    return [...mergedById.values()];
  }

  function saveOperators(profiles: Iterable<GuildOperatorProfile>): void {
    const list = [...profiles];
    if (operatorsFilePath) {
      try {
        mkdirSync(dirname(operatorsFilePath), { recursive: true });
        writeFileSync(operatorsFilePath, JSON.stringify(list, null, 2), "utf8");
      } catch { /* ignore file write error */ }
    }
    if (closed) return;
    try {
      db.exec("BEGIN IMMEDIATE");
      db.prepare("DELETE FROM operators").run();
      const ins = db.prepare("INSERT OR REPLACE INTO operators (operator_id, profile_json, updated_at_ms) VALUES (?, ?, ?)");
      for (const p of list) ins.run(p.operatorId, JSON.stringify(p), p.updatedAtMs || Date.now());
      db.exec("COMMIT");
    } catch {
      try { db.exec("ROLLBACK"); } catch { /* ignore */ }
    }
  }

  const upsertMsgStmt = db.prepare(`
    INSERT INTO session_messages (
      operator_id, session_id, message_id, role, text, attached_skills_json, created_at_ms, updated_at_ms
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(operator_id, session_id, message_id) DO UPDATE SET
      text = CASE
        WHEN length(excluded.text) >= length(session_messages.text) THEN excluded.text
        ELSE session_messages.text
      END,
      attached_skills_json = excluded.attached_skills_json,
      updated_at_ms = excluded.updated_at_ms
  `);

  function runUpsertMessagesRows(
    operatorId: string,
    sessionId: string,
    messages: ReadonlyArray<SessionChatMessage>,
  ): void {
    const recentSlice = messages.length > 60 ? messages.slice(-60) : messages;
    for (const m of recentSlice) {
      if (!m.text || !m.text.trim()) continue;
      upsertMsgStmt.run(
        operatorId,
        sessionId,
        m.messageId,
        m.role,
        m.text,
        JSON.stringify(m.attachedSkills ?? []),
        m.createdAtMs || Date.now(),
        m.updatedAtMs ?? m.createdAtMs ?? Date.now(),
      );
    }
  }

  function upsertSessionMessages(
    operatorId: string,
    sessionId: string,
    messages: ReadonlyArray<SessionChatMessage>,
  ): void {
    if (closed || !operatorId || !sessionId || messages.length === 0) return;
    try {
      db.exec("BEGIN IMMEDIATE");
      runUpsertMessagesRows(operatorId, sessionId, messages);
      db.exec("COMMIT");
    } catch {
      try { db.exec("ROLLBACK"); } catch { /* ignore */ }
    }
  }

  function getSessionMessages(operatorId: string, sessionId: string): SessionChatMessage[] {
    if (closed || !operatorId || !sessionId) return [];
    try {
      const rows = db
        .prepare(
          `SELECT message_id, role, text, attached_skills_json, created_at_ms, updated_at_ms
           FROM session_messages
           WHERE operator_id = ? AND session_id = ?
           ORDER BY created_at_ms ASC`,
        )
        .all(operatorId, sessionId) as Array<{
        message_id: string;
        role: string;
        text: string;
        attached_skills_json: string;
        created_at_ms: number;
        updated_at_ms: number;
      }>;
      return rows.map((r) => {
        let attachedSkills: string[] = [];
        try { attachedSkills = JSON.parse(r.attached_skills_json || "[]"); } catch { attachedSkills = []; }
        return {
          messageId: r.message_id,
          role: r.role === "user" ? "user" : "assistant",
          text: r.text,
          attachedSkills,
          createdAtMs: r.created_at_ms,
          updatedAtMs: r.updated_at_ms,
        };
      });
    } catch {
      return [];
    }
  }

  function saveSnapshot(operatorId: string, snapshot: GuildSnapshot): void {
    if (closed || !operatorId) return;
    try {
      const roomsJson = JSON.stringify(snapshot.rooms || {});
      const roomOrderJson = JSON.stringify(snapshot.roomOrder || []);
      const charactersJson = JSON.stringify(snapshot.characters || {});
      const questGatesJson = JSON.stringify(snapshot.questGates || {});
      const deletedSessionsJson = JSON.stringify(snapshot.deletedSessionIds || []);
      const deletedRoomsJson = JSON.stringify(snapshot.deletedRoomIds || []);
      const tributeRecords = collectSnapshotTributeRecords(snapshot);
      const tributeJson = JSON.stringify(tributeRecords);
      const snapSig = `${roomsJson}|${roomOrderJson}|${charactersJson}|${questGatesJson}|${deletedSessionsJson}|${deletedRoomsJson}|${tributeJson}`;
      if (lastSnapshotSigByOp.get(operatorId) === snapSig) return;

      db.exec("BEGIN IMMEDIATE");
      upsertSnapshotTributeLedgerRows(db, operatorId, snapshot);
      for (const ch of Object.values(snapshot.characters || {})) {
        const synthesized: SessionChatMessage[] = [...(ch.messages ?? [])];
        if (ch.lastUserPromptText?.trim() && !synthesized.some((m) => m.role === "user")) {
          synthesized.push({
            messageId: `user:${ch.sessionId}`,
            role: "user",
            text: ch.lastUserPromptText,
            createdAtMs: (ch.lastActivityAtMs || snapshot.timestampMs || Date.now()) - 1,
          });
        }
        if (ch.lastAssistantText?.trim() && !synthesized.some((m) => m.role === "assistant")) {
          synthesized.push({
            messageId: `asst:${ch.sessionId}`,
            role: "assistant",
            text: ch.lastAssistantText,
            createdAtMs: ch.lastActivityAtMs || snapshot.timestampMs || Date.now(),
          });
        }
        if (synthesized.length > 0) {
          const lastMsg = synthesized[synthesized.length - 1];
          const msgSig = `${synthesized.length}:${lastMsg?.messageId ?? ""}:${lastMsg?.text?.length ?? 0}`;
          const sigKey = `${operatorId}::${ch.sessionId}`;
          if (lastSessionMsgSig.get(sigKey) !== msgSig) {
            runUpsertMessagesRows(operatorId, ch.sessionId, synthesized);
            lastSessionMsgSig.set(sigKey, msgSig);
          }
        }
      }

      const activeIds = Object.keys(snapshot.characters || {});
      if (activeIds.length > 0) {
        const placeholders = activeIds.map(() => "?").join(", ");
        db.prepare(
          `DELETE FROM session_messages WHERE operator_id = ? AND session_id NOT IN (${placeholders})`,
        ).run(operatorId, ...activeIds);
      } else if (Array.isArray(snapshot.roomOrder)) {
        db.prepare("DELETE FROM session_messages WHERE operator_id = ?").run(operatorId);
      }

      db.prepare(`
        INSERT OR REPLACE INTO world_snapshots (
          operator_id, rooms_json, room_order_json, characters_json, quest_gates_json, deleted_sessions_json, deleted_rooms_json, updated_at_ms
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(operatorId, roomsJson, roomOrderJson, charactersJson, questGatesJson, deletedSessionsJson, deletedRoomsJson, snapshot.timestampMs || Date.now());
      db.exec("COMMIT");
      lastSnapshotSigByOp.set(operatorId, snapSig);
    } catch {
      try { db.exec("ROLLBACK"); } catch { /* ignore */ }
    }
  }

  function loadSnapshot(operatorId: string): Partial<GuildSnapshot> | null {
    if (closed || !operatorId) return null;
    try {
      const row = db
        .prepare("SELECT rooms_json, room_order_json, characters_json, quest_gates_json, deleted_sessions_json, deleted_rooms_json, updated_at_ms FROM world_snapshots WHERE operator_id = ?")
        .get(operatorId) as { rooms_json: string; room_order_json: string; characters_json: string; quest_gates_json: string; deleted_sessions_json?: string; deleted_rooms_json?: string; updated_at_ms: number } | undefined;
      if (!row) {
        const tributeOnly = loadOperatorTributeLedger(db, operatorId);
        return Object.keys(tributeOnly).length > 0 ? { tributeLedger: tributeOnly } : null;
      }
      const rooms = JSON.parse(row.rooms_json || "{}") as Record<string, WorkshopRoomState>;
      let roomOrder = JSON.parse(row.room_order_json || "[]") as string[];
      const characters = JSON.parse(row.characters_json || "{}") as Record<string, CharacterState>;
      const questGates = JSON.parse(row.quest_gates_json || "{}") as Record<string, QuestGateState>;
      const deletedSessionIds = JSON.parse(row.deleted_sessions_json || "[]") as string[];
      const deletedRoomIds = JSON.parse(row.deleted_rooms_json || "[]") as string[];
      const deletedRoomSet = new Set(deletedRoomIds);
      const tributeLedger = loadOperatorTributeLedger(db, operatorId, characters, rooms);

      for (const room of Object.values(rooms)) {
        if (room?.locationDirectory) normalizeLocationDirectory(room.locationDirectory);
      }
      for (const [roomId, room] of Object.entries(rooms)) {
        if (deletedRoomSet.has(roomId) || isDeletedHostDirectory(room?.locationDirectory || roomId)) delete rooms[roomId];
      }
      roomOrder = roomOrder.filter((id) => Boolean(rooms[id]) && !deletedRoomSet.has(id) && !isDeletedHostDirectory(id));
      for (const [charId, ch] of Object.entries(characters)) {
        if (!rooms[ch.roomId] || isDeletedHostDirectory(ch.locationDirectory || ch.roomId)) delete characters[charId];
      }
      for (const [gateId, gate] of Object.entries(questGates)) {
        if (!rooms[gate.roomId] || !characters[gate.sessionId]) delete questGates[gateId];
      }

      for (const ch of Object.values(characters)) {
        const storedMsgs = getSessionMessages(operatorId, ch.sessionId);
        if (storedMsgs.length > 0) {
          ch.messages = [];
          reconcileCharacterMessages(ch, storedMsgs);
          const cleanMsgs = ch.messages ?? storedMsgs;
          if (cleanMsgs.length !== storedMsgs.length) {
            db.prepare("DELETE FROM session_messages WHERE operator_id = ? AND session_id = ?").run(operatorId, ch.sessionId);
            runUpsertMessagesRows(operatorId, ch.sessionId, cleanMsgs);
          }
          const lastAsst = [...cleanMsgs].reverse().find((m) => m.role === "assistant");
          if (cleanMsgs[cleanMsgs.length - 1]?.role === "user") ch.lastAssistantText = null;
          else if (lastAsst && !ch.lastAssistantText) ch.lastAssistantText = lastAsst.text;
        }
      }
      return {
        timestampMs: row.updated_at_ms, rooms, roomOrder, characters, questGates,
        ...(Object.keys(tributeLedger).length > 0 ? { tributeLedger } : {}),
        ...(deletedSessionIds.length > 0 ? { deletedSessionIds } : {}),
        ...(deletedRoomIds.length > 0 ? { deletedRoomIds } : {}),
      };
    } catch { return null; }
  }

  function deleteSessionMessages(operatorId: string, sessionId: string): void {
    if (closed || !operatorId || !sessionId) return;
    lastSessionMsgSig.delete(`${operatorId}::${sessionId}`);
    try { db.prepare("DELETE FROM session_messages WHERE operator_id = ? AND session_id = ?").run(operatorId, sessionId); } catch { /* ignore */ }
  }

  function deleteOperatorData(operatorId: string): void {
    if (closed || !operatorId) return;
    lastSnapshotSigByOp.delete(operatorId);
    for (const k of lastSessionMsgSig.keys()) {
      if (k.startsWith(`${operatorId}::`)) lastSessionMsgSig.delete(k);
    }
    try {
      db.prepare("DELETE FROM operators WHERE operator_id = ?").run(operatorId);
      db.prepare("DELETE FROM world_snapshots WHERE operator_id = ?").run(operatorId);
      db.prepare("DELETE FROM session_messages WHERE operator_id = ?").run(operatorId);
      db.prepare("DELETE FROM session_tribute_ledger WHERE operator_id = ?").run(operatorId);
    } catch { /* ignore */ }
  }

  function close(): void {
    if (closed) return;
    closed = true;
    try { db.close(); } catch { /* ignore */ }
  }

  return {
    sqlitePath, operatorsFilePath, loadOperators, saveOperators, saveSnapshot,
    loadSnapshot, upsertSessionMessages, getSessionMessages, deleteSessionMessages, deleteOperatorData, close,
  };
}
