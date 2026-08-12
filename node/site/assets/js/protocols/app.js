import { protocolIcon } from "./icons.js";
import { printProtocolSheet } from "./pdf.js";

const STATUS = [
  ["PARA_DISTRIBUIR", "Para distribuir", "inbox"], ["EM_ANDAMENTO", "Em andamento", "progress"],
  ["PARALISADOS", "Paralisados", "pause"],
  ["PARA_CORRECAO", "Para correção", "correction"], ["LAVRADOS", "Lavrados", "done"], ["ARQUIVADOS", "Arquivados", "archive"]
];
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = {
  board: {}, metadata: {}, current: null, lists: {}, presence: {},
  saveTimer: 0, saveQueue: Promise.resolve(), filters: {}, ws: null,
  cursor: 0, boardLoadToken: 0, modalSyncToken: 0,
  dirtyFields: new Set(), savingFields: new Set(), deferredFields: new Map(),
  deferredLists: new Map(), externalHighlightTimers: new Map(),
  dialogCloseTimer: 0, dialogBackdropTimer: 0, reconnectTimer: 0, boardReloadTimer: 0,
  confirmResolve: null
};
let user = loadUser();

function localId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function loadUser() {
  const key = "protocolos.node.user.v1";
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "null");
    if (saved?.id) return saved;
    const colors = ["#2563eb", "#0f766e", "#b45309", "#9333ea", "#be123c"];
    const created = { id: localId(), name: localStorage.getItem("protocolos.userName") || "Usuário local", color: colors[Math.floor(Math.random() * colors.length)] };
    localStorage.setItem(key, JSON.stringify(created));
    return created;
  } catch { return { id: localId(), name: "Usuário local", color: "#2563eb" }; }
}

window.addEventListener("protocolos:user-identity", (event) => {
  if (!event.detail?.id || !event.detail?.name) return;
  user = { ...user, ...event.detail };
  if (state.ws?.readyState === WebSocket.OPEN) {
    state.ws.send(JSON.stringify({ type: "hello", user }));
  }
});

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", "X-User-Id": user.id, "X-User-Name": user.name, ...(options.headers || {}) },
    body: options.body && typeof options.body !== "string" ? JSON.stringify({ ...options.body, user }) : options.body
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(data.error || "Falha na comunicação com o servidor."); error.status = response.status; error.data = data; throw error; }
  return data;
}

function escapeHtml(value) { const node = document.createElement("span"); node.textContent = String(value ?? ""); return node.innerHTML; }
function normalize(value) { return value == null ? "" : String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim(); }
function escapeRegExp(string) { return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function searchTerms() {
  const query = normalize(state.filters.q).toLowerCase();
  if (!query) return [];
  return [...new Set(query.split(/\s+/).filter((term) => term.length >= 2))];
}
function renderHighlightedText(value) {
  const text = String(value ?? "");
  const terms = searchTerms();
  if (!terms.length) return escapeHtml(text);
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  let cursor = 0;
  let html = "";
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    html += escapeHtml(text.slice(cursor, index));
    html += `<mark class="protocol-search-highlight">${escapeHtml(match[0])}</mark>`;
    cursor = index + match[0].length;
  }
  html += escapeHtml(text.slice(cursor));
  return html;
}
function dateBr(value) { if (!value) return "-"; const [y, m, d] = String(value).slice(0, 10).split("-"); return `${d}/${m}/${y}`; }
function ficha(value) { return Number(value) ? `Ficha ${value}` : "Não Possui Ficha"; }
function money(value) { return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); }
function operationId() { return localId(); }
function ownPresence(protocolId) { return (state.presence[protocolId] || []).filter((person) => person.id !== user.id); }

function toast(message, type = "success") {
  const host = $("#toasts");
  host.innerHTML = `<div class="protocols-toast protocols-toast-${type}" role="status"><span>${escapeHtml(message)}</span></div>`;
  clearTimeout(toast.timer); toast.timer = setTimeout(() => host.replaceChildren(), 2600);
}

function finishConfirmation(accepted) {
  const dialog = $("#confirm-dialog");
  if (!dialog?.open || dialog.classList.contains("is-closing")) return;
  dialog.classList.remove("is-opening");
  dialog.classList.add("is-closing");
  const resolve = state.confirmResolve;
  state.confirmResolve = null;
  window.setTimeout(() => {
    if (dialog.open) dialog.close();
    dialog.classList.add("hidden");
    dialog.classList.remove("is-closing");
    dialog.setAttribute("aria-hidden", "true");
    resolve?.(accepted);
  }, shouldReduceMotion() ? 0 : 180);
}

function confirmAction({ title, message, summary, confirmLabel = "Excluir" }) {
  const dialog = $("#confirm-dialog");
  if (!dialog) return Promise.resolve(window.confirm(`${title}\n\n${summary || message || ""}`));
  if (state.confirmResolve) finishConfirmation(false);
  $("#confirm-title").textContent = title;
  $("#confirm-message").textContent = message;
  $("#confirm-summary").textContent = summary;
  $("#confirm-accept").textContent = confirmLabel;
  dialog.classList.remove("hidden", "is-closing");
  dialog.setAttribute("aria-hidden", "false");
  if (!dialog.open) dialog.showModal();
  dialog.classList.add("is-opening");
  return new Promise((resolve) => {
    state.confirmResolve = resolve;
  });
}

function presenceMarkup(protocolId) {
  const people = ownPresence(protocolId);
  if (!people.length) return "";
  const label = people.length === 1 ? `${people[0].name} está com esta ficha aberta` : `${people.length} pessoas estão com esta ficha aberta`;
  return `<span class="protocol-presence protocol-card-presence" title="${escapeHtml(label)}"><span class="protocol-presence-icon">${protocolIcon("user")}</span></span>`;
}

function renderPresenceIndicators() {
  $$(".protocol-card[data-id]").forEach((element) => {
    const markup = presenceMarkup(element.dataset.id);
    const current = $(".protocol-card-presence", element);
    element.classList.toggle("has-presence", Boolean(markup));
    if (!markup) current?.remove();
    else if (current) current.outerHTML = markup;
    else element.insertAdjacentHTML("afterbegin", markup);
  });
  renderModalPresence();
}

function scheduleBoardReload(delay = 80) {
  clearTimeout(state.boardReloadTimer);
  state.boardReloadTimer = setTimeout(() => loadBoard().catch(console.error), delay);
}

function cardLine(icon, label, value, extraClass = "") {
  if (!value) return "";
  return `<div class="protocol-card-line ${extraClass}">${protocolIcon(icon)}<span class="protocol-card-line-label">${escapeHtml(label)}</span><span class="protocol-card-line-value">${renderHighlightedText(value)}</span></div>`;
}

function card(item) {
  const people = ownPresence(item.id);
  const total = Number(item.total_valores || 0);
  const customTag = String(item.tag_custom || "").trim();
  const lines = [
    cardLine("user", "Apresentante", item.apresentante),
    cardLine("keyboard", "Digitador", item.digitador),
    cardLine("calendar", "Data", item.data_apresentacao ? dateBr(item.data_apresentacao) : ""),
    cardLine("file", "Outorgantes", item.outorgantes, "is-multiline"),
    cardLine("send", "Outorgados", item.outorgados, "is-multiline")
  ].join("");
  return `<article class="protocol-card${Number(item.urgente) ? " is-urgent" : ""}${people.length ? " has-presence" : ""}" draggable="true" data-id="${item.id}" data-status="${item.status}" style="--tag-color:${escapeHtml(item.tag_cor || "#2563eb")}">
    ${presenceMarkup(item.id)}
    <button class="protocol-card-main" type="button" data-card-action="open">
      <div class="protocol-card-top"><span class="protocol-card-ato">${renderHighlightedText(item.ato || "Sem ato")}</span>${Number(item.urgente) ? `<span class="protocol-urgent-badge">${protocolIcon("alert")}Urgente</span>` : ""}</div>
      <strong>${renderHighlightedText(ficha(item.ficha))}</strong>
      <div class="protocol-card-lines">${lines || '<div class="protocol-card-empty">Sem dados detalhados neste protocolo.</div>'}</div>
    </button>
    <footer><span class="protocol-value-pill">${protocolIcon("money")}${total > 0 ? escapeHtml(money(total)) : "Sem valores"}</span><div class="protocol-card-footer-meta">${customTag ? `<span class="protocol-chip">${renderHighlightedText(customTag)}</span>` : ""}</div></footer>
    <div class="protocol-card-actions"><button class="protocol-action-button protocol-action-archive" type="button" data-card-action="archive">${protocolIcon(item.status === "ARQUIVADOS" ? "restore" : "archive")}<span>${item.status === "ARQUIVADOS" ? "Restaurar" : "Arquivar"}</span></button><button class="protocol-action-button protocol-action-delete danger" type="button" data-card-action="delete">${protocolIcon("trash")}<span>Excluir</span></button></div>
  </article>`;
}

function renderBoard() {
  const scrollByStatus = new Map(
    $$(".protocol-column-cards[data-drop-status]", $("#board"))
      .map((element) => [element.dataset.dropStatus, element.scrollTop])
  );
  const showArchived = $("#show-archived").checked;
  $("#board").classList.toggle("is-showing-archived", showArchived);
  $("#board").classList.toggle("is-archive-collapsing", !showArchived);
  $("#board").innerHTML = STATUS.filter(([status]) => status !== "ARQUIVADOS" || showArchived).map(([status, label, icon]) => {
    const column = state.board[status] || { items: [], total: 0 };
    return `<section class="protocol-column protocol-column-${status.toLowerCase().replaceAll("_", "-")}" data-status="${status}">
      <header><div><span class="protocol-column-title">${protocolIcon(icon)}<span class="eyebrow">${label}</span></span><strong class="protocol-column-count">${column.total}</strong>${status === "PARA_DISTRIBUIR" ? '<button class="protocol-column-add" type="button" data-create-inline aria-label="Novo protocolo">+</button>' : ""}</div></header>
      <div class="protocol-column-cards" data-drop-status="${status}">${column.items.map(card).join("") || `<div class="protocol-empty-column">Nenhum protocolo nesta etapa.</div>`}</div>
    </section>`;
  }).join("");
  scrollByStatus.forEach((scrollTop, status) => {
    const column = $(`.protocol-column-cards[data-drop-status="${status}"]`, $("#board"));
    if (column) column.scrollTop = scrollTop;
  });
  $("#board").classList.remove("is-loading"); $("#board").setAttribute("aria-busy", "false");
}

function populateSelect(id, values, emptyLabel) {
  const select = $(id); const selected = select.value;
  select.innerHTML = `<option value="">${emptyLabel}</option>${values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`).join("")}`;
  select.value = selected;
}
function populateDatalist(id, values) { $(id).innerHTML = values.map((value) => `<option value="${escapeHtml(value)}"></option>`).join(""); }
function applyMetadata(metadata) {
  state.metadata = metadata;
  populateSelect("#filter-ato", metadata.atos || [], "Todos"); populateSelect("#filter-digitador", metadata.digitadores || [], "Todos"); populateSelect("#filter-tag", metadata.tags || [], "Todas");
  populateDatalist("#ato-options", metadata.atos || []); populateDatalist("#digitador-options", metadata.digitadores || []); populateDatalist("#tag-options", metadata.tags || []);
}

async function loadBoard() {
  const token = ++state.boardLoadToken;
  const query = new URLSearchParams({ ...state.filters, includeArchived: $("#show-archived").checked ? "1" : "0" });
  const data = await api(`/api/board?${query}`);
  if (token !== state.boardLoadToken) return;
  state.board = data.columns; state.cursor = Math.max(state.cursor, Number(data.cursor || 0)); applyMetadata(data.metadata); renderBoard();
}

function findProtocol(id) {
  for (const column of Object.values(state.board)) { const found = column.items?.find((item) => String(item.id) === String(id)); if (found) return found; }
  return null;
}

function modalFieldElements() {
  return $$("[data-field]", $("#protocol-dialog"));
}

function fieldValue(element) {
  return element.type === "checkbox" ? (element.checked ? 1 : 0) : element.value;
}

function normalizeField(field, value) {
  if (field === "ficha") return value === "" || value === null ? null : Number(value);
  if (field === "valor_ato") {
    const normalized = String(value ?? "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
    return normalized === "" ? null : Number(normalized);
  }
  return value ?? "";
}

function comparableFieldValue(field, value) {
  const normalized = normalizeField(field, value);
  return normalized === null ? "" : String(normalized);
}

function displayFieldValue(field, value) {
  if (field === "valor_ato" && value !== null && value !== "") {
    return Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return value ?? "";
}

function setModalFieldValue(element, value) {
  if (element.type === "checkbox") element.checked = Number(value || 0) === 1;
  else element.value = displayFieldValue(element.dataset.field, value);
}

function setSavedFieldValue(element, value) {
  element.dataset.savedValue = comparableFieldValue(element.dataset.field, value);
}

function updateModalSummary(protocol = state.current) {
  if (!protocol) return;
  $("#modal-title").textContent = ficha(protocol.ficha);
  $("#overview-ficha").textContent = ficha(protocol.ficha);
  $("#overview-ato").textContent = protocol.ato || "-";
  $("#overview-digitador").textContent = protocol.digitador || "-";
  $("#overview-date").textContent = dateBr(protocol.data_apresentacao);
  $("#protocol-dialog").style.setProperty("--protocol-tag-color", protocol.tag_cor || "#2563eb");
  $("#protocol-dialog").classList.toggle("is-urgent", Number(protocol.urgente || 0) === 1);
}

function captureModalScroll() {
  const body = $(".protocols-dialog-body", $("#protocol-dialog"));
  return {
    dialog: $("#protocol-dialog").scrollTop,
    body: body?.scrollTop || 0,
    notes: $("#notes")?.scrollTop || 0
  };
}

function restoreModalScroll(position) {
  if (!position) return;
  const apply = () => {
    const dialog = $("#protocol-dialog");
    const body = $(".protocols-dialog-body", dialog);
    dialog.scrollTop = position.dialog;
    if (body) body.scrollTop = position.body;
    if ($("#notes")) $("#notes").scrollTop = position.notes;
  };
  apply();
  requestAnimationFrame(apply);
}

function fillModal(data) {
  state.current = data.protocol;
  state.lists = { properties: data.properties || [], values: data.values || [], notes: data.notes || [] };
  state.dirtyFields.clear();
  state.savingFields.clear();
  state.deferredFields.clear();
  state.deferredLists.clear();
  $("#modal-notice").classList.add("is-hidden");
  $("#modal-notice").textContent = "";
  updateModalSummary();
  modalFieldElements().forEach((element) => {
    const value = state.current[element.dataset.field];
    setModalFieldValue(element, value);
    setSavedFieldValue(element, value);
  });
  renderLists();
  renderModalPresence();
}

function childInput(resource, item, field, icon, placeholder, options = {}) {
  const value = options.money
    ? Number(item[field] || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : (item[field] ?? "");
  return `<div class="protocol-subitem-field">${protocolIcon(icon)}<input ${options.money ? 'inputmode="decimal"' : 'type="text"'} data-child-resource="${resource}" data-child-id="${item.id}" data-child-field="${field}" value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}"></div>`;
}

function renderList(resource) {
  const items = state.lists[resource] || [];
  const host = $(`#${resource}`);
  if (!host) return;
  if (resource === "properties") {
    host.innerHTML = items.length ? items.map((item) => `<article class="protocol-subitem node-subitem" data-child-resource-row="properties">${childInput("properties", item, "matricula", "map", "Matrícula")}${childInput("properties", item, "area", "file", "Área")}<button type="button" data-delete-child="properties" data-id="${item.id}">${protocolIcon("trash")}<span>Remover</span></button></article>`).join("") : '<div class="protocol-empty-column">Nenhuma matrícula adicionada.</div>';
    return;
  }
  if (resource === "values") {
    host.innerHTML = items.length ? items.map((item) => `<article class="protocol-subitem node-subitem" data-child-resource-row="values">${childInput("values", item, "descricao", "file", "Descrição")}${childInput("values", item, "valor", "money", "Valor", { money: true })}<button type="button" data-delete-child="values" data-id="${item.id}">${protocolIcon("trash")}<span>Remover</span></button></article>`).join("") : '<div class="protocol-empty-column">Nenhum valor adicional.</div>';
    const total = items.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    const totalEl = $("#values-total");
    if (totalEl) totalEl.textContent = `Total adicional: ${money(total)}`;
    return;
  }
  host.innerHTML = items.length ? items.map((item) => `<article class="protocol-note node-subitem is-note" data-child-resource-row="notes"><div class="protocol-note-head"><div class="protocol-note-meta">${protocolIcon("note")}<small>${dateBr(item.created_at)}</small></div><button class="protocol-note-remove" type="button" data-delete-child="notes" data-id="${item.id}" aria-label="Remover andamento">${protocolIcon("trash")}</button></div><div class="protocol-note-field"><textarea data-child-resource="notes" data-child-id="${item.id}" data-child-field="descricao" rows="3">${escapeHtml(item.descricao || "")}</textarea></div></article>`).join("") : '<div class="protocol-empty-column">Nenhum andamento.</div>';
}

function renderLists() {
  renderList("properties");
  renderList("values");
  renderList("notes");
}

function renderModalPresence() {
  if (!state.current) return;
  const people = ownPresence(state.current.id);
  $("#modal-presence").innerHTML = people.length ? `<span class="protocol-presence">${protocolIcon("user")} ${escapeHtml(people.map((person) => person.name).join(", "))} também ${people.length === 1 ? "está" : "estão"} nesta ficha</span>` : "";
}

function shouldReduceMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function clearDialogBackdrop() {
  clearTimeout(state.dialogBackdropTimer);
  document.body.classList.remove("protocol-dialog-backdrop-active", "protocol-dialog-backdrop-open", "protocol-dialog-backdrop-closing");
}

function openDialogBackdrop() {
  clearDialogBackdrop();
  if (shouldReduceMotion()) return;
  document.body.classList.add("protocol-dialog-backdrop-active");
  void document.body.offsetHeight;
  document.body.classList.add("protocol-dialog-backdrop-open");
}

function closeDialogBackdrop() {
  if (shouldReduceMotion()) return clearDialogBackdrop();
  document.body.classList.remove("protocol-dialog-backdrop-open");
  document.body.classList.add("protocol-dialog-backdrop-active", "protocol-dialog-backdrop-closing");
  state.dialogBackdropTimer = setTimeout(clearDialogBackdrop, 230);
}

function setDialogOrigin(event) {
  if (!event) return;
  const dialog = $("#protocol-dialog");
  dialog.style.setProperty("--protocol-modal-origin-x", `${Math.round(event.clientX || innerWidth / 2)}px`);
  dialog.style.setProperty("--protocol-modal-origin-y", `${Math.round(event.clientY || innerHeight / 2)}px`);
}

function animateOpeningCard(cardElement, event) {
  if (!cardElement || shouldReduceMotion()) return;
  const rect = cardElement.getBoundingClientRect();
  cardElement.style.setProperty("--protocol-card-click-x", `${Math.max(0, Math.min(rect.width, (event?.clientX || rect.left + rect.width / 2) - rect.left))}px`);
  cardElement.style.setProperty("--protocol-card-click-y", `${Math.max(0, Math.min(rect.height, (event?.clientY || rect.top + rect.height / 2) - rect.top))}px`);
  cardElement.classList.remove("is-card-opening");
  void cardElement.offsetWidth;
  cardElement.classList.add("is-card-opening");
  setTimeout(() => cardElement.classList.remove("is-card-opening"), 380);
}

async function openProtocol(id, event = null, cardElement = null) {
  animateOpeningCard(cardElement, event);
  const data = await api(`/api/protocols/${id}`);
  fillModal(data);
  const dialog = $("#protocol-dialog");
  if (!dialog.open) {
    setDialogOrigin(event);
    dialog.classList.remove("is-closing");
    dialog.classList.add("is-opening");
    openDialogBackdrop();
    dialog.showModal();
    setTimeout(() => dialog.classList.remove("is-opening"), shouldReduceMotion() ? 0 : 320);
  }
  dialog.scrollTop = 0;
  $(".protocols-dialog-body", dialog).scrollTop = 0;
  send({ type: "presence.open", protocolId: Number(id) });
}

async function closeDialog() {
  const dialog = $("#protocol-dialog");
  if (!dialog.open || dialog.classList.contains("is-closing")) return;
  const pendingSave = flushSave();
  send({ type: "presence.close" });
  const finish = () => {
    if (dialog.open) dialog.close();
    state.current = null;
    state.deferredFields.clear();
    state.deferredLists.clear();
    loadBoard().catch(console.error);
  };
  if (shouldReduceMotion()) {
    await pendingSave;
    clearDialogBackdrop();
    finish();
    return;
  }
  dialog.classList.remove("is-opening");
  dialog.classList.add("is-closing");
  closeDialogBackdrop();
  clearTimeout(state.dialogCloseTimer);
  await Promise.all([
    pendingSave,
    new Promise((resolve) => {
      state.dialogCloseTimer = setTimeout(resolve, 210);
    })
  ]);
  finish();
}

function queueSave(element) {
  const field = element?.dataset.field;
  if (!field) return;
  state.dirtyFields.add(field);
  state.deferredFields.delete(field);
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(flushSave, element.tagName === "TEXTAREA" ? 520 : 280);
}

async function flushSave() {
  clearTimeout(state.saveTimer);
  state.saveQueue = state.saveQueue.then(async () => {
    if (!state.current) return;
    const changes = {};
    const expected = {};
    const submitted = new Map();
    modalFieldElements().forEach((element) => {
      const field = element.dataset.field;
      if (!state.dirtyFields.has(field)) return;
      const value = normalizeField(field, fieldValue(element));
      const saved = element.dataset.savedValue ?? comparableFieldValue(field, state.current[field]);
      if (comparableFieldValue(field, value) === saved) {
        state.dirtyFields.delete(field);
        return;
      }
      changes[field] = value;
      expected[field] = normalizeField(field, state.current[field]);
      submitted.set(field, { element, value: comparableFieldValue(field, value) });
      state.savingFields.add(field);
    });
    if (!Object.keys(changes).length) return;
    const baseRevision = state.current.revision;
    const id = state.current.id;
    try {
      const result = await api(`/api/protocols/${id}`, { method: "PATCH", body: { operationId: operationId(), baseRevision, changes, expected } });
      if (state.current?.id !== id) return;
      state.current = { ...state.current, ...result.protocol };
      submitted.forEach(({ element, value }, field) => {
        state.savingFields.delete(field);
        state.deferredFields.delete(field);
        if (comparableFieldValue(field, fieldValue(element)) === value) {
          state.dirtyFields.delete(field);
          setSavedFieldValue(element, result.protocol[field]);
        }
      });
      updateModalSummary();
    } catch (error) {
      submitted.forEach((entry, field) => state.savingFields.delete(field));
      if (error.status === 409) {
        $("#modal-notice").classList.remove("is-hidden");
        $("#modal-notice").textContent = `Outro usuário alterou: ${(error.data.fields || []).join(", ")}. Seu texto foi mantido para você revisar.`;
        if (error.data.protocol) applyExternalProtocolToModal(error.data.protocol, error.data.fields || []);
      } else {
        toast(error.message, "error");
      }
    }
  });
  return state.saveQueue;
}

function canApplyExternalField(element) {
  const field = element.dataset.field;
  return document.activeElement !== element && !state.dirtyFields.has(field) && !state.savingFields.has(field);
}

function flashExternalField(element) {
  const field = element.dataset.field;
  clearTimeout(state.externalHighlightTimers.get(field));
  element.classList.remove("is-data-external-update");
  void element.offsetWidth;
  element.classList.add("is-data-external-update");
  state.externalHighlightTimers.set(field, setTimeout(() => {
    element.classList.remove("is-data-external-update");
    state.externalHighlightTimers.delete(field);
  }, 1000));
}

function applyExternalProtocolToModal(protocol, changedFields = []) {
  if (!state.current || String(state.current.id) !== String(protocol?.id || "")) return;
  if (Number(protocol.revision || 0) < Number(state.current.revision || 0)) return;
  const previous = state.current;
  const next = { ...previous };
  const requested = new Set(changedFields || []);
  modalFieldElements().forEach((element) => {
    const field = element.dataset.field;
    const changed = requested.size
      ? requested.has(field)
      : comparableFieldValue(field, previous[field]) !== comparableFieldValue(field, protocol[field]);
    if (!changed) return;
    if (canApplyExternalField(element)) {
      setModalFieldValue(element, protocol[field]);
      setSavedFieldValue(element, protocol[field]);
      next[field] = protocol[field];
      state.deferredFields.delete(field);
      flashExternalField(element);
    } else {
      state.deferredFields.set(field, protocol[field]);
    }
  });
  for (const [key, value] of Object.entries(protocol)) {
    if (!modalFieldElements().some((element) => element.dataset.field === key)) next[key] = value;
  }
  state.current = next;
  updateModalSummary();
}

function applyDeferredField(field) {
  const element = $(`[data-field="${field}"]`, $("#protocol-dialog"));
  if (!element || !state.deferredFields.has(field) || !canApplyExternalField(element)) return;
  const value = state.deferredFields.get(field);
  state.deferredFields.delete(field);
  setModalFieldValue(element, value);
  setSavedFieldValue(element, value);
  state.current[field] = value;
  updateModalSummary();
  flashExternalField(element);
}

function activeChildResource() {
  return document.activeElement?.dataset?.childResource || "";
}

function hasPendingChildEdits(resource) {
  return Boolean($(`[data-child-resource-row="${resource}"][data-child-dirty="true"], [data-child-resource-row="${resource}"][data-child-saving="true"]`, $("#protocol-dialog")));
}

function applyExternalList(resource, items) {
  if (activeChildResource() === resource || hasPendingChildEdits(resource)) {
    state.deferredLists.set(resource, items);
    return;
  }
  const scroll = captureModalScroll();
  state.lists[resource] = items;
  renderList(resource);
  restoreModalScroll(scroll);
}

async function refreshExternalLists(message) {
  const resources = (message.changedFields || []).filter((field) => ["properties", "values", "notes"].includes(field));
  if (!resources.length || !state.current) return;
  const token = ++state.modalSyncToken;
  const protocolId = state.current.id;
  const details = await api(`/api/protocols/${protocolId}`);
  if (token !== state.modalSyncToken || state.current?.id !== protocolId) return;
  applyExternalProtocolToModal(details.protocol, []);
  resources.forEach((resource) => applyExternalList(resource, details[resource] || []));
}

async function createChild(resource, body) {
  const protocolId = state.current.id;
  const scroll = captureModalScroll();
  const data = await api(`/api/protocols/${protocolId}/${resource}`, { method: "POST", body });
  if (state.current?.id !== protocolId) return;
  state.current = { ...state.current, ...data.protocol };
  const details = await api(`/api/protocols/${protocolId}`);
  state.lists[resource] = details[resource] || [];
  renderList(resource);
  updateModalSummary();
  restoreModalScroll(scroll);
}

async function saveChild(element) {
  const resource = element.dataset.childResource;
  const id = element.dataset.childId;
  const article = element.closest("[data-child-resource-row]");
  if (!article || article.dataset.childDirty !== "true" || article.dataset.childSaving === "true") return;
  const editVersion = Number(article.dataset.childEditVersion || 0);
  article.dataset.childSaving = "true";
  const body = {};
  $$(`[data-child-resource="${resource}"]`, article).forEach((input) => {
    const field = input.dataset.childField;
    body[field] = resource === "values" && field === "valor"
      ? (normalizeField("valor_ato", input.value) || 0)
      : input.value;
  });
  try {
    const result = await api(`/api/${resource}/${id}`, { method: "PATCH", body });
    if (Number(article.dataset.childEditVersion || 0) === editVersion) article.dataset.childDirty = "false";
    if (state.current?.id === result.protocol?.id) state.current = { ...state.current, ...result.protocol };
  } finally {
    article.dataset.childSaving = "false";
    if (article.dataset.childDirty === "true") {
      clearTimeout(article._saveTimer);
      article._saveTimer = setTimeout(() => {
        const pendingInput = $(`[data-child-resource="${resource}"]`, article);
        if (pendingInput) saveChild(pendingInput).catch((error) => toast(error.message, "error"));
      }, 180);
    }
  }
  if (state.current && state.deferredLists.has(resource) && !hasPendingChildEdits(resource)) {
    state.deferredLists.delete(resource);
    const scroll = captureModalScroll();
    const protocolId = state.current.id;
    const details = await api(`/api/protocols/${protocolId}`);
    if (state.current?.id !== protocolId) return;
    state.current = { ...state.current, ...details.protocol };
    state.lists[resource] = details[resource] || [];
    renderList(resource);
    updateModalSummary();
    restoreModalScroll(scroll);
  }
}

function connectRealtime() {
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  const socket = new WebSocket(`${protocol}//${location.host}/ws`);
  state.ws = socket;
  socket.addEventListener("open", () => {
    clearTimeout(state.reconnectTimer);
    send({ type: "hello", user });
    if (state.current) send({ type: "presence.open", protocolId: state.current.id });
    setConnection(true);
  });
  socket.addEventListener("message", (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }
    if (message.type === "presence.snapshot" || message.type === "realtime.ready") {
      state.presence = { ...state.presence, ...message.presence };
      renderPresenceIndicators();
      return;
    }
    if (!message.protocol) return;
    state.cursor = Math.max(state.cursor, Number(message.cursor || 0));
    const isCurrent = String(state.current?.id || "") === String(message.protocol.id || "");
    const isExternal = String(message.user?.id || "") !== String(user.id || "");
    if (isCurrent && isExternal) {
      applyExternalProtocolToModal(message.protocol, message.changedFields || []);
      refreshExternalLists(message).catch(console.error);
    }
    scheduleBoardReload();
  });
  socket.addEventListener("close", () => {
    if (state.ws !== socket) return;
    setConnection(false);
    clearTimeout(state.reconnectTimer);
    state.reconnectTimer = setTimeout(connectRealtime, 1800);
  });
}

function send(message) {
  if (state.ws?.readyState === WebSocket.OPEN) state.ws.send(JSON.stringify(message));
}

function setConnection(online) {
  let indicator = $(".connection-indicator");
  if (!indicator) {
    indicator = document.createElement("span");
    indicator.className = "connection-indicator";
    indicator.setAttribute("role", "status");
    document.body.appendChild(indicator);
  }
  const label = online ? "Sincronização conectada" : "Reconectando a sincronização";
  indicator.className = `connection-indicator is-${online ? "online" : "offline"}`;
  indicator.setAttribute("aria-label", label);
  indicator.title = label;
  indicator.innerHTML = protocolIcon(online ? "sync" : "offline");
}

let dragged = null;

function setDropTarget(target) {
  const board = $("#board");
  const nextTarget = target && dragged && target.dataset.dropStatus !== dragged.status ? target : null;
  if (dragged?.dropTarget === nextTarget) return;
  $$(".protocol-column-cards.is-drop-target", board).forEach((element) => element.classList.remove("is-drop-target"));
  $$(".protocol-column.is-drop-target", board).forEach((element) => element.classList.remove("is-drop-target"));
  if (dragged) dragged.dropTarget = nextTarget;
  if (!nextTarget) return;
  nextTarget.classList.add("is-drop-target");
  nextTarget.closest(".protocol-column")?.classList.add("is-drop-target");
}

function clearDragFeedback() {
  const board = $("#board");
  board.classList.remove("is-board-dragging");
  setDropTarget(null);
  dragged?.element?.classList.remove("is-dragging");
}

$("#board").addEventListener("click", async (event) => {
  if (event.target.closest("[data-create-inline]")) {
    const created = await api("/api/protocols", { method:"POST", body:{ operationId:operationId() } });
    await loadBoard(); await openProtocol(created.protocol.id); return;
  }
  const cardElement = event.target.closest(".protocol-card"); if (!cardElement) return;
  const action = event.target.closest("[data-card-action]")?.dataset.cardAction;
  const protocol = findProtocol(cardElement.dataset.id);
  if (!action) return openProtocol(cardElement.dataset.id, event, cardElement).catch((error) => toast(error.message, "error"));
  event.stopPropagation();
  if (action === "open") return openProtocol(cardElement.dataset.id, event, cardElement).catch((error) => toast(error.message, "error"));
  if (action === "delete") {
    const confirmed = await confirmAction({
      title: "Excluir protocolo?",
      message: "Esta ação marca o protocolo como excluído. Os dados permanecem preservados no banco.",
      summary: `${ficha(protocol.ficha)}${protocol.ato ? ` • ${protocol.ato}` : ""}`,
      confirmLabel: "Excluir protocolo"
    });
    if (!confirmed) return;
    await api(`/api/protocols/${protocol.id}`, { method:"DELETE", body:{ operationId:operationId() } });
  } else {
    const nextStatus = protocol.status === "ARQUIVADOS" ? "PARA_DISTRIBUIR" : "ARQUIVADOS";
    await api(`/api/protocols/${protocol.id}`, { method:"PATCH", body:{ operationId:operationId(), baseRevision:protocol.revision, changes:{status:nextStatus}, expected:{status:protocol.status} } });
  }
  await loadBoard();
});
$("#board").addEventListener("dragstart", (event) => {
  const card = event.target.closest(".protocol-card");
  if (!card) return;
  dragged = { id: Number(card.dataset.id), status: card.dataset.status, element: card };
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", String(dragged.id));
  $("#board").classList.add("is-board-dragging");
  requestAnimationFrame(() => card.classList.add("is-dragging"));
});
$("#board").addEventListener("dragover", (event) => {
  const target = event.target.closest("[data-drop-status]");
  if (!target || !dragged) return;
  if (target.dataset.dropStatus !== dragged.status) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }
  setDropTarget(target);
});
$("#board").addEventListener("dragleave", (event) => {
  if (!$("#board").contains(event.relatedTarget)) setDropTarget(null);
});
$("#board").addEventListener("dragend", () => {
  clearDragFeedback();
  dragged = null;
});
$("#board").addEventListener("drop", async (event) => {
  const target = event.target.closest("[data-drop-status]");
  if (!target || !dragged || target.dataset.dropStatus === dragged.status) return;
  event.preventDefault();
  const moving = dragged;
  const protocol = findProtocol(moving.id);
  clearDragFeedback();
  try {
    await api(`/api/protocols/${moving.id}`, {
      method: "PATCH",
      body: {
        operationId: operationId(),
        baseRevision: protocol.revision,
        changes: { status: target.dataset.dropStatus },
        expected: { status: moving.status }
      }
    });
    await loadBoard();
    toast("Protocolo movido.");
  } catch (error) {
    toast(error.message, "error");
  } finally {
    dragged = null;
  }
});

function filterChips() {
  const chips = [];
  if (state.filters.q) chips.push({ type: "q", label: `Busca: ${state.filters.q}` });
  if (state.filters.ato) chips.push({ type: "ato", label: `Ato: ${$("#filter-ato").options[$("#filter-ato").selectedIndex]?.text || state.filters.ato}` });
  if (state.filters.digitador) chips.push({ type: "digitador", label: `Digitador: ${$("#filter-digitador").options[$("#filter-digitador").selectedIndex]?.text || state.filters.digitador}` });
  if (state.filters.urgente) chips.push({ type: "urgente", label: "Urgentes" });
  if (state.filters.tag_custom) chips.push({ type: "tag_custom", label: `Etiqueta: ${$("#filter-tag").options[$("#filter-tag").selectedIndex]?.text || state.filters.tag_custom}` });
  if ($("#show-archived").checked) chips.push({ type: "archived", label: "Arquivados visíveis" });
  return chips;
}

function renderActiveFilters() {
  const activeFilters = $("#active-filters");
  if (!activeFilters) return;
  const chips = filterChips();
  activeFilters.innerHTML = chips.length
      ? chips.map((chip) => `
          <button class="protocol-filter-chip" type="button" data-clear-filter="${escapeHtml(chip.type)}" aria-label="Remover filtro ${escapeHtml(chip.label)}">
              <span class="protocol-filter-chip-label">${escapeHtml(chip.label)}</span>
              <span class="protocol-filter-chip-remove" aria-hidden="true">
                  <svg viewBox="0 0 24 24" focusable="false"><path d="m7 7 10 10M17 7 7 17"></path></svg>
              </span>
          </button>
      `).join("")
      : `<span class="protocol-filter-hint">Os filtros são aplicados automaticamente conforme você ajusta os campos.</span>`;
}

function clearFilter(type) {
  if (type === "q") { $("#search").value = ""; }
  else if (type === "ato") { $("#filter-ato").value = ""; }
  else if (type === "digitador") { $("#filter-digitador").value = ""; }
  else if (type === "urgente") { $("#filter-urgent").checked = false; }
  else if (type === "tag_custom") { $("#filter-tag").value = ""; }
  else if (type === "archived") { $("#show-archived").checked = false; }
  updateFilters();
}

$("#active-filters")?.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-clear-filter]");
  if (!trigger) return;
  clearFilter(trigger.dataset.clearFilter);
});

let filterTimer = 0;
function updateFilters() { 
  state.filters = { q: $("#search").value.trim(), ato: $("#filter-ato").value, digitador: $("#filter-digitador").value, tag_custom: $("#filter-tag").value, urgente: $("#filter-urgent").checked ? "1" : "" }; 
  renderActiveFilters();
  loadBoard().catch((error) => toast(error.message, "error")); 
}
$("#search").addEventListener("input", () => { clearTimeout(filterTimer); filterTimer = setTimeout(updateFilters, 300); });
for (const id of ["#filter-ato", "#filter-digitador", "#filter-tag", "#filter-urgent", "#show-archived"]) $(id).addEventListener("change", updateFilters);

// Render initial filter hint
renderActiveFilters();
$("#close-dialog").addEventListener("click", closeDialog);
$("#protocol-dialog").addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
$("#protocol-dialog").addEventListener("close", () => {
  $("#protocol-dialog").classList.remove("is-opening", "is-closing");
  clearDialogBackdrop();
});
$("#protocol-dialog").addEventListener("input", (event) => {
  if (event.target.matches("[data-field]")) queueSave(event.target);
  if (event.target.matches("[data-child-field]")) {
    const row = event.target.closest("[data-child-resource-row]");
    if (!row) return;
    row.dataset.childDirty = "true";
    row.dataset.childEditVersion = String(Number(row.dataset.childEditVersion || 0) + 1);
    clearTimeout(row._saveTimer);
    row._saveTimer = setTimeout(() => saveChild(event.target).catch((error) => toast(error.message, "error")), 650);
    // Update values total live while typing
    if (event.target.dataset.childResource === "values" && event.target.dataset.childField === "valor") {
      const totalEl = $("#values-total");
      if (totalEl) {
        const allValueInputs = $$("[data-child-resource='values'][data-child-field='valor']");
        const liveTotal = allValueInputs.reduce((sum, input) => {
          const raw = input.value.replace(/\./g, "").replace(",", ".");
          return sum + (Number(raw) || 0);
        }, 0);
        totalEl.textContent = `Total adicional: ${money(liveTotal)}`;
      }
    }
  }
});
$("#protocol-dialog").addEventListener("focusout", (event) => {
  if (event.target.matches("[data-field]")) {
    const field = event.target.dataset.field;
    flushSave().then(() => applyDeferredField(field)).catch((error) => toast(error.message, "error"));
  }
  if (event.target.matches("[data-child-field]")) {
    const row = event.target.closest("[data-child-resource-row]");
    if (row && !row.contains(event.relatedTarget)) {
      clearTimeout(row._saveTimer);
      saveChild(event.target).catch((error) => toast(error.message, "error"));
    }
  }
});
$("#add-property").addEventListener("click", () => createChild("properties", { matricula: "", area: "" }).catch((error) => toast(error.message, "error")));
$("#add-value").addEventListener("click", () => createChild("values", { descricao: "", valor: 0 }).catch((error) => toast(error.message, "error")));
$("#add-note").addEventListener("click", async () => { const description = $("#new-note").value.trim(); if (!description) return; await createChild("notes", { descricao: description }); $("#new-note").value = ""; });
$("#protocol-dialog").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-child]");
  if (!button) return;
  const resource = button.dataset.deleteChild;
  const labels = {
    notes: ["Excluir andamento?", "Esta ação remove o andamento selecionado desta ficha.", "Excluir andamento"],
    properties: ["Excluir imóvel?", "Esta ação remove a matrícula selecionada desta ficha.", "Excluir imóvel"],
    values: ["Excluir valor adicional?", "Esta ação remove o valor selecionado desta ficha.", "Excluir valor"]
  };
  const [title, message, confirmLabel] = labels[resource] || ["Remover item?", "Esta ação remove o item selecionado.", "Remover"];
  const row = button.closest("[data-child-resource-row]");
  const summary = $("textarea, input", row)?.value?.trim() || `Item ${button.dataset.id}`;
  const confirmed = await confirmAction({ title, message, summary, confirmLabel });
  if (!confirmed || !state.current) return;
  const protocolId = state.current.id;
  const scroll = captureModalScroll();
  const result = await api(`/api/${resource}/${button.dataset.id}`, { method: "DELETE", body: {} });
  if (state.current?.id !== protocolId) return;
  state.current = { ...state.current, ...result.protocol };
  const details = await api(`/api/protocols/${protocolId}`);
  state.lists[resource] = details[resource] || [];
  renderList(resource);
  updateModalSummary();
  restoreModalScroll(scroll);
});
$("#duplicate").addEventListener("click", async () => { const data = await api(`/api/protocols/${state.current.id}/duplicate`, { method: "POST", body: {} }); await closeDialog(); await openProtocol(data.protocol.id); });
$("#print").addEventListener("click", () => printProtocolSheet({
  current: state.current,
  protocolTitle: (protocol) => ficha(protocol.ficha),
  logoPath: new URL("../../img/logo.png", import.meta.url).toString(),
  apiGet: async (resource) => {
    const details = state.current ? await api(`/api/protocols/${state.current.id}`) : null;
    if (resource === "protocolos") return details?.protocol;
    if (resource === "valores") return details?.values || [];
    if (resource === "andamentos") return details?.notes || [];
    if (resource === "imoveis") return details?.properties || [];
    return [];
  }
}).catch((error) => toast(error.message, "error")));

for (const selector of ["#confirm-cancel", "#confirm-close", "#confirm-overlay"]) {
  $(selector)?.addEventListener("click", () => finishConfirmation(false));
}
$("#confirm-accept")?.addEventListener("click", () => finishConfirmation(true));
$("#confirm-dialog")?.addEventListener("cancel", (event) => {
  event.preventDefault();
  finishConfirmation(false);
});

$$("[data-node-icon]").forEach((element) => {
  element.innerHTML = protocolIcon(element.dataset.nodeIcon);
});

setInterval(() => send({ type: "ping" }), 25000);
setInterval(async () => {
  if (document.hidden || state.ws?.readyState === WebSocket.OPEN) return;
  try {
    const data = await api(`/api/changes?after=${state.cursor}`);
    state.cursor = Number(data.cursor || state.cursor);
    if (data.events?.length) {
      for (const item of data.events) {
        if (!item.protocol || String(item.protocol.id) !== String(state.current?.id || "")) continue;
        const resource = String(item.action || "").split(".")[0];
        const changedFields = ["properties", "values", "notes"].includes(resource) ? [resource] : [];
        applyExternalProtocolToModal(item.protocol, changedFields);
        if (changedFields.length) await refreshExternalLists({ protocol: item.protocol, changedFields });
      }
      await loadBoard();
    }
  } catch {}
}, 20000);
connectRealtime();
loadBoard().catch((error) => toast(error.message, "error"));
