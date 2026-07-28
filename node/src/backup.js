import fs from "node:fs";
import path from "node:path";

function stamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

export function createBackupService({ db, getConfig, logger = console }) {
  let timer = null;
  let currentRun = null;

  function run(reason = "manual") {
    // All callers await the same operation instead of receiving a misleading
    // "skipped" response while another backup is finishing.
    if (currentRun) return currentRun;
    currentRun = (async () => {
      const config = getConfig();
      fs.mkdirSync(config.backup.directory, { recursive: true });
      const destination = path.join(config.backup.directory, `protocolos-${stamp()}.sqlite`);
      await db.backup(destination);
      const integrity = db.verify(destination);
      if (integrity !== "ok") throw new Error(`Falha na integridade do backup: ${integrity}`);
      for (const suffix of ["-wal", "-shm"]) {
        const sidecar = `${destination}${suffix}`;
        if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
      }
      cleanup(config);
      logger.info({ destination, reason }, "Backup concluído");
      return { success: true, destination, reason, createdAt: new Date().toISOString() };
    })().finally(() => { currentRun = null; });
    return currentRun;
  }

  function cleanup(config) {
    const maxAge = Math.max(1, Number(config.backup.retentionDays || 90)) * 86400000;
    const now = Date.now();
    for (const name of fs.readdirSync(config.backup.directory)) {
      if (!/^protocolos-.*\.sqlite$/.test(name)) continue;
      const filename = path.join(config.backup.directory, name);
      if (now - fs.statSync(filename).mtimeMs > maxAge) {
        fs.unlinkSync(filename);
        for (const suffix of ["-wal", "-shm"]) {
          const sidecar = `${filename}${suffix}`;
          if (fs.existsSync(sidecar)) fs.unlinkSync(sidecar);
        }
      }
    }
  }

  function scheduledOccurrence(config, now) {
    if (!config.backup.enabled) return false;
    const [hour, minute] = String(config.backup.time || "06:00").split(":").map(Number);
    const scheduled = new Date(now);
    scheduled.setHours(hour, minute, 0, 0);
    if (config.backup.frequency === "weekly") {
      const daysSince = (scheduled.getDay() - Number(config.backup.weekDay ?? 5) + 7) % 7;
      scheduled.setDate(scheduled.getDate() - daysSince);
    }
    return scheduled;
  }

  function isDue(config, now) {
    if (!config.backup.enabled) return false;
    const scheduled = scheduledOccurrence(config, now);
    if (!scheduled || now < scheduled) return false;
    fs.mkdirSync(config.backup.directory, { recursive: true });
    const latest = fs.readdirSync(config.backup.directory)
      .filter((name) => /^protocolos-.*\.sqlite$/.test(name))
      .reduce((value, name) => Math.max(value, fs.statSync(path.join(config.backup.directory, name)).mtimeMs), 0);
    return latest < scheduled.getTime();
  }

  function start() {
    clearInterval(timer);
    const tick = () => {
      const now = new Date();
      const config = getConfig();
      if (isDue(config, now)) {
        run("scheduled").catch((error) => logger.error(error, "Falha no backup agendado"));
      }
    };
    timer = setInterval(tick, 30000);
    timer.unref();
    tick();
  }

  return { run, start, stop: () => clearInterval(timer) };
}
