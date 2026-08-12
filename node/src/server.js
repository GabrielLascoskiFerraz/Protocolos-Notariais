import fs from "node:fs";
import path from "node:path";
import Fastify from "fastify";
import fastifyStatic from "@fastify/static";
import { z } from "zod";
import { loadConfig, saveConfig, applyPendingRestore, scheduleRestore, projectRoot } from "./config.js";
import { openDatabase, createRepository } from "./database.js";
import { createRealtimeHub } from "./realtime.js";
import { createBackupService } from "./backup.js";
import { inspectLegacyDatabase, migrateLegacyDatabase } from "./migration.js";
import { createCalendarService } from "./calendar.js";
import { createNetworkService, normalizeFriendlyHost } from "./network.js";
import atoOptions from "./ato-options.js";

let config = loadConfig();
applyPendingRestore(config);
const app = Fastify({ logger: { level: process.env.LOG_LEVEL || "info" }, bodyLimit: 2 * 1024 * 1024 });
const hub = createRealtimeHub(config.presence);
const db = openDatabase(config.database.file);
const seedAto = db.prepare("INSERT INTO protocolos_tags (ato, cor) VALUES (?, ?) ON CONFLICT(ato) DO NOTHING");
db.transaction(() => Object.entries(atoOptions).forEach(([ato, color]) => seedAto.run(ato, color)))();
const repository = createRepository(db, (event) => hub.publish(event));
const backup = createBackupService({ db, getConfig: () => config, logger: app.log });
const calendar = createCalendarService(() => config);
const network = createNetworkService({ getConfig: () => config, logger: app.log });

const userSchema = z.object({ id: z.string().max(80).optional(), name: z.string().max(80).optional(), color: z.string().max(20).optional() }).optional();
const operationSchema = z.string().uuid().optional();
const serverSettingsSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  host: z.string().trim().min(1).max(255).optional(),
  port: z.coerce.number().int().min(1).max(65535).optional(),
  friendlyHost: z.string().trim().max(80).transform((value) => normalizeFriendlyHost(value)).optional(),
  mdnsEnabled: z.boolean().optional()
}).strict();

function requestUser(request) {
  return userSchema.parse(request.body?.user || {
    id: request.headers["x-user-id"] || "local-user",
    name: request.headers["x-user-name"] || "Usuário local",
    color: request.headers["x-user-color"] || "#2563eb"
  });
}

function apiError(reply, status, code, message, extra = {}) {
  return reply.code(status).send({ ok: false, code, error: message, ...extra });
}

function touchProtocol(protocolId, user, action, changedFields = []) {
  const before = repository.fetchProtocol(protocolId, true);
  db.prepare("UPDATE protocolos SET revision = revision + 1, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_by = ? WHERE id = ?").run(user?.name || null, protocolId);
  const protocol = repository.fetchProtocol(protocolId, true);
  const audit = db.prepare(`INSERT INTO audit_log (protocolo_id,revision,operation_id,user_id,action,before_json,after_json)
    VALUES (?,?,?,?,?,?,?)`).run(protocolId, protocol.revision, crypto.randomUUID(), user?.id || null, action, JSON.stringify(before), JSON.stringify(protocol));
  hub.publish({ type: action, protocol, protocolId, changedFields, user, cursor: Number(audit.lastInsertRowid) });
  return { before, protocol };
}

app.register(fastifyStatic, { root: path.join(projectRoot, "site"), prefix: "/" });

app.get("/api/health", async () => ({
  ok: true,
  name: config.server.name,
  time: new Date().toISOString(),
  database: db.pragma("quick_check", { simple: true }),
  access: network.info()
}));

app.get("/api/board", async (request) => {
  const query = request.query || {};
  return repository.board({
    q: String(query.q || "").trim(), ato: String(query.ato || "").trim(),
    digitador: String(query.digitador || "").trim(), tag_custom: String(query.tag_custom || "").trim(),
    urgente: query.urgente, includeArchived: query.includeArchived === "1" || query.includeArchived === true
  }, Math.max(1, Math.min(100, Number(query.limit || 50))));
});

app.get("/api/protocols/:id", async (request, reply) => {
  const result = repository.details(Number(request.params.id));
  return result || apiError(reply, 404, "NOT_FOUND", "Protocolo não encontrado.");
});

app.post("/api/protocols", async (request) => {
  const body = z.object({ operationId: operationSchema, user: userSchema }).parse(request.body || {});
  return { ok: true, protocol: repository.createProtocol({ user: body.user || requestUser(request), operationId: body.operationId }) };
});

app.patch("/api/protocols/:id", async (request, reply) => {
  const body = z.object({
    operationId: operationSchema,
    baseRevision: z.coerce.number().int().positive(),
    changes: z.record(z.string(), z.any()),
    expected: z.record(z.string(), z.any()).default({}),
    user: userSchema
  }).parse(request.body || {});
  const result = repository.patchProtocol(Number(request.params.id), body, body.user || requestUser(request));
  if (result.notFound) return apiError(reply, 404, "NOT_FOUND", "Protocolo não encontrado.");
  if (result.invalid) return apiError(reply, 400, "INVALID", result.invalid);
  if (result.conflict) return apiError(reply, 409, "CONFLICT", "Outro usuário alterou o mesmo campo.", { protocol: result.protocol, fields: result.fields });
  return { ok: true, ...result };
});

app.post("/api/protocols/:id/duplicate", async (request, reply) => {
  const source = repository.details(Number(request.params.id));
  if (!source) return apiError(reply, 404, "NOT_FOUND", "Protocolo não encontrado.");
  const user = requestUser(request);
  const duplicate = db.transaction(() => {
    const result = db.prepare(`INSERT INTO protocolos
      (ato,digitador,apresentante,data_apresentacao,contato,outorgantes,outorgados,valor_ato,status,observacoes,urgente,tag_custom,updated_by)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(source.protocol.ato, source.protocol.digitador, source.protocol.apresentante,
      new Date().toISOString().slice(0, 10), source.protocol.contato, source.protocol.outorgantes, source.protocol.outorgados,
      source.protocol.valor_ato, "PARA_DISTRIBUIR", source.protocol.observacoes, source.protocol.urgente, source.protocol.tag_custom, user.name);
    const id = Number(result.lastInsertRowid);
    const propertyInsert = db.prepare("INSERT INTO protocolos_imoveis (protocolo_id,matricula,area) VALUES (?,?,?)");
    source.properties.forEach((item) => propertyInsert.run(id, item.matricula, item.area));
    const valueInsert = db.prepare("INSERT INTO protocolos_valores (protocolo_id,descricao,valor) VALUES (?,?,?)");
    source.values.forEach((item) => valueInsert.run(id, item.descricao, item.valor));
    return repository.fetchProtocol(id);
  })();
  const audit = db.prepare(`INSERT INTO audit_log (protocolo_id,revision,operation_id,user_id,action,after_json)
    VALUES (?,?,?,?,?,?)`).run(duplicate.id, duplicate.revision, crypto.randomUUID(), user?.id || null, "protocol.created", JSON.stringify(duplicate));
  hub.publish({ type: "protocol.created", protocol: duplicate, protocolId: duplicate.id, user, cursor: Number(audit.lastInsertRowid) });
  return { ok: true, protocol: duplicate };
});

app.delete("/api/protocols/:id", async (request, reply) => {
  const protocol = repository.fetchProtocol(Number(request.params.id));
  if (!protocol) return apiError(reply, 404, "NOT_FOUND", "Protocolo não encontrado.");
  const result = repository.patchProtocol(protocol.id, {
    operationId: request.body?.operationId,
    baseRevision: protocol.revision,
    changes: { deletado: 1 }, expected: { deletado: protocol.deletado }
  }, requestUser(request));
  return { ok: true, protocol: result.protocol };
});

function registerChildRoutes({ resource, table, fields, orderBy }) {
  app.post(`/api/protocols/:protocolId/${resource}`, async (request, reply) => {
    const protocolId = Number(request.params.protocolId);
    if (!repository.fetchProtocol(protocolId)) return apiError(reply, 404, "NOT_FOUND", "Protocolo não encontrado.");
    const values = fields.map((field) => request.body?.[field] ?? (field === "valor" ? 0 : ""));
    const columns = ["protocolo_id", ...fields];
    const placeholders = columns.map(() => "?").join(",");
    const result = db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`).run(protocolId, ...values);
    const user = requestUser(request);
    const touched = touchProtocol(protocolId, user, `${resource}.created`, [resource]);
    const item = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(result.lastInsertRowid);
    return { ok: true, item, protocol: touched.protocol };
  });
  app.patch(`/api/${resource}/:id`, async (request, reply) => {
    const id = Number(request.params.id);
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!existing) return apiError(reply, 404, "NOT_FOUND", "Item não encontrado.");
    const updates = fields.filter((field) => Object.hasOwn(request.body || {}, field));
    if (!updates.length) return { ok: true, item: existing };
    const bindings = { id };
    for (const field of updates) bindings[field] = request.body[field];
    db.prepare(`UPDATE ${table} SET ${updates.map((field) => `${field} = @${field}`).join(",")}, revision = revision + 1 WHERE id = @id`).run(bindings);
    const user = requestUser(request);
    const touched = touchProtocol(existing.protocolo_id, user, `${resource}.updated`, [resource]);
    return { ok: true, item: db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id), protocol: touched.protocol };
  });
  app.delete(`/api/${resource}/:id`, async (request, reply) => {
    const id = Number(request.params.id);
    const existing = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    if (!existing) return apiError(reply, 404, "NOT_FOUND", "Item não encontrado.");
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    const user = requestUser(request);
    const touched = touchProtocol(existing.protocolo_id, user, `${resource}.deleted`, [resource]);
    return { ok: true, protocol: touched.protocol };
  });
}

registerChildRoutes({ resource: "properties", table: "protocolos_imoveis", fields: ["matricula", "area"] });
registerChildRoutes({ resource: "values", table: "protocolos_valores", fields: ["descricao", "valor"] });
registerChildRoutes({ resource: "notes", table: "protocolos_andamentos", fields: ["descricao"] });

app.get("/api/changes", async (request) => repository.changes(Number(request.query?.after || 0)));

app.get("/api/calendar.php", async (request, reply) => {
  try { return await calendar(request.query?.refresh === "1"); }
  catch (error) { request.log.error(error); return apiError(reply, 502, "CALENDAR_FAILED", "Não foi possível carregar o calendário.", { events: [] }); }
});

app.get("/api/settings", async () => ({
  server: { ...config.server }, backup: { ...config.backup }, presence: { ...config.presence }, calendar: { ...(config.calendar || {}) },
  database: { file: config.database.file, size: fs.existsSync(config.database.file) ? fs.statSync(config.database.file).size : 0 },
  access: network.info()
}));

app.put("/api/settings", async (request) => {
  const body = request.body || {};
  const serverSettings = body.server ? serverSettingsSchema.parse(body.server) : null;
  config = {
    ...config,
    server: { ...config.server, ...(serverSettings || {}) },
    backup: { ...config.backup, ...(body.backup || {}) },
    presence: { ...config.presence, ...(body.presence || {}) },
    calendar: { ...(config.calendar || {}), ...(body.calendar || {}) }
  };
  saveConfig(config);
  return { ok: true, restartRequired: Boolean(serverSettings), access: network.info() };
});

app.post("/api/backups", async () => backup.run("manual"));
app.get("/api/backups", async () => {
  fs.mkdirSync(config.backup.directory, { recursive: true });
  return { items: fs.readdirSync(config.backup.directory).filter((name) => /^protocolos-.*\.sqlite$/.test(name)).map((name) => {
    const filename = path.join(config.backup.directory, name); const stat = fs.statSync(filename);
    return { name, path: filename, size: stat.size, createdAt: stat.mtime.toISOString() };
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
});
app.post("/api/backups/restore", async (request, reply) => {
  try { scheduleRestore(config, request.body?.path); return { ok: true, restartRequired: true }; }
  catch (error) { return apiError(reply, 400, "INVALID_BACKUP", error.message); }
});

app.post("/api/migration/inspect", async (request, reply) => {
  try { return { ok: true, counts: await inspectLegacyDatabase(request.body || {}) }; }
  catch (error) {
    request.log.error(error);
    return apiError(reply, 400, "LEGACY_CONNECTION_FAILED", "Não foi possível analisar o banco legado.", { detail: error.message });
  }
});

app.post("/api/migration/run", async (request, reply) => {
  try {
    await backup.run("pre-migration");
    const body = request.body || {};
    return await migrateLegacyDatabase({ connectionConfig: body.connection, repository, user: body.user, operationId: body.operationId || crypto.randomUUID() });
  } catch (error) {
    request.log.error(error);
    return apiError(reply, 500, "MIGRATION_FAILED", "A migração não foi concluída; o banco atual foi preservado ou pode ser restaurado pelo backup.", { detail: error.message });
  }
});

app.setErrorHandler((error, request, reply) => {
  request.log.error(error);
  if (error instanceof z.ZodError) return apiError(reply, 400, "VALIDATION_ERROR", "Dados inválidos.", { issues: error.issues });
  return apiError(reply, 500, "INTERNAL_ERROR", "Erro interno do servidor.");
});

app.addHook("onClose", async () => { backup.stop(); await network.stop(); hub.close(); db.close(); });

await app.listen({ host: config.server.host, port: Number(config.server.port) });
hub.attach(app.server);
backup.start();
await network.start();
const access = network.info();
app.log.info(`Protocolos disponíveis em http://localhost:${config.server.port}`);
if (access.friendlyUrl) app.log.info(`Acesso amigável na rede: ${access.friendlyUrl}`);
for (const url of access.localUrls) app.log.info(`Acesso alternativo na rede: ${url}`);
