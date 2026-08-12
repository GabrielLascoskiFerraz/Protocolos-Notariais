import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = globalThis.process?.pkg
  ? path.dirname(globalThis.process.execPath)
  : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configDirectory = path.join(projectRoot, "config");
const configFile = path.join(configDirectory, "server.json");
const exampleFile = path.join(configDirectory, "server.example.json");

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function resolveProjectPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(projectRoot, value);
}

export function loadConfig() {
  fs.mkdirSync(configDirectory, { recursive: true });
  if (!fs.existsSync(configFile)) fs.copyFileSync(exampleFile, configFile);
  const defaults = readJson(exampleFile);
  const stored = readJson(configFile);
  const config = {
    ...defaults,
    ...stored,
    server: { ...defaults.server, ...(stored.server || {}) },
    database: { ...defaults.database, ...(stored.database || {}) },
    backup: { ...defaults.backup, ...(stored.backup || {}) },
    presence: { ...defaults.presence, ...(stored.presence || {}) },
    calendar: { ...defaults.calendar, ...(stored.calendar || {}) }
  };
  config.database.file = resolveProjectPath(config.database.file);
  config.backup.directory = resolveProjectPath(config.backup.directory);
  return config;
}

export function saveConfig(nextConfig) {
  const serializable = structuredClone(nextConfig);
  serializable.database.file = path.relative(projectRoot, nextConfig.database.file) || "data/protocolos.sqlite";
  serializable.backup.directory = path.relative(projectRoot, nextConfig.backup.directory) || "backups";
  const temporary = `${configFile}.tmp`;
  fs.writeFileSync(temporary, `${JSON.stringify(serializable, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, configFile);
}

export function applyPendingRestore(config) {
  const marker = path.join(configDirectory, "restore-pending.json");
  if (!fs.existsSync(marker)) return null;
  const pending = readJson(marker);
  const source = path.resolve(String(pending.source || ""));
  const backupRoot = path.resolve(config.backup.directory);
  if (source !== backupRoot && !source.startsWith(`${backupRoot}${path.sep}`)) throw new Error("Backup de restauração fora da pasta permitida.");
  if (!fs.existsSync(source)) throw new Error("Backup selecionado para restauração não existe.");
  fs.mkdirSync(path.dirname(config.database.file), { recursive: true });
  for (const suffix of ["-wal", "-shm"]) {
    const sidecar = `${config.database.file}${suffix}`;
    if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
  }
  fs.copyFileSync(source, config.database.file);
  fs.unlinkSync(marker);
  return source;
}

export function scheduleRestore(config, source) {
  const backupRoot = path.resolve(config.backup.directory);
  const resolved = path.resolve(source);
  if (!resolved.startsWith(`${backupRoot}${path.sep}`) || !fs.existsSync(resolved)) throw new Error("Backup inválido.");
  fs.writeFileSync(path.join(configDirectory, "restore-pending.json"), JSON.stringify({ source: resolved, scheduledAt: new Date().toISOString() }, null, 2));
}

export { projectRoot, configFile };
