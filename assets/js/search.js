import { apiUrl } from './base.js';
import { getIsDragging, getSuppressSyncUntil } from './state.js';

/* =========================================================
   BUSCA GLOBAL DO BOARD
   ======================================================= */

const searchInput = document.getElementById('search');
const filterAto = document.getElementById('filter-ato');
const filterDigitador = document.getElementById('filter-digitador');
const filterUrgente = document.getElementById('filter-urgente');
const filterTag = document.getElementById('filter-tag');
const activeFilters = document.getElementById('active-filters');
const STATUSES = ['PARA_DISTRIBUIR', 'EM_ANDAMENTO', 'PARA_CORRECAO', 'LAVRADOS', 'ARQUIVADOS'];
const PAGE_SIZE = 50;
let searchTimeout = null;
let lastSyncKey = null;
let lastSyncHash = null;
let offsets = {};
let loading = {};
let exhausted = {};
let currentQuery = '';
let lastSyncAt = null;
let shouldClear = {};
let staggerIndex = {};
let skeletonShown = {};
let totalCounts = {};

if (searchInput) {
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);

        const query = this.value.trim();
        currentQuery = query;

        searchTimeout = setTimeout(() => {
            resetBoardAndLoad();
            renderActiveFilters();
        }, 300);
    });
}

if (filterAto) {
    filterAto.addEventListener('change', () => {
        resetBoardAndLoad();
        renderActiveFilters();
    });
}

if (filterDigitador) {
    filterDigitador.addEventListener('change', () => {
        resetBoardAndLoad();
        renderActiveFilters();
    });
}

if (filterUrgente) {
    filterUrgente.addEventListener('change', () => {
        resetBoardAndLoad();
        renderActiveFilters();
    });
}

if (filterTag) {
    filterTag.addEventListener('change', () => {
        resetBoardAndLoad();
        renderActiveFilters();
    });
}

if (activeFilters) {
    activeFilters.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-filter]');
        if (!btn) return;
        const type = btn.dataset.filter;

        if (type === 'q' && searchInput) searchInput.value = '';
        if (type === 'ato' && filterAto) filterAto.value = '';
        if (type === 'digitador' && filterDigitador) filterDigitador.value = '';
        if (type === 'urgente' && filterUrgente) filterUrgente.value = '';
        if (type === 'tag' && filterTag) filterTag.value = '';

        resetBoardAndLoad();
        renderActiveFilters();
    });
}

/* =========================================================
   BUSCAR PROTOCOLOS NO BACKEND
   ======================================================= */

function hasActiveFilters() {
    return !!(
        (currentQuery && currentQuery.trim()) ||
        (filterAto && filterAto.value) ||
        (filterDigitador && filterDigitador.value) ||
        (filterUrgente && filterUrgente.value) ||
        (filterTag && filterTag.value)
    );
}

function buildParams(status, offset) {
    if (getSuppressSyncUntil() && Date.now() < getSuppressSyncUntil()) {
        return;
    }
    const params = new URLSearchParams();
    params.set('action', 'search');
    params.set('q', currentQuery ?? '');
    params.set('status', status);
    params.set('limit', PAGE_SIZE);
    params.set('offset', offset);
    if (filterAto && filterAto.value) {
        params.set('ato', filterAto.value);
    }
    if (filterDigitador && filterDigitador.value) {
        params.set('digitador', filterDigitador.value);
    }
    if (filterUrgente && filterUrgente.value) {
        params.set('urgente', filterUrgente.value);
    }
    if (filterTag && filterTag.value.trim()) {
        params.set('tag_custom', filterTag.value.trim());
    }
    return params;
}

function loadPage(status) {
    if (loading[status] || exhausted[status]) return;
    loading[status] = true;

    const params = buildParams(status, offsets[status] || 0);
    if (!params) {
        loading[status] = false;
        return;
    }

    if ((offsets[status] || 0) === 0) {
        showSkeletons(status);
    }

    const url = apiUrl(`api/protocolos.php?${params.toString()}`);

    fetch(url)
        .then(res => res.json())
        .then(payload => {
            const protocolos = payload?.items;
            if (!Array.isArray(protocolos)) {
                console.error('Resposta inválida da busca:', payload);
                clearSkeletons(status);
                loading[status] = false;
                return;
            }

            const key = `${currentQuery ?? ''}|${filterAto?.value ?? ''}|${filterDigitador?.value ?? ''}|${filterUrgente?.value ?? ''}|${filterTag?.value ?? ''}|${status}`;
            const hash = JSON.stringify(protocolos);
            if (key === lastSyncKey && hash === lastSyncHash && (offsets[status] || 0) === 0) {
                loading[status] = false;
                return;
            }
            lastSyncKey = key;
            lastSyncHash = hash;

            if ((offsets[status] || 0) === 0 && shouldClear[status]) {
                limparColuna(status);
                shouldClear[status] = false;
            }

            if (typeof payload?.total === 'number') {
                totalCounts[status] = payload.total;
                updateColumnCount(status);
            }

            clearSkeletons(status);
            appendToBoard(status, protocolos);
            offsets[status] = (offsets[status] || 0) + protocolos.length;
            if (protocolos.length < PAGE_SIZE) {
                exhausted[status] = true;
            }

            if (payload?.server_now) {
                lastSyncAt = payload.server_now;
            }

            loading[status] = false;
        })
        .catch(err => {
            clearSkeletons(status);
            loading[status] = false;
            console.error(err);
        });
}

/* =========================================================
   ATUALIZAR CARD ESPECÍFICO
   ======================================================= */

function atualizarCard(id) {
    fetch(apiUrl(`api/protocolos.php?action=get&id=${id}`))
        .then(res => res.json())
        .then(p => {
            if (!p || p.error) {
                document.querySelector(`.card[data-id="${id}"]`)?.remove();
                return;
            }

            const coluna = document.getElementById(p.status);
            if (!coluna) return;

            const novoCard = criarCard(p);
            const atual = document.querySelector(`.card[data-id="${id}"]`);
            const oldStatus = atual?.dataset?.status;

            if (atual) {
                if (atual.parentElement !== coluna) {
                    coluna.appendChild(novoCard);
                    atual.remove();
                    if (oldStatus && oldStatus !== p.status) {
                        adjustColumnCount(oldStatus, -1);
                        adjustColumnCount(p.status, 1);
                    }
                } else {
                    atual.replaceWith(novoCard);
                }
            } else {
                coluna.appendChild(novoCard);
                adjustColumnCount(p.status, 1);
            }
        })
        .catch(err => console.error(err));
}

/* =========================================================
   LIMPA TODAS AS COLUNAS
   ======================================================= */

function limparColuna(status) {
    const coluna = document.getElementById(status);
    if (coluna) {
        coluna.innerHTML = '';
    }
    updateColumnCount(status);
}

/* =========================================================
   ATUALIZAR BOARD COM RESULTADO DA BUSCA
   ======================================================= */

function appendToBoard(status, protocolos) {
    const coluna = document.getElementById(status);
    if (!coluna) return;

    const baseDelay = Math.max(0, STATUSES.indexOf(status)) * 60;
    if (staggerIndex[status] === undefined) {
        staggerIndex[status] = 0;
    }

    protocolos.forEach((p, i) => {
        const card = criarCard(p);
        const idx = staggerIndex[status] + i;
        const delay = baseDelay + Math.min(idx, 12) * 18;
        card.style.animationDelay = `${delay}ms`;
        coluna.appendChild(card);
        setTimeout(() => card.classList.remove('card-appear'), delay + 260);
    });

    staggerIndex[status] += protocolos.length;
    updateColumnCount(status);
}

function resetBoardAndLoad() {
    if (searchInput) {
        currentQuery = searchInput.value.trim();
    }
    offsets = {};
    loading = {};
    exhausted = {};

    shouldClear = {};
    skeletonShown = {};
    totalCounts = {};
    staggerIndex = {};
    STATUSES.forEach(s => {
        offsets[s] = 0;
        loading[s] = false;
        exhausted[s] = false;
        shouldClear[s] = true;
        loadPage(s);
    });
    renderActiveFilters();
    updateAllColumnCounts();
}

function showSkeletons(status) {
    if (skeletonShown[status]) return;
    const coluna = document.getElementById(status);
    if (!coluna) return;
    if (coluna.querySelector('.card-skeleton')) return;

    skeletonShown[status] = true;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 3; i++) {
        frag.appendChild(criarSkeletonCard());
    }
    coluna.appendChild(frag);
}

function clearSkeletons(status) {
    const coluna = document.getElementById(status);
    if (!coluna) return;
    coluna.querySelectorAll('.card-skeleton').forEach(el => el.remove());
}

function criarSkeletonCard() {
    const card = document.createElement('div');
    card.className = 'card card-skeleton';
    card.innerHTML = `
        <div class="skeleton-bar"></div>
        <div class="card-body">
            <div class="skeleton-line w-70"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-60"></div>
        </div>
        <div class="card-footer">
            <div class="skeleton-line w-40"></div>
        </div>
    `;
    return card;
}

function buscarProtocolos(query) {
    currentQuery = (query ?? '').trim();
    if (searchInput) {
        searchInput.value = currentQuery;
    }
    resetBoardAndLoad();
    renderActiveFilters();
}

/* =========================================================
   CRIAR CARD VIA JS (USA <template id="card-template">)
   ======================================================= */

const cardTemplate = document.getElementById('card-template');

function criarCard(p) {
    const clone = cardTemplate.content.firstElementChild.cloneNode(true);
    const card = clone;

    card.dataset.id = p.id;
    card.dataset.status = p.status;
    card.dataset.urgente = p.urgente == 1 ? '1' : '0';
    card.addEventListener('click', () => abrirModal(p.id));

    if (p.urgente == 1) card.classList.add('card-urgente');

    // Tag do ato (cor)
    const corTag = corAtoFixa(p.ato || '') || (p.tag_cor && p.tag_cor.trim() ? p.tag_cor : '#64748b');
    const corTexto = corTextoParaFundo(corTag);
    const tagEl = card.querySelector('.card-tag');
    tagEl.style.backgroundColor = corTag;
    tagEl.style.color = corTexto;
    tagEl.title = p.ato || '';

    const query = (currentQuery || '').trim();
    const atoText = (p.ato || '').toUpperCase();
    tagEl.innerHTML = highlightText(atoText, query.toUpperCase());

    // Ficha / Urgente / Tag custom
    const fichaEl = card.querySelector('.card-ficha');
    const fichaHtml = [];
    if (p.ficha) fichaHtml.push(`<span>Ficha ${p.ficha}</span>`);
    if (p.urgente == 1) fichaHtml.push('<span class="tag-urgente">Urgente</span>');
    if (p.tag_custom) fichaHtml.push(`<span class="tag-custom">${escapeHtml(p.tag_custom)}</span>`);
    if (fichaHtml.length) {
        fichaEl.innerHTML = fichaHtml.join('');
    } else {
        fichaEl.remove();
    }

    // Campos condicionais do body
    setCardField(card, '.card-apresentante', p.apresentante, query);
    setCardField(card, '.card-digitador', p.digitador, query, 'Digitador: ');
    setCardField(card, '.card-outorgantes', p.outorgantes, query, 'Outorgante: ');
    setCardField(card, '.card-outorgados', p.outorgados, query, 'Outorgado: ');

    const dataEl = card.querySelector('.card-data');
    if (p.data_apresentacao) {
        dataEl.querySelector('.card-text').textContent = formatarData(p.data_apresentacao);
    } else {
        dataEl.remove();
    }

    // Footer — ações
    const actions = card.querySelector('.card-actions');
    if (p.status !== 'ARQUIVADOS') {
        actions.innerHTML = `<button onclick="arquivarProtocolo(${p.id}); event.stopPropagation()">Arquivar</button>`;
    } else {
        actions.innerHTML = `<button class="btn-restaurar" onclick="restaurarProtocolo(${p.id}); event.stopPropagation()">Restaurar</button>`;
    }
    actions.insertAdjacentHTML('beforeend', `<button class="danger" onclick="excluirProtocolo(${p.id}); event.stopPropagation()">Excluir</button>`);

    // Valores
    const valoresEl = card.querySelector('.card-valores');
    valoresEl.innerHTML = p.total_valores > 0 ? `R$ ${formatarValor(p.total_valores)}` : '&nbsp;';

    setTimeout(() => card.classList.remove('card-appear'), 300);
    return card;
}

function setCardField(card, selector, value, query, prefix) {
    const el = card.querySelector(selector);
    if (!value) { el.remove(); return; }
    const textEl = el.querySelector('.card-text');
    if (textEl) {
        textEl.innerHTML = (prefix || '') + highlightText(value, query);
    }
}

function insertCardSorted(coluna, card, item) {
    const newUrg = item.urgente == 1 ? 1 : 0;
    const newId = parseInt(item.id, 10);
    const cards = Array.from(coluna.querySelectorAll('.card'));

    for (const c of cards) {
        const cUrg = parseInt(c.dataset.urgente || '0', 10);
        const cId = parseInt(c.dataset.id || '0', 10);
        if (newUrg > cUrg || (newUrg === cUrg && newId > cId)) {
            coluna.insertBefore(card, c);
            return;
        }
    }
    coluna.appendChild(card);
}

function syncChanges() {
    if (hasActiveFilters()) return;
    if (!lastSyncAt) return;

    const url = apiUrl(`api/protocolos.php?action=changes&since=${encodeURIComponent(lastSyncAt)}`);
    fetch(url)
        .then(res => res.json())
        .then(payload => {
            const items = payload?.items;
            if (!Array.isArray(items) || items.length === 0) {
                if (payload?.server_now) lastSyncAt = payload.server_now;
                return;
            }

            items.forEach(p => {
                const existing = document.querySelector(`.card[data-id="${p.id}"]`);
                if (p.deletado == 1) {
                    if (existing) {
                        const oldStatus = existing.closest('.cards')?.id;
                        existing.remove();
                        adjustColumnCount(oldStatus, -1);
                    }
                    return;
                }

                const coluna = document.getElementById(p.status);
                if (!coluna) return;

                const novoCard = criarCard(p);
                if (existing) {
                    const oldStatus = existing.closest('.cards')?.id;

                    // FLIP animation: captura posição antes
                    const oldRect = existing.getBoundingClientRect();

                    existing.remove();
                    if (oldStatus && oldStatus !== p.status) {
                        adjustColumnCount(oldStatus, -1);
                        adjustColumnCount(p.status, 1);
                    } else if (oldStatus) {
                        updateColumnCount(oldStatus);
                    }

                    insertCardSorted(coluna, novoCard, p);

                    // FLIP: calcula diferença e anima
                    const newRect = novoCard.getBoundingClientRect();
                    const dx = oldRect.left - newRect.left;
                    const dy = oldRect.top - newRect.top;

                    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                        novoCard.style.transform = `translate(${dx}px, ${dy}px)`;
                        novoCard.style.transition = 'none';
                        requestAnimationFrame(() => {
                            novoCard.style.transition = 'transform .35s ease, opacity .35s ease';
                            novoCard.style.transform = '';
                            novoCard.addEventListener('transitionend', function handler() {
                                novoCard.style.transition = '';
                                novoCard.removeEventListener('transitionend', handler);
                            });
                        });
                    }
                } else {
                    adjustColumnCount(p.status, 1);
                    insertCardSorted(coluna, novoCard, p);
                    novoCard.classList.add('card-sync-move');
                    setTimeout(() => novoCard.classList.remove('card-sync-move'), 350);
                }
            });

            if (payload?.server_now) lastSyncAt = payload.server_now;
        })
        .catch(err => console.error(err));
}

function updateColumnCount(status) {
    if (!status) return;
    const coluna = document.getElementById(status);
    const badge = document.querySelector(`.column-count[data-count="${status}"]`);
    if (!coluna || !badge) return;
    if (typeof totalCounts[status] === 'number') {
        animateBadgeCount(badge, totalCounts[status]);
        return;
    }
    const current = parseInt(badge.dataset.value || badge.textContent || '0', 10);
    if (Number.isFinite(current)) {
        animateBadgeCount(badge, current);
        return;
    }
    const count = coluna.querySelectorAll('.card:not(.card-skeleton)').length;
    animateBadgeCount(badge, count);
}

function updateAllColumnCounts() {
    STATUSES.forEach(updateColumnCount);
}

window.updateColumnCount = updateColumnCount;
window.updateAllColumnCounts = updateAllColumnCounts;
window.adjustColumnCount = adjustColumnCount;

function animateBadgeCount(badge, target) {
    const prev = parseInt(badge.dataset.value || badge.textContent || '0', 10);
    if (!Number.isFinite(target)) return;
    if (prev === target) return;

    const start = performance.now();
    const duration = 280;
    const from = Number.isFinite(prev) ? prev : 0;
    const to = target;

    function tick(now) {
        const t = Math.min(1, (now - start) / duration);
        const current = Math.round(from + (to - from) * t);
        badge.textContent = current;
        if (t < 1) {
            requestAnimationFrame(tick);
        } else {
            badge.textContent = to;
            badge.dataset.value = String(to);
        }
    }

    requestAnimationFrame(tick);
}

function adjustColumnCount(status, delta) {
    if (!status || !Number.isFinite(delta)) return;
    if (typeof totalCounts[status] === 'number') {
        totalCounts[status] = Math.max(0, totalCounts[status] + delta);
        updateColumnCount(status);
    } else {
        const badge = document.querySelector(`.column-count[data-count="${status}"]`);
        const current = badge ? parseInt(badge.dataset.value || badge.textContent || '0', 10) : NaN;
        if (Number.isFinite(current)) {
            totalCounts[status] = Math.max(0, current + delta);
            updateColumnCount(status);
        } else {
            updateColumnCount(status);
        }
    }
}

/* =========================================================
   HELPERS
   ======================================================= */

function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarData(data) {
    if (!data) return '';
    const s = String(data).slice(0, 10); // "YYYY-MM-DD"
    const [y, m, d] = s.split('-').map(n => parseInt(n, 10));
    if (!y || !m || !d) return '';
    return new Date(y, m - 1, d).toLocaleDateString('pt-BR');
}

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function escapeRegex(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightText(text, query) {
    if (!query) return escapeHtml(text);
    const escapedText = escapeHtml(text);
    const re = new RegExp(escapeRegex(query), 'gi');
    return escapedText.replace(re, '<mark class="highlight">$&</mark>');
}

function renderActiveFilters() {
    if (!activeFilters) return;
    const chips = [];

    if (currentQuery) chips.push({ label: `Busca: ${currentQuery}`, type: 'q' });
    if (filterAto?.value) chips.push({ label: `Ato: ${filterAto.options[filterAto.selectedIndex]?.text || filterAto.value}`, type: 'ato' });
    if (filterDigitador?.value) chips.push({ label: `Digitador: ${filterDigitador.options[filterDigitador.selectedIndex]?.text || filterDigitador.value}`, type: 'digitador' });
    if (filterUrgente?.value) chips.push({ label: 'Urgente', type: 'urgente' });
    if (filterTag?.value) chips.push({ label: `Tag: ${filterTag.options[filterTag.selectedIndex]?.text || filterTag.value}`, type: 'tag' });

    if (!chips.length) {
        activeFilters.innerHTML = '';
        return;
    }

    activeFilters.innerHTML = chips
        .map(c => `<span class="filter-chip">${escapeHtml(c.label)}<button type="button" data-filter="${c.type}">×</button></span>`)
        .join('');
}

/* Mapa de cores carregado do servidor (fonte única: config/ato-cores.php) */
let atoCoresMap = {};

function carregarAtoCores() {
    fetch(apiUrl('api/ato-cores.php'))
        .then(res => res.json())
        .then(map => { atoCoresMap = map; })
        .catch(err => console.error(err));
}

carregarAtoCores();

function corAtoFixa(ato) {
    return atoCoresMap[ato] || null;
}

function corTextoParaFundo(bg) {
    if (!bg) return '#ffffff';
    const hex = bg.replace('#', '');
    if (hex.length !== 6) return '#ffffff';
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    return luma > 0.6 ? '#0f172a' : '#ffffff';
}

/* =========================================================
   ARQUIVAR / RESTAURAR (STATUS)
   ======================================================= */

function moveCardToColumn(id, newStatus) {
    const card = document.querySelector(`.card[data-id="${id}"]`);
    const coluna = document.getElementById(newStatus);
    if (!card || !coluna) return;

    const oldStatus = card.closest('.cards')?.id;

    // Captura posição original para FLIP
    const oldRect = card.getBoundingClientRect();

    // Move imediatamente no DOM
    card.dataset.status = newStatus;
    coluna.prepend(card);

    // Atualiza botões do card
    if (typeof window.atualizarAcoesCard === 'function') {
        window.atualizarAcoesCard(card, newStatus);
    }

    // Atualiza contadores
    if (oldStatus && oldStatus !== newStatus) {
        adjustColumnCount(oldStatus, -1);
        adjustColumnCount(newStatus, 1);
    }

    // FLIP animation
    const newRect = card.getBoundingClientRect();
    const dx = oldRect.left - newRect.left;
    const dy = oldRect.top - newRect.top;

    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        card.style.transform = `translate(${dx}px, ${dy}px)`;
        card.style.transition = 'none';
        requestAnimationFrame(() => {
            card.style.transition = 'transform .35s ease, opacity .35s ease';
            card.style.transform = '';
            card.addEventListener('transitionend', function handler() {
                card.style.transition = '';
                card.removeEventListener('transitionend', handler);
            });
        });
    }
}

function arquivarProtocolo(id) {
    moveCardToColumn(id, 'ARQUIVADOS');

    fetch(apiUrl('api/protocolos.php?action=status'), {
        method: 'POST',
        body: new URLSearchParams({ id, status: 'ARQUIVADOS' })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) console.error('Erro ao arquivar', json);
    })
    .catch(err => console.error(err));
}

function restaurarProtocolo(id) {
    moveCardToColumn(id, 'PARA_DISTRIBUIR');

    fetch(apiUrl('api/protocolos.php?action=status'), {
        method: 'POST',
        body: new URLSearchParams({ id, status: 'PARA_DISTRIBUIR' })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) console.error('Erro ao restaurar', json);
    })
    .catch(err => console.error(err));
}

/* =========================================================
   AUTO-SYNC (COLABORATIVO)
   ======================================================= */

const SYNC_INTERVAL_MS = 8000;
let syncInterval = null;

function iniciarAutoSync() {
    if (syncInterval) clearInterval(syncInterval);

    syncInterval = setInterval(() => {
        if (document.hidden) return;
        if (getIsDragging()) return;
        if (hasActiveFilters()) return;
        syncChanges();
    }, SYNC_INTERVAL_MS);
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        if (getIsDragging()) return;
        if (hasActiveFilters()) return;
        syncChanges();
    }
});

document.querySelectorAll('.cards').forEach(col => {
    col.addEventListener('scroll', () => {
        if (col.scrollTop + col.clientHeight >= col.scrollHeight - 60) {
            loadPage(col.id);
        }
    });
});

resetBoardAndLoad();
iniciarAutoSync();

// Expor no window para uso por outros módulos e onclick handlers inline
window.atualizarCard = atualizarCard;
window.buscarProtocolos = buscarProtocolos;
window.adjustColumnCount = adjustColumnCount;
window.updateAllColumnCounts = updateAllColumnCounts;
