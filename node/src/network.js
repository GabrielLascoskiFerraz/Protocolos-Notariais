import os from "node:os";
import { Bonjour } from "bonjour-service";

function stripDiacritics(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function normalizeFriendlyHost(value, fallback = "protocolos") {
  const normalized = stripDiacritics(value)
    .toLowerCase()
    .replace(/\.local\.?$/i, "")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63);
  return normalized || fallback;
}

function localIPv4Addresses() {
  const addresses = new Set();
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal) addresses.add(entry.address);
    }
  }
  return [...addresses].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function httpUrl(host, port) {
  return `http://${host}${Number(port) === 80 ? "" : `:${port}`}`;
}

export function createNetworkService({ getConfig, logger = console }) {
  let bonjour = null;
  let service = null;
  let state = "disabled";
  let lastError = "";
  let publishTimer = null;

  function info() {
    const config = getConfig();
    const port = Number(config.server.port);
    const friendlyHost = normalizeFriendlyHost(config.server.friendlyHost);
    const enabled = config.server.mdnsEnabled !== false;
    const networkListening = !["127.0.0.1", "::1", "localhost"].includes(String(config.server.host).toLowerCase());
    return {
      networkListening,
      localUrls: networkListening ? localIPv4Addresses().map((address) => httpUrl(address, port)) : [],
      friendlyHost,
      friendlyUrl: enabled && networkListening ? httpUrl(`${friendlyHost}.local`, port) : null,
      mdns: { enabled, state, error: lastError || null }
    };
  }

  async function stop() {
    clearTimeout(publishTimer);
    publishTimer = null;
    if (service) {
      await new Promise((resolve) => service.stop(resolve));
      service = null;
    }
    if (bonjour) {
      bonjour.destroy();
      bonjour = null;
    }
    state = "disabled";
  }

  async function start() {
    const config = getConfig();
    const details = info();
    lastError = "";
    if (!details.mdns.enabled || !details.networkListening) {
      state = "disabled";
      return details;
    }

    state = "starting";
    try {
      bonjour = new Bonjour({}, (error) => {
        lastError = error?.message || "Falha desconhecida no anúncio da rede.";
        state = "error";
        logger.warn?.({ error }, "Não foi possível anunciar o endereço mDNS.");
      });
      service = bonjour.publish({
        name: `${String(config.server.name || "Protocolos Notariais")} [${details.friendlyHost}:${config.server.port}]`,
        host: `${details.friendlyHost}.local`,
        type: "http",
        protocol: "tcp",
        port: Number(config.server.port),
        disableIPv6: true,
        txt: { path: "/", application: "protocolos-notariais" }
      });
      service.on("up", () => {
        clearTimeout(publishTimer);
        publishTimer = null;
        state = "online";
        logger.info?.(`Endereço amigável disponível em ${info().friendlyUrl}`);
      });
      service.on("error", (error) => {
        lastError = error?.message || "Não foi possível publicar o endereço amigável.";
        state = "error";
        logger.warn?.({ error }, "Falha ao publicar o serviço mDNS.");
      });
      publishTimer = setTimeout(() => {
        if (state !== "starting") return;
        lastError = "O nome já pode estar sendo usado por outro servidor na rede.";
        state = "error";
        logger.warn?.("O anúncio mDNS não foi confirmado. Verifique se o endereço amigável já está em uso.");
      }, 2200);
      publishTimer.unref?.();
    } catch (error) {
      lastError = error?.message || "Não foi possível iniciar o anúncio da rede.";
      state = "error";
      logger.warn?.({ error }, "Falha ao iniciar o serviço mDNS.");
    }
    return info();
  }

  return { info, start, stop };
}
