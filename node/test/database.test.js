import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { openDatabase, createRepository } from "../src/database.js";
import { createBackupService } from "../src/backup.js";

function fixture() {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "protocolos-node-"));
  const databaseFile = path.join(directory, "data.sqlite");
  const events = [];
  const db = openDatabase(databaseFile);
  const repository = createRepository(db, (event) => events.push(event));
  return { directory, databaseFile, db, repository, events };
}

test("migra bancos Node antigos para o status Paralisados sem perder vínculos", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "protocolos-node-migration-"));
  const databaseFile = path.join(directory, "data.sqlite");
  const legacy = new DatabaseSync(databaseFile);
  legacy.exec(`
    PRAGMA foreign_keys = ON;
    CREATE TABLE protocolos (
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
      created_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z',
      updated_at TEXT NOT NULL DEFAULT '2026-01-01T00:00:00.000Z',
      updated_by TEXT
    );
    CREATE TABLE protocolos_imoveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      protocolo_id INTEGER NOT NULL REFERENCES protocolos(id) ON DELETE CASCADE,
      matricula TEXT,
      area TEXT,
      revision INTEGER NOT NULL DEFAULT 1
    );
    INSERT INTO protocolos (ficha, ato, status) VALUES (77, 'Inventário', 'EM_ANDAMENTO');
    INSERT INTO protocolos_imoveis (protocolo_id, matricula, area) VALUES (1, 'M-77', '10 ha');
  `);
  legacy.close();

  const db = openDatabase(databaseFile);
  try {
    const repository = createRepository(db, () => {});
    const current = repository.fetchProtocol(1);
    assert.equal(current.ato, "Inventário");
    assert.equal(repository.STATUSES.includes("PARALISADOS"), true);
    assert.deepEqual(Object.keys(repository.board({ includeArchived: true }).columns), [
      "PARA_DISTRIBUIR", "EM_ANDAMENTO", "PARALISADOS", "PARA_CORRECAO", "LAVRADOS", "ARQUIVADOS"
    ]);
    assert.equal(db.prepare("SELECT matricula FROM protocolos_imoveis WHERE protocolo_id = 1").get().matricula, "M-77");

    const result = repository.patchProtocol(1, {
      operationId: crypto.randomUUID(),
      baseRevision: current.revision,
      changes: { status: "PARALISADOS" },
      expected: { status: "EM_ANDAMENTO" }
    }, { id: "migration-test", name: "Teste" });
    assert.equal(result.protocol.status, "PARALISADOS");
    assert.deepEqual(db.prepare("PRAGMA foreign_key_check").all(), []);
    const next = repository.createProtocol({ user: { id: "migration-test", name: "Teste" }, operationId: crypto.randomUUID() });
    assert.equal(next.id, 2);
  } finally {
    db.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test("mescla edições simultâneas em campos diferentes e conflita somente no mesmo campo", () => {
  const context = fixture();
  try {
    const protocol = context.repository.createProtocol({ user: { id: "a", name: "Ana" }, operationId: crypto.randomUUID() });
    const first = context.repository.patchProtocol(protocol.id, {
      operationId: crypto.randomUUID(), baseRevision: protocol.revision,
      changes: { apresentante: "Maria" }, expected: { apresentante: null }
    }, { id: "a", name: "Ana" });
    assert.equal(first.protocol.apresentante, "Maria");

    const merged = context.repository.patchProtocol(protocol.id, {
      operationId: crypto.randomUUID(), baseRevision: protocol.revision,
      changes: { digitador: "João" }, expected: { digitador: null }
    }, { id: "b", name: "Bruno" });
    assert.equal(merged.protocol.apresentante, "Maria");
    assert.equal(merged.protocol.digitador, "João");

    const conflict = context.repository.patchProtocol(protocol.id, {
      operationId: crypto.randomUUID(), baseRevision: protocol.revision,
      changes: { apresentante: "Carla" }, expected: { apresentante: null }
    }, { id: "b", name: "Bruno" });
    assert.equal(conflict.conflict, true);
    assert.deepEqual(conflict.fields, ["apresentante"]);
  } finally {
    context.db.close(); fs.rmSync(context.directory, { recursive: true, force: true });
  }
});

test("operationId torna uma escrita repetida idempotente", () => {
  const context = fixture();
  try {
    const protocol = context.repository.createProtocol({ user: { id: "a", name: "Ana" }, operationId: crypto.randomUUID() });
    const operationId = crypto.randomUUID();
    const payload = { operationId, baseRevision: protocol.revision, changes: { ato: "Inventário" }, expected: { ato: "" } };
    const first = context.repository.patchProtocol(protocol.id, payload, { id: "a", name: "Ana" });
    const replay = context.repository.patchProtocol(protocol.id, payload, { id: "a", name: "Ana" });
    assert.equal(replay.replay, true);
    assert.equal(replay.protocol.revision, first.protocol.revision);
    assert.equal(context.repository.fetchProtocol(protocol.id).revision, first.protocol.revision);
  } finally {
    context.db.close(); fs.rmSync(context.directory, { recursive: true, force: true });
  }
});

test("backup cria snapshot íntegro do SQLite", async () => {
  const context = fixture();
  try {
    context.repository.createProtocol({ user: { id: "a", name: "Ana" }, operationId: crypto.randomUUID() });
    const service = createBackupService({
      db: context.db,
      getConfig: () => ({ backup: { directory: path.join(context.directory, "backups"), retentionDays: 30 } }),
      logger: { info() {}, error() {} }
    });
    const result = await service.run("test");
    assert.equal(result.success, true);
    assert.equal(fs.existsSync(result.destination), true);
  } finally {
    context.db.close(); fs.rmSync(context.directory, { recursive: true, force: true });
  }
});
