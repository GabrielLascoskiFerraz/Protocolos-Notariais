import { apiGet, apiPost } from "./api.js";
import { protocolIcon } from "./icons.js";
import { printProtocolSheet } from "./pdf.js";

const metadata = window.PROTOCOLOS_METADATA || {};
const atoColors = metadata.atoColors || {};
const atoColorsLower = Object.fromEntries(
    Object.entries(atoColors).map(([name, color]) => [String(name).toLowerCase(), color])
);
const filterMetadata = {
    atos: new Set(metadata.atos || []),
    atoOptions: new Set(metadata.atoOptions || metadata.atos || []),
    digitadores: new Set(metadata.digitadores || []),
    tags: new Set(metadata.tags || [])
};
const LOGO_PATH = new URL("assets/img/logo.png", document.baseURI || window.location.href).toString();
const ARCHIVED_VISIBILITY_KEY = "protocolos.mostrarArquivados";

const statuses = [
    ["PARA_DISTRIBUIR", "Para distribuir"],
    ["EM_ANDAMENTO", "Em andamento"],
    ["PARALISADOS", "Paralisados"],
    ["PARA_CORRECAO", "Para correção"],
    ["LAVRADOS", "Lavrados"],
    ["ARQUIVADOS", "Arquivados"]
];
const PAGE_SIZE = 50;
const SYNC_INTERVAL_MS = 8000;
const VISIBLE_ANIMATION_LIMIT = 5;
const statusIcons = {
    PARA_DISTRIBUIR: "inbox",
    EM_ANDAMENTO: "progress",
    PARALISADOS: "pause",
    PARA_CORRECAO: "correction",
    LAVRADOS: "done",
    ARQUIVADOS: "archive"
};

const fields = [
    "ficha",
    "ato",
    "digitador",
    "apresentante",
    "data_apresentacao",
    "contato",
    "outorgantes",
    "outorgados",
    "valor_ato",
    "observacoes",
    "urgente",
    "tag_custom",
    "pasta_documentos"
];

const state = {
    filters: {
        q: "",
        ato: "",
        digitador: "",
        urgente: "",
        tag_custom: ""
    },
    pendingSearchQuery: "",
    showArchived: false,
    itemsByStatus: new Map(),
    totalsByStatus: new Map(),
    previousCountsByStatus: new Map(),
    loadingByStatus: new Set(),
    statusLoadTokens: new Map(),
    exhaustedByStatus: new Set(),
    current: null,
    currentLists: {
        properties: [],
        values: [],
        notes: [],
        documents: []
    },
    listLoadTokens: {
        properties: 0,
        values: 0,
        notes: 0,
        documents: 0
    },
    saveTimers: new Map(),
    boardReady: false,
    loadingBoard: false,
    lastError: "",
    lastSyncAt: "",
    syncingChanges: false,
    draggingProtocolId: "",
    draggingSourceStatus: "",
    draggingStartRect: null,
    pendingDeleteId: "",
    pendingDeleteNoteId: "",
    freshCardIds: new Set(),
    animationCleanupTimer: 0,
    filterMetadataRefreshTimer: 0,
    filterLoadToken: 0,
    archivedTransition: "",
    archivedToggleTimer: 0,
    archiveMotionTimer: 0,
    boardEntranceTimer: 0,
    boardHydrationTimer: 0,
    modalBoardRefreshPending: false,
    saveInFlight: new Map(),
    modalNoticeTimer: 0,
    toastTimer: 0,
    dialogCloseTimer: 0,
    dialogBackdropTimer: 0,
    activeCardFlights: new Set(),
    externalHighlightTimers: new Map(),
    protocolEventsConnected: false,
    protocolEventSource: null,
    boardLoadController: null,
    boardLoadToken: 0,
    activeDropStatus: ""
};

function loadArchivedVisibilityPreference() {
    try {
        return window.localStorage.getItem(ARCHIVED_VISIBILITY_KEY) === "1";
    } catch {
        return false;
    }
}

function saveArchivedVisibilityPreference(value) {
    try {
        window.localStorage.setItem(ARCHIVED_VISIBILITY_KEY, value ? "1" : "0");
    } catch {
        // Local persistence is optional; the board keeps working without it.
    }
}

const dom = {
    board: document.getElementById("protocols-board"),
    search: document.getElementById("protocols-search"),
    ato: document.getElementById("protocols-filter-ato"),
    digitador: document.getElementById("protocols-filter-digitador"),
    tag: document.getElementById("protocols-filter-tag"),
    urgente: document.getElementById("protocols-filter-urgente"),
    archived: document.getElementById("protocols-toggle-archived"),
    create: document.getElementById("protocols-create"),
    activeFilters: document.getElementById("protocols-active-filters"),
    dialog: document.getElementById("protocols-dialog"),
    close: document.getElementById("protocols-close"),
    duplicate: document.getElementById("protocols-duplicate"),
    print: document.getElementById("protocols-print"),
    title: document.getElementById("protocols-modal-title"),
    subtitle: document.getElementById("protocols-modal-subtitle"),
    modalNotice: document.getElementById("protocols-modal-notice"),
    overviewFicha: document.getElementById("protocols-overview-ficha"),
    overviewAto: document.getElementById("protocols-overview-ato"),
    overviewDigitador: document.getElementById("protocols-overview-digitador"),
    overviewData: document.getElementById("protocols-overview-data"),
    atoOptions: document.getElementById("protocols-ato-options"),
    digitadorOptions: document.getElementById("protocols-digitador-options"),
    tagOptions: document.getElementById("protocols-tag-options"),
    properties: document.getElementById("protocols-properties"),
    values: document.getElementById("protocols-values"),
    valuesTotal: document.getElementById("protocols-values-total"),
    notes: document.getElementById("protocols-notes"),
    notesFrame: document.getElementById("protocols-notes-frame"),
    notesHint: document.getElementById("protocols-notes-hint"),
    documentsPath: document.getElementById("protocols-documents-path"),
    documentsFeedback: document.getElementById("protocols-documents-feedback"),
    documentsSummary: document.getElementById("protocols-documents-summary"),
    documentsList: document.getElementById("protocols-documents-list"),
    refreshDocuments: document.getElementById("protocols-refresh-documents"),
    copyDocumentsPath: document.getElementById("protocols-copy-documents-path"),
    openDocumentsPath: document.getElementById("protocols-open-documents-path"),
    newNote: document.getElementById("protocols-new-note"),
    addNote: document.getElementById("protocols-add-note"),
    addProperty: document.getElementById("protocols-add-property"),
    addValue: document.getElementById("protocols-add-value"),
    deleteModal: document.getElementById("protocols-delete-modal"),
    deleteOverlay: document.getElementById("protocols-delete-overlay"),
    deleteClose: document.getElementById("protocols-delete-close"),
    deleteCancel: document.getElementById("protocols-delete-cancel"),
    deleteConfirm: document.getElementById("protocols-delete-confirm"),
    deleteSummary: document.getElementById("protocols-delete-summary"),
    noteDeleteModal: document.getElementById("protocols-note-delete-modal"),
    noteDeleteOverlay: document.getElementById("protocols-note-delete-overlay"),
    noteDeleteClose: document.getElementById("protocols-note-delete-close"),
    noteDeleteCancel: document.getElementById("protocols-note-delete-cancel"),
    noteDeleteConfirm: document.getElementById("protocols-note-delete-confirm"),
    noteDeleteSummary: document.getElementById("protocols-note-delete-summary")
};

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function selectorEscape(value) {
    if (window.CSS?.escape) return window.CSS.escape(String(value));
    return String(value).replace(/["\\\]]/g, "\\$&");
}

function normalize(value) {
    return String(value || "").trim();
}

function money(value) {
    const number = Number(value || 0);
    return number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function parseMoneyNumber(value) {
    const raw = normalize(value);
    if (!raw) return null;

    const clean = raw.replace(/[R$\s]/g, "");
    let normalized = clean;
    if (clean.includes(",")) {
        normalized = clean.replace(/\./g, "").replace(",", ".");
    } else if ((clean.match(/\./g) || []).length > 1) {
        normalized = clean.replace(/\./g, "");
    } else if (/^\d{1,3}\.\d{3}$/.test(clean)) {
        normalized = clean.replace(".", "");
    }

    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
}

function moneyDecimalValue(value) {
    const number = parseMoneyNumber(value);
    return number === null ? normalize(value) : number.toFixed(2);
}

function moneyInputValue(value) {
    const raw = normalize(value);
    if (!raw) return "";
    const number = parseMoneyNumber(raw);
    if (!Number.isFinite(number)) {
        return raw.replace(".", ",");
    }
    return number.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function normalizedProtocolFieldValue(field, value) {
    if (field === "ficha") return String(value ?? "").replace(/\D/g, "");
    if (field === "urgente") return Number(value || 0) === 1 ? "1" : "0";
    if (field === "valor_ato") {
        const raw = normalize(value);
        if (!raw) return "";
        return moneyDecimalValue(raw);
    }
    return normalize(value);
}

function dateBr(value) {
    if (!value) return "";
    const [year, month, day] = String(value).slice(0, 10).split("-");
    return year && month && day ? `${day}/${month}/${year}` : value;
}

function hasFicha(value) {
    const ficha = normalize(value);
    return ficha !== "" && /[1-9]/.test(ficha);
}

function fichaLabel(value) {
    return hasFicha(value) ? normalize(value) : "Não Possui Ficha";
}

function protocolTitle(item) {
    return hasFicha(item?.ficha) ? `Ficha ${fichaLabel(item.ficha)}` : fichaLabel(item?.ficha);
}

function searchTerms() {
    const query = normalize(state.filters.q);
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

function resolveTagColor(item = {}) {
    const explicit = normalize(item.tag_cor);
    if (explicit) return explicit;

    const ato = normalize(item.ato);
    if (!ato) return "#1f4f8f";

    return atoColors[ato] || atoColorsLower[ato.toLowerCase()] || "#1f4f8f";
}

function lowerValue(value) {
    return normalize(value).toLocaleLowerCase("pt-BR");
}

function optionExists(select, value) {
    if (!select) return true;
    const wanted = String(value);
    return [...select.options].some((option) => option.value === wanted);
}

function addSelectOption(select, value, label = value) {
    if (!select || !normalize(label) || optionExists(select, value)) return;
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    select.appendChild(option);
    const fixed = [...select.options].slice(1).sort((left, right) => left.text.localeCompare(right.text, "pt-BR"));
    select.replaceChildren(select.options[0], ...fixed);
}

function addDatalistOption(datalist, value) {
    const label = normalize(value);
    if (!datalist || !label) return;
    if ([...datalist.options].some((option) => option.value === label)) return;
    const option = document.createElement("option");
    option.value = label;
    datalist.appendChild(option);
}

function uniqueSortedLabels(values = []) {
    const map = new Map();
    values.forEach((value) => {
        const label = normalize(value);
        const key = lowerValue(label);
        if (key && !map.has(key)) map.set(key, label);
    });
    return [...map.values()].sort((left, right) => left.localeCompare(right, "pt-BR"));
}

function replaceSelectOptions(select, values = [], valueForLabel = (label) => label) {
    if (!select) return;
    const firstOption = select.options[0]?.cloneNode(true) || new Option("Todos", "");
    const options = uniqueSortedLabels(values).map((label) => {
        const option = document.createElement("option");
        option.value = valueForLabel(label);
        option.textContent = label;
        return option;
    });
    select.replaceChildren(firstOption, ...options);
}

function replaceDatalistOptions(datalist, values = []) {
    if (!datalist) return;
    const options = uniqueSortedLabels(values).map((label) => {
        const option = document.createElement("option");
        option.value = label;
        return option;
    });
    datalist.replaceChildren(...options);
}

function replaceTagOptions(values = []) {
    const selectedValue = state.filters.tag_custom || dom.tag?.value || "";
    const labels = uniqueSortedLabels(values);
    filterMetadata.tags = new Set(labels);
    replaceSelectOptions(dom.tag, labels, (label) => lowerValue(label));
    replaceDatalistOptions(dom.tagOptions, labels);
    if (dom.tag) {
        dom.tag.value = selectedValue && optionExists(dom.tag, selectedValue) ? selectedValue : "";
    }
    renderActiveFilters();
}

function syncFilterOption(kind, value) {
    const label = normalize(value);
    if (!label) return false;

    if (kind === "ato") {
        const key = lowerValue(label);
        const changedFilter = !filterMetadata.atos.has(label);
        const changedSuggestion = !filterMetadata.atoOptions.has(label);
        if (changedFilter) {
            filterMetadata.atos.add(label);
            addSelectOption(dom.ato, key, label);
        }
        if (changedSuggestion) {
            filterMetadata.atoOptions.add(label);
            addDatalistOption(dom.atoOptions, label);
        }
        return changedFilter || changedSuggestion;
    }

    if (kind === "digitador") {
        if (filterMetadata.digitadores.has(label)) return false;
        filterMetadata.digitadores.add(label);
        addSelectOption(dom.digitador, label, label);
        addDatalistOption(dom.digitadorOptions, label);
        return true;
    }

    if (kind === "tag_custom") {
        const key = lowerValue(label);
        if (filterMetadata.tags.has(label)) return false;
        filterMetadata.tags.add(label);
        addSelectOption(dom.tag, key, label);
        addDatalistOption(dom.tagOptions, label);
        return true;
    }

    return false;
}

function syncFilterOptionsFromProtocol(protocol = {}, options = {}) {
    let changed = false;
    changed = syncFilterOption("ato", protocol.ato) || changed;
    changed = syncFilterOption("digitador", protocol.digitador) || changed;
    if (options.includeTags) {
        changed = syncFilterOption("tag_custom", protocol.tag_custom) || changed;
    }
    if (changed) renderActiveFilters();
}

async function refreshFilterMetadata() {
    const data = await apiGet("metadata", { action: "list" });
    applyServerClock(data);
    (data.atos || []).forEach((value) => syncFilterOption("ato", value));
    (data.atoOptions || []).forEach((value) => {
        const label = normalize(value);
        if (!label || filterMetadata.atoOptions.has(label)) return;
        filterMetadata.atoOptions.add(label);
        addDatalistOption(dom.atoOptions, label);
    });
    (data.digitadores || []).forEach((value) => syncFilterOption("digitador", value));
    replaceTagOptions(data.tags || []);
}

function scheduleFilterMetadataRefresh(delay = 800) {
    window.clearTimeout(state.filterMetadataRefreshTimer);
    state.filterMetadataRefreshTimer = window.setTimeout(() => {
        refreshFilterMetadata().catch((error) => {
            console.error(error);
        });
    }, delay);
}

function applyServerClock(data = {}) {
    if (data.server_now) {
        state.lastSyncAt = data.server_now;
    }
}

function markCurrentProtocolTouched(data = {}) {
    if (!currentId()) return;
    if (data.protocol) {
        patchProtocolInState(data.protocol, { insertIfMissing: true });
        return;
    }
    if (!data.server_now) return;
    patchCurrentProtocol({ updated_at: data.server_now });
}

function protocolSnapshot(protocol = {}) {
    const keys = ["id", "status", "deletado", "updated_at", "total_valores", ...fields];
    return keys.map((key) => [key, normalize(protocol?.[key])]);
}

function statusStateSignature(statusList = []) {
    return JSON.stringify(
        [...new Set(statusList.filter(Boolean))].map((status) => [
            status,
            state.totalsByStatus.get(status) ?? null,
            (state.itemsByStatus.get(status) || []).map(protocolSnapshot)
        ])
    );
}

function protocolMatchesCurrentVersion(protocol = null) {
    if (!protocol || !state.current) return false;
    const currentUpdatedAt = normalize(state.current.updated_at);
    const protocolUpdatedAt = normalize(protocol.updated_at);
    return Boolean(
        currentUpdatedAt
        && protocolUpdatedAt
        && currentUpdatedAt === protocolUpdatedAt
        && JSON.stringify(protocolSnapshot(protocol)) === JSON.stringify(protocolSnapshot(state.current))
    );
}

function showProtocolToast(message, type = "error") {
    const text = normalize(message);
    if (!text) return;

    let stack = document.getElementById("protocols-toast-stack");
    if (!stack) {
        stack = document.createElement("div");
        stack.id = "protocols-toast-stack";
        stack.className = "protocols-toast-stack";
    }
    const toastHost = dom.dialog?.open ? dom.dialog : document.body;
    if (stack.parentElement !== toastHost) {
        toastHost.appendChild(stack);
    }

    stack.innerHTML = `
        <div class="protocols-toast protocols-toast-${escapeHtml(type)}" role="status">
            ${protocolIcon(type === "error" ? "alert" : "progress")}
            <span>${escapeHtml(text)}</span>
        </div>
    `;
    window.clearTimeout(state.toastTimer);
    state.toastTimer = window.setTimeout(() => {
        stack.querySelector(".protocols-toast")?.classList.add("is-leaving");
        window.setTimeout(() => stack.replaceChildren(), 180);
    }, 4200);
}

function showModalNotice(message, type = "warning") {
    if (!dom.modalNotice) return;
    const text = normalize(message);
    if (!text) {
        dom.modalNotice.classList.add("is-hidden");
        dom.modalNotice.textContent = "";
        return;
    }

    dom.modalNotice.className = `protocols-modal-notice protocols-modal-notice-${type}`;
    dom.modalNotice.innerHTML = `
        ${protocolIcon(type === "error" ? "alert" : "progress")}
        <span>${escapeHtml(text)}</span>
    `;
    if (type !== "warning") {
        window.clearTimeout(state.modalNoticeTimer);
        state.modalNoticeTimer = window.setTimeout(() => showModalNotice(""), 5200);
    }
}

function markFieldError(element, message) {
    if (!element) {
        showProtocolToast(message);
        return;
    }
    element.classList.add("is-data-error");
    element.setAttribute("aria-invalid", "true");
    element.title = message;
    window.setTimeout(() => {
        element.classList.remove("is-data-error");
        element.removeAttribute("aria-invalid");
        element.removeAttribute("title");
    }, 5200);
    showProtocolToast(message);
}

function renderCardLine(icon, label, value, extraClass = "") {
    return `
        <div class="protocol-card-line ${extraClass}">
            ${protocolIcon(icon)}
            <span class="protocol-card-line-label">${escapeHtml(label)}</span>
            <span class="protocol-card-line-value">${renderHighlightedText(value)}</span>
        </div>
    `;
}

function cardLines(item) {
    const lines = [];

    if (item.apresentante) lines.push(renderCardLine("user", "Apresentante", item.apresentante));
    if (item.digitador) lines.push(renderCardLine("keyboard", "Digitador", item.digitador));
    if (item.data_apresentacao) lines.push(renderCardLine("calendar", "Data", dateBr(item.data_apresentacao)));
    if (item.outorgantes) lines.push(renderCardLine("file", "Outorgantes", item.outorgantes, "is-multiline"));
    if (item.outorgados) lines.push(renderCardLine("send", "Outorgados", item.outorgados, "is-multiline"));

    return lines.length
        ? lines.join("")
        : `<div class="protocol-card-empty">Sem dados detalhados neste protocolo.</div>`;
}

function renderCard(item, cardIndex = 0, columnIndex = 0) {
    const urgent = Number(item.urgente || 0) === 1;
    const tag = normalize(item.tag_custom);
    const ato = normalize(item.ato) || "Sem ato";
    const total = Number(item.total_valores || 0);
    const color = resolveTagColor(item);
    const id = String(item.id || "");
    const animationClass = state.freshCardIds.has(id) ? " is-card-entering" : "";
    const flightClass = state.activeCardFlights.has(id) ? " is-card-flight-target" : "";
    const openingDelay = Math.min(180, 36 + (Number(columnIndex) || 0) * 22 + Math.min(Number(cardIndex) || 0, 12) * 8);

    return `
        <article class="protocol-card${urgent ? " is-urgent" : ""}${animationClass}${flightClass}" draggable="true" data-protocol-id="${escapeHtml(item.id)}" data-status="${escapeHtml(item.status)}" style="--tag-color:${escapeHtml(color)};--protocol-card-index:${escapeHtml(cardIndex)};--protocol-card-delay:${escapeHtml(openingDelay)}ms">
            <button class="protocol-card-main" type="button" data-open-protocol="${escapeHtml(item.id)}">
                <div class="protocol-card-top">
                    <span class="protocol-card-ato">${renderHighlightedText(ato)}</span>
                    ${urgent ? `<span class="protocol-urgent-badge">${protocolIcon("alert")}Urgente</span>` : ""}
                </div>
                <strong>${renderHighlightedText(protocolTitle(item))}</strong>
                <div class="protocol-card-lines">${cardLines(item)}</div>
            </button>
            <footer>
                <span class="protocol-value-pill">${total > 0 ? `${protocolIcon("money")}${escapeHtml(money(total))}` : `${protocolIcon("money")}Sem valores`}</span>
                <div class="protocol-card-footer-meta">
                    ${tag ? `<span class="protocol-chip">${renderHighlightedText(tag)}</span>` : ""}
                </div>
            </footer>
            <div class="protocol-card-actions">
                <button class="protocol-action-button protocol-action-archive" type="button" data-archive-protocol="${escapeHtml(item.id)}" aria-label="${item.status === "ARQUIVADOS" ? "Restaurar protocolo" : "Arquivar protocolo"}">
                    ${item.status === "ARQUIVADOS" ? `${protocolIcon("restore")}<span>Restaurar</span>` : `${protocolIcon("archive")}<span>Arquivar</span>`}
                </button>
                <button class="protocol-action-button protocol-action-delete danger" type="button" data-delete-protocol="${escapeHtml(item.id)}" aria-label="Excluir protocolo">
                    ${protocolIcon("trash")}<span>Excluir</span>
                </button>
            </div>
        </article>
    `;
}

function renderSkeletonCard() {
    return `
        <article class="protocol-card protocol-skeleton-card" aria-hidden="true">
            <div class="protocol-skeleton-line is-pill"></div>
            <div class="protocol-skeleton-line is-title"></div>
            <div class="protocol-skeleton-grid">
                <div class="protocol-skeleton-line"></div>
                <div class="protocol-skeleton-line"></div>
                <div class="protocol-skeleton-line"></div>
            </div>
        </article>
    `;
}

function renderSkeletonCards(count = 3) {
    return Array.from({ length: count }, renderSkeletonCard).join("");
}

function hasMoreStatus(status) {
    if (state.exhaustedByStatus.has(status)) return false;
    const total = state.totalsByStatus.get(status);
    const loaded = (state.itemsByStatus.get(status) || []).length;
    return typeof total === "number" ? loaded < total : true;
}

function columnCount(status) {
    const total = state.totalsByStatus.get(status);
    return typeof total === "number" ? total : (state.itemsByStatus.get(status) || []).length;
}

function renderColumnFooter(status) {
    const loading = state.loadingByStatus.has(status);
    const loaded = (state.itemsByStatus.get(status) || []).length;
    const total = state.totalsByStatus.get(status);
    if (loading && loaded > 0) {
        return `<div class="protocol-column-loader is-loading" role="status">${protocolIcon("progress")}Atualizando coluna</div>`;
    }
    if (!hasMoreStatus(status) || loaded === 0) {
        return "";
    }
    const suffix = typeof total === "number" ? ` (${loaded}/${total})` : "";
    return `<button class="protocol-column-more" type="button" data-load-more-status="${escapeHtml(status)}">Carregar mais${escapeHtml(suffix)}</button>`;
}

function renderColumn(status, label, columnIndex = 0, options = {}) {
    const items = state.itemsByStatus.get(status) || [];
    const isLoading = state.loadingByStatus.has(status) || state.loadingBoard;
    const isInitialLoading = isLoading && !items.length;
    const transitionClass = status === "ARQUIVADOS" && state.archivedTransition === "show"
        ? " is-column-revealed"
        : "";
    const entranceClass = options.entrance ? " is-column-entering" : "";
    const columnDelay = 40 + (Number(columnIndex) || 0) * 28;
    const columnHeadDelay = columnDelay + 35;
    const columnSoftDelay = columnDelay + 70;
    const count = columnCount(status);
    return `
        <section class="protocol-column protocol-column-${status.toLowerCase().replace(/_/g, "-")}${transitionClass}${entranceClass}" data-status="${status}" style="--protocol-column-index:${escapeHtml(columnIndex)};--protocol-column-delay:${escapeHtml(columnDelay)}ms;--protocol-column-head-delay:${escapeHtml(columnHeadDelay)}ms;--protocol-column-soft-delay:${escapeHtml(columnSoftDelay)}ms">
            <header>
                <div>
                    <span class="protocol-column-title">${protocolIcon(statusIcons[status] || "file")}<span class="eyebrow">${escapeHtml(label)}</span></span>
                    <strong class="protocol-column-count" data-column-count-status="${escapeHtml(status)}">${count}</strong>
                </div>
                ${status === "PARA_DISTRIBUIR" ? `<button class="protocol-column-add" type="button" data-create-inline aria-label="Novo protocolo">+</button>` : ""}
            </header>
            <div class="protocol-column-cards" data-drop-status="${status}" data-scroll-status="${status}" aria-label="${escapeHtml(label)}">
                ${items.length
                    ? items.map((item, cardIndex) => renderCard(item, cardIndex, columnIndex)).join("")
                    : (isInitialLoading
                        ? renderSkeletonCards(4)
                        : `<div class="protocol-empty-column">Nenhum protocolo aqui.</div>`)}
                ${renderColumnFooter(status)}
            </div>
        </section>
    `;
}

function columnScrollElement(status) {
    return [...dom.board.querySelectorAll("[data-scroll-status]")]
        .find((element) => element.dataset.scrollStatus === status);
}

function renderBoardPreservingScroll(status = "") {
    if (status && dom.board.querySelector(`[data-status="${selectorEscape(status)}"]`)) {
        renderStatusColumnsPreservingScroll([status]);
        return;
    }
    const scrollTop = status ? columnScrollElement(status)?.scrollTop || 0 : 0;
    renderBoard();
    if (status) {
        const nextColumn = columnScrollElement(status);
        if (nextColumn) nextColumn.scrollTop = scrollTop;
    }
}

function renderBoardPreservingAllScroll() {
    const scrollByStatus = new Map(
        [...dom.board.querySelectorAll("[data-scroll-status]")]
            .map((element) => [element.dataset.scrollStatus, element.scrollTop])
    );
    renderBoard();
    scrollByStatus.forEach((scrollTop, status) => {
        const nextColumn = columnScrollElement(status);
        if (nextColumn) nextColumn.scrollTop = scrollTop;
    });
}

function captureColumnScrolls() {
    return new Map(
        [...dom.board.querySelectorAll("[data-scroll-status]")]
            .map((element) => [element.dataset.scrollStatus, element.scrollTop])
    );
}

function restoreColumnScrolls(scrollByStatus = new Map()) {
    scrollByStatus.forEach((scrollTop, status) => {
        const nextColumn = columnScrollElement(status);
        if (nextColumn) nextColumn.scrollTop = scrollTop;
    });
}

function statusLabel(status) {
    return statuses.find(([candidate]) => candidate === status)?.[1] || status;
}

function visibleStatusKeys() {
    return visibleStatuses().map(([status]) => status);
}

function captureCardRects(statusList = []) {
    const wanted = new Set(statusList.filter(Boolean));
    const rects = new Map();
    dom.board.querySelectorAll(".protocol-column-cards").forEach((container) => {
        const status = container.closest("[data-status]")?.dataset.status || "";
        if (wanted.size && !wanted.has(status)) return;

        const visibleTop = Math.max(0, container.scrollTop - 120);
        const visibleBottom = container.scrollTop + container.clientHeight + 120;
        container.querySelectorAll("[data-protocol-id]").forEach((card) => {
            const cardTop = card.offsetTop;
            const cardBottom = cardTop + card.offsetHeight;
            const id = String(card.dataset.protocolId || "");
            const isDraggedCard = id && id === state.draggingProtocolId;
            if (!isDraggedCard && (cardBottom < visibleTop || cardTop > visibleBottom)) return;
            rects.set(id, card.getBoundingClientRect());
        });
    });
    return rects;
}

function captureColumnRects() {
    const rects = new Map();
    dom.board.querySelectorAll(".protocol-column[data-status]").forEach((column) => {
        rects.set(String(column.dataset.status || ""), column.getBoundingClientRect());
    });
    return rects;
}

function animateColumnLayout(beforeRects) {
    if (shouldReduceMotion() || !beforeRects?.size) return;
    window.requestAnimationFrame(() => {
        const moves = [];
        dom.board.querySelectorAll(".protocol-column[data-status]").forEach((column) => {
            const before = beforeRects.get(String(column.dataset.status || ""));
            if (!before) return;

            const after = column.getBoundingClientRect();
            const dx = before.left - after.left;
            const dy = before.top - after.top;
            const moved = Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5;
            if (!moved) return;
            moves.push({ column, dx, dy });
        });

        moves.forEach(({ column, dx, dy }) => {
            column.classList.add("is-column-layout-moving");
            column.style.transition = "none";
            column.style.transformOrigin = "left top";
            column.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        });

        if (!moves.length) return;
        window.requestAnimationFrame(() => {
            moves.forEach(({ column }) => {
                column.style.transition = "transform 360ms cubic-bezier(0.16, 1, 0.3, 1)";
                column.style.transform = "";
                const cleanup = () => {
                    column.classList.remove("is-column-layout-moving");
                    column.style.removeProperty("transition");
                    column.style.removeProperty("transform-origin");
                    column.style.removeProperty("transform");
                };
                column.addEventListener("transitionend", cleanup, { once: true });
                window.setTimeout(cleanup, 440);
            });
        });
    });
}

function animateCardFlight(card, before, after, id) {
    const protocolId = String(id || "");
    if (!protocolId || !card || !before || !after) return;

    const dx = after.left - before.left;
    const dy = after.top - before.top;
    const distance = Math.hypot(dx, dy);
    const duration = Math.min(620, Math.max(340, distance * 0.24));
    const clone = card.cloneNode(true);

    document.querySelectorAll(`[data-card-flight-for="${selectorEscape(protocolId)}"]`).forEach((element) => element.remove());
    clone.classList.remove("is-card-entering", "is-card-leaving", "is-card-moving", "is-dragging", "is-card-flight-target");
    clone.classList.add("is-card-flight");
    clone.removeAttribute("draggable");
    clone.dataset.cardFlightFor = protocolId;
    clone.style.left = `${before.left}px`;
    clone.style.top = `${before.top}px`;
    clone.style.width = `${before.width}px`;
    clone.style.height = `${before.height}px`;
    clone.style.transformOrigin = "left top";
    clone.style.transform = "translate3d(0, 0, 0)";

    state.activeCardFlights.add(protocolId);
    card.classList.add("is-card-flight-target");
    document.body.appendChild(clone);

    const cleanup = () => {
        clone.removeEventListener("transitionend", handleFlightEnd);
        clone.remove();
        state.activeCardFlights.delete(protocolId);
        protocolCardElement(protocolId)?.classList.remove("is-card-flight-target");
    };

    const handleFlightEnd = (event) => {
        if (event.target !== clone) return;
        if (event.propertyName !== "transform") return;
        cleanup();
    };

    window.requestAnimationFrame(() => {
        clone.style.transition = [
            `opacity ${Math.min(260, duration)}ms ease`,
            `transform ${duration}ms cubic-bezier(0.16, 1, 0.3, 1)`
        ].join(", ");
        clone.style.opacity = "0.98";
        clone.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
    });

    clone.addEventListener("transitionend", handleFlightEnd);
    window.setTimeout(cleanup, duration + 140);
}

function animateCardLayout(beforeRects, options = {}) {
    if (shouldReduceMotion() || !beforeRects?.size) return;
    const overlayIds = new Set((options.overlayIds || []).map((id) => String(id || "")).filter(Boolean));
    const canAnimateRegularCards = beforeRects.size <= 36;
    window.requestAnimationFrame(() => {
        const moves = [];
        dom.board.querySelectorAll("[data-protocol-id]").forEach((card) => {
            const id = String(card.dataset.protocolId || "");
            const before = beforeRects.get(id);
            if (!before) return;

            const after = card.getBoundingClientRect();
            const dx = before.left - after.left;
            const dy = before.top - after.top;
            if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

            if (overlayIds.has(id)) {
                animateCardFlight(card, before, after, id);
                return;
            }

            if (!canAnimateRegularCards) return;
            moves.push({ card, dx, dy });
        });

        moves.forEach(({ card, dx, dy }) => {
            card.classList.add("is-card-moving");
            card.style.transition = "none";
            card.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
            card.style.zIndex = "4";
        });

        if (!moves.length) return;
        window.requestAnimationFrame(() => {
            moves.forEach(({ card }) => {
                card.style.transition = "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)";
                card.style.transform = "";
                const cleanup = () => {
                    card.classList.remove("is-card-moving");
                    card.style.removeProperty("transition");
                    card.style.removeProperty("transform");
                    card.style.removeProperty("z-index");
                };
                card.addEventListener("transitionend", cleanup, { once: true });
                window.setTimeout(cleanup, 300);
            });
        });
    });
}

function renderStatusColumnsPreservingScroll(statusList = [], options = {}) {
    const statusesToRender = [...new Set(statusList.filter((status) => visibleStatusKeys().includes(status)))];
    if (!statusesToRender.length) return;

    const previousCounts = new Map(state.previousCountsByStatus);
    const scrollByStatus = new Map(
        statusesToRender.map((status) => [status, columnScrollElement(status)?.scrollTop || 0])
    );
    let renderedAll = false;

    statusesToRender.forEach((status) => {
        const column = dom.board.querySelector(`[data-status="${selectorEscape(status)}"]`);
        if (!column) {
            renderedAll = true;
            return;
        }
        column.outerHTML = renderColumn(status, statusLabel(status));
    });

    if (renderedAll) {
        renderBoardPreservingAllScroll();
        return;
    }

    scrollByStatus.forEach((scrollTop, status) => {
        const nextColumn = columnScrollElement(status);
        if (nextColumn) nextColumn.scrollTop = scrollTop;
    });

    const nextCounts = new Map(visibleStatuses().map(([status]) => [status, columnCount(status)]));
    animateColumnCounts(previousCounts, nextCounts);
    state.previousCountsByStatus = nextCounts;
    queueProtocolAnimationCleanup();
    animateCardLayout(options.beforeRects, { overlayIds: options.overlayIds });
}

function renderBoard(options = {}) {
    const scrollByStatus = options.preserveScroll ? captureColumnScrolls() : null;
    const visibleStatuses = statuses.filter(([status]) => state.showArchived || status !== "ARQUIVADOS");
    const entrance = Boolean(options.entrance) && !shouldReduceMotion();
    const hydrate = Boolean(options.hydrate) && !entrance && !shouldReduceMotion();
    dom.board.classList.toggle("is-loading", state.loadingBoard);
    dom.board.classList.toggle("is-showing-archived", state.showArchived);
    dom.board.classList.toggle("is-opening-board", entrance);
    dom.board.classList.toggle("is-hydrating-board", hydrate);
    dom.board.setAttribute("aria-busy", state.loadingBoard ? "true" : "false");
    window.clearTimeout(state.boardEntranceTimer);
    window.clearTimeout(state.boardHydrationTimer);
    if (entrance) {
        state.boardEntranceTimer = window.setTimeout(() => {
            dom.board.classList.remove("is-opening-board");
        }, 620);
    }
    if (hydrate) {
        state.boardHydrationTimer = window.setTimeout(() => {
            dom.board.classList.remove("is-hydrating-board");
        }, 620);
    }
    if (state.lastError) {
        dom.board.classList.remove("is-hydrating-board", "is-opening-board");
        dom.board.innerHTML = `<section class="surface protocols-empty"><strong>Não foi possível carregar os protocolos</strong><p>${escapeHtml(state.lastError)}</p></section>`;
        return;
    }
    const nextCounts = new Map(visibleStatuses.map(([status]) => [status, columnCount(status)]));
    const previousCounts = new Map(state.previousCountsByStatus);

    dom.board.innerHTML = visibleStatuses.map(([status, label], columnIndex) => renderColumn(status, label, columnIndex, { entrance })).join("");
    if (hydrate) {
        markVisibleCardsForAnimation("is-hydrate-visible");
    }
    if (options.filterTransition) {
        markVisibleCardsForAnimation("is-filter-visible", "--protocol-filter-enter-delay", 10);
    }
    if (scrollByStatus) {
        restoreColumnScrolls(scrollByStatus);
    }
    animateColumnCounts(previousCounts, nextCounts);
    state.previousCountsByStatus = nextCounts;
    queueProtocolAnimationCleanup();
    animateColumnLayout(options.beforeColumnRects);
    animateCardLayout(options.beforeRects, { overlayIds: options.overlayIds });
    if (options.settle && !shouldReduceMotion()) {
        dom.board.classList.remove("is-board-settling");
        window.requestAnimationFrame(() => {
            dom.board.classList.add("is-board-settling");
            window.setTimeout(() => dom.board.classList.remove("is-board-settling"), 360);
        });
    }
}

function animateColumnCounts(previousCounts, nextCounts) {
    nextCounts.forEach((to, status) => {
        if (!previousCounts.has(status)) return;
        const from = previousCounts.get(status);
        if (from === to) return;

        const element = dom.board.querySelector(`[data-column-count-status="${selectorEscape(status)}"]`);
        if (!element) return;

        const start = Number(from) || 0;
        const end = Number(to) || 0;
        const delta = end - start;
        const duration = Math.min(780, Math.max(260, Math.abs(delta) * 42));
        const startedAt = performance.now();
        element.classList.add("is-counting");

        function tick(now) {
            const progress = Math.min(1, (now - startedAt) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            element.textContent = String(Math.round(start + delta * eased));
            if (progress < 1) {
                window.requestAnimationFrame(tick);
                return;
            }
            element.textContent = String(end);
            element.classList.remove("is-counting");
        }

        window.requestAnimationFrame(tick);
    });
}

function queueProtocolAnimationCleanup() {
    window.clearTimeout(state.animationCleanupTimer);
    state.animationCleanupTimer = window.setTimeout(() => {
        dom.board.querySelectorAll(".is-card-entering, .is-card-leaving, .is-card-moving, .is-hydrate-visible, .is-filter-visible").forEach((element) => {
            element.classList.remove("is-card-entering", "is-card-leaving", "is-card-moving", "is-hydrate-visible", "is-filter-visible");
            element.style.removeProperty("--protocol-card-exit-height");
            element.style.removeProperty("--protocol-hydrate-delay");
            element.style.removeProperty("--protocol-filter-enter-delay");
            element.style.removeProperty("transition");
            element.style.removeProperty("transform");
            element.style.removeProperty("z-index");
        });
        state.freshCardIds.clear();
        state.archivedTransition = "";
    }, 620);
}

function shouldReduceMotion() {
    return window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
}

function markVisibleCardsForAnimation(className, delayProperty = "--protocol-hydrate-delay", maxVisiblePerColumn = VISIBLE_ANIMATION_LIMIT) {
    if (!dom.board || shouldReduceMotion()) return;

    const viewport = {
        top: 0,
        left: 0,
        right: window.innerWidth || document.documentElement.clientWidth || 0,
        bottom: window.innerHeight || document.documentElement.clientHeight || 0
    };

    dom.board.querySelectorAll(".protocol-column-cards").forEach((container) => {
        const containerRect = container.getBoundingClientRect();
        if (containerRect.bottom <= viewport.top
            || containerRect.top >= viewport.bottom
            || containerRect.right <= viewport.left
            || containerRect.left >= viewport.right) return;

        let visibleIndex = 0;
        const visibleTop = container.scrollTop;
        const visibleBottom = visibleTop + container.clientHeight;
        const cards = [...container.querySelectorAll(".protocol-card:not(.protocol-skeleton-card)")];
        for (const card of cards) {
            const cardTop = card.offsetTop;
            const cardBottom = cardTop + card.offsetHeight;
            const isVisible = cardBottom > visibleTop && cardTop < visibleBottom;

            if (isVisible) {
                card.classList.add(className);
                card.style.setProperty(delayProperty, `${Math.min(visibleIndex, 5) * 16}ms`);
                visibleIndex += 1;
            }

            if (visibleIndex >= maxVisiblePerColumn || cardTop > visibleBottom) break;
        }
    });
}

function protocolCardElement(id) {
    const protocolId = String(id || "");
    if (!protocolId) return null;
    return dom.board.querySelector(`[data-protocol-id="${selectorEscape(protocolId)}"]`);
}

function animateProtocolCardExit(id) {
    const card = protocolCardElement(id);
    if (!card || shouldReduceMotion()) return Promise.resolve();

    card.style.setProperty("--protocol-card-exit-height", `${Math.ceil(card.getBoundingClientRect().height)}px`);
    card.classList.remove("is-card-entering");
    card.classList.add("is-card-leaving");

    return new Promise((resolve) => {
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            resolve();
        };

        card.addEventListener("animationend", finish, { once: true });
        window.setTimeout(finish, 320);
    });
}

function visibleStatuses() {
    return statuses.filter(([status]) => state.showArchived || status !== "ARQUIVADOS");
}

function isStatusVisible(status) {
    return state.showArchived || status !== "ARQUIVADOS";
}

function hasActiveFilters() {
    return Boolean(
        state.filters.q ||
        state.filters.ato ||
        state.filters.digitador ||
        state.filters.urgente ||
        state.filters.tag_custom
    );
}

function compareProtocols(left, right) {
    const urgent = Number(right.urgente || 0) - Number(left.urgente || 0);
    if (urgent !== 0) return urgent;
    return Number(right.id || 0) - Number(left.id || 0);
}

function removeProtocolFromState(id) {
    const protocolId = String(id || "");
    if (!protocolId) return "";

    for (const [status] of statuses) {
        const items = state.itemsByStatus.get(status) || [];
        const nextItems = items.filter((item) => String(item.id) !== protocolId);
        if (nextItems.length !== items.length) {
            state.itemsByStatus.set(status, nextItems);
            return status;
        }
    }

    return "";
}

function protocolStatusInState(id) {
    const protocolId = String(id || "");
    if (!protocolId) return "";
    for (const [status] of statuses) {
        const items = state.itemsByStatus.get(status) || [];
        if (items.some((item) => String(item.id) === protocolId)) return status;
    }
    return "";
}

function patchProtocolInState(protocol, options = {}) {
    const id = String(protocol?.id || "");
    if (!id) return [];

    syncFilterOptionsFromProtocol(protocol);
    const previousStatus = protocolStatusInState(id);
    if (!previousStatus && !options.insertIfMissing) return [];
    const previousProtocol = findProtocolInState(id);
    const sameBoardProtocol = previousProtocol
        && JSON.stringify(protocolSnapshot(previousProtocol)) === JSON.stringify(protocolSnapshot(protocol));
    const sameCurrentProtocol = state.current?.id
        && id === String(state.current.id)
        && protocolMatchesCurrentVersion(protocol);
    if (sameBoardProtocol && (!state.current?.id || sameCurrentProtocol || id !== String(state.current.id))) {
        return [];
    }

    const beforeRects = captureCardRects(previousStatus ? [previousStatus, protocol.status] : [protocol.status]);
    const touched = upsertSyncedProtocol(protocol);
    if (state.current?.id && id === String(state.current.id)) {
        state.current = { ...state.current, ...protocol };
        updateDialogOverview(state.current);
        applyDialogAccent(state.current);
    }
    renderStatusColumnsPreservingScroll(touched, { beforeRects });
    return touched;
}

function patchCurrentProtocol(changes = {}) {
    if (!state.current?.id) return;
    state.current = { ...state.current, ...changes };
    updateDialogOverview(state.current);
    applyDialogAccent(state.current);
    patchProtocolInState(state.current);
}

function upsertSyncedProtocol(item) {
    const id = String(item?.id || "");
    if (!id) return [];

    syncFilterOptionsFromProtocol(item);
    const touched = new Set();
    const oldStatus = removeProtocolFromState(id);
    if (oldStatus) touched.add(oldStatus);

    if (Number(item.deletado || 0) === 1) {
        return [...touched];
    }

    const nextStatus = normalize(item.status) || "PARA_DISTRIBUIR";
    touched.add(nextStatus);

    if (isStatusVisible(nextStatus)) {
        const items = state.itemsByStatus.get(nextStatus) || [];
        state.itemsByStatus.set(nextStatus, [...items, item].sort(compareProtocols));
        if (state.boardReady && oldStatus !== nextStatus) {
            state.freshCardIds.add(id);
        }
    }

    return [...touched];
}

function resetBoardState() {
    state.itemsByStatus.clear();
    state.totalsByStatus.clear();
    state.exhaustedByStatus.clear();
    state.loadingByStatus.clear();
}

function markVisibleCardsAsFresh() {
    visibleStatuses().forEach(([status]) => {
        (state.itemsByStatus.get(status) || []).slice(0, VISIBLE_ANIMATION_LIMIT).forEach((item) => {
            const id = String(item.id || "");
            if (id) state.freshCardIds.add(id);
        });
    });
}

function markStatusCardsAsFresh(statusList = []) {
    const wanted = new Set(statusList.filter(Boolean));
    if (!wanted.size) return;
    wanted.forEach((status) => {
        (state.itemsByStatus.get(status) || []).slice(0, VISIBLE_ANIMATION_LIMIT).forEach((item) => {
            const id = String(item.id || "");
            if (id) state.freshCardIds.add(id);
        });
    });
}

async function loadStatus(status, options = {}) {
    const append = Boolean(options.append);
    const refreshLoaded = Boolean(options.refreshLoaded);
    const background = Boolean(options.background);
    const silent = Boolean(options.silent);
    const supersede = Boolean(options.supersede);
    if (state.loadingByStatus.has(status) && !supersede) return;
    if (append && state.exhaustedByStatus.has(status)) return;
    const loadToken = (state.statusLoadTokens.get(status) || 0) + 1;
    state.statusLoadTokens.set(status, loadToken);

    const existing = state.itemsByStatus.get(status) || [];
    const offset = append ? existing.length : 0;
    const limit = PAGE_SIZE;
    const params = {
        action: "search",
        status,
        limit,
        offset,
        q: state.filters.q,
        ato: state.filters.ato,
        digitador: state.filters.digitador,
        urgente: state.filters.urgente,
        tag_custom: state.filters.tag_custom
    };
    state.loadingByStatus.add(status);
    if (!silent && !background && state.boardReady) {
        renderBoardPreservingScroll(status);
    }
    try {
        const data = await apiGet("protocolos", params, { signal: options.signal });
        if (state.statusLoadTokens.get(status) !== loadToken) return;
        const items = Array.isArray(data.items) ? data.items : [];
        const total = Number(data.total);
        if (data.server_now) {
            state.lastSyncAt = data.server_now;
        }
        if (Number.isFinite(total)) {
            state.totalsByStatus.set(status, total);
        }

        const known = new Set(existing.map((item) => String(item.id)));
        if (append) {
            const nextItems = items.filter((item) => !known.has(String(item.id)));
            if (state.boardReady) {
                nextItems.forEach((item) => state.freshCardIds.add(String(item.id || "")));
            }
            state.itemsByStatus.set(status, [...existing, ...nextItems]);
        } else if (refreshLoaded && existing.length > PAGE_SIZE) {
            const refreshed = new Set(items.map((item) => String(item.id)));
            state.itemsByStatus.set(status, [...items, ...existing.filter((item) => !refreshed.has(String(item.id)))]);
        } else {
            state.itemsByStatus.set(status, items);
        }

        const loaded = (state.itemsByStatus.get(status) || []).length;
        if (items.length < limit || (Number.isFinite(total) && loaded >= total)) {
            state.exhaustedByStatus.add(status);
        } else {
            state.exhaustedByStatus.delete(status);
        }
    } finally {
        if (state.statusLoadTokens.get(status) !== loadToken) return;
        state.loadingByStatus.delete(status);
        if (!silent && !background && state.boardReady) {
            renderBoardPreservingScroll(status);
        }
    }
}

async function loadMoreStatus(status) {
    await loadStatus(status, { append: true });
}

async function loadBoard(options = {}) {
    const reset = options.reset !== false;
    const refreshLoaded = Boolean(options.refreshLoaded);
    const animateResults = Boolean(options.animateResults);
    const skipLayoutAnimation = Boolean(options.skipLayoutAnimation);
    const filterTransition = Boolean(options.filterTransition);
    const suppressSoftRefreshIndicator = Boolean(options.suppressSoftRefreshIndicator)
        || skipLayoutAnimation
        || filterTransition;
    const freshStatuses = Array.isArray(options.freshStatuses) ? options.freshStatuses : [];
    if (reset) {
        state.boardLoadController?.abort();
        state.boardLoadController = new AbortController();
    }
    const controller = state.boardLoadController;
    const loadToken = ++state.boardLoadToken;
    const wasReady = state.boardReady;
    const hasInitialSkeleton = !wasReady && Boolean(dom.board.querySelector(".protocol-skeleton-card"));
    const softRefresh = wasReady && reset;
    const beforeRects = softRefresh && !suppressSoftRefreshIndicator && !skipLayoutAnimation ? captureCardRects(visibleStatusKeys()) : null;
    state.loadingBoard = true;
    state.lastError = "";
    if (reset && !softRefresh) {
        resetBoardState();
    }
    if (!state.boardReady) {
        if (hasInitialSkeleton && !state.showArchived) {
            dom.board.classList.add("is-loading");
            dom.board.setAttribute("aria-busy", "true");
        } else {
            renderBoard();
        }
    } else {
        dom.board.classList.add("is-loading");
        dom.board.setAttribute("aria-busy", "true");
        if (!suppressSoftRefreshIndicator) {
            dom.board.classList.add("is-soft-refreshing");
        }
    }
    try {
        await Promise.all(visibleStatuses().map(([status]) => loadStatus(status, {
            refreshLoaded,
            silent: softRefresh,
            supersede: reset,
            signal: controller?.signal
        })));
        if (loadToken !== state.boardLoadToken) return;
        if (animateResults) {
            markVisibleCardsAsFresh();
        } else if (!wasReady) {
            state.freshCardIds.clear();
        } else {
            markStatusCardsAsFresh(freshStatuses);
        }
        state.boardReady = true;
    } catch (error) {
        if (error?.name === "AbortError" || loadToken !== state.boardLoadToken) return;
        state.lastError = error.message || "Falha ao carregar dados.";
    } finally {
        if (loadToken !== state.boardLoadToken) return;
        state.loadingBoard = false;
        dom.board.classList.remove("is-soft-refreshing");
        renderBoard({
            beforeRects,
            preserveScroll: softRefresh,
            settle: ((softRefresh && !suppressSoftRefreshIndicator) || animateResults) && !skipLayoutAnimation,
            entrance: !wasReady && !hasInitialSkeleton && !state.lastError,
            hydrate: !wasReady && hasInitialSkeleton && !state.lastError,
            filterTransition: wasReady && filterTransition && !state.lastError
        });
    }
}

async function syncChanges() {
    if (document.hidden) return;
    if (state.protocolEventsConnected) return;
    if (state.syncingChanges) return;
    if (state.draggingProtocolId) return;
    if (state.loadingBoard) return;
    if (isProtocolDialogOpen()) {
        state.modalBoardRefreshPending = true;
        return;
    }
    if (!state.lastSyncAt) return;

    state.syncingChanges = true;
    try {
        const data = await apiGet("protocolos", {
            action: "changes",
            since: state.lastSyncAt
        });
        const items = Array.isArray(data.items) ? data.items : [];
        if (data.server_now) {
            state.lastSyncAt = data.server_now;
        }
        if (!items.length) return;
        if (items.some((item) => Object.prototype.hasOwnProperty.call(item, "tag_custom"))) {
            scheduleFilterMetadataRefresh(1200);
        }

        if (hasActiveFilters()) {
            await loadBoard({ reset: true, refreshLoaded: true });
            return;
        }

        const touchedStatuses = new Set();
        items.forEach((item) => {
            upsertSyncedProtocol(item).forEach((status) => touchedStatuses.add(status));
        });

        const touched = [...touchedStatuses];
        renderStatusColumnsPreservingScroll(touched);
        const renderedSignature = statusStateSignature(touched);

        await Promise.all(
            touched
                .filter((status) => isStatusVisible(status))
                .map((status) => loadStatus(status, { refreshLoaded: true, background: true }))
        );
        if (renderedSignature !== statusStateSignature(touched)) {
            renderStatusColumnsPreservingScroll(touched);
        }
    } catch (error) {
        console.error(error);
    } finally {
        state.syncingChanges = false;
    }
}

function protocolEventAppliesToCurrent(event = {}) {
    const protocolId = String(event.protocol_id || event.protocol?.id || "");
    return Boolean(protocolId && currentId() && protocolId === String(currentId()));
}

function handleProtocolServerEvent(event = {}) {
    if (!event || event.type === "ping" || event.type === "ready") return;

    applyServerClock(event);

    const protocol = event.protocol && typeof event.protocol === "object" ? event.protocol : null;
    const appliesToCurrent = protocolEventAppliesToCurrent(event);
    const sameCurrentVersion = protocolMatchesCurrentVersion(protocol);

    if (appliesToCurrent && isProtocolDialogOpen() && !sameCurrentVersion) {
        showModalNotice("Este protocolo recebeu alterações de outro usuário. Reabra ou confira os campos antes de continuar.", "warning");
        if (protocol) {
            applyExternalProtocolToModal(protocol);
        }
        if (event.resource === "andamentos") loadNotes().catch(console.error);
        if (event.resource === "valores") loadValues().catch(console.error);
        if (event.resource === "imoveis") loadProperties().catch(console.error);
    } else if (appliesToCurrent && isProtocolDialogOpen() && protocol) {
        applyExternalProtocolToModal(protocol);
    }

    if (protocol) {
        patchProtocolInState(protocol, { insertIfMissing: true });
        return;
    }

    if (!state.protocolEventsConnected) {
        requestBoardRefresh(120);
    }
}

function connectProtocolEvents() {
    // Este projeto roda somente em PHP/XAMPP; o sync colaborativo usa polling.
    state.protocolEventsConnected = false;
}

function scheduleLoad(delay = 180, options = {}) {
    window.clearTimeout(scheduleLoad.timer);
    const token = ++state.filterLoadToken;
    scheduleLoad.timer = window.setTimeout(async () => {
        try {
            if (token !== state.filterLoadToken) return;
            await loadBoard({
                reset: true,
                animateResults: false,
                skipLayoutAnimation: Boolean(options.skipLayoutAnimation),
                filterTransition: Boolean(options.filterTransition)
            });
        } catch (error) {
            console.error(error);
        }
    }, delay);
}

function isProtocolDialogOpen() {
    return Boolean(dom.dialog?.open);
}

function requestBoardRefresh(delay = 180, options = {}) {
    if (isProtocolDialogOpen()) {
        state.modalBoardRefreshPending = true;
        return;
    }
    scheduleLoad(delay, options);
}

function flushDeferredBoardRefresh() {
    if (!state.modalBoardRefreshPending) return;
    state.modalBoardRefreshPending = false;
    scheduleLoad(80);
}

function scheduleSearchLoad(delay = 180) {
    window.clearTimeout(scheduleLoad.timer);
    const token = ++state.filterLoadToken;
    scheduleLoad.timer = window.setTimeout(async () => {
        const nextQuery = normalize(state.pendingSearchQuery);
        if (state.filters.q === nextQuery) return;

        state.filters.q = nextQuery;
        renderActiveFilters();

        try {
            if (token !== state.filterLoadToken) return;
            await loadBoard({ reset: true, animateResults: false, skipLayoutAnimation: true, filterTransition: true });
        } catch (error) {
            console.error(error);
        }
    }, delay);
}

function fieldElements() {
    return [...dom.dialog.querySelectorAll("[data-protocol-field]")];
}

function elementValue(element) {
    return element?.type === "checkbox" ? (element.checked ? "1" : "0") : (element?.value ?? "");
}

function setSavedElementValue(element, value) {
    if (!element) return;
    element.dataset.protocolSavedValue = element.type === "checkbox"
        ? (Number(value || 0) === 1 ? "1" : "0")
        : String(value ?? "");
}

function setElementValue(element, value) {
    if (!element) return;
    if (element.type === "checkbox") {
        element.checked = Number(value || 0) === 1;
        return;
    }
    if (element.dataset.protocolField === "valor_ato") {
        element.value = moneyInputValue(value);
        return;
    }
    element.value = value ?? "";
    if (element.tagName === "TEXTAREA") {
        fitProtocolTextarea(element);
    }
}

function pendingSaveKeyForElement(element) {
    const field = element?.dataset?.protocolField;
    if (!field || !currentId()) return "";
    return `${currentId()}:${field}`;
}

function canApplyExternalValue(element) {
    if (!element) return false;
    const saveKey = pendingSaveKeyForElement(element);
    const hasPendingTimer = Boolean(saveKey && state.saveTimers.has(saveKey));
    const hasInFlightSave = Boolean(saveKey && state.saveInFlight.has(saveKey));
    return !hasPendingTimer && !hasInFlightSave && document.activeElement !== element;
}

function flashExternalElement(element) {
    if (!element) return;
    const field = element.dataset.protocolField || element.name || "";
    window.clearTimeout(state.externalHighlightTimers.get(field));
    element.classList.remove("is-data-external-update");
    void element.offsetWidth;
    element.classList.add("is-data-external-update");
    state.externalHighlightTimers.set(field, window.setTimeout(() => {
        element.classList.remove("is-data-external-update");
        state.externalHighlightTimers.delete(field);
    }, 4200));
}

function applyExternalProtocolToModal(protocol = {}) {
    if (!state.current?.id || String(state.current.id) !== String(protocol.id || "")) return [];

    const changedFields = [];
    fieldElements().forEach((element) => {
        const field = element.dataset.protocolField;
        if (!fields.includes(field)) return;
        const previous = normalize(state.current?.[field]);
        const next = normalize(protocol?.[field]);
        if (previous === next) return;

        changedFields.push(field);
        if (canApplyExternalValue(element)) {
            setElementValue(element, protocol[field]);
            setSavedElementValue(element, protocol[field]);
        }
        flashExternalElement(element);
    });

    state.current = { ...state.current, ...protocol };
    updateDialogOverview(state.current);
    applyDialogAccent(state.current);
    dom.title.textContent = protocolTitle(state.current);
    clearDialogSubtitle();
    return changedFields;
}

function updateDialogOverview(protocol) {
    dom.overviewFicha.textContent = fichaLabel(protocol.ficha);
    dom.overviewAto.textContent = protocol.ato || "-";
    dom.overviewDigitador.textContent = protocol.digitador || "-";
    dom.overviewData.textContent = protocol.data_apresentacao ? dateBr(protocol.data_apresentacao) : "-";
}

function clearDialogSubtitle() {
    if (!dom.subtitle) return;
    dom.subtitle.textContent = "";
    dom.subtitle.hidden = true;
}

function applyDialogAccent(protocol) {
    const color = resolveTagColor(protocol);
    dom.dialog.style.setProperty("--protocol-tag-color", color);
    dom.dialog.classList.toggle("is-urgent", Number(protocol.urgente || 0) === 1);
}

function hydrateStaticIcons() {
    document.querySelectorAll("[data-protocol-icon]").forEach((element) => {
        const name = element.dataset.protocolIcon;
        if (!name) return;
        element.innerHTML = protocolIcon(name);
    });
}

function fillModal(protocol) {
    state.current = protocol;
    syncFilterOptionsFromProtocol(protocol);
    showModalNotice("");
    dom.title.textContent = protocolTitle(protocol);
    clearDialogSubtitle();
    updateDialogOverview(protocol);
    applyDialogAccent(protocol);

    fieldElements().forEach((element) => {
        const field = element.dataset.protocolField;
        if (!fields.includes(field)) return;
        setElementValue(element, protocol[field]);
        setSavedElementValue(element, protocol[field]);
    });
}

function currentId() {
    return Number(state.current?.id || 0);
}

function resetDialogScroll() {
    dom.dialog.scrollTop = 0;
    const body = dom.dialog.querySelector(".protocols-dialog-body");
    if (body) body.scrollTop = 0;
}

async function runQueuedFieldSave(entry) {
    if (!entry?.protocolId || !entry.field || !entry.element) return;
    const previous = state.saveInFlight.get(entry.key);
    if (previous) {
        await previous.catch(() => {});
    }
    if (currentId() !== Number(entry.protocolId) && dom.dialog?.open) return;

    const promise = saveField(entry.protocolId, entry.field, elementValue(entry.element), entry.element)
        .finally(() => {
            if (state.saveInFlight.get(entry.key) === promise) {
                state.saveInFlight.delete(entry.key);
            }
        });
    state.saveInFlight.set(entry.key, promise);
    await promise;
}

async function flushPendingFieldSaves(protocolId = currentId()) {
    const pending = [];
    state.saveTimers.forEach((entry, key) => {
        if (Number(entry.protocolId) !== Number(protocolId)) return;
        window.clearTimeout(entry.timer);
        state.saveTimers.delete(key);
        pending.push(entry);
    });
    await Promise.allSettled(pending.map((entry) => runQueuedFieldSave(entry)));
}

function cancelPendingFieldSaves(protocolId = 0) {
    state.saveTimers.forEach((entry, key) => {
        if (protocolId && Number(entry.protocolId) !== Number(protocolId)) return;
        window.clearTimeout(entry.timer);
        state.saveTimers.delete(key);
    });
}

function clearModalLists() {
    state.listLoadTokens.properties += 1;
    state.listLoadTokens.values += 1;
    state.listLoadTokens.notes += 1;
    state.currentLists = { properties: [], values: [], notes: [], documents: [] };
    if (dom.properties) dom.properties.innerHTML = `<div class="protocol-empty-column">Carregando matrículas...</div>`;
    if (dom.values) dom.values.innerHTML = `<div class="protocol-empty-column">Carregando valores...</div>`;
    if (dom.notes) dom.notes.innerHTML = `<div class="protocol-empty-column">Carregando andamentos...</div>`;
    if (dom.documentsList) dom.documentsList.innerHTML = `<div class="protocol-empty-column">Carregando documentos...</div>`;
    if (dom.documentsSummary) dom.documentsSummary.textContent = "";
    if (dom.documentsFeedback) dom.documentsFeedback.textContent = "Carregando documentos vinculados...";
}

function setDialogAnimationOrigin(event = null) {
    if (!dom.dialog) return;
    const hasPointerPosition = Number(event?.detail || 0) > 0
        && Number.isFinite(event?.clientX)
        && Number.isFinite(event?.clientY);
    const x = hasPointerPosition ? event.clientX : window.innerWidth / 2;
    const y = hasPointerPosition ? event.clientY : window.innerHeight / 2;
    const originX = Math.max(8, Math.min(92, (x / Math.max(window.innerWidth, 1)) * 100));
    const originY = Math.max(8, Math.min(92, (y / Math.max(window.innerHeight, 1)) * 100));
    dom.dialog.style.setProperty("--protocol-modal-origin-x", `${originX}%`);
    dom.dialog.style.setProperty("--protocol-modal-origin-y", `${originY}%`);
}

function animateOpeningCard(trigger = null, event = null) {
    const card = trigger?.closest?.(".protocol-card");
    if (!card) return;

    const rect = card.getBoundingClientRect();
    const hasPointerPosition = Number(event?.detail || 0) > 0
        && Number.isFinite(event?.clientX)
        && Number.isFinite(event?.clientY);
    const x = hasPointerPosition ? event.clientX - rect.left : rect.width / 2;
    const y = hasPointerPosition ? event.clientY - rect.top : rect.height / 2;
    card.style.setProperty("--protocol-card-click-x", `${Math.max(0, Math.min(rect.width, x))}px`);
    card.style.setProperty("--protocol-card-click-y", `${Math.max(0, Math.min(rect.height, y))}px`);
    card.classList.remove("is-card-opening");
    void card.offsetWidth;
    card.classList.add("is-card-opening");
    window.setTimeout(() => {
        card.classList.remove("is-card-opening");
        card.style.removeProperty("--protocol-card-click-x");
        card.style.removeProperty("--protocol-card-click-y");
    }, shouldReduceMotion() ? 0 : 360);
}

function clearProtocolDialogBackdrop() {
    document.body.classList.remove(
        "protocol-dialog-backdrop-active",
        "protocol-dialog-backdrop-open",
        "protocol-dialog-backdrop-closing"
    );
}

function playProtocolDialogBackdropOpen() {
    window.clearTimeout(state.dialogBackdropTimer);
    clearProtocolDialogBackdrop();
    if (shouldReduceMotion()) return;

    document.body.classList.add("protocol-dialog-backdrop-active");
    void document.body.offsetHeight;
    document.body.classList.add("protocol-dialog-backdrop-open");
}

function playProtocolDialogBackdropClose() {
    window.clearTimeout(state.dialogBackdropTimer);
    if (shouldReduceMotion()) {
        clearProtocolDialogBackdrop();
        return;
    }

    document.body.classList.remove("protocol-dialog-backdrop-open");
    document.body.classList.add("protocol-dialog-backdrop-active", "protocol-dialog-backdrop-closing");
    state.dialogBackdropTimer = window.setTimeout(clearProtocolDialogBackdrop, 230);
}

function playDialogOpenAnimation(event = null) {
    if (!dom.dialog) return;
    window.clearTimeout(state.dialogCloseTimer);
    setDialogAnimationOrigin(event);
    dom.dialog.classList.remove("is-closing", "is-opening");
    dom.dialog.classList.add("is-opening");
    playProtocolDialogBackdropOpen();
    window.setTimeout(() => dom.dialog.classList.remove("is-opening"), shouldReduceMotion() ? 0 : 320);
}

async function closeProtocolDialog() {
    if (!dom.dialog?.open || dom.dialog.classList.contains("is-closing")) return;
    await flushPendingFieldSaves(currentId());

    if (shouldReduceMotion()) {
        clearProtocolDialogBackdrop();
        dom.dialog.close();
        return;
    }

    dom.dialog.classList.remove("is-opening");
    dom.dialog.classList.add("is-closing");
    playProtocolDialogBackdropClose();
    window.clearTimeout(state.dialogCloseTimer);
    state.dialogCloseTimer = window.setTimeout(() => {
        if (dom.dialog.open) dom.dialog.close();
    }, 220);
}

async function openProtocol(id, event = null, trigger = null) {
    animateOpeningCard(trigger, event);
    if (currentId() && currentId() !== Number(id)) {
        await flushPendingFieldSaves(currentId());
        cancelPendingFieldSaves();
    }
    const protocol = await apiGet("protocolos", { action: "get", id });
    applyServerClock(protocol);
    fillModal(protocol);
    clearModalLists();
    if (!dom.dialog.open) {
        playDialogOpenAnimation(event);
        dom.dialog.showModal();
    }
    resetDialogScroll();
    await Promise.all([loadProperties(id), loadValues(id), loadNotes(id), loadDocuments(id)]);
    resetDialogScroll();
}

async function saveField(protocolId, field, value, element = null) {
    if (!protocolId) return;
    const expectedValue = element?.dataset.protocolSavedValue ?? state.current?.[field] ?? "";
    const normalizedValue = normalizedProtocolFieldValue(field, value);
    try {
        const data = await apiPost("protocolos", { action: "update" }, {
            id: protocolId,
            field,
            value: normalizedValue,
            expected_value: expectedValue
        });
        applyServerClock(data);
        if (currentId() === Number(protocolId) && data.protocol) {
            state.current = data.protocol;
            dom.title.textContent = protocolTitle(state.current);
            clearDialogSubtitle();
            updateDialogOverview(state.current);
            applyDialogAccent(state.current);
            setSavedElementValue(element, state.current[field]);
        }
        if (data.protocol) {
            patchProtocolInState(data.protocol);
        }
        if (field === "tag_custom") {
            scheduleFilterMetadataRefresh(900);
        }
    } catch (error) {
        const message = error.status === 409
            ? "Conflito detectado: este campo mudou em outro lugar. Reabra o protocolo antes de salvar."
            : (error.message || "Não foi possível salvar este campo.");
        markFieldError(element, message);
        if (error.status === 409 && error.data?.protocol) {
            showModalNotice(message, "error");
            patchProtocolInState(error.data.protocol);
        }
        throw error;
    }
}

function queueSave(element) {
    const field = element.dataset.protocolField;
    const protocolId = currentId();
    const key = `${protocolId}:${field}`;
    const existing = state.saveTimers.get(key);
    if (existing) window.clearTimeout(existing.timer);
    if (!protocolId || !field) return;

    const currentValue = normalizedProtocolFieldValue(field, elementValue(element));
    const savedValue = normalizedProtocolFieldValue(field, element.dataset.protocolSavedValue ?? state.current?.[field] ?? "");
    if (currentValue === savedValue && !state.saveInFlight.has(key)) {
        state.saveTimers.delete(key);
        return;
    }

    const entry = {
        key,
        protocolId,
        field,
        element,
        timer: window.setTimeout(() => {
            state.saveTimers.delete(key);
            runQueuedFieldSave(entry).catch((error) => console.error(error));
        }, element.tagName === "TEXTAREA" ? 420 : 180)
    };
    state.saveTimers.set(key, entry);
}

function subItemRow(type, item) {
    if (type === "properties") {
        return `
            <article class="protocol-subitem" data-property-id="${escapeHtml(item.id)}">
                <div class="protocol-subitem-field">
                    ${protocolIcon("map")}
                    <input data-property-field="matricula" value="${escapeHtml(item.matricula || "")}" placeholder="Matrícula">
                </div>
                <div class="protocol-subitem-field">
                    ${protocolIcon("file")}
                    <input data-property-field="area" value="${escapeHtml(item.area || "")}" placeholder="Área">
                </div>
                <button type="button" data-remove-property="${escapeHtml(item.id)}">${protocolIcon("trash")}<span>Remover</span></button>
            </article>
        `;
    }
    if (type === "values") {
        return `
            <article class="protocol-subitem" data-value-id="${escapeHtml(item.id)}">
                <div class="protocol-subitem-field">
                    ${protocolIcon("file")}
                    <input data-value-field="descricao" value="${escapeHtml(item.descricao || "")}" placeholder="Descrição">
                </div>
                <div class="protocol-subitem-field">
                    ${protocolIcon("money")}
                    <input data-value-field="valor" inputmode="decimal" value="${escapeHtml(moneyInputValue(item.valor))}" placeholder="Valor">
                </div>
                <button type="button" data-remove-value="${escapeHtml(item.id)}">${protocolIcon("trash")}<span>Remover</span></button>
            </article>
        `;
    }
    return `
        <article class="protocol-note" data-note-id="${escapeHtml(item.id)}">
            <div class="protocol-note-head">
                <div class="protocol-note-meta">
                    ${protocolIcon("note")}
                    <small>${escapeHtml(dateBr(item.created_at))}</small>
                </div>
                <button class="protocol-note-remove" type="button" data-remove-note="${escapeHtml(item.id)}" aria-label="Remover andamento" title="Remover andamento">${protocolIcon("trash")}</button>
            </div>
            <div class="protocol-note-field">
                <textarea data-note-field="descricao" rows="3">${escapeHtml(item.descricao || "")}</textarea>
            </div>
        </article>
    `;
}

function fitProtocolTextarea(textarea) {
    if (!textarea) return;
    textarea.style.height = "auto";
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, 56), 180);
    textarea.style.height = `${nextHeight}px`;
}

function fitNoteTextareas(container = dom.notes) {
    container?.querySelectorAll("[data-note-field='descricao']").forEach(fitProtocolTextarea);
}

function syncNotesScrollHint() {
    if (!dom.notes || !dom.notesFrame || !dom.notesHint) return;
    const hasOverflow = dom.notes.scrollHeight > dom.notes.clientHeight + 6;
    const isAtBottom = (dom.notes.scrollHeight - dom.notes.scrollTop - dom.notes.clientHeight) <= 8;
    dom.notesFrame.classList.toggle("has-overflow", hasOverflow);
    dom.notesFrame.classList.toggle("is-at-bottom", !hasOverflow || isAtBottom);
    dom.notesHint.classList.toggle("is-hidden", !hasOverflow || isAtBottom);
}

async function loadProperties(id = currentId()) {
    const token = ++state.listLoadTokens.properties;
    const properties = await apiGet("imoveis", { action: "list", protocolo_id: id });
    if (token !== state.listLoadTokens.properties) return;
    if (currentId() !== Number(id)) return;
    state.currentLists.properties = properties;
    dom.properties.innerHTML = state.currentLists.properties.length
        ? state.currentLists.properties.map((item) => subItemRow("properties", item)).join("")
        : `<div class="protocol-empty-column">Nenhuma matrícula adicionada.</div>`;
}

async function loadValues(id = currentId()) {
    const token = ++state.listLoadTokens.values;
    const values = await apiGet("valores", { action: "list", protocolo_id: id });
    if (token !== state.listLoadTokens.values) return;
    if (currentId() !== Number(id)) return;
    state.currentLists.values = values;
    dom.values.innerHTML = state.currentLists.values.length
        ? state.currentLists.values.map((item) => subItemRow("values", item)).join("")
        : `<div class="protocol-empty-column">Nenhum valor adicional.</div>`;
    const total = state.currentLists.values.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    updateValuesTotal(total);
}

function updateValuesTotal(total) {
    dom.valuesTotal.textContent = `Total adicional: ${money(total)}`;
    patchCurrentProtocol({ total_valores: total });
}

function syncValueRowAfterSave(row, data = {}) {
    if (!row) return;
    const id = String(row.dataset.valueId || "");
    const descricao = row.querySelector("[data-value-field='descricao']")?.value || "";
    const valor = moneyDecimalValue(row.querySelector("[data-value-field='valor']")?.value || "0");
    const index = state.currentLists.values.findIndex((item) => String(item.id || "") === id);

    if (index >= 0) {
        state.currentLists.values[index] = {
            ...state.currentLists.values[index],
            descricao,
            valor
        };
    }

    const total = data.total ?? state.currentLists.values.reduce((sum, item) => sum + Number(item.valor || 0), 0);
    updateValuesTotal(total);
}

async function loadNotes(id = currentId()) {
    const token = ++state.listLoadTokens.notes;
    const notes = await apiGet("andamentos", { action: "list", protocolo_id: id });
    if (token !== state.listLoadTokens.notes) return;
    if (currentId() !== Number(id)) return;
    state.currentLists.notes = notes;
    dom.notes.innerHTML = state.currentLists.notes.length
        ? state.currentLists.notes.map((item) => subItemRow("notes", item)).join("")
        : `<div class="protocol-empty-column">Nenhum andamento registrado.</div>`;
    fitNoteTextareas();
    window.requestAnimationFrame(syncNotesScrollHint);
}

function fileUrlFromPath(path) {
    const value = normalize(path);
    if (!value) return "";
    if (value.startsWith("\\\\")) {
        return `file://///${value.replace(/^\\+/, "").replace(/\\/g, "/")}`;
    }
    if (/^[A-Za-z]:\\/.test(value)) {
        return `file:///${value.replace(/\\/g, "/")}`;
    }
    if (value.startsWith("/")) {
        return `file://${value.split("/").map((part, index) => index === 0 ? "" : encodeURIComponent(part)).join("/")}`;
    }
    return "";
}

function renderDocumentItem(item) {
    const problem = Boolean(item.problem);
    const meta = [item.extension, item.size_human, item.modified ? dateBr(item.modified) : "Sem data"].filter(Boolean).join(" • ");
    return `
        <article class="protocol-document-item${problem ? " is-problem" : ""}">
            <div class="protocol-document-icon">${protocolIcon(item.type === "folder" ? "archive" : "file")}</div>
            <div class="protocol-document-copy">
                <strong>${escapeHtml(item.name || "Sem nome")}</strong>
                <span>${escapeHtml(meta)}</span>
                ${problem ? `<em>${escapeHtml(item.problem_reason || "Arquivo possivelmente problemático")}</em>` : ""}
            </div>
        </article>
    `;
}

async function loadDocuments(id = currentId()) {
    if (!dom.documentsList) return;
    const token = ++state.listLoadTokens.documents;
    try {
        const data = await apiGet("documentos", { action: "list", protocolo_id: id });
        if (token !== state.listLoadTokens.documents) return;
        if (currentId() !== Number(id)) return;
        const items = Array.isArray(data.items) ? data.items : [];
        state.currentLists.documents = items;
        const summary = data.summary || {};
        dom.documentsFeedback.textContent = data.path ? `Pasta vinculada: ${data.path}` : "Nenhuma pasta vinculada.";
        const truncatedLabel = summary.truncated ? ` • exibindo ${items.length} de ${summary.total_found || summary.total || items.length}` : "";
        dom.documentsSummary.textContent = items.length
            ? `${summary.files || 0} arquivos • ${summary.folders || 0} pastas${summary.problematic ? ` • ${summary.problematic} atenção` : ""}${truncatedLabel}`
            : "Nenhum arquivo encontrado nesta pasta.";
        dom.documentsList.innerHTML = items.length
            ? items.map(renderDocumentItem).join("")
            : `<div class="protocol-empty-column">Nenhum arquivo encontrado.</div>`;
    } catch (error) {
        if (token !== state.listLoadTokens.documents) return;
        dom.documentsSummary.textContent = "";
        dom.documentsFeedback.textContent = error.message || "Não foi possível listar os documentos.";
        dom.documentsList.innerHTML = `<div class="protocol-empty-column">${escapeHtml(error.message || "Não foi possível listar os documentos.")}</div>`;
    }
}

async function copyDocumentsPath() {
    const path = normalize(dom.documentsPath?.value);
    if (!path) return showProtocolToast("Informe o caminho da pasta antes de copiar.");
    try {
        await navigator.clipboard.writeText(path);
        showProtocolToast("Caminho copiado.", "success");
    } catch {
        dom.documentsPath?.select();
        document.execCommand("copy");
        showProtocolToast("Caminho copiado.", "success");
    }
}

function openDocumentsPath() {
    const path = normalize(dom.documentsPath?.value);
    const url = fileUrlFromPath(path);
    if (!url) return showProtocolToast("Informe um caminho válido para abrir.");
    window.open(url, "_blank", "noopener");
}

function removeNoteFromModal(noteId) {
    const id = String(noteId || "");
    if (!id) return;
    state.listLoadTokens.notes += 1;
    state.currentLists.notes = state.currentLists.notes.filter((item) => String(item.id) !== id);
    dom.notes?.querySelectorAll("[data-note-id]").forEach((element) => {
        if (String(element.dataset.noteId || "") !== id) return;
        window.clearTimeout(element.timer);
        element.classList.add("is-removing");
        window.setTimeout(() => {
            element.remove();
            if (!dom.notes?.querySelector("[data-note-id]")) {
                dom.notes.innerHTML = `<div class="protocol-empty-column">Nenhum andamento registrado.</div>`;
            }
            syncNotesScrollHint();
        }, shouldReduceMotion() ? 0 : 160);
    });
}

async function createProtocol() {
    const data = await apiPost("protocolos", { action: "create" });
    if (data.id) state.freshCardIds.add(String(data.id));
    if (state.boardReady) {
        await refreshTouchedStatuses(["PARA_DISTRIBUIR"]);
    } else {
        await loadBoard();
    }
    if (data.id) await openProtocol(data.id);
}

async function duplicateProtocol() {
    const sourceId = currentId();
    if (!sourceId || dom.duplicate?.disabled) return;

    if (dom.duplicate) dom.duplicate.disabled = true;
    try {
        await flushPendingFieldSaves(sourceId);
        const data = await apiPost("protocolos", { action: "duplicate" }, { id: sourceId });
        applyServerClock(data);

        const duplicatedId = data.id || data.protocol?.id;
        if (duplicatedId) state.freshCardIds.add(String(duplicatedId));

        if (state.boardReady) {
            await refreshTouchedStatuses(["PARA_DISTRIBUIR"]);
        } else {
            await loadBoard();
        }

        if (duplicatedId) await openProtocol(duplicatedId);
        showProtocolToast("Ficha duplicada.", "success");
    } catch (error) {
        showProtocolToast(error.message || "Não foi possível duplicar a ficha.");
    } finally {
        if (dom.duplicate) dom.duplicate.disabled = false;
    }
}

function adjustStatusTotal(status, delta) {
    if (!status || !state.totalsByStatus.has(status)) return;
    const current = Number(state.totalsByStatus.get(status));
    if (!Number.isFinite(current)) return;
    state.totalsByStatus.set(status, Math.max(0, current + delta));
}

function moveProtocolInState(id, nextStatus) {
    const protocolId = String(id || "");
    const status = normalize(nextStatus);
    if (!protocolId || !status) return null;

    const item = findProtocolInState(protocolId);
    if (!item) return null;

    const previousStatus = normalize(item.status) || "";
    if (previousStatus === status) return { previousStatus, nextStatus: status, item };

    removeProtocolFromState(protocolId);
    adjustStatusTotal(previousStatus, -1);
    adjustStatusTotal(status, 1);

    const moved = { ...item, status };
    if (isStatusVisible(status)) {
        const targetItems = state.itemsByStatus.get(status) || [];
        state.itemsByStatus.set(status, [...targetItems, moved].sort(compareProtocols));
    }

    return { previousStatus, nextStatus: status, item: moved };
}

function rollbackProtocolMove(protocolId, moved) {
    if (!moved || !protocolId || moved.previousStatus === moved.nextStatus) return;
    removeProtocolFromState(protocolId);
    adjustStatusTotal(moved.nextStatus, -1);
    adjustStatusTotal(moved.previousStatus, 1);

    if (isStatusVisible(moved.previousStatus)) {
        const restored = { ...moved.item, status: moved.previousStatus };
        const previousItems = state.itemsByStatus.get(moved.previousStatus) || [];
        state.itemsByStatus.set(moved.previousStatus, [...previousItems, restored].sort(compareProtocols));
    }
}

async function refreshTouchedStatuses(statusesToRefresh) {
    const uniqueStatuses = [...new Set(statusesToRefresh.filter(Boolean))].filter((status) => isStatusVisible(status));
    const beforeRects = captureCardRects(uniqueStatuses);
    await Promise.all(uniqueStatuses.map((status) => loadStatus(status, { refreshLoaded: true, background: true })));
    renderStatusColumnsPreservingScroll(uniqueStatuses, { beforeRects });
}

async function updateStatus(id, status, options = {}) {
    const protocolId = String(id || "");
    const current = findProtocolInState(protocolId);
    const previousStatus = normalize(current?.status) || "";
    const nextStatus = normalize(status);
    const isVisibleMove = current
        && previousStatus !== nextStatus
        && isStatusVisible(previousStatus)
        && isStatusVisible(nextStatus);
    const affectedStatuses = [previousStatus, nextStatus].filter(Boolean);
    const beforeRects = isVisibleMove ? captureCardRects(affectedStatuses) : null;
    if (beforeRects && options.startRect) {
        beforeRects.set(protocolId, options.startRect);
    }

    if (current && previousStatus !== nextStatus && isStatusVisible(previousStatus) && !isStatusVisible(nextStatus)) {
        await animateProtocolCardExit(protocolId);
    }
    const moved = moveProtocolInState(protocolId, status);
    if (moved) {
        renderStatusColumnsPreservingScroll(affectedStatuses, {
            beforeRects,
            overlayIds: isVisibleMove ? [protocolId] : []
        });
    }

    try {
        const data = await apiPost("protocolos", { action: "status" }, {
            id,
            status,
            expected_status: previousStatus
        });
        applyServerClock(data);
        if (data.protocol) {
            patchProtocolInState(data.protocol, { insertIfMissing: Boolean(moved) });
        }
    } catch (error) {
        if (moved) {
            const rollbackBeforeRects = captureCardRects(affectedStatuses);
            rollbackProtocolMove(protocolId, moved);
            renderStatusColumnsPreservingScroll(affectedStatuses, {
                beforeRects: rollbackBeforeRects,
                overlayIds: isVisibleMove ? [protocolId] : []
            });
        }
        if (error.status === 409 && error.data?.protocol) {
            patchProtocolInState(error.data.protocol, { insertIfMissing: true });
        }
        showProtocolToast(error.message || "Não foi possível mover o protocolo.");
        throw error;
    }
}

function findProtocolInState(id) {
    const protocolId = String(id || "");
    for (const [status] of statuses) {
        const item = (state.itemsByStatus.get(status) || []).find((candidate) => String(candidate.id) === protocolId);
        if (item) return item;
    }
    return null;
}

function closeDeleteModal() {
    state.pendingDeleteId = "";
    if (!dom.deleteModal) return;
    dom.deleteModal.classList.add("is-closing");
    window.setTimeout(() => {
        if (typeof dom.deleteModal.close === "function" && dom.deleteModal.open) {
            dom.deleteModal.close();
        }
        dom.deleteModal.classList.add("hidden");
        dom.deleteModal.classList.remove("is-closing", "is-opening");
        dom.deleteModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }, 200);
}

function requestDeleteProtocol(id) {
    const item = findProtocolInState(id);
    state.pendingDeleteId = String(id || "");
    if (dom.deleteSummary) {
        dom.deleteSummary.textContent = item
            ? `${protocolTitle(item)}${item.ato ? ` • ${item.ato}` : ""}`
            : `Protocolo ${id}`;
    }
    if (!dom.deleteModal) return;
    dom.deleteModal.classList.remove("is-closing");
    dom.deleteModal.classList.remove("hidden");
    if (typeof dom.deleteModal.showModal === "function" && !dom.deleteModal.open) {
        dom.deleteModal.showModal();
    }
    dom.deleteModal.classList.add("is-opening");
    dom.deleteModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

function closeNoteDeleteModal() {
    state.pendingDeleteNoteId = "";
    if (!dom.noteDeleteModal) return;
    dom.noteDeleteModal.classList.add("is-closing");
    window.setTimeout(() => {
        if (typeof dom.noteDeleteModal.close === "function" && dom.noteDeleteModal.open) {
            dom.noteDeleteModal.close();
        }
        dom.noteDeleteModal.classList.add("hidden");
        dom.noteDeleteModal.classList.remove("is-closing", "is-opening");
        dom.noteDeleteModal.setAttribute("aria-hidden", "true");
        if (!dom.deleteModal || dom.deleteModal.classList.contains("hidden")) {
            document.body.style.overflow = "";
        }
    }, 200);
}

function requestDeleteNote(noteId) {
    const id = String(noteId || "");
    if (!id) return;
    const note = state.currentLists.notes.find((item) => String(item.id) === id);
    const descricao = normalize(note?.descricao || "");
    state.pendingDeleteNoteId = id;
    if (dom.noteDeleteSummary) {
        dom.noteDeleteSummary.textContent = descricao
            ? descricao.slice(0, 220)
            : `Andamento ${id}`;
    }
    if (!dom.noteDeleteModal) return;
    dom.noteDeleteModal.classList.remove("is-closing");
    dom.noteDeleteModal.classList.remove("hidden");
    if (typeof dom.noteDeleteModal.showModal === "function" && !dom.noteDeleteModal.open) {
        dom.noteDeleteModal.showModal();
    }
    dom.noteDeleteModal.classList.add("is-opening");
    dom.noteDeleteModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
}

async function deleteNote(noteId) {
    const id = String(noteId || "");
    if (!id) return;
    const noteElement = [...(dom.notes?.querySelectorAll("[data-note-id]") || [])]
        .find((element) => String(element.dataset.noteId || "") === id);
    if (noteElement?.timer) window.clearTimeout(noteElement.timer);
    closeNoteDeleteModal();
    removeNoteFromModal(id);
    try {
        const data = await apiPost("andamentos", { action: "delete" }, { id, protocolo_id: currentId() });
        applyServerClock(data);
        markCurrentProtocolTouched(data);
        await loadNotes();
    } catch (error) {
        showProtocolToast(error.message || "Não foi possível remover o andamento.");
        await loadNotes();
    }
}

async function deleteProtocol(id) {
    const item = findProtocolInState(id);
    const status = normalize(item?.status) || "";
    const data = await apiPost("protocolos", { action: "delete" }, { id });
    applyServerClock(data);
    closeDeleteModal();
    await animateProtocolCardExit(id);
    if (status) {
        removeProtocolFromState(id);
        adjustStatusTotal(status, -1);
        renderStatusColumnsPreservingScroll([status]);
    } else {
        await loadBoard({ reset: false, refreshLoaded: true });
    }
}

function printProtocol() {
    if (!state.current) return;
    printProtocolSheet({
        current: state.current,
        apiGet,
        protocolTitle,
        logoPath: LOGO_PATH
    }).catch(console.error);
}

function filterChips() {
    const chips = [];
    if (state.filters.q) chips.push({ type: "q", label: `Busca: ${state.filters.q}` });
    if (state.filters.ato) chips.push({ type: "ato", label: `Ato: ${dom.ato.options[dom.ato.selectedIndex]?.text || state.filters.ato}` });
    if (state.filters.digitador) chips.push({ type: "digitador", label: `Digitador: ${dom.digitador.options[dom.digitador.selectedIndex]?.text || state.filters.digitador}` });
    if (state.filters.urgente) chips.push({ type: "urgente", label: "Urgentes" });
    if (state.filters.tag_custom) chips.push({ type: "tag_custom", label: `Etiqueta: ${dom.tag.options[dom.tag.selectedIndex]?.text || state.filters.tag_custom}` });
    if (state.showArchived) chips.push({ type: "archived", label: "Arquivados visíveis" });
    return chips;
}

function renderActiveFilters() {
    const chips = filterChips();
    dom.activeFilters.innerHTML = chips.length
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
    if (type === "q") {
        dom.search.value = "";
        state.pendingSearchQuery = "";
        state.filters.q = "";
    }
    if (type === "ato") {
        dom.ato.value = "";
        state.filters.ato = "";
    }
    if (type === "digitador") {
        dom.digitador.value = "";
        state.filters.digitador = "";
    }
    if (type === "urgente") {
        dom.urgente.checked = false;
        state.filters.urgente = "";
    }
    if (type === "tag_custom") {
        dom.tag.value = "";
        state.filters.tag_custom = "";
    }
    if (type === "archived") {
        dom.archived.checked = false;
        setArchivedVisibility(false);
        return;
    }
    renderActiveFilters();
    scheduleLoad(20, { skipLayoutAnimation: true, filterTransition: true });
}

function clearDropTargets(options = {}) {
    dom.board.querySelectorAll(".is-drop-target").forEach((element) => {
        element.classList.remove("is-drop-target");
    });
    if (!options.keepPlaceholder) {
        dom.board.querySelectorAll(".protocol-drag-placeholder").forEach((element) => {
            element.remove();
        });
    }
    if (!options.keepActiveStatus) {
        state.activeDropStatus = "";
    }
}

function showDragPlaceholder(zone) {
    if (!zone || !state.draggingProtocolId) return;
    const dragged = protocolCardElement(state.draggingProtocolId);
    const height = Math.max(86, Math.ceil(dragged?.getBoundingClientRect().height || 112));
    let placeholder = dom.board.querySelector(".protocol-drag-placeholder");
    if (!placeholder) {
        placeholder = document.createElement("div");
        placeholder.className = "protocol-drag-placeholder";
        placeholder.setAttribute("aria-hidden", "true");
    }
    placeholder.style.setProperty("--protocol-drag-placeholder-height", `${height}px`);
    const footer = zone.querySelector(".protocol-column-loader, .protocol-column-more");
    zone.insertBefore(placeholder, footer || null);
}

function setArchiveMotion(mode = "") {
    window.clearTimeout(state.archiveMotionTimer);
    dom.board.classList.remove("is-archive-transitioning", "is-archive-expanding", "is-archive-collapsing");
    if (!mode || shouldReduceMotion()) return;

    dom.board.classList.add("is-archive-transitioning", `is-archive-${mode}`);
    state.archiveMotionTimer = window.setTimeout(() => {
        dom.board.classList.remove("is-archive-transitioning", "is-archive-expanding", "is-archive-collapsing");
    }, 460);
}

function loadBoardAfterArchiveToggle(delay = 80, animateResults = false, freshStatuses = []) {
    window.clearTimeout(state.archivedToggleTimer);
    state.archivedToggleTimer = window.setTimeout(() => {
        loadBoard({ reset: true, refreshLoaded: true, animateResults, freshStatuses, suppressSoftRefreshIndicator: true }).catch(console.error);
    }, shouldReduceMotion() ? 0 : delay);
}

function setArchivedVisibility(show) {
    window.clearTimeout(state.archivedToggleTimer);
    saveArchivedVisibilityPreference(show);

    if (!state.boardReady) {
        state.showArchived = show;
        renderActiveFilters();
        scheduleLoad(20, { skipLayoutAnimation: true, filterTransition: true });
        return;
    }

    if (show) {
        const beforeColumnRects = captureColumnRects();
        const archivedAlreadyLoaded = (state.itemsByStatus.get("ARQUIVADOS") || []).length > 0;
        if (archivedAlreadyLoaded) {
            markStatusCardsAsFresh(["ARQUIVADOS"]);
        }
        state.showArchived = true;
        state.archivedTransition = "show";
        renderActiveFilters();
        setArchiveMotion("expanding");
        renderBoard({
            preserveScroll: true,
            settle: false,
            beforeColumnRects
        });
        loadBoardAfterArchiveToggle(archivedAlreadyLoaded ? 280 : 40, false, archivedAlreadyLoaded ? [] : ["ARQUIVADOS"]);
        return;
    }

    const archivedColumn = dom.board.querySelector('[data-status="ARQUIVADOS"]');
    if (!archivedColumn) {
        state.showArchived = false;
        renderActiveFilters();
        setArchiveMotion("collapsing");
        renderBoard({
            preserveScroll: true,
            settle: false
        });
        loadBoardAfterArchiveToggle(260, false);
        return;
    }

    setArchiveMotion("collapsing");
    archivedColumn.classList.add("is-column-hiding");
    state.archivedToggleTimer = window.setTimeout(() => {
        const beforeColumnRects = captureColumnRects();
        state.showArchived = false;
        state.archivedTransition = "";
        renderActiveFilters();
        renderBoard({
            preserveScroll: true,
            settle: false,
            beforeColumnRects
        });
        loadBoardAfterArchiveToggle(260, false);
    }, shouldReduceMotion() ? 0 : 220);
}

function bindBoardEvents() {
    dom.board.addEventListener("click", async (event) => {
        const open = event.target.closest("[data-open-protocol]");
        const archive = event.target.closest("[data-archive-protocol]");
        const remove = event.target.closest("[data-delete-protocol]");
        const create = event.target.closest("[data-create-inline]");
        const loadMore = event.target.closest("[data-load-more-status]");

        if (open) await openProtocol(open.dataset.openProtocol, event, open);
        if (archive) {
            const card = archive.closest("[data-protocol-id]");
            const status = card?.closest("[data-status]")?.dataset.status;
            await updateStatus(archive.dataset.archiveProtocol, status === "ARQUIVADOS" ? "PARA_DISTRIBUIR" : "ARQUIVADOS");
        }
        if (remove) requestDeleteProtocol(remove.dataset.deleteProtocol);
        if (create) await createProtocol();
        if (loadMore) await loadMoreStatus(loadMore.dataset.loadMoreStatus);
    });

    dom.board.addEventListener("scroll", (event) => {
        const column = event.target.closest?.("[data-scroll-status]");
        if (!column || event.target !== column) return;
        if (column.scrollTop + column.clientHeight < column.scrollHeight - 140) return;
        loadMoreStatus(column.dataset.scrollStatus).catch(console.error);
    }, true);

    dom.board.addEventListener("dragstart", (event) => {
        const card = event.target.closest("[data-protocol-id]");
        if (!card) return;
        const rect = card.getBoundingClientRect();
        state.draggingProtocolId = card.dataset.protocolId || "";
        state.draggingSourceStatus = card.closest("[data-status]")?.dataset.status || "";
        state.draggingStartRect = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
        };
        card.classList.add("is-dragging");
        event.dataTransfer.setData("text/plain", card.dataset.protocolId);
        event.dataTransfer.effectAllowed = "move";
    });

    dom.board.addEventListener("dragend", () => {
        state.draggingProtocolId = "";
        state.draggingSourceStatus = "";
        state.draggingStartRect = null;
        clearDropTargets();
        dom.board.querySelectorAll(".is-dragging").forEach((card) => card.classList.remove("is-dragging"));
    });

    dom.board.addEventListener("dragover", (event) => {
        const zone = event.target.closest("[data-drop-status]");
        if (zone) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            const nextStatus = zone.dataset.dropStatus || "";
            if (state.activeDropStatus === nextStatus) return;
            clearDropTargets({ keepPlaceholder: true, keepActiveStatus: true });
            state.activeDropStatus = nextStatus;
            zone.classList.add("is-drop-target");
            showDragPlaceholder(zone);
        }
    });

    dom.board.addEventListener("drop", async (event) => {
        const zone = event.target.closest("[data-drop-status]");
        if (!zone) return;
        event.preventDefault();
        const id = event.dataTransfer.getData("text/plain");
        try {
            const targetStatus = zone.dataset.dropStatus || "";
            if (id && targetStatus && targetStatus !== state.draggingSourceStatus) {
                const placeholderRect = zone.querySelector(".protocol-drag-placeholder")?.getBoundingClientRect();
                await updateStatus(id, targetStatus, { startRect: state.draggingStartRect || placeholderRect || null });
            }
        } finally {
            state.draggingProtocolId = "";
            state.draggingSourceStatus = "";
            state.draggingStartRect = null;
            clearDropTargets();
        }
    });
}

function bindModalEvents() {
    dom.dialog.querySelector("form")?.addEventListener("submit", (event) => event.preventDefault());
    dom.close.addEventListener("click", () => {
        closeProtocolDialog().catch(console.error);
    });
    dom.dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeProtocolDialog().catch(console.error);
    });
    dom.dialog.addEventListener("close", () => {
        window.clearTimeout(state.dialogCloseTimer);
        dom.dialog.classList.remove("is-opening", "is-closing");
        if (!document.body.classList.contains("protocol-dialog-backdrop-closing")) {
            clearProtocolDialogBackdrop();
        }
        cancelPendingFieldSaves();
        showModalNotice("");
        flushDeferredBoardRefresh();
    });
    dom.duplicate?.addEventListener("click", () => {
        duplicateProtocol().catch(console.error);
    });
    dom.print.addEventListener("click", printProtocol);
    dom.notes?.addEventListener("scroll", syncNotesScrollHint, { passive: true });
    dom.refreshDocuments?.addEventListener("click", () => {
        flushPendingFieldSaves(currentId()).finally(() => loadDocuments().catch(console.error));
    });
    dom.copyDocumentsPath?.addEventListener("click", copyDocumentsPath);
    dom.openDocumentsPath?.addEventListener("click", openDocumentsPath);
    window.addEventListener("resize", syncNotesScrollHint);

    fieldElements().forEach((element) => {
        element.addEventListener(element.type === "checkbox" ? "change" : "input", () => queueSave(element));
        element.addEventListener("blur", () => {
            if (element.dataset.protocolField === "valor_ato") {
                element.value = moneyInputValue(element.value);
            }
            queueSave(element);
            if (element.dataset.protocolField === "tag_custom") {
                scheduleFilterMetadataRefresh(900);
            }
        });
    });

    dom.addProperty.addEventListener("click", async () => {
        try {
            const data = await apiPost("imoveis", { action: "create" }, { protocolo_id: currentId(), matricula: "", area: "" });
            applyServerClock(data);
            markCurrentProtocolTouched(data);
            await loadProperties();
        } catch (error) {
            showProtocolToast(error.message || "Não foi possível adicionar o imóvel.");
        }
    });

    dom.addValue.addEventListener("click", async () => {
        try {
            const data = await apiPost("valores", { action: "create" }, { protocolo_id: currentId(), descricao: "", valor: "0" });
            applyServerClock(data);
            markCurrentProtocolTouched(data);
            await loadValues();
        } catch (error) {
            showProtocolToast(error.message || "Não foi possível adicionar o valor.");
        }
    });

    dom.addNote.addEventListener("click", async () => {
        const descricao = normalize(dom.newNote.value);
        if (!descricao) return;
        try {
            const data = await apiPost("andamentos", { action: "create" }, { protocolo_id: currentId(), descricao });
            applyServerClock(data);
            markCurrentProtocolTouched(data);
            dom.newNote.value = "";
            await loadNotes();
        } catch (error) {
            showProtocolToast(error.message || "Não foi possível registrar o andamento.");
        }
    });

    dom.dialog.addEventListener("input", (event) => {
        const property = event.target.closest("[data-property-id]");
        const value = event.target.closest("[data-value-id]");
        const note = event.target.closest("[data-note-id]");

        if (property) {
            window.clearTimeout(property.timer);
            property.timer = window.setTimeout(async () => {
                try {
                    const data = await apiPost("imoveis", { action: "update" }, {
                        id: property.dataset.propertyId,
                        protocolo_id: currentId(),
                        matricula: property.querySelector("[data-property-field='matricula']").value,
                        area: property.querySelector("[data-property-field='area']").value
                    });
                    applyServerClock(data);
                    markCurrentProtocolTouched(data);
                } catch (error) {
                    showProtocolToast(error.message || "Não foi possível salvar o imóvel.");
                }
            }, 260);
        }

        if (value) {
            window.clearTimeout(value.timer);
            value.timer = window.setTimeout(async () => {
                try {
                    const data = await apiPost("valores", { action: "update" }, {
                        id: value.dataset.valueId,
                        protocolo_id: currentId(),
                        descricao: value.querySelector("[data-value-field='descricao']").value,
                        valor: moneyDecimalValue(value.querySelector("[data-value-field='valor']").value || "0")
                    });
                    applyServerClock(data);
                    markCurrentProtocolTouched(data);
                    syncValueRowAfterSave(value, data);
                } catch (error) {
                    showProtocolToast(error.message || "Não foi possível salvar o valor.");
                }
            }, 320);
        }

        if (note) {
            if (event.target.matches("[data-note-field='descricao']")) {
                fitProtocolTextarea(event.target);
            }
            window.clearTimeout(note.timer);
            note.timer = window.setTimeout(async () => {
                try {
                    const data = await apiPost("andamentos", { action: "update" }, {
                        id: note.dataset.noteId,
                        protocolo_id: currentId(),
                        descricao: note.querySelector("[data-note-field='descricao']").value
                    });
                    applyServerClock(data);
                    markCurrentProtocolTouched(data);
                } catch (error) {
                    showProtocolToast(error.message || "Não foi possível salvar o andamento.");
                }
            }, 380);
        }
    });

    dom.dialog.addEventListener("focusout", (event) => {
        if (!event.target.matches("[data-value-field='valor']")) return;
        event.target.value = moneyInputValue(event.target.value);
    });

    dom.dialog.addEventListener("click", async (event) => {
        const removeProperty = event.target.closest("[data-remove-property]");
        const removeValue = event.target.closest("[data-remove-value]");
        const removeNote = event.target.closest("[data-remove-note]");

        if (removeProperty) {
            try {
                const data = await apiPost("imoveis", { action: "delete" }, { id: removeProperty.dataset.removeProperty, protocolo_id: currentId() });
                applyServerClock(data);
                markCurrentProtocolTouched(data);
                await loadProperties();
            } catch (error) {
                showProtocolToast(error.message || "Não foi possível remover o imóvel.");
            }
        }
        if (removeValue) {
            try {
                const data = await apiPost("valores", { action: "delete" }, { id: removeValue.dataset.removeValue, protocolo_id: currentId() });
                applyServerClock(data);
                markCurrentProtocolTouched(data);
                await loadValues();
            } catch (error) {
                showProtocolToast(error.message || "Não foi possível remover o valor.");
            }
        }
        if (removeNote) {
            requestDeleteNote(removeNote.dataset.removeNote);
        }
    });
}

function bindConfirmEvents() {
    dom.deleteClose?.addEventListener("click", closeDeleteModal);
    dom.deleteCancel?.addEventListener("click", closeDeleteModal);
    dom.deleteOverlay?.addEventListener("click", closeDeleteModal);
    dom.deleteModal?.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeDeleteModal();
    });
    dom.deleteConfirm?.addEventListener("click", () => {
        if (!state.pendingDeleteId) return;
        deleteProtocol(state.pendingDeleteId).catch(console.error);
    });
    dom.noteDeleteClose?.addEventListener("click", closeNoteDeleteModal);
    dom.noteDeleteCancel?.addEventListener("click", closeNoteDeleteModal);
    dom.noteDeleteOverlay?.addEventListener("click", closeNoteDeleteModal);
    dom.noteDeleteModal?.addEventListener("cancel", (event) => {
        event.preventDefault();
        closeNoteDeleteModal();
    });
    dom.noteDeleteConfirm?.addEventListener("click", () => {
        if (!state.pendingDeleteNoteId) return;
        deleteNote(state.pendingDeleteNoteId).catch(console.error);
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && dom.noteDeleteModal && !dom.noteDeleteModal.classList.contains("hidden")) {
            closeNoteDeleteModal();
            return;
        }
        if (event.key === "Escape" && dom.deleteModal && !dom.deleteModal.classList.contains("hidden")) {
            closeDeleteModal();
        }
    });
}

function bindFilters() {
    dom.search.addEventListener("input", () => {
        state.pendingSearchQuery = normalize(dom.search.value);
        scheduleSearchLoad();
    });

    dom.ato.addEventListener("change", () => {
        state.filters.ato = dom.ato.value;
        renderActiveFilters();
        scheduleLoad(20, { skipLayoutAnimation: true, filterTransition: true });
    });

    dom.digitador.addEventListener("change", () => {
        state.filters.digitador = dom.digitador.value;
        renderActiveFilters();
        scheduleLoad(20, { skipLayoutAnimation: true, filterTransition: true });
    });

    dom.tag.addEventListener("change", () => {
        state.filters.tag_custom = dom.tag.value;
        renderActiveFilters();
        scheduleLoad(20, { skipLayoutAnimation: true, filterTransition: true });
    });

    dom.urgente.addEventListener("change", () => {
        state.filters.urgente = dom.urgente.checked ? "1" : "";
        renderActiveFilters();
        scheduleLoad(20, { skipLayoutAnimation: true, filterTransition: true });
    });

    dom.archived.addEventListener("change", () => {
        setArchivedVisibility(dom.archived.checked);
    });

    dom.activeFilters.addEventListener("click", (event) => {
        const trigger = event.target.closest("[data-clear-filter]");
        if (!trigger) return;
        clearFilter(trigger.dataset.clearFilter);
    });

    dom.create?.addEventListener("click", () => createProtocol().catch(console.error));
}

function init() {
    hydrateStaticIcons();
    state.showArchived = loadArchivedVisibilityPreference();
    dom.archived.checked = state.showArchived;
    bindFilters();
    bindBoardEvents();
    bindModalEvents();
    bindConfirmEvents();
    renderActiveFilters();
    connectProtocolEvents();
    refreshFilterMetadata().catch((error) => {
        state.lastError = error.message || "Falha ao carregar metadados dos filtros.";
    });
    loadBoard({ reset: true });
    window.setInterval(() => syncChanges().catch(console.error), SYNC_INTERVAL_MS);
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            syncChanges().catch(console.error);
        }
    });
}

init();
