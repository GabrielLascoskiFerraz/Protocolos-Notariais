/* =========================================================
   BUSCA GLOBAL DO BOARD
   ======================================================= */

const searchInput = document.getElementById('search');
const filterAto = document.getElementById('filter-ato');
const filterDigitador = document.getElementById('filter-digitador');
let searchTimeout = null;
let lastSyncKey = null;
let lastSyncHash = null;

if (searchInput) {
    searchInput.addEventListener('input', function () {
        clearTimeout(searchTimeout);

        const query = this.value.trim();

        searchTimeout = setTimeout(() => {
            buscarProtocolos(query);
        }, 300);
    });
}

if (filterAto) {
    filterAto.addEventListener('change', () => {
        const termo = searchInput?.value ?? '';
        buscarProtocolos(termo);
    });
}

if (filterDigitador) {
    filterDigitador.addEventListener('change', () => {
        const termo = searchInput?.value ?? '';
        buscarProtocolos(termo);
    });
}

/* =========================================================
   BUSCAR PROTOCOLOS NO BACKEND
   ======================================================= */

function buscarProtocolos(query) {
    if (window.suppressSyncUntil && Date.now() < window.suppressSyncUntil) {
        return;
    }
    const params = new URLSearchParams();
    params.set('action', 'search');
    params.set('q', query ?? '');
    if (filterAto && filterAto.value) {
        params.set('ato', filterAto.value);
    }
    if (filterDigitador && filterDigitador.value) {
        params.set('digitador', filterDigitador.value);
    }
    const url = apiUrl(`api/protocolos.php?${params.toString()}`);

    fetch(url)
        .then(res => res.json())
        .then(protocolos => {

            if (!Array.isArray(protocolos)) {
                console.error('Resposta inválida da busca:', protocolos);
                limparBoard();
                return;
            }

            const key = `${query ?? ''}|${filterAto?.value ?? ''}|${filterDigitador?.value ?? ''}`;
            const hash = JSON.stringify(protocolos);
            if (key === lastSyncKey && hash === lastSyncHash) {
                return;
            }
            lastSyncKey = key;
            lastSyncHash = hash;

            atualizarBoard(protocolos);
        })
        .catch(err => console.error(err));
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

            if (atual) {
                if (atual.parentElement !== coluna) {
                    coluna.appendChild(novoCard);
                    atual.remove();
                } else {
                    atual.replaceWith(novoCard);
                }
            } else {
                coluna.appendChild(novoCard);
            }
        })
        .catch(err => console.error(err));
}

/* =========================================================
   LIMPA TODAS AS COLUNAS
   ======================================================= */

function limparBoard() {
    document.querySelectorAll('.cards').forEach(col => {
        col.innerHTML = '';
    });
}

/* =========================================================
   ATUALIZAR BOARD COM RESULTADO DA BUSCA
   ======================================================= */

function atualizarBoard(protocolos) {

    limparBoard();

    protocolos.forEach(p => {
        const coluna = document.getElementById(p.status);
        if (!coluna) return;

        coluna.appendChild(criarCard(p));
    });
}

/* =========================================================
   CRIAR CARD VIA JS (ESPELHO DO card.php)
   ======================================================= */

function criarCard(p) {

    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = p.id;
    card.dataset.status = p.status;

    // Clique no card abre modal
    card.addEventListener('click', () => abrirModal(p.id));

    // Urgente
    if (p.urgente == 1) {
        card.classList.add('card-urgente');
    }

    const corTag = corAtoFixa(p.ato || '') || (p.tag_cor && p.tag_cor.trim() ? p.tag_cor : '#64748b');
    const corTexto = corTextoParaFundo(corTag);

    card.innerHTML = `
        <div class="card-tag" style="background-color: ${corTag}; color: ${corTexto}">
            ${escapeHtml(p.ato || '')}
        </div>

        <div class="card-body">
            ${(p.ficha || p.urgente)
                ? `<div class="card-ficha">
                        ${p.ficha ? `<span>Ficha ${p.ficha}</span>` : ''}
                        ${p.urgente == 1 ? `<span class="tag-urgente">Urgente</span>` : ''}
                   </div>`
                : ''
            }
            ${p.apresentante ? `<div class="card-apresentante">${escapeHtml(p.apresentante)}</div>` : ''}
            ${p.digitador ? `<div class="card-digitador">Digitador: ${escapeHtml(p.digitador)}</div>` : ''}
            ${p.outorgantes ? `<div class="card-outorgantes">Outorgante: ${escapeHtml(p.outorgantes)}</div>` : ''}
            ${p.data_apresentacao ? `<div class="card-data">${formatarData(p.data_apresentacao)}</div>` : ''}
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

    return card;
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
        const termo = searchInput?.value ?? '';
        buscarProtocolos(termo);
    }, SYNC_INTERVAL_MS);
}

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        if (window.isDraggingCard) return;
        const termo = searchInput?.value ?? '';
        buscarProtocolos(termo);
    }
});

iniciarAutoSync();
