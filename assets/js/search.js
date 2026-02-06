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
    if (window.suppressSyncUntil && Date.now() < window.suppressSyncUntil) {
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
   CRIAR CARD VIA JS (ESPELHO DO card.php)
   ======================================================= */

function criarCard(p) {

    const card = document.createElement('div');
    card.className = 'card card-appear';
    card.draggable = true;
    card.dataset.id = p.id;
    card.dataset.status = p.status;
    card.dataset.urgente = p.urgente == 1 ? '1' : '0';

    // Clique no card abre modal
    card.addEventListener('click', () => abrirModal(p.id));

    // Urgente
    if (p.urgente == 1) {
        card.classList.add('card-urgente');
    }

    const corTag = corAtoFixa(p.ato || '') || (p.tag_cor && p.tag_cor.trim() ? p.tag_cor : '#64748b');
    const corTexto = corTextoParaFundo(corTag);

    const query = (currentQuery || '').trim();
    const queryUpper = query.toUpperCase();
    const atoText = (p.ato || '').toUpperCase();
    const atoDisplay = highlightText(atoText, queryUpper);

    card.innerHTML = `
        <div class="card-tag" style="background-color: ${corTag}; color: ${corTexto}">
            ${atoDisplay}
        </div>

        <div class="card-body">
            ${(p.ficha || p.urgente)
                ? `<div class="card-ficha">
                        ${p.ficha ? `<span>Ficha ${p.ficha}</span>` : ''}
                        ${p.urgente == 1 ? `<span class="tag-urgente">Urgente</span>` : ''}
                        ${p.tag_custom ? `<span class="tag-custom">${escapeHtml(p.tag_custom)}</span>` : ''}
                   </div>`
                : ''
            }
            ${(p.tag_custom && !p.ficha && p.urgente != 1)
                ? `<div class="card-ficha">
                        <span class="tag-custom">${escapeHtml(p.tag_custom)}</span>
                   </div>`
                : ''
            }
            ${p.apresentante ? `<div class="card-apresentante"><span class="card-icon">👤</span>${highlightText(p.apresentante, query)}</div>` : ''}
            ${p.digitador ? `<div class="card-digitador"><span class="card-icon">⌨️</span>Digitador: ${highlightText(p.digitador, query)}</div>` : ''}
            ${p.outorgantes ? `<div class="card-outorgantes"><span class="card-icon">📝</span>Outorgante: ${highlightText(p.outorgantes, query)}</div>` : ''}
            ${p.outorgados ? `<div class="card-outorgados"><span class="card-icon">🧾</span>Outorgado: ${highlightText(p.outorgados, query)}</div>` : ''}
            ${p.data_apresentacao ? `<div class="card-data"><span class="card-icon">📅</span>${formatarData(p.data_apresentacao)}</div>` : ''}
        </div>

        <div class="card-footer">

            <div class="card-actions">
                ${p.status !== 'ARQUIVADOS'
                    ? `<button onclick="arquivarProtocolo(${p.id}); event.stopPropagation()">Arquivar</button>`
                    : `<button class="btn-restaurar" onclick="restaurarProtocolo(${p.id}); event.stopPropagation()">Restaurar</button>`
                }
                <button class="danger" onclick="excluirProtocolo(${p.id}); event.stopPropagation()">Excluir</button>
            </div>

            <div class="card-valores">
                ${p.total_valores > 0
                    ? `R$ ${formatarValor(p.total_valores)}`
                    : '&nbsp;'
                }
            </div>

            <div class="card-handle">⋮⋮</div>
        </div>
    `;

    setTimeout(() => card.classList.remove('card-appear'), 300);
    return card;
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
                    existing.remove();
                    if (oldStatus && oldStatus !== p.status) {
                        adjustColumnCount(oldStatus, -1);
                        adjustColumnCount(p.status, 1);
                    } else if (oldStatus) {
                        updateColumnCount(oldStatus);
                    }
                } else {
                    adjustColumnCount(p.status, 1);
                }
                insertCardSorted(coluna, novoCard, p);
                novoCard.classList.add('card-sync');
                setTimeout(() => novoCard.classList.remove('card-sync'), 1020);
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
    return new Date(data).toLocaleDateString('pt-BR');
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

function corAtoFixa(ato) {
    const map = {
        'Abertura de Crédito em conta': '#3b82f6',
        'Aditivo': '#22c55e',
        'Alienação Fiduciária': '#f97316',
        'Ata de adjudicação compulsória': '#6366f1',
        'Ata Notarial Diligencia Externa': '#14b8a6',
        'Ata Notarial Externa': '#0ea5e9',
        'Ata Notarial Interna': '#8b5cf6',
        'Ata Notarial Internet': '#ef4444',
        'Ata Notarial para Usucapião': '#06b6d4',
        'Autocuratela': '#84cc16',
        'Autorização': '#a855f7',
        'Caução': '#f59e0b',
        'Cessão de direitos de aquisição': '#10b981',
        'Cessão de Direitos de Meação Onerosa': '#1d4ed8',
        'Cessão de Direitos de Meação por Doação': '#f43f5e',
        'Cessão de Direitos de Posse': '#16a34a',
        'Cessão de Direitos Hereditários': '#0f766e',
        'Cessão de Direitos Hereditários e de Meação': '#7c3aed',
        'Cessão de Direitos Não Onerosa': '#ea580c',
        'Cessão de Direitos Onerosa': '#2563eb',
        'Comodato': '#059669',
        'Compra e venda': '#4f46e5',
        'Compra e Venda Bem Móvel com Hipoteca e Alienação': '#b45309',
        'Compra e Venda com Cessão Onerosa de Direito de Us': '#0891b2',
        'Compromisso de Compra e Venda': '#22c55e',
        'Concessão de Direito Real de Uso': '#f97316',
        'Confissão de Dívida': '#64748b',
        'Constituição e Convenção de Condomínio': '#0ea5e9',
        'Contrato de Arrendamento Mercantil': '#1f2937',
        'Contrato de Locação': '#0f766e',
        'Conversão de separação em divórcio sem partilha': '#7c3aed',
        'CONVERSÃO Escritura pública': '#e11d48',
        'Dação em Pagamento': '#16a34a',
        'Declaração de União Estável': '#9333ea',
        'Declaratória': '#f59e0b',
        'Declaratória de Estremação': '#0ea5e9',
        'Desapropriação': '#ef4444',
        'Desapropriação Amigável': '#10b981',
        'Desfazimento': '#f97316',
        'Desincorporação': '#6366f1',
        'Diretivas Antecipadas de Vontade': '#14b8a6',
        'Dissolução de União Estável': '#3b82f6',
        'Dissolução de União Estável Com Partilha': '#22c55e',
        'Distrato de Escritura Pública': '#f43f5e',
        'Divisão Amigável': '#0ea5e9',
        'Divórcio com Partilha': '#8b5cf6',
        'Divórcio Sem Partilha': '#ef4444',
        'Doação': '#f59e0b',
        'Doação com Reserva de Usufruto': '#10b981',
        'Emancipação': '#6366f1',
        'Extinção de Fundação': '#0f766e',
        'Hipoteca': '#f97316',
        'Incorporação': '#3b82f6',
        'Instituição de Bem de Família': '#14b8a6',
        'Instituição de Condomínio': '#8b5cf6',
        'Instituição de Servidão': '#ef4444',
        'Instituição de Usufruto': '#22c55e',
        'Integralização de Capital': '#0ea5e9',
        'Inventário': '#f59e0b',
        'Inventário e Partilha com Menores e Incapazes': '#7c3aed',
        'Inventário e Partilha de Bens': '#10b981',
        'Mútuo': '#64748b',
        'Nomeação de Inventariante': '#3b82f6',
        'Nomeação de inventariante com menores e incapazes': '#22c55e',
        'Pacto Antenupcial': '#f97316',
        'Pacto Pós Nupcial': '#6366f1',
        'Partilha Amigável': '#14b8a6',
        'Permuta': '#ef4444',
        'Pública Forma': '#8b5cf6',
        'Quitação': '#0ea5e9',
        'Ratificação': '#10b981',
        'Re-Ratificação': '#f59e0b',
        'Reconhecimento com dissolução de união estável e P': '#64748b',
        'Reconhecimento de Paternidade': '#3b82f6',
        'Renúncia': '#ef4444',
        'Renúncia de Direitos Hereditários': '#8b5cf6',
        'Renúncia de Propriedade': '#0ea5e9',
        'Renúncia de Usufruto': '#10b981',
        'Rerratificação': '#f97316',
        'Rerratificação e Aditamento': '#6366f1',
        'Restabelecimento de Sociedade Conjugal': '#14b8a6',
        'Retificação': '#22c55e',
        'Revogação de Clausula de Incomunicabilidade': '#f59e0b',
        'Revogação de Cláusula de Reversão': '#0ea5e9',
        'Revogação Procuração (1)': '#ef4444',
        'Sobrepartilha': '#8b5cf6',
        'Subrogação': '#10b981',
        'Transação - Acordo Extrajudicial': '#3b82f6'
    };

    return map[ato] || null;
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

function arquivarProtocolo(id) {

    fetch(apiUrl('api/protocolos.php?action=status'), {
        method: 'POST',
        body: new URLSearchParams({
            id,
            status: 'ARQUIVADOS'
        })
    })
    .then(res => res.json())
    .then(() => {
        const termo = searchInput?.value ?? '';
        buscarProtocolos(termo);
    })
    .catch(err => console.error(err));
}

function restaurarProtocolo(id) {

    fetch(apiUrl('api/protocolos.php?action=status'), {
        method: 'POST',
        body: new URLSearchParams({
            id,
            status: 'PARA_DISTRIBUIR'
        })
    })
    .then(res => res.json())
    .then(() => {
        const termo = searchInput?.value ?? '';
        buscarProtocolos(termo);
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
        if (window.isDraggingCard) return;
        if (hasActiveFilters()) return;
        syncChanges();
    }, SYNC_INTERVAL_MS);
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        if (window.isDraggingCard) return;
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
