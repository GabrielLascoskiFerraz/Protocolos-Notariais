import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
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
