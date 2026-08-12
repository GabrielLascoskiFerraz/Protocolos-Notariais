(() => {
  "use strict";

  const STORAGE_KEY = "raizes_genealogia_v1";
  const WORLD_WIDTH = 2400;
  const WORLD_HEIGHT = 1800;
  const NODE_WIDTH = 210;
  const NODE_HEIGHT = 82;
  const HORIZONTAL_GAP = 70;
  const COUPLE_GAP = 34;
  const FAMILY_GAP = 110;
  const VERTICAL_GAP = 155;

  const state = {
    trees: [],
    currentTreeId: null,
    selectedPersonId: null,
    openMenuTreeId: null,
    modalConfig: null,
    saveTimer: null,
    saveErrorShown: false,
    layout: new Map(),
    generations: new Map(),
    view: { x: 0, y: 0, scale: 1 },
    drag: null,
    hasFittedCurrentTree: false,
  };

  const elements = {
    libraryScreen: document.querySelector("#library-screen"),
    editorScreen: document.querySelector("#editor-screen"),
    createTreeBtn: document.querySelector("#create-tree-btn"),
    importTreeBtn: document.querySelector("#import-tree-btn"),
    importFileInput: document.querySelector("#import-file-input"),
    treeSearch: document.querySelector("#tree-search"),
    treeList: document.querySelector("#tree-list"),
    treeCount: document.querySelector("#tree-count"),
    backToLibraryBtn: document.querySelector("#back-to-library-btn"),
    renameCurrentBtn: document.querySelector("#rename-current-btn"),
    currentTreeName: document.querySelector("#current-tree-name"),
    exportTreeBtn: document.querySelector("#export-tree-btn"),
    exportTreePdfBtn: document.querySelector("#export-tree-pdf-btn"),
    personSearch: document.querySelector("#person-search"),
    personSearchResults: document.querySelector("#person-search-results"),
    editorLayout: document.querySelector(".editor-layout"),
    addPanel: document.querySelector("#add-panel"),
    editPanel: document.querySelector("#edit-panel"),
    mobileAddBtn: document.querySelector("#mobile-add-btn"),
    closeAddPanelBtn: document.querySelector("#close-add-panel-btn"),
    emptyAddBtn: document.querySelector("#empty-add-btn"),
    addPersonForm: document.querySelector("#add-person-form"),
    editPersonForm: document.querySelector("#edit-person-form"),
    addPersonName: document.querySelector("#add-person-name"),
    addMotherName: document.querySelector("#add-mother-name"),
    addFatherName: document.querySelector("#add-father-name"),
    addSpouseName: document.querySelector("#add-spouse-name"),
    addDeceased: document.querySelector("#add-deceased"),
    editPersonName: document.querySelector("#edit-person-name"),
    editMotherName: document.querySelector("#edit-mother-name"),
    editFatherName: document.querySelector("#edit-father-name"),
    editSpouseName: document.querySelector("#edit-spouse-name"),
    editDeceased: document.querySelector("#edit-deceased"),
    selectedPersonSummary: document.querySelector("#selected-person-summary"),
    closeEditPanelBtn: document.querySelector("#close-edit-panel-btn"),
    removePersonBtn: document.querySelector("#remove-person-btn"),
    treeViewport: document.querySelector("#tree-viewport"),
    treeWorld: document.querySelector("#tree-world"),
    connectionsLayer: document.querySelector("#connections-layer"),
    nodesLayer: document.querySelector("#nodes-layer"),
    emptyTreeState: document.querySelector("#empty-tree-state"),
    zoomOutBtn: document.querySelector("#zoom-out-btn"),
    zoomInBtn: document.querySelector("#zoom-in-btn"),
    fitTreeBtn: document.querySelector("#fit-tree-btn"),
    zoomLabel: document.querySelector("#zoom-label"),
    modalBackdrop: document.querySelector("#modal-backdrop"),
    modalCloseBtn: document.querySelector("#modal-close-btn"),
    modalCancelBtn: document.querySelector("#modal-cancel-btn"),
    modalForm: document.querySelector("#modal-form"),
    modalTitle: document.querySelector("#modal-title"),
    modalMessage: document.querySelector("#modal-message"),
    modalIcon: document.querySelector("#modal-icon"),
    modalFieldWrap: document.querySelector("#modal-field-wrap"),
    modalFieldLabel: document.querySelector("#modal-field-label"),
    modalInput: document.querySelector("#modal-input"),
    modalConfirmBtn: document.querySelector("#modal-confirm-btn"),
    toastRegion: document.querySelector("#toast-region"),
  };

  function generateId(prefix) {
    const randomPart =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replaceAll("-", "")
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
    return `${prefix}_${randomPart.slice(0, 16)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function normalizeName(value) {
    return String(value ?? "")
      .trim()
      .replace(/\s+/g, " ");
  }

  function searchKey(value) {
    return normalizeName(value)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("pt-BR");
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeSpouseLinks(people) {
    const byId = new Map(people.map((person) => [person.id, person]));
    people.forEach((person) => {
      if (!person.conjugueId || person.conjugueId === person.id || !byId.has(person.conjugueId)) {
        person.conjugueId = null;
      }
    });
    people.forEach((person) => {
      if (!person.conjugueId) return;
      const spouse = byId.get(person.conjugueId);
      if (!spouse.conjugueId || spouse.conjugueId === person.id) {
        spouse.conjugueId = person.id;
        return;
      }
      person.conjugueId = null;
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Data desconhecida";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  function uniqueTreeName(baseName) {
    const cleanBase = normalizeName(baseName) || "Árvore importada";
    const existing = new Set(state.trees.map((tree) => searchKey(tree.nome)));
    if (!existing.has(searchKey(cleanBase))) return cleanBase;

    let index = 2;
    while (existing.has(searchKey(`${cleanBase} (${index})`))) index += 1;
    return `${cleanBase} (${index})`;
  }

  function initials(name) {
    const parts = normalizeName(name).split(" ").filter(Boolean);
    if (!parts.length) return "?";
    return `${parts[0][0] ?? ""}${parts.length > 1 ? parts.at(-1)[0] : ""}`.toLocaleUpperCase("pt-BR");
  }

  function icon(name) {
    const paths = {
      tree: '<path d="M12 22V7m0 8c-3-1-5-3-6-6 4 0 6 2 6 6Zm0 3c4 0 7-3 8-6-5 0-8 2-8 6Zm0-11c2 0 4-2 4-5-3 0-4 2-4 5Z"/><path d="M8 22h8"/>',
      folder: '<path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z"/>',
      edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/>',
      copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
      trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6m5 4v7m4-7v7"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6m-3-3h6"/>',
      calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
      dots: '<circle cx="12" cy="5" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
      target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3m0 14v3M2 12h3m14 0h3"/>',
      check: '<path d="m5 12 4 4L19 6"/>',
      alert: '<path d="M12 9v4m0 4h.01"/><path d="M10.3 4.2 2.7 17.3A2 2 0 0 0 4.4 20h15.2a2 2 0 0 0 1.7-2.7L13.7 4.2a2 2 0 0 0-3.4 0Z"/>',
      search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      memorial: '<path d="M7 20h10M8 20V10a4 4 0 0 1 8 0v10"/><path d="M10 14h4"/>',
    };
    return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] ?? paths.tree}</svg>`;
  }

  function sanitizeStoredTree(raw) {
    if (!raw || typeof raw !== "object") return null;
    const sourcePeople = Array.isArray(raw.pessoas) ? raw.pessoas : [];
    const seen = new Set();
    const oldToNew = new Map();
    const people = sourcePeople.map((person) => {
      const oldId = typeof person?.id === "string" ? person.id : "";
      let id = oldId && !seen.has(oldId) ? oldId : generateId("pessoa");
      while (seen.has(id)) id = generateId("pessoa");
      seen.add(id);
      if (oldId && !oldToNew.has(oldId)) oldToNew.set(oldId, id);
      return {
        id,
        nome: normalizeName(person?.nome) || "Pessoa sem nome",
        maeId: null,
        paiId: null,
        conjugueId: null,
        falecida: Boolean(person?.falecida ?? person?.falecido),
        posicao: {
          x: Number.isFinite(person?.posicao?.x) ? person.posicao.x : 0,
          y: Number.isFinite(person?.posicao?.y) ? person.posicao.y : 0,
        },
        __maeAntiga: person?.maeId,
        __paiAntigo: person?.paiId,
        __conjugueAntigo: person?.conjugueId ?? person?.conjugeId,
      };
    });

    people.forEach((person) => {
      person.maeId = oldToNew.get(person.__maeAntiga) ?? null;
      person.paiId = oldToNew.get(person.__paiAntigo) ?? null;
      person.conjugueId = oldToNew.get(person.__conjugueAntigo) ?? null;
      delete person.__maeAntiga;
      delete person.__paiAntigo;
      delete person.__conjugueAntigo;
    });
    normalizeSpouseLinks(people);

    return {
      id: typeof raw.id === "string" && raw.id ? raw.id : generateId("tree"),
      nome: normalizeName(raw.nome) || "Árvore sem nome",
      criadoEm: raw.criadoEm || nowIso(),
      atualizadoEm: raw.atualizadoEm || nowIso(),
      pessoas: people,
    };
  }

  function importTreeFromObject(raw) {
    const source = raw?.tree && typeof raw.tree === "object" ? raw.tree : raw;
    const sanitized = sanitizeStoredTree(source);
    if (!sanitized) throw new Error("O arquivo não contém uma árvore válida.");

    const oldToNew = new Map();
    sanitized.pessoas.forEach((person) => oldToNew.set(person.id, generateId("pessoa")));
    sanitized.pessoas = sanitized.pessoas.map((person) => ({
      ...person,
      id: oldToNew.get(person.id),
      maeId: oldToNew.get(person.maeId) ?? null,
      paiId: oldToNew.get(person.paiId) ?? null,
      conjugueId: oldToNew.get(person.conjugueId) ?? null,
    }));
    normalizeSpouseLinks(sanitized.pessoas);
    sanitized.id = generateId("tree");
    sanitized.nome = uniqueTreeName(sanitized.nome);
    sanitized.criadoEm = nowIso();
    sanitized.atualizadoEm = nowIso();
    return sanitized;
  }

  function loadTrees() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const source = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.trees) ? parsed.trees : [];
      state.trees = source.map(sanitizeStoredTree).filter(Boolean);
    } catch (error) {
      console.error("Falha ao carregar árvores:", error);
      state.trees = [];
      showToast("Não foi possível ler os dados salvos. Uma biblioteca vazia foi aberta.", "error");
    }
  }

  function persistTrees() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.trees));
      state.saveErrorShown = false;
      return true;
    } catch (error) {
      console.error("Falha ao salvar árvores:", error);
      if (!state.saveErrorShown) {
        showToast("O navegador não conseguiu salvar os dados locais.", "error");
        state.saveErrorShown = true;
      }
      return false;
    }
  }

  function currentTree() {
    return state.trees.find((tree) => tree.id === state.currentTreeId) ?? null;
  }

  function currentPerson() {
    return currentTree()?.pessoas.find((person) => person.id === state.selectedPersonId) ?? null;
  }

  function updateSaveStatus() {
    // O salvamento permanece silencioso; falhas continuam sendo exibidas por toast.
  }

  function scheduleSave() {
    const tree = currentTree();
    if (tree) tree.atualizadoEm = nowIso();
    updateSaveStatus(true);
    window.clearTimeout(state.saveTimer);
    state.saveTimer = window.setTimeout(() => {
      persistTrees();
      updateSaveStatus(false);
      renderLibrary();
    }, 280);
  }

  function flushSave() {
    window.clearTimeout(state.saveTimer);
    if (persistTrees()) updateSaveStatus(false);
  }

  function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.innerHTML = `${icon(type === "error" ? "alert" : "check")}<span>${escapeHtml(message)}</span>`;
    elements.toastRegion.append(toast);
    window.setTimeout(() => toast.remove(), 3600);
  }

  function showModal(config) {
    state.modalConfig = config;
    elements.modalTitle.textContent = config.title;
    elements.modalMessage.textContent = config.message || "";
    elements.modalMessage.hidden = !config.message;
    elements.modalFieldWrap.hidden = config.input === false;
    elements.modalFieldLabel.textContent = config.label || "";
    elements.modalInput.value = config.value || "";
    elements.modalInput.placeholder = config.placeholder || "";
    elements.modalInput.required = config.required !== false && config.input !== false;
    elements.modalConfirmBtn.textContent = config.confirmText || "Confirmar";
    elements.modalConfirmBtn.className = `button ${config.danger ? "button-danger" : "button-primary"}`;
    elements.modalIcon.className = `modal-icon${config.danger ? " danger" : ""}`;
    elements.modalIcon.innerHTML = icon(config.danger ? "trash" : config.icon || "tree");
    elements.modalBackdrop.hidden = false;

    window.setTimeout(() => {
      if (config.input === false) elements.modalConfirmBtn.focus();
      else {
        elements.modalInput.focus();
        elements.modalInput.select();
      }
    }, 0);
  }

  function closeModal() {
    elements.modalBackdrop.hidden = true;
    state.modalConfig = null;
  }

  function treeEmblemSvg() {
    return '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 29V9m0 11c-5-1-8-4-9-8 5 0 8 3 9 8Zm0 3c5 0 9-3 10-8-6 0-9 3-10 8Zm0-13c3 0 5-2 5-6-4 0-6 3-5 6Z"/><path d="M11 29h10"/></svg>';
  }

  function renderLibrary() {
    const query = searchKey(elements.treeSearch.value);
    const trees = state.trees
      .filter((tree) => !query || searchKey(tree.nome).includes(query))
      .sort((a, b) => new Date(b.atualizadoEm) - new Date(a.atualizadoEm));

    elements.treeCount.textContent = state.trees.length
      ? `${state.trees.length} ${state.trees.length === 1 ? "árvore" : "árvores"}`
      : "";

    if (!trees.length) {
      const isSearch = Boolean(query);
      elements.treeList.innerHTML = `
        <div class="empty-library">
          <span class="tree-emblem">${treeEmblemSvg()}</span>
          <h3>${isSearch ? "Nenhuma árvore encontrada" : "Comece uma árvore genealógica"}</h3>
          <p>${
            isSearch
              ? "Tente buscar por outro nome."
              : "Crie uma árvore e adicione pessoas informando nome, mãe, pai e demais vínculos."
          }</p>
          ${
            isSearch
              ? ""
              : '<button class="button button-primary" type="button" data-empty-create>Criar primeira árvore</button>'
          }
        </div>`;
      return;
    }

    elements.treeList.innerHTML = `
      <div class="tree-list-header" aria-hidden="true">
        <span>Nome da árvore</span>
        <span>Pessoas</span>
        <span>Última atualização</span>
        <span></span>
      </div>
      ${trees
        .map(
          (tree, index) => `
          <article class="tree-row" data-tree-id="${escapeHtml(tree.id)}" tabindex="0" aria-label="Abrir ${escapeHtml(tree.nome)}">
            <div class="tree-main-cell">
              <span class="tree-emblem ${index % 4 === 3 ? "clay" : ""}">${treeEmblemSvg()}</span>
              <h3 class="tree-name">${escapeHtml(tree.nome)}</h3>
            </div>
            <div class="tree-meta">
              ${icon("users")}
              <span>${tree.pessoas.length} ${tree.pessoas.length === 1 ? "pessoa" : "pessoas"}</span>
            </div>
            <div class="tree-meta">
              ${icon("calendar")}
              <span>${escapeHtml(formatDate(tree.atualizadoEm))}</span>
            </div>
            <button class="icon-button tree-menu-button" type="button" data-tree-menu aria-label="Opções de ${escapeHtml(tree.nome)}">
              ${icon("dots")}
            </button>
            ${
              state.openMenuTreeId === tree.id
                ? `
                  <div class="context-menu" data-context-menu>
                    <button type="button" data-action="open">${icon("folder")}Abrir</button>
                    <button type="button" data-action="rename">${icon("edit")}Renomear</button>
                    <button type="button" data-action="duplicate">${icon("copy")}Duplicar</button>
                    <button type="button" class="danger" data-action="delete">${icon("trash")}Excluir</button>
                  </div>`
                : ""
            }
          </article>`,
        )
        .join("")}
    `;
  }

  function createTree() {
    showModal({
      title: "Criar nova árvore",
      message: "Dê um nome para identificar esta árvore genealógica.",
      label: "Nome da árvore",
      placeholder: "Ex.: Família Ferraz",
      confirmText: "Criar árvore",
      icon: "tree",
      onConfirm(value) {
        const name = normalizeName(value);
        if (!name) return false;
        const timestamp = nowIso();
        const tree = {
          id: generateId("tree"),
          nome: uniqueTreeName(name),
          criadoEm: timestamp,
          atualizadoEm: timestamp,
          pessoas: [],
        };
        state.trees.push(tree);
        persistTrees();
        closeModal();
        openTree(tree.id);
        showToast("Árvore criada.");
        return true;
      },
    });
  }

  function renameTree(treeId) {
    const tree = state.trees.find((item) => item.id === treeId);
    if (!tree) return;
    showModal({
      title: "Renomear árvore",
      message: "O conteúdo e os vínculos familiares serão mantidos.",
      label: "Novo nome",
      value: tree.nome,
      confirmText: "Salvar nome",
      icon: "edit",
      onConfirm(value) {
        const name = normalizeName(value);
        if (!name) return false;
        tree.nome = name;
        tree.atualizadoEm = nowIso();
        persistTrees();
        elements.currentTreeName.textContent = tree.nome;
        renderLibrary();
        closeModal();
        showToast("Nome da árvore atualizado.");
        return true;
      },
    });
  }

  function duplicateTree(treeId) {
    const tree = state.trees.find((item) => item.id === treeId);
    if (!tree) return;
    const duplicate = clone(tree);
    const oldToNew = new Map();
    duplicate.pessoas.forEach((person) => oldToNew.set(person.id, generateId("pessoa")));
    duplicate.pessoas = duplicate.pessoas.map((person) => ({
      ...person,
      id: oldToNew.get(person.id),
      maeId: oldToNew.get(person.maeId) ?? null,
      paiId: oldToNew.get(person.paiId) ?? null,
      conjugueId: oldToNew.get(person.conjugueId) ?? null,
    }));
    normalizeSpouseLinks(duplicate.pessoas);
    duplicate.id = generateId("tree");
    duplicate.nome = uniqueTreeName(`${tree.nome} — cópia`);
    duplicate.criadoEm = nowIso();
    duplicate.atualizadoEm = nowIso();
    state.trees.push(duplicate);
    persistTrees();
    renderLibrary();
    showToast("Árvore duplicada.");
  }

  function deleteTree(treeId) {
    const tree = state.trees.find((item) => item.id === treeId);
    if (!tree) return;
    showModal({
      title: "Excluir árvore?",
      message: `“${tree.nome}” e todas as pessoas cadastradas serão removidas deste navegador. Essa ação não pode ser desfeita.`,
      input: false,
      confirmText: "Excluir árvore",
      danger: true,
      onConfirm() {
        state.trees = state.trees.filter((item) => item.id !== treeId);
        persistTrees();
        closeModal();
        renderLibrary();
        showToast("Árvore excluída.");
        return true;
      },
    });
  }

  function handleTreeListClick(event) {
    const emptyCreate = event.target.closest("[data-empty-create]");
    if (emptyCreate) {
      createTree();
      return;
    }

    const row = event.target.closest("[data-tree-id]");
    if (!row) return;
    const treeId = row.dataset.treeId;
    const menuButton = event.target.closest("[data-tree-menu]");
    const actionButton = event.target.closest("[data-action]");

    if (menuButton) {
      event.stopPropagation();
      state.openMenuTreeId = state.openMenuTreeId === treeId ? null : treeId;
      renderLibrary();
      return;
    }

    if (actionButton) {
      event.stopPropagation();
      state.openMenuTreeId = null;
      const action = actionButton.dataset.action;
      if (action === "open") openTree(treeId);
      if (action === "rename") renameTree(treeId);
      if (action === "duplicate") duplicateTree(treeId);
      if (action === "delete") deleteTree(treeId);
      return;
    }

    openTree(treeId);
  }

  function openTree(treeId) {
    const tree = state.trees.find((item) => item.id === treeId);
    if (!tree) {
      showToast("Essa árvore não foi encontrada.", "error");
      window.location.hash = "#/";
      return;
    }
    flushSave();
    state.currentTreeId = treeId;
    state.selectedPersonId = null;
    state.openMenuTreeId = null;
    state.hasFittedCurrentTree = false;
    elements.personSearch.value = "";
    hideSearchResults();
    window.location.hash = `#/tree/${encodeURIComponent(treeId)}`;
    showEditor();
  }

  function showLibrary() {
    flushSave();
    state.currentTreeId = null;
    state.selectedPersonId = null;
    elements.editorScreen.hidden = true;
    elements.libraryScreen.hidden = false;
    elements.addPanel.classList.remove("open");
    renderLibrary();
  }

  function showEditor() {
    const tree = currentTree();
    if (!tree) {
      showLibrary();
      return;
    }
    elements.libraryScreen.hidden = true;
    elements.editorScreen.hidden = false;
    elements.currentTreeName.textContent = tree.nome;
    updateSaveStatus(false);
    renderTree();
    window.requestAnimationFrame(() => {
      if (!state.hasFittedCurrentTree) {
        fitTree();
        state.hasFittedCurrentTree = true;
      }
    });
  }

  function route() {
    const match = window.location.hash.match(/^#\/tree\/(.+)$/);
    if (match) {
      state.currentTreeId = decodeURIComponent(match[1]);
      if (currentTree()) showEditor();
      else {
        window.location.hash = "#/";
        showLibrary();
      }
    } else {
      showLibrary();
    }
  }

  function familyPairKey(firstId, secondId) {
    return [firstId, secondId].sort().join("|");
  }

  function buildFamilyUnits(people) {
    const byId = new Map(people.map((person) => [person.id, person]));
    const sourceOrder = new Map(people.map((person, index) => [person.id, index]));
    const parent = new Map(people.map((person) => [person.id, person.id]));

    function find(id) {
      const current = parent.get(id);
      if (current === id) return id;
      const root = find(current);
      parent.set(id, root);
      return root;
    }

    function union(firstId, secondId) {
      if (!byId.has(firstId) || !byId.has(secondId)) return;
      const firstRoot = find(firstId);
      const secondRoot = find(secondId);
      if (firstRoot !== secondRoot) parent.set(secondRoot, firstRoot);
    }

    const couples = new Map();
    people.forEach((person) => {
      if (person.conjugueId && byId.has(person.conjugueId)) {
        union(person.id, person.conjugueId);
        couples.set(familyPairKey(person.id, person.conjugueId), [person.id, person.conjugueId]);
      }
      if (person.maeId && person.paiId && byId.has(person.maeId) && byId.has(person.paiId)) {
        union(person.maeId, person.paiId);
        couples.set(familyPairKey(person.maeId, person.paiId), [person.maeId, person.paiId]);
      }
    });

    const units = new Map();
    people.forEach((person, sourceIndex) => {
      const root = find(person.id);
      if (!units.has(root)) {
        units.set(root, {
          id: root,
          members: [],
          parentUnitIds: new Set(),
          childUnitIds: new Set(),
          sourceIndex,
          generation: 0,
          width: 0,
          centerX: WORLD_WIDTH / 2,
        });
      }
      units.get(root).members.push(person);
    });

    const unitByPerson = new Map();
    units.forEach((unit) => {
      unit.members.sort(
        (a, b) =>
          sourceOrder.get(a.id) - sourceOrder.get(b.id) ||
          a.nome.localeCompare(b.nome, "pt-BR") ||
          a.id.localeCompare(b.id),
      );
      unit.width = unit.members.length * NODE_WIDTH + Math.max(0, unit.members.length - 1) * COUPLE_GAP;
      unit.members.forEach((person) => unitByPerson.set(person.id, unit.id));
    });

    people.forEach((person) => {
      const childUnitId = unitByPerson.get(person.id);
      [person.maeId, person.paiId].forEach((parentId) => {
        const parentUnitId = unitByPerson.get(parentId);
        if (!parentUnitId || parentUnitId === childUnitId) return;
        units.get(childUnitId).parentUnitIds.add(parentUnitId);
        units.get(parentUnitId).childUnitIds.add(childUnitId);
      });
    });

    const generationMemo = new Map();
    function resolveGeneration(unitId, visiting = new Set()) {
      if (generationMemo.has(unitId)) return generationMemo.get(unitId);
      if (visiting.has(unitId)) return 0;
      const unit = units.get(unitId);
      const nextVisiting = new Set(visiting).add(unitId);
      const parentGenerations = [...unit.parentUnitIds].map((parentId) =>
        resolveGeneration(parentId, nextVisiting),
      );
      const generation = parentGenerations.length ? Math.max(...parentGenerations) + 1 : 0;
      unit.generation = generation;
      generationMemo.set(unitId, generation);
      return generation;
    }
    units.forEach((unit) => resolveGeneration(unit.id));

    return { byId, units, unitByPerson, couples: [...couples.values()] };
  }

  function calculateLayout(people) {
    const family = buildFamilyUnits(people);
    const generations = new Map();
    const childrenByParent = new Map();
    people.forEach((person) => {
      generations.set(person.id, family.units.get(family.unitByPerson.get(person.id))?.generation ?? 0);
      [person.maeId, person.paiId].forEach((parentId) => {
        if (!parentId || !family.byId.has(parentId)) return;
        if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
        childrenByParent.get(parentId).push(person.id);
      });
    });

    const layers = new Map();
    family.units.forEach((unit) => {
      if (!layers.has(unit.generation)) layers.set(unit.generation, []);
      layers.get(unit.generation).push(unit);
    });

    const layout = new Map();
    [...layers.entries()]
      .sort(([a], [b]) => a - b)
      .forEach(([generation, units]) => {
        const clustersByParents = new Map();
        units.forEach((unit) => {
          const parentIds = [...unit.parentUnitIds]
            .filter((parentId) => family.units.get(parentId)?.generation < generation)
            .sort();
          const key = parentIds.length ? parentIds.join("|") : `root:${unit.id}`;
          if (!clustersByParents.has(key)) {
            clustersByParents.set(key, {
              parentIds,
              units: [],
              desiredCenter: WORLD_WIDTH / 2,
              width: 0,
              left: 0,
            });
          }
          clustersByParents.get(key).units.push(unit);
        });

        const clusters = [...clustersByParents.values()];
        clusters.forEach((cluster) => {
          const parentCenters = cluster.parentIds
            .map((parentId) => family.units.get(parentId)?.centerX)
            .filter(Number.isFinite);
          cluster.desiredCenter = parentCenters.length
            ? parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length
            : WORLD_WIDTH / 2;
          cluster.units.sort(
            (a, b) =>
              a.sourceIndex - b.sourceIndex ||
              a.members[0].nome.localeCompare(b.members[0].nome, "pt-BR") ||
              a.id.localeCompare(b.id),
          );
          cluster.sourceIndex = Math.min(...cluster.units.map((unit) => unit.sourceIndex));
          cluster.width =
            cluster.units.reduce((sum, unit) => sum + unit.width, 0) +
            Math.max(0, cluster.units.length - 1) * HORIZONTAL_GAP;
        });

        clusters.sort(
          (a, b) =>
            a.desiredCenter - b.desiredCenter ||
            a.sourceIndex - b.sourceIndex ||
            a.units[0].id.localeCompare(b.units[0].id),
        );

        let previousRight = -Infinity;
        clusters.forEach((cluster) => {
          const desiredLeft = cluster.desiredCenter - cluster.width / 2;
          cluster.left = Math.max(desiredLeft, previousRight + FAMILY_GAP);
          previousRight = cluster.left + cluster.width;
        });

        if (clusters.length) {
          const desiredAverage =
            clusters.reduce((sum, cluster) => sum + cluster.desiredCenter, 0) / clusters.length;
          const actualAverage =
            clusters.reduce((sum, cluster) => sum + cluster.left + cluster.width / 2, 0) /
            clusters.length;
          let shift = desiredAverage - actualAverage;
          const minLeft = Math.min(...clusters.map((cluster) => cluster.left));
          const maxRight = Math.max(...clusters.map((cluster) => cluster.left + cluster.width));
          if (minLeft + shift < 90) shift = 90 - minLeft;
          if (maxRight + shift > WORLD_WIDTH - 90) shift = WORLD_WIDTH - 90 - maxRight;
          clusters.forEach((cluster) => {
            cluster.left += shift;
          });
        }

        const y = 140 + generation * (NODE_HEIGHT + VERTICAL_GAP);
        clusters.forEach((cluster) => {
          let unitLeft = cluster.left;
          cluster.units.forEach((unit) => {
            unit.centerX = unitLeft + unit.width / 2;
            unit.members.forEach((person, memberIndex) => {
              const position = {
                x: unitLeft + memberIndex * (NODE_WIDTH + COUPLE_GAP),
                y,
              };
              layout.set(person.id, position);
              person.posicao = { ...position };
            });
            unitLeft += unit.width + HORIZONTAL_GAP;
          });
        });
      });

    return { layout, generations, childrenByParent, couples: family.couples };
  }

  function relationshipLabel(person, people, childrenByParent) {
    const children = childrenByParent.get(person.id) || [];
    const usedAsMother = people.some((item) => item.maeId === person.id);
    const usedAsFather = people.some((item) => item.paiId === person.id);
    let relationship = "";
    if (children.length) {
      if (usedAsMother && !usedAsFather) relationship = `Mãe de ${children.length}`;
      else if (usedAsFather && !usedAsMother) relationship = `Pai de ${children.length}`;
      else relationship = `${children.length} ${children.length === 1 ? "descendente" : "descendentes"}`;
    } else {
      const parents = [person.maeId, person.paiId].filter(Boolean).length;
      if (parents) relationship = `${parents} ${parents === 1 ? "vínculo parental" : "vínculos parentais"}`;
      else if (person.conjugueId) relationship = "Cônjuge cadastrado";
      else relationship = "Sem vínculos informados";
    }
    return person.falecida ? `Falecida · ${relationship}` : relationship;
  }

  function coupleConnector(firstPosition, secondPosition) {
    const [left, right] =
      firstPosition.x <= secondPosition.x
        ? [firstPosition, secondPosition]
        : [secondPosition, firstPosition];
    const gap = right.x - (left.x + NODE_WIDTH);
    if (gap > COUPLE_GAP * 1.6 || left.y !== right.y) {
      const y = Math.max(left.y, right.y) + NODE_HEIGHT + 24;
      const startX = left.x + NODE_WIDTH / 2;
      const endX = right.x + NODE_WIDTH / 2;
      return {
        d: `M ${startX} ${left.y + NODE_HEIGHT} V ${y} H ${endX} V ${right.y + NODE_HEIGHT}`,
        junctionX: startX + (endX - startX) / 2,
        junctionY: y,
      };
    }
    const y = left.y + NODE_HEIGHT / 2;
    const startX = left.x + NODE_WIDTH;
    const endX = right.x;
    return {
      d: `M ${startX} ${y} H ${endX}`,
      junctionX: startX + (endX - startX) / 2,
      junctionY: y,
    };
  }

  function assignConnectionLanes(groups) {
    const bands = new Map();
    groups.forEach((group) => {
      const bandKey = `${Math.round(group.parentBottom)}:${Math.round(group.childTop)}`;
      if (!bands.has(bandKey)) bands.set(bandKey, []);
      bands.get(bandKey).push(group);
    });

    bands.forEach((bandGroups) => {
      const laneEnds = [];
      bandGroups
        .sort(
          (a, b) =>
            a.railStart - b.railStart ||
            a.railEnd - b.railEnd ||
            a.key.localeCompare(b.key),
        )
        .forEach((group) => {
          const laneIndex = laneEnds.findIndex((end) => group.railStart > end + 18);
          group.laneIndex = laneIndex === -1 ? laneEnds.length : laneIndex;
          laneEnds[group.laneIndex] = group.railEnd;
        });

      bandGroups.forEach((group) => {
        group.laneCount = laneEnds.length;
      });
    });
  }

  function connectionRailY(group) {
    const gap = Math.max(1, group.childTop - group.parentBottom);
    if (group.laneCount <= 1) return group.parentBottom + gap * 0.52;
    const firstLane = 0.28;
    const lastLane = 0.72;
    const fraction =
      firstLane + (lastLane - firstLane) * (group.laneIndex / (group.laneCount - 1));
    return group.parentBottom + gap * fraction;
  }

  function renderTree() {
    const tree = currentTree();
    if (!tree) return;

    const { layout, generations, childrenByParent, couples } = calculateLayout(tree.pessoas);
    state.layout = layout;
    state.generations = generations;

    elements.emptyTreeState.hidden = tree.pessoas.length > 0;
    elements.treeWorld.hidden = tree.pessoas.length === 0;

    const byId = new Map(tree.pessoas.map((person) => [person.id, person]));
    const connectionMarkup = [];
    const renderedCouples = new Set();
    const coupleJunctions = new Map();
    couples.forEach(([firstId, secondId]) => {
      const firstPosition = layout.get(firstId);
      const secondPosition = layout.get(secondId);
      if (!firstPosition || !secondPosition) return;
      const key = familyPairKey(firstId, secondId);
      const connector = coupleConnector(firstPosition, secondPosition);
      renderedCouples.add(key);
      coupleJunctions.set(key, connector);
      connectionMarkup.push(
        `<path class="couple-path" d="${connector.d}"></path><circle class="couple-dot" cx="${connector.junctionX}" cy="${connector.junctionY}" r="3.5"></circle>`,
      );
    });

    const childrenByParents = new Map();
    tree.pessoas.forEach((person) => {
      const parentIds = [person.maeId, person.paiId].filter((parentId) => layout.has(parentId));
      if (!parentIds.length) return;
      const key = [...parentIds].sort().join("|");
      if (!childrenByParents.has(key)) childrenByParents.set(key, { parentIds, children: [] });
      childrenByParents.get(key).children.push(person.id);
    });

    const connectionGroups = [];
    childrenByParents.forEach(({ parentIds, children }, key) => {
      const childPositions = children.map((childId) => layout.get(childId)).filter(Boolean);
      const parentPositions = parentIds.map((parentId) => layout.get(parentId)).filter(Boolean);
      if (!childPositions.length || !parentPositions.length) return;

      const childCenters = childPositions.map((position) => position.x + NODE_WIDTH / 2);
      const childTop = Math.min(...childPositions.map((position) => position.y));
      const parentBottom = Math.max(...parentPositions.map((position) => position.y + NODE_HEIGHT));
      let stemX;
      let stemY;

      if (parentIds.length === 2) {
        const pairKey = familyPairKey(parentIds[0], parentIds[1]);
        let connector = coupleJunctions.get(pairKey);
        if (!connector) {
          connector = coupleConnector(parentPositions[0], parentPositions[1]);
          coupleJunctions.set(pairKey, connector);
          if (!renderedCouples.has(pairKey)) {
            renderedCouples.add(pairKey);
            connectionMarkup.push(
              `<path class="couple-path" d="${connector.d}"></path><circle class="couple-dot" cx="${connector.junctionX}" cy="${connector.junctionY}" r="3.5"></circle>`,
            );
          }
        }
        stemX = connector.junctionX;
        stemY = connector.junctionY;
      } else {
        stemX = parentPositions[0].x + NODE_WIDTH / 2;
        stemY = parentPositions[0].y + NODE_HEIGHT;
      }

      const railStart = Math.min(stemX, ...childCenters);
      const railEnd = Math.max(stemX, ...childCenters);
      connectionGroups.push({
        key,
        childPositions,
        childCenters,
        childTop,
        parentBottom,
        stemX,
        stemY,
        railStart,
        railEnd,
        laneIndex: 0,
        laneCount: 1,
      });
    });

    assignConnectionLanes(connectionGroups);
    connectionGroups.forEach((group) => {
      const railY = connectionRailY(group);
      connectionMarkup.push(
        `<path class="connection-path" d="M ${group.stemX} ${group.stemY} V ${railY}"></path>`,
        `<path class="connection-path" d="M ${group.railStart} ${railY} H ${group.railEnd}"></path>`,
        `<circle class="connection-dot" cx="${group.stemX}" cy="${railY}" r="4"></circle>`,
      );
      group.childPositions.forEach((position, index) => {
        const childX = group.childCenters[index];
        connectionMarkup.push(
          `<path class="connection-path" d="M ${childX} ${railY} V ${position.y}"></path><circle class="connection-dot" cx="${childX}" cy="${railY}" r="4"></circle>`,
        );
      });
    });
    elements.connectionsLayer.setAttribute("viewBox", `0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`);
    elements.connectionsLayer.innerHTML = connectionMarkup.join("");

    elements.nodesLayer.innerHTML = tree.pessoas
      .map((person) => {
        const position = layout.get(person.id);
        const selected = person.id === state.selectedPersonId;
        return `
          <article
            class="person-node${selected ? " selected" : ""}${person.falecida ? " deceased" : ""}"
            data-person-id="${escapeHtml(person.id)}"
            tabindex="0"
            role="button"
            aria-pressed="${selected}"
            aria-label="Selecionar ${escapeHtml(person.nome)}${person.falecida ? ", pessoa falecida" : ""}"
            style="left:${position.x}px;top:${position.y}px"
          >
            <span class="person-avatar">${escapeHtml(initials(person.nome))}</span>
            <span class="person-node-copy">
              <span class="person-node-name">${escapeHtml(person.nome)}</span>
              <span class="person-node-meta">${escapeHtml(relationshipLabel(person, tree.pessoas, childrenByParent))}</span>
            </span>
            ${
              person.falecida
                ? `<span class="deceased-indicator" title="Pessoa falecida" aria-label="Pessoa falecida">${icon("memorial")}</span>`
                : ""
            }
          </article>`;
      })
      .join("");

    if (state.selectedPersonId && !byId.has(state.selectedPersonId)) state.selectedPersonId = null;
    renderInspector();
    applyViewTransform();
  }

  function renderInspector() {
    const person = currentPerson();
    const tree = currentTree();
    const visible = Boolean(person && tree);
    elements.editPanel.hidden = !visible;
    elements.editorLayout.classList.toggle("has-inspector", visible);
    if (!visible) return;

    const mother = tree.pessoas.find((item) => item.id === person.maeId);
    const father = tree.pessoas.find((item) => item.id === person.paiId);
    const spouse = tree.pessoas.find((item) => item.id === person.conjugueId);
    const hasChildren = tree.pessoas.some((item) => item.maeId === person.id || item.paiId === person.id);
    elements.selectedPersonSummary.innerHTML = `
      <span class="summary-avatar">${escapeHtml(initials(person.nome))}</span>
      <span class="summary-copy">
        <strong>${escapeHtml(person.nome)}</strong>
        <span>${
          person.falecida
            ? "Pessoa falecida"
            : hasChildren || [mother?.nome, father?.nome, spouse?.nome].filter(Boolean).length
              ? "Vínculos familiares cadastrados"
              : "Sem vínculos informados"
        }</span>
      </span>`;
    elements.editPersonName.value = person.nome;
    elements.editMotherName.value = mother?.nome || "";
    elements.editFatherName.value = father?.nome || "";
    elements.editSpouseName.value = spouse?.nome || "";
    elements.editDeceased.checked = Boolean(person.falecida);
    elements.editMotherName.dataset.personId = mother?.id || "";
    elements.editFatherName.dataset.personId = father?.id || "";
    elements.editSpouseName.dataset.personId = spouse?.id || "";
  }

  function updateSelectedNode(personId, selected) {
    if (!personId) return;
    const node = elements.nodesLayer.querySelector(`[data-person-id="${CSS.escape(personId)}"]`);
    if (!node) return;
    node.classList.toggle("selected", selected);
    node.setAttribute("aria-pressed", String(selected));
  }

  function selectPerson(personId) {
    const tree = currentTree();
    if (!tree?.pessoas.some((person) => person.id === personId)) return;
    const previousPersonId = state.selectedPersonId;
    if (previousPersonId === personId) return;
    updateSelectedNode(previousPersonId, false);
    state.selectedPersonId = personId;
    updateSelectedNode(personId, true);
    renderInspector();
  }

  function clearPersonSelection() {
    updateSelectedNode(state.selectedPersonId, false);
    state.selectedPersonId = null;
    renderInspector();
  }

  function centerPerson(personId) {
    const position = state.layout.get(personId);
    if (!position) return;
    const rect = elements.treeViewport.getBoundingClientRect();
    state.view.x = rect.width / 2 - (position.x + NODE_WIDTH / 2) * state.view.scale;
    state.view.y = rect.height / 2 - (position.y + NODE_HEIGHT / 2) * state.view.scale;
    applyViewTransform();
  }

  function fitTree() {
    const tree = currentTree();
    if (!tree?.pessoas.length || !state.layout.size) {
      state.view = { x: 0, y: 0, scale: 1 };
      applyViewTransform();
      return;
    }

    const positions = [...state.layout.values()];
    const minX = Math.min(...positions.map((position) => position.x));
    const minY = Math.min(...positions.map((position) => position.y));
    const maxX = Math.max(...positions.map((position) => position.x + NODE_WIDTH));
    const maxY = Math.max(...positions.map((position) => position.y + NODE_HEIGHT));
    const boundsWidth = maxX - minX;
    const boundsHeight = maxY - minY;
    const rect = elements.treeViewport.getBoundingClientRect();
    const padding = 90;
    const scale = Math.min(
      1,
      Math.max(0.15, Math.min((rect.width - padding) / boundsWidth, (rect.height - padding) / boundsHeight)),
    );
    state.view.scale = scale;
    state.view.x = (rect.width - boundsWidth * scale) / 2 - minX * scale;
    state.view.y = (rect.height - boundsHeight * scale) / 2 - minY * scale;
    applyViewTransform();
  }

  function applyViewTransform() {
    elements.treeWorld.style.transform = `translate(${state.view.x}px, ${state.view.y}px) scale(${state.view.scale})`;
    elements.zoomLabel.textContent = `${Math.round(state.view.scale * 100)}%`;
  }

  function setZoom(nextScale, anchorX, anchorY) {
    const rect = elements.treeViewport.getBoundingClientRect();
    const pointX = anchorX ?? rect.width / 2;
    const pointY = anchorY ?? rect.height / 2;
    const oldScale = state.view.scale;
    const scale = Math.min(2, Math.max(0.15, nextScale));
    const worldX = (pointX - state.view.x) / oldScale;
    const worldY = (pointY - state.view.y) / oldScale;
    state.view.scale = scale;
    state.view.x = pointX - worldX * scale;
    state.view.y = pointY - worldY * scale;
    applyViewTransform();
  }

  function fuzzyScore(name, query) {
    const target = searchKey(name);
    const needle = searchKey(query);
    if (!needle) return 0;
    if (target === needle) return 1000;
    if (target.startsWith(needle)) return 800 - target.length;
    const directIndex = target.indexOf(needle);
    if (directIndex >= 0) return 650 - directIndex * 5 - target.length;

    let queryIndex = 0;
    let gaps = 0;
    for (let index = 0; index < target.length && queryIndex < needle.length; index += 1) {
      if (target[index] === needle[queryIndex]) queryIndex += 1;
      else if (queryIndex > 0) gaps += 1;
    }
    return queryIndex === needle.length ? 350 - gaps * 3 : -1;
  }

  function getSuggestions(query, excludeId = null) {
    const tree = currentTree();
    if (!tree || normalizeName(query).length < 1) return [];
    return tree.pessoas
      .filter((person) => person.id !== excludeId)
      .map((person) => ({ person, score: fuzzyScore(person.nome, query) }))
      .filter((item) => item.score >= 0)
      .sort((a, b) => b.score - a.score || a.person.nome.localeCompare(b.person.nome, "pt-BR"))
      .slice(0, 7)
      .map((item) => item.person);
  }

  function renderAutocomplete(input) {
    const list = document.querySelector(`[data-autocomplete-for="${input.id}"]`);
    if (!list) return;
    const excludeId = input.id.startsWith("edit-") ? state.selectedPersonId : null;
    const suggestions = getSuggestions(input.value, excludeId);
    if (!suggestions.length) {
      list.hidden = true;
      list.innerHTML = "";
      return;
    }
    list.innerHTML = suggestions
      .map(
        (person) => `
          <button type="button" data-suggestion-id="${escapeHtml(person.id)}">
            <span>${escapeHtml(person.nome)}</span>
            <small>Já cadastrada</small>
          </button>`,
      )
      .join("");
    list.hidden = false;
  }

  function hideAutocompletes(except = null) {
    document.querySelectorAll("[data-autocomplete-for]").forEach((list) => {
      if (list !== except) list.hidden = true;
    });
  }

  function findExactByName(people, name, excludeId = null) {
    const key = searchKey(name);
    if (!key) return null;
    return people.find((person) => person.id !== excludeId && searchKey(person.nome) === key) ?? null;
  }

  function proposedRelative(input, people, subjectId) {
    const name = normalizeName(input.value);
    if (!name) return null;
    const selected = people.find(
      (person) =>
        person.id === input.dataset.personId &&
        person.id !== subjectId &&
        searchKey(person.nome) === searchKey(name),
    );
    if (selected) return selected.id;

    const exact = findExactByName(people, name, subjectId);
    if (exact) return exact.id;

    const person = {
      id: generateId("pessoa"),
      nome: name,
      maeId: null,
      paiId: null,
      conjugueId: null,
      falecida: false,
      posicao: { x: 0, y: 0 },
    };
    people.push(person);
    return person.id;
  }

  function graphHasCycle(people) {
    const byId = new Map(people.map((person) => [person.id, person]));
    const visiting = new Set();
    const visited = new Set();

    function visit(id) {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      const person = byId.get(id);
      if (!person) return false;
      visiting.add(id);
      const hasCycle = [person.maeId, person.paiId].filter(Boolean).some((parentId) => visit(parentId));
      visiting.delete(id);
      visited.add(id);
      return hasCycle;
    }

    return people.some((person) => visit(person.id));
  }

  function validateParents(motherId, fatherId, subjectId, people) {
    if (motherId && motherId === fatherId) {
      throw new Error("Mãe e pai precisam ser pessoas diferentes.");
    }
    if (motherId === subjectId || fatherId === subjectId) {
      throw new Error("Uma pessoa não pode ser mãe ou pai de si mesma.");
    }
    if (graphHasCycle(people)) {
      throw new Error("Esse vínculo criaria um ciclo impossível na árvore.");
    }
  }

  function hasAncestorRelationship(firstId, secondId, people) {
    const byId = new Map(people.map((person) => [person.id, person]));
    function isAncestor(ancestorId, personId, visited = new Set()) {
      if (visited.has(personId)) return false;
      visited.add(personId);
      const person = byId.get(personId);
      if (!person) return false;
      return [person.maeId, person.paiId]
        .filter(Boolean)
        .some((parentId) => parentId === ancestorId || isAncestor(ancestorId, parentId, visited));
    }
    return isAncestor(firstId, secondId) || isAncestor(secondId, firstId);
  }

  function setSpouseRelationship(people, subjectId, spouseId) {
    const byId = new Map(people.map((person) => [person.id, person]));
    const subject = byId.get(subjectId);
    if (!subject) return;

    const previousSpouse = byId.get(subject.conjugueId);
    if (previousSpouse?.conjugueId === subject.id) previousSpouse.conjugueId = null;
    subject.conjugueId = null;
    if (!spouseId) return;
    if (spouseId === subjectId) throw new Error("Uma pessoa não pode ser cônjuge de si mesma.");
    if (hasAncestorRelationship(subjectId, spouseId, people)) {
      throw new Error("Ascendentes e descendentes não podem ser cadastrados como cônjuges.");
    }

    const spouse = byId.get(spouseId);
    if (!spouse) return;
    const spousePreviousPartner = byId.get(spouse.conjugueId);
    if (spousePreviousPartner?.conjugueId === spouse.id) spousePreviousPartner.conjugueId = null;
    spouse.conjugueId = subject.id;
    subject.conjugueId = spouse.id;
  }

  function handleAddPerson(event) {
    event.preventDefault();
    const tree = currentTree();
    if (!tree) return;
    const name = normalizeName(elements.addPersonName.value);
    if (!name) {
      elements.addPersonName.focus();
      return;
    }

    try {
      const people = clone(tree.pessoas);
      let person = findExactByName(people, name);
      const alreadyExisted = Boolean(person);
      if (!person) {
        person = {
          id: generateId("pessoa"),
          nome: name,
          maeId: null,
          paiId: null,
          conjugueId: null,
          falecida: false,
          posicao: { x: 0, y: 0 },
        };
        people.push(person);
      }

      const motherId = proposedRelative(elements.addMotherName, people, person.id);
      const fatherId = proposedRelative(elements.addFatherName, people, person.id);
      const spouseId = proposedRelative(elements.addSpouseName, people, person.id);
      person.nome = name;
      person.maeId = motherId;
      person.paiId = fatherId;
      person.falecida = elements.addDeceased.checked;
      validateParents(motherId, fatherId, person.id, people);
      setSpouseRelationship(people, person.id, spouseId);

      tree.pessoas = people;
      state.selectedPersonId = null;
      elements.addPersonForm.reset();
      elements.addMotherName.dataset.personId = "";
      elements.addFatherName.dataset.personId = "";
      elements.addSpouseName.dataset.personId = "";
      hideAutocompletes();
      elements.addPanel.classList.remove("open");
      renderTree();
      scheduleSave();
      window.requestAnimationFrame(() => centerPerson(person.id));
      showToast(alreadyExisted ? "Pessoa existente atualizada." : "Pessoa adicionada à árvore.");
    } catch (error) {
      showToast(error.message || "Não foi possível adicionar a pessoa.", "error");
    }
  }

  function handleEditPerson(event) {
    event.preventDefault();
    const tree = currentTree();
    const selected = currentPerson();
    if (!tree || !selected) return;
    const name = normalizeName(elements.editPersonName.value);
    if (!name) {
      elements.editPersonName.focus();
      return;
    }

    try {
      const people = clone(tree.pessoas);
      const person = people.find((item) => item.id === selected.id);
      const motherId = proposedRelative(elements.editMotherName, people, person.id);
      const fatherId = proposedRelative(elements.editFatherName, people, person.id);
      const spouseId = proposedRelative(elements.editSpouseName, people, person.id);
      person.nome = name;
      person.maeId = motherId;
      person.paiId = fatherId;
      person.falecida = elements.editDeceased.checked;
      validateParents(motherId, fatherId, person.id, people);
      setSpouseRelationship(people, person.id, spouseId);
      tree.pessoas = people;
      renderTree();
      scheduleSave();
      window.requestAnimationFrame(() => centerPerson(person.id));
      showToast("Alterações salvas.");
    } catch (error) {
      showToast(error.message || "Não foi possível salvar as alterações.", "error");
    }
  }

  function removeSelectedPerson() {
    const tree = currentTree();
    const person = currentPerson();
    if (!tree || !person) return;
    showModal({
      title: "Remover pessoa?",
      message: `“${person.nome}” será removida. Os demais blocos serão mantidos e os vínculos com essa pessoa serão desfeitos.`,
      input: false,
      confirmText: "Remover pessoa",
      danger: true,
      onConfirm() {
        tree.pessoas = tree.pessoas
          .filter((item) => item.id !== person.id)
          .map((item) => ({
            ...item,
            maeId: item.maeId === person.id ? null : item.maeId,
            paiId: item.paiId === person.id ? null : item.paiId,
            conjugueId: item.conjugueId === person.id ? null : item.conjugueId,
          }));
        state.selectedPersonId = null;
        closeModal();
        renderTree();
        scheduleSave();
        showToast("Pessoa removida.");
        return true;
      },
    });
  }

  function hideSearchResults() {
    elements.personSearchResults.hidden = true;
    elements.personSearchResults.innerHTML = "";
  }

  function renderPersonSearch() {
    const suggestions = getSuggestions(elements.personSearch.value);
    if (!suggestions.length) {
      hideSearchResults();
      return;
    }
    elements.personSearchResults.innerHTML = suggestions
      .map(
        (person) => `
          <button type="button" data-search-person-id="${escapeHtml(person.id)}">
            <span>${escapeHtml(person.nome)}</span>
            <small>Centralizar</small>
          </button>`,
      )
      .join("");
    elements.personSearchResults.hidden = false;
  }

  function exportCurrentTree() {
    const tree = currentTree();
    if (!tree) return;
    flushSave();
    const payload = {
      versao: 2,
      exportadoEm: nowIso(),
      tree,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const slug =
      searchKey(tree.nome)
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || "arvore-genealogica";
    anchor.href = url;
    anchor.download = `${slug}.json`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Arquivo JSON exportado.");
  }

  function exportCurrentTreePdf() {
    const tree = currentTree();
    if (!tree?.pessoas.length) {
      showToast("Adicione ao menos uma pessoa antes de exportar.", "error");
      return;
    }

    flushSave();
    const { layout, childrenByParent } = calculateLayout(tree.pessoas);
    const positions = [...layout.values()];
    const margin = 44;
    const minX = Math.min(...positions.map((position) => position.x)) - margin;
    const minY = Math.min(...positions.map((position) => position.y)) - margin;
    const maxX = Math.max(...positions.map((position) => position.x + NODE_WIDTH)) + margin;
    const maxY = Math.max(...positions.map((position) => position.y + NODE_HEIGHT)) + margin;
    const contentWidth = Math.max(1, maxX - minX);
    const contentHeight = Math.max(1, maxY - minY);
    const printableWidth = 1010;
    const printableHeight = 620;
    const scale = Math.min(printableWidth / contentWidth, printableHeight / contentHeight, 1);
    const scaledWidth = Math.round(contentWidth * scale);
    const scaledHeight = Math.round(contentHeight * scale);
    const connections = elements.connectionsLayer.innerHTML;
    const title = escapeHtml(tree.nome);
    const generatedAt = new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());

    const nodes = tree.pessoas
      .map((person) => {
        const position = layout.get(person.id);
        if (!position) return "";
        return `
          <article class="person-node${person.falecida ? " deceased" : ""}" style="left:${position.x - minX}px;top:${position.y - minY}px">
            <span class="person-avatar">${escapeHtml(initials(person.nome))}</span>
            <span class="person-copy">
              <strong>${escapeHtml(person.nome)}</strong>
              <small>${escapeHtml(relationshipLabel(person, tree.pessoas, childrenByParent))}</small>
            </span>
          </article>`;
      })
      .join("");

    const printMarkup = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <title>${title} — Árvore genealógica</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; color: #172033; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fff; }
    body { padding: 0; }
    .page { width: 100%; min-height: 185mm; display: grid; grid-template-rows: auto 1fr; gap: 8mm; }
    header { display: flex; align-items: end; justify-content: space-between; gap: 24px; padding-bottom: 4mm; border-bottom: 1px solid #d9dee8; }
    h1 { margin: 0; font-size: 20pt; line-height: 1.05; letter-spacing: -0.03em; }
    header p { margin: 4px 0 0; color: #667085; font-size: 8.5pt; }
    header small { color: #667085; font-size: 7.5pt; white-space: nowrap; }
    .viewport { min-height: 0; display: grid; place-items: center; overflow: hidden; }
    .scaled-tree { position: relative; width: ${scaledWidth}px; height: ${scaledHeight}px; }
    .tree { position: absolute; top: 0; left: 0; width: ${contentWidth}px; height: ${contentHeight}px; transform: scale(${scale}); transform-origin: 0 0; }
    svg { position: absolute; inset: 0; width: ${contentWidth}px; height: ${contentHeight}px; overflow: visible; }
    .connection-path, .couple-path { fill: none; stroke: #7b9ed4; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .couple-path { stroke: #2463d4; stroke-width: 2.3; }
    .connection-dot, .couple-dot { fill: #fff; stroke: #7b9ed4; stroke-width: 2; }
    .couple-dot { stroke: #2463d4; }
    .person-node { position: absolute; width: ${NODE_WIDTH}px; min-height: ${NODE_HEIGHT}px; display: grid; grid-template-columns: 42px minmax(0, 1fr); align-items: center; gap: 10px; padding: 12px; border: 1px solid #cfd6e2; border-left: 4px solid #2463d4; border-radius: 12px; background: #fff; box-shadow: 0 4px 12px rgba(16, 24, 40, .08); }
    .person-node.deceased { border-left-color: #98a2b3; background: #f8fafc; }
    .person-avatar { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 10px; color: #1557c0; background: #eaf2ff; font-size: 12px; font-weight: 800; }
    .person-copy { min-width: 0; }
    .person-copy strong, .person-copy small { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .person-copy strong { font-size: 13px; }
    .person-copy small { margin-top: 4px; color: #667085; font-size: 10px; }
  </style>
</head>
<body>
  <main class="page">
    <header>
      <div>
        <h1>${title}</h1>
        <p>Árvore genealógica · ${tree.pessoas.length} ${tree.pessoas.length === 1 ? "pessoa" : "pessoas"}</p>
      </div>
      <small>Gerado em ${escapeHtml(generatedAt)}</small>
    </header>
    <section class="viewport">
      <div class="scaled-tree">
        <div class="tree">
          <svg viewBox="${minX} ${minY} ${contentWidth} ${contentHeight}" aria-hidden="true">${connections}</svg>
          ${nodes}
        </div>
      </div>
    </section>
  </main>
</body>
</html>`;
    const printFrame = document.createElement("iframe");
    printFrame.title = "Impressão da árvore genealógica";
    printFrame.setAttribute("aria-hidden", "true");
    Object.assign(printFrame.style, {
      position: "fixed",
      right: "0",
      bottom: "0",
      width: "1px",
      height: "1px",
      border: "0",
      opacity: "0",
      pointerEvents: "none",
    });
    printFrame.srcdoc = printMarkup;
    document.body.append(printFrame);
    printFrame.addEventListener("load", () => {
      window.setTimeout(() => {
        const printWindow = printFrame.contentWindow;
        if (!printWindow) {
          printFrame.remove();
          showToast("Não foi possível abrir a impressão.", "error");
          return;
        }
        printWindow.addEventListener("afterprint", () => printFrame.remove(), { once: true });
        printWindow.focus();
        printWindow.print();
        window.setTimeout(() => printFrame.remove(), 60000);
      }, 180);
    }, { once: true });
  }

  async function importTreeFile(file) {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const sources = Array.isArray(parsed) ? parsed : [parsed];
      const imported = sources.map(importTreeFromObject);
      state.trees.push(...imported);
      persistTrees();
      renderLibrary();
      showToast(
        `${imported.length} ${imported.length === 1 ? "árvore importada" : "árvores importadas"} com sucesso.`,
      );
      if (imported.length === 1) openTree(imported[0].id);
    } catch (error) {
      console.error("Falha ao importar JSON:", error);
      showToast(error.message || "O arquivo JSON não é válido.", "error");
    } finally {
      elements.importFileInput.value = "";
    }
  }

  function navigateFromNode(personId, key) {
    const tree = currentTree();
    if (!tree) return;
    const person = tree.pessoas.find((item) => item.id === personId);
    if (!person) return;
    let destinationId = null;

    if (key === "ArrowUp") destinationId = person.maeId || person.paiId;
    if (key === "ArrowDown") {
      destinationId = tree.pessoas.find((item) => item.maeId === person.id || item.paiId === person.id)?.id;
    }
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const generation = state.generations.get(person.id);
      const peers = tree.pessoas
        .filter((item) => state.generations.get(item.id) === generation)
        .sort((a, b) => (state.layout.get(a.id)?.x ?? 0) - (state.layout.get(b.id)?.x ?? 0));
      const index = peers.findIndex((item) => item.id === person.id);
      const direction = key === "ArrowLeft" ? -1 : 1;
      destinationId = peers[index + direction]?.id;
    }

    if (destinationId) {
      centerPerson(destinationId);
      window.requestAnimationFrame(() => {
        elements.nodesLayer.querySelector(`[data-person-id="${CSS.escape(destinationId)}"]`)?.focus();
      });
    }
  }

  function bindEvents() {
    elements.createTreeBtn.addEventListener("click", createTree);
    elements.importTreeBtn.addEventListener("click", () => elements.importFileInput.click());
    elements.importFileInput.addEventListener("change", () => importTreeFile(elements.importFileInput.files?.[0]));
    elements.treeSearch.addEventListener("input", renderLibrary);
    elements.treeList.addEventListener("click", handleTreeListClick);
    elements.treeList.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      if (event.target.closest("button")) return;
      const row = event.target.closest("[data-tree-id]");
      if (row) openTree(row.dataset.treeId);
    });

    elements.backToLibraryBtn.addEventListener("click", () => {
      window.location.hash = "#/";
    });
    elements.renameCurrentBtn.addEventListener("click", () => renameTree(state.currentTreeId));
    elements.exportTreeBtn.addEventListener("click", exportCurrentTree);
    elements.exportTreePdfBtn?.addEventListener("click", exportCurrentTreePdf);
    elements.mobileAddBtn.addEventListener("click", () => elements.addPanel.classList.add("open"));
    elements.emptyAddBtn.addEventListener("click", () => {
      elements.addPanel.classList.add("open");
      elements.addPersonName.focus();
    });
    elements.closeAddPanelBtn.addEventListener("click", () => elements.addPanel.classList.remove("open"));
    elements.addPersonForm.addEventListener("submit", handleAddPerson);
    elements.editPersonForm.addEventListener("submit", handleEditPerson);
    elements.removePersonBtn.addEventListener("click", removeSelectedPerson);
    elements.closeEditPanelBtn.addEventListener("click", clearPersonSelection);

    [
      elements.addMotherName,
      elements.addFatherName,
      elements.addSpouseName,
      elements.editMotherName,
      elements.editFatherName,
      elements.editSpouseName,
    ].forEach((input) => {
      input.addEventListener("input", () => {
        input.dataset.personId = "";
        renderAutocomplete(input);
      });
      input.addEventListener("focus", () => renderAutocomplete(input));
    });

    document.addEventListener("click", (event) => {
      const suggestion = event.target.closest("[data-suggestion-id]");
      if (suggestion) {
        const list = suggestion.closest("[data-autocomplete-for]");
        const input = document.querySelector(`#${CSS.escape(list.dataset.autocompleteFor)}`);
        const person = currentTree()?.pessoas.find((item) => item.id === suggestion.dataset.suggestionId);
        if (input && person) {
          input.value = person.nome;
          input.dataset.personId = person.id;
          list.hidden = true;
        }
        return;
      }

      if (!event.target.closest(".autocomplete")) hideAutocompletes();
      if (!event.target.closest("[data-tree-id]")) {
        if (state.openMenuTreeId) {
          state.openMenuTreeId = null;
          renderLibrary();
        }
      }
    });

    elements.personSearch.addEventListener("input", renderPersonSearch);
    elements.personSearch.addEventListener("focus", renderPersonSearch);
    elements.personSearchResults.addEventListener("click", (event) => {
      const button = event.target.closest("[data-search-person-id]");
      if (!button) return;
      const person = currentTree()?.pessoas.find((item) => item.id === button.dataset.searchPersonId);
      clearPersonSelection();
      centerPerson(button.dataset.searchPersonId);
      elements.personSearch.value = person?.nome || "";
      hideSearchResults();
    });

    elements.nodesLayer.addEventListener("click", (event) => {
      const node = event.target.closest("[data-person-id]");
      if (!node) return;
      selectPerson(node.dataset.personId);
    });

    elements.nodesLayer.addEventListener("keydown", (event) => {
      const node = event.target.closest("[data-person-id]");
      if (!node) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectPerson(node.dataset.personId);
      }
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
        event.preventDefault();
        navigateFromNode(node.dataset.personId, event.key);
      }
    });

    elements.treeViewport.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const rect = elements.treeViewport.getBoundingClientRect();
        const factor = event.deltaY > 0 ? 0.9 : 1.1;
        setZoom(state.view.scale * factor, event.clientX - rect.left, event.clientY - rect.top);
      },
      { passive: false },
    );

    elements.treeViewport.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest(".person-node, .empty-tree-state")) return;
      state.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        viewX: state.view.x,
        viewY: state.view.y,
        active: false,
      };
      elements.treeViewport.setPointerCapture(event.pointerId);
    });

    elements.treeViewport.addEventListener("pointermove", (event) => {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - state.drag.startX;
      const deltaY = event.clientY - state.drag.startY;
      if (!state.drag.active) {
        if (Math.hypot(deltaX, deltaY) < 5) return;
        state.drag.active = true;
        elements.treeViewport.classList.add("dragging");
      }
      state.view.x = state.drag.viewX + deltaX;
      state.view.y = state.drag.viewY + deltaY;
      applyViewTransform();
    });

    function endDrag(event) {
      if (!state.drag || state.drag.pointerId !== event.pointerId) return;
      state.drag = null;
      elements.treeViewport.classList.remove("dragging");
    }

    elements.treeViewport.addEventListener("pointerup", endDrag);
    elements.treeViewport.addEventListener("pointercancel", endDrag);
    elements.treeViewport.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") setZoom(state.view.scale * 1.12);
      if (event.key === "-") setZoom(state.view.scale / 1.12);
      if (event.key === "0") fitTree();
    });

    elements.zoomInBtn.addEventListener("click", () => setZoom(state.view.scale * 1.15));
    elements.zoomOutBtn.addEventListener("click", () => setZoom(state.view.scale / 1.15));
    elements.fitTreeBtn.addEventListener("click", fitTree);

    elements.modalCloseBtn.addEventListener("click", closeModal);
    elements.modalCancelBtn.addEventListener("click", closeModal);
    elements.modalBackdrop.addEventListener("click", (event) => {
      if (event.target === elements.modalBackdrop) closeModal();
    });
    elements.modalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const config = state.modalConfig;
      if (!config) return;
      const value = elements.modalInput.value;
      if (config.input !== false && config.required !== false && !normalizeName(value)) {
        elements.modalInput.focus();
        return;
      }
      config.onConfirm?.(value);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        if (!elements.modalBackdrop.hidden) closeModal();
        hideAutocompletes();
        hideSearchResults();
        elements.addPanel.classList.remove("open");
      }
    });

    window.addEventListener("hashchange", route);
    window.addEventListener("beforeunload", flushSave);
    window.addEventListener("resize", () => {
      if (!elements.editorScreen.hidden && currentTree()?.pessoas.length) fitTree();
    });
  }

  loadTrees();
  bindEvents();
  route();
})();
