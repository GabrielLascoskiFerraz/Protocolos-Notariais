import { WebSocketServer, WebSocket } from "ws";

export function createRealtimeHub({ idleSeconds = 90 } = {}) {
  const clients = new Map();
  const wss = new WebSocketServer({ noServer: true });

  function safeSend(socket, payload) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload));
  }

  function presenceSnapshot(protocolId = null) {
    const grouped = {};
    for (const client of clients.values()) {
      if (!client.protocolId) continue;
      if (protocolId && String(client.protocolId) !== String(protocolId)) continue;
      grouped[client.protocolId] ||= [];
      grouped[client.protocolId].push({ id: client.user.id, name: client.user.name, color: client.user.color });
    }
    return grouped;
  }

  function broadcast(payload, except = null) {
    const message = JSON.stringify(payload);
    for (const [socket] of clients) {
      if (socket !== except && socket.readyState === WebSocket.OPEN) socket.send(message);
    }
  }

  function broadcastPresence(protocolId = null) {
    const presence = presenceSnapshot(protocolId);
    if (protocolId && !Object.hasOwn(presence, protocolId)) presence[protocolId] = [];
    broadcast({ type: "presence.snapshot", presence });
  }

  function leave(socket) {
    const client = clients.get(socket);
    if (!client) return;
    const previousProtocolId = client.protocolId;
    clients.delete(socket);
    if (previousProtocolId) broadcastPresence(previousProtocolId);
  }

  wss.on("connection", (socket) => {
    const now = Date.now();
    clients.set(socket, {
      user: { id: `guest-${Math.random().toString(16).slice(2)}`, name: "Usuário", color: "#2563eb" },
      protocolId: null,
      lastSeen: now
    });
    safeSend(socket, { type: "realtime.ready", presence: presenceSnapshot() });

    socket.on("message", (raw) => {
      let message;
      try { message = JSON.parse(String(raw)); } catch { return; }
      const client = clients.get(socket);
      if (!client) return;
      client.lastSeen = Date.now();
      if (message.type === "hello") {
        client.user = {
          id: String(message.user?.id || client.user.id).slice(0, 80),
          name: String(message.user?.name || "Usuário").slice(0, 80),
          color: String(message.user?.color || "#2563eb").slice(0, 20)
        };
        safeSend(socket, { type: "presence.snapshot", presence: presenceSnapshot() });
      }
      if (message.type === "presence.open") {
        const previous = client.protocolId;
        client.protocolId = Number(message.protocolId) || null;
        if (previous) broadcastPresence(previous);
        if (client.protocolId) broadcastPresence(client.protocolId);
      }
      if (message.type === "presence.close") {
        const previous = client.protocolId;
        client.protocolId = null;
        if (previous) broadcastPresence(previous);
      }
      if (message.type === "ping") safeSend(socket, { type: "pong", at: Date.now() });
    });
    socket.on("close", () => leave(socket));
    socket.on("error", () => leave(socket));
  });

  const timer = setInterval(() => {
    const threshold = Date.now() - idleSeconds * 1000;
    for (const [socket, client] of clients) {
      if (client.lastSeen >= threshold) continue;
      socket.terminate();
      leave(socket);
    }
  }, Math.min(30, Math.max(10, idleSeconds / 3)) * 1000);
  timer.unref();

  return {
    attach(server) {
      server.on("upgrade", (request, socket, head) => {
        const url = new URL(request.url, "http://localhost");
        if (url.pathname !== "/ws") return socket.destroy();
        wss.handleUpgrade(request, socket, head, (webSocket) => wss.emit("connection", webSocket, request));
      });
    },
    publish(event) { broadcast(event); },
    presenceSnapshot,
    close() { clearInterval(timer); wss.close(); }
  };
}
