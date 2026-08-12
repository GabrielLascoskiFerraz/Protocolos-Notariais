import assert from "node:assert/strict";
import test from "node:test";
import { createNetworkService, normalizeFriendlyHost } from "../src/network.js";

test("normaliza o endereço amigável como um hostname mDNS válido", () => {
  assert.equal(normalizeFriendlyHost("Protocolos do Cartório.local"), "protocolos-do-cartorio");
  assert.equal(normalizeFriendlyHost("  --Fichas__Internas--  "), "fichas-internas");
  assert.equal(normalizeFriendlyHost(""), "protocolos");
});

test("informa o endereço amigável sem iniciar sockets durante o diagnóstico", () => {
  const service = createNetworkService({
    getConfig: () => ({
      server: {
        host: "0.0.0.0",
        port: 8080,
        name: "Protocolos Notariais",
        friendlyHost: "protocolos-cartorio",
        mdnsEnabled: true
      }
    }),
    logger: { info() {}, warn() {} }
  });
  const info = service.info();
  assert.equal(info.networkListening, true);
  assert.equal(info.friendlyUrl, "http://protocolos-cartorio.local:8080");
  assert.equal(info.mdns.enabled, true);
  assert.equal(info.mdns.state, "disabled");
});

test("não anuncia link de rede quando o servidor escuta apenas localmente", () => {
  const service = createNetworkService({
    getConfig: () => ({
      server: {
        host: "127.0.0.1",
        port: 8080,
        friendlyHost: "protocolos",
        mdnsEnabled: true
      }
    })
  });
  const info = service.info();
  assert.equal(info.networkListening, false);
  assert.equal(info.friendlyUrl, null);
  assert.deepEqual(info.localUrls, []);
});
