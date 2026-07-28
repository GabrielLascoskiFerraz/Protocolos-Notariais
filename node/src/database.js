import fs from "node:fs";
import path from "node:path";
import { DatabaseSync, backup as sqliteBackup } from "node:sqlite";

const STATUSES = ["PARA_DISTRIBUIR", "EM_ANDAMENTO", "PARA_CORRECAO", "LAVRADOS", "ARQUIVADOS"];
const PROTOCOL_FIELDS = [
  "ficha", "ato", "digitador", "apresentante", "data_apresentacao", "contato",
  "outorgantes", "outorgados", "valor_ato", "status", "observacoes", "urgente",
  "deletado", "tag_custom", "pasta_documentos"
];

function json(value, fallback = {}) {
  try { return JSON.parse(value); } catch { return fallback; }
}

export function openDatabase(filename) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  const inner = new DatabaseSync(filename);
  const db = {
    prepare: (...args) => inner.prepare(...args),
    exec: (...args) => inner.exec(...args),
    close: () => inner.close(),
    pragma(statement, options = {}) {
      const prepared = inner.prepare(`PRAGMA ${statement}`);
      const row = prepared.get();
      return options.simple && row ? Object.values(row)[0] : row;
    },
    transaction(callback) {
      return (...args) => {
        inner.exec("BEGIN IMMEDIATE");
        try { const result = callback(...args); inner.exec("COMMIT"); return result; }
        catch (error) { inner.exec("ROLLBACK"); throw error; }
      };
    },
    backup: (destination) => sqliteBackup(inner, destination),
    verify(filenameToCheck) {
      const check = new DatabaseSync(filenameToCheck, { readOnly: true });
      try { const row = check.prepare("PRAGMA integrity_check").get(); return Object.values(row)[0]; }
      finally { check.close(); }
    }
  };
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  db.exec(`
    CREATE TABLE IF NOT EXISTS protocolos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ficha INTEGER,
      ato TEXT NOT NULL DEFAULT '',
      digitador TEXT,
      apresentante TEXT,
      data_apresentacao TEXT,
      contato TEXT,
      outorgantes TEXT,
      outorgados TEXT,
      valor_ato NUMERIC,
      status TEXT NOT NULL DEFAULT 'PARA_DISTRIBUIR' CHECK(status IN ('PARA_DISTRIBUIR','EM_ANDAMENTO','PARA_CORRECAO','LAVRADOS','ARQUIVADOS')),
      observacoes TEXT,
      urgente INTEGER NOT NULL DEFAULT 0,
      deletado INTEGER NOT NULL DEFAULT 0,
      tag_custom TEXT,
      pasta_documentos TEXT,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
      updated_by TEXT
    );
    CREATE TABLE IF NOT EXISTS protocolos_imoveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocolo_id INTEGER NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
      matricula TEXT,
      area TEXT,
      revision INTEGER NOT NULL DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS protocolos_valores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocolo_id INTEGER NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
      descricao TEXT,
      valor NUMERIC NOT NULL DEFAULT 0,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS protocolos_andamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocolo_id INTEGER NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
      descricao TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS protocolos_tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ato TEXT NOT NULL COLLATE NOCASE UNIQUE,
      cor TEXT NOT NULL DEFAULT '#64748b'
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocolo_id INTEGER,
      revision INTEGER,
      operation_id TEXT UNIQUE,
      user_id TEXT,
      action TEXT NOT NULL,
      before_json TEXT,
      after_json TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
    );
    CREATE INDEX IF NOT EXISTS idx_protocolos_board ON protocolos(deletado, status, urgente DESC, id DESC);
    CREATE INDEX IF NOT EXISTS idx_protocolos_updated ON protocolos(revision, updated_at);
    CREATE INDEX IF NOT EXISTS idx_protocolos_ato ON protocolos(deletado, ato COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_protocolos_digitador ON protocolos(deletado, digitador COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_protocolos_tag ON protocolos(deletado, tag_custom COLLATE NOCASE);
    CREATE INDEX IF NOT EXISTS idx_imoveis_protocol ON protocolos_imoveis(protocolo_id, id);
    CREATE INDEX IF NOT EXISTS idx_valores_protocol ON protocolos_valores(protocolo_id, id);
    CREATE INDEX IF NOT EXISTS idx_andamentos_protocol ON protocolos_andamentos(protocolo_id, created_at DESC, id DESC);
  `);
  return db;
}

export function createRepository(db, publish) {
  const protocolSelect = `
    SELECT p.*, COALESCE((SELECT SUM(v.valor) FROM protocolos_valores v WHERE v.protocolo_id = p.id), 0) AS total_valores,
           t.cor AS tag_cor
      FROM protocolos p
      LEFT JOIN protocolos_tags t ON t.ato = p.ato COLLATE NOCASE`;
  const getProtocol = db.prepare(`${protocolSelect} WHERE p.id = ?`);
  const getActiveProtocol = db.prepare(`${protocolSelect} WHERE p.id = ? AND p.deletado = 0`);

  const audit = db.prepare(`INSERT INTO audit_log
    (protocolo_id, revision, operation_id, user_id, action, before_json, after_json)
    VALUES (@protocolId, @revision, @operationId, @userId, @action, @before, @after)`);

  function fetchProtocol(id, includeDeleted = false) {
    return (includeDeleted ? getProtocol : getActiveProtocol).get(Number(id)) || null;
  }

  function details(id) {
    const protocol = fetchProtocol(id);
    if (!protocol) return null;
    return {
      protocol,
      properties: db.prepare("SELECT * FROM protocolos_imoveis WHERE protocolo_id = ? ORDER BY id").all(id),
      values: db.prepare("SELECT * FROM protocolos_valores WHERE protocolo_id = ? ORDER BY created_at, id").all(id),
      notes: db.prepare("SELECT * FROM protocolos_andamentos WHERE protocolo_id = ? ORDER BY created_at DESC, id DESC").all(id)
    };
  }

  function recordAndPublish({ before, after, operationId, user, action, changedFields = [] }) {
    const auditResult = audit.run({
      protocolId: after?.id ?? before?.id ?? null,
      revision: after?.revision ?? before?.revision ?? null,
      operationId: operationId || null,
      userId: user?.id || null,
      action,
      before: before ? JSON.stringify(before) : null,
      after: after ? JSON.stringify(after) : null
    });
    publish({ type: action, protocol: after, protocolId: after?.id ?? before?.id, changedFields, user: user || null, cursor: Number(auditResult.lastInsertRowid) });
  }

  const createProtocol = db.transaction(({ user, operationId }) => {
    const date = new Date().toISOString().slice(0, 10);
    const result = db.prepare("INSERT INTO protocolos (data_apresentacao, updated_by) VALUES (?, ?)").run(date, user?.name || null);
    const protocol = fetchProtocol(result.lastInsertRowid);
    recordAndPublish({ after: protocol, operationId, user, action: "protocol.created" });
    return protocol;
  });

  const patchProtocol = db.transaction((id, payload, user) => {
    const current = fetchProtocol(id);
    if (!current) return { notFound: true };
    if (payload.operationId) {
      const previous = db.prepare("SELECT after_json FROM audit_log WHERE operation_id = ?").get(payload.operationId);
      if (previous) return { protocol: json(previous.after_json, current), replay: true };
    }
    const changes = Object.fromEntries(Object.entries(payload.changes || {}).filter(([key]) => PROTOCOL_FIELDS.includes(key)));
    if (!Object.keys(changes).length) return { protocol: current };
    if (changes.status && !STATUSES.includes(changes.status)) return { invalid: "Status inválido" };
    changes.urgente = Object.hasOwn(changes, "urgente") ? (changes.urgente ? 1 : 0) : undefined;
    changes.deletado = Object.hasOwn(changes, "deletado") ? (changes.deletado ? 1 : 0) : undefined;
    Object.keys(changes).forEach((key) => changes[key] === undefined && delete changes[key]);

    if (Number(payload.baseRevision) !== Number(current.revision)) {
      const conflicts = Object.keys(changes).filter((field) => {
        const expected = payload.expected?.[field] ?? null;
        return String(current[field] ?? "") !== String(expected ?? "");
      });
      if (conflicts.length) return { conflict: true, protocol: current, fields: conflicts };
    }

    const assignments = Object.keys(changes).map((field) => `${field} = @${field}`);
    const statement = db.prepare(`UPDATE protocolos SET ${assignments.join(", ")}, revision = revision + 1,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_by = @updatedBy WHERE id = @id`);
    statement.run({ ...changes, id: Number(id), updatedBy: user?.name || null });
    const protocol = fetchProtocol(id, true);
    recordAndPublish({ before: current, after: protocol, operationId: payload.operationId, user, action: "protocol.updated", changedFields: Object.keys(changes) });
    return { protocol };
  });

  function board(filters = {}, limit = 50) {
    const columns = {};
    const where = ["p.deletado = 0", "p.status = @status"];
    const params = {};
    if (filters.q) {
      where.push("(CAST(p.ficha AS TEXT) LIKE @q OR p.ato LIKE @q OR p.digitador LIKE @q OR p.apresentante LIKE @q OR p.outorgantes LIKE @q OR p.outorgados LIKE @q)");
      params.q = `%${filters.q}%`;
    }
    for (const field of ["ato", "digitador", "tag_custom"]) {
      if (filters[field]) { where.push(`p.${field} = @${field} COLLATE NOCASE`); params[field] = filters[field]; }
    }
    if (filters.urgente === "1" || filters.urgente === 1 || filters.urgente === true) { where.push("p.urgente = 1"); }
    for (const status of STATUSES) {
      if (status === "ARQUIVADOS" && !filters.includeArchived) continue;
      const countBindings = { ...params, status };
      const itemBindings = { ...countBindings, limit };
      const items = db.prepare(`${protocolSelect} WHERE ${where.join(" AND ")} ORDER BY p.urgente DESC, p.id DESC LIMIT @limit`).all(itemBindings);
      const total = db.prepare(`SELECT COUNT(*) AS total FROM protocolos p WHERE ${where.join(" AND ")}`).get(countBindings).total;
      columns[status] = { items, total };
    }
    return { columns, metadata: metadata(), cursor: Number(db.prepare("SELECT COALESCE(MAX(id), 0) AS id FROM audit_log").get().id) };
  }

  function metadata() {
    const distinct = (field) => db.prepare(`SELECT DISTINCT ${field} AS value FROM protocolos WHERE deletado = 0 AND TRIM(COALESCE(${field}, '')) <> '' ORDER BY value COLLATE NOCASE`).all().map((row) => row.value);
    const atos = db.prepare("SELECT ato AS value FROM protocolos_tags UNION SELECT ato AS value FROM protocolos WHERE deletado = 0 AND TRIM(COALESCE(ato, '')) <> '' ORDER BY value COLLATE NOCASE").all().map((row) => row.value);
    return { atos, digitadores: distinct("digitador"), tags: distinct("tag_custom") };
  }

  function changes(after = 0) {
    const events = db.prepare("SELECT id, protocolo_id, revision, action, user_id, after_json, created_at FROM audit_log WHERE id > ? ORDER BY id LIMIT 500").all(Number(after));
    return {
      events: events.map((event) => ({ ...event, protocol: event.after_json ? json(event.after_json, null) : null, after_json: undefined })),
      cursor: events.length ? events.at(-1).id : Number(after)
    };
  }

  return { db, fetchProtocol, details, createProtocol, patchProtocol, board, metadata, changes, STATUSES };
}
