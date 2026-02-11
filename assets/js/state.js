/* =========================================================
   Estado centralizado da aplicação.
   Substitui os antigos window.protocoloAtual,
   window.isDraggingCard, window.suppressSyncUntil.
   ======================================================= */

let protocoloAtual = null;
let isDraggingCard = false;
let suppressSyncUntil = 0;

export function getProtocoloAtual() { return protocoloAtual; }
export function setProtocoloAtual(id) {
    protocoloAtual = id;
    window.protocoloAtual = id; // retrocompatibilidade com onclick inline
}

export function getIsDragging() { return isDraggingCard; }
export function setIsDragging(v) { isDraggingCard = v; }

export function getSuppressSyncUntil() { return suppressSyncUntil; }
export function setSuppressSyncUntil(ts) { suppressSyncUntil = ts; }

// Retrocompatibilidade com onclick handlers inline
window.protocoloAtual = null;
