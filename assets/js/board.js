import { apiUrl } from './base.js';
import { showToast } from './toast.js';
import { setIsDragging, setSuppressSyncUntil } from './state.js';

/* =========================================================
   DRAG & DROP DO KANBAN
   ======================================================= */

let draggedCard = null;
let dragImageEl = null;

/* =========================
   INÍCIO DO DRAG
   ========================= */
document.addEventListener('dragstart', function (e) {
    const card = e.target.closest('.card');
    if (!card) return;

    draggedCard = card;
    setIsDragging(true);

    if (dragImageEl) {
        dragImageEl.remove();
        dragImageEl = null;
    }
    dragImageEl = card.cloneNode(true);
    dragImageEl.style.position = 'absolute';
    dragImageEl.style.top = '-9999px';
    dragImageEl.style.left = '-9999px';
    dragImageEl.style.width = `${card.offsetWidth}px`;
    dragImageEl.style.height = `${card.offsetHeight}px`;
    dragImageEl.style.pointerEvents = 'none';
    dragImageEl.classList.remove('dragging');
    document.body.appendChild(dragImageEl);

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);

    const rect = card.getBoundingClientRect();
    const offsetX = Number.isFinite(e.clientX) ? Math.max(0, Math.min(rect.width, e.clientX - rect.left)) : 20;
    const offsetY = Number.isFinite(e.clientY) ? Math.max(0, Math.min(rect.height, e.clientY - rect.top)) : 20;
    e.dataTransfer.setDragImage(dragImageEl, offsetX, offsetY);

    card.classList.add('dragging');
});

/* =========================
   FIM DO DRAG
   ========================= */
document.addEventListener('dragend', function () {
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
    }
    draggedCard = null;
    setIsDragging(false);
    if (dragImageEl) {
        dragImageEl.remove();
        dragImageEl = null;
    }
});

/* =========================
   DROP NAS COLUNAS
   ========================= */
document.querySelectorAll('.cards').forEach(column => {

    column.addEventListener('dragover', e => {
        e.preventDefault();
        column.classList.add('drag-over');
    });

    column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
    });

    column.addEventListener('drop', function (e) {
        e.preventDefault();
        column.classList.remove('drag-over');

        const idFromDrag = e.dataTransfer?.getData('text/plain');
        const cardEl = draggedCard || (idFromDrag ? document.querySelector(`.card[data-id="${idFromDrag}"]`) : null);
        if (!cardEl) return;

        const id = cardEl.dataset.id;
        const oldStatus = cardEl.dataset.status;
        const novoStatus = column.id;

        column.prepend(cardEl);
        cardEl.dataset.status = novoStatus;
        atualizarAcoesCard(cardEl, novoStatus);
        cardEl.classList.remove('move-animate');
        void cardEl.offsetWidth;
        cardEl.classList.add('move-animate');
        setTimeout(() => cardEl.classList.remove('move-animate'), 280);
        setSuppressSyncUntil(Date.now() + 1500);

        atualizarStatus(id, novoStatus);
        if (typeof window.adjustColumnCount === 'function' && oldStatus && oldStatus !== novoStatus) {
            window.adjustColumnCount(oldStatus, -1);
            window.adjustColumnCount(novoStatus, 1);
        } else if (typeof window.updateAllColumnCounts === 'function') {
            window.updateAllColumnCounts();
        }
    });
});

/* =========================================================
   BACKEND — ATUALIZAR STATUS
   ======================================================= */

function atualizarStatus(id, status) {
    fetch(apiUrl('api/protocolos.php?action=status'), {
        method: 'POST',
        body: new URLSearchParams({ id, status })
    })
    .then(r => r.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao atualizar status', json);
            return;
        }
        if (typeof window.atualizarCard === 'function') {
            window.atualizarCard(id);
        }
        const map = {
            'PARA_DISTRIBUIR': 'Para distribuir',
            'EM_ANDAMENTO': 'Em andamento',
            'PARA_CORRECAO': 'Para correção',
            'LAVRADOS': 'Lavrados',
            'ARQUIVADOS': 'Arquivados'
        };
        const label = map[status] || status.replace(/_/g, ' ').toLowerCase();
        showToast(`Movido para ${label}`, 'success');
    })
    .catch(err => console.error(err));
}

/* =========================================================
   ATUALIZAR BOTÕES DO CARD (ARQUIVAR/RESTAURAR)
   ======================================================= */

export function atualizarAcoesCard(card, status) {
    const actions = card.querySelector('.card-actions');
    if (!actions) return;

    if (status === 'ARQUIVADOS') {
        actions.innerHTML = `
            <button class="btn-restaurar" onclick="restaurarProtocolo(${card.dataset.id}); event.stopPropagation()">
                Restaurar
            </button>
            <button class="danger" onclick="excluirProtocolo(${card.dataset.id}); event.stopPropagation()">
                Excluir
            </button>
        `;
        return;
    }

    actions.innerHTML = `
        <button onclick="arquivarProtocolo(${card.dataset.id}); event.stopPropagation()">
            Arquivar
        </button>
        <button class="danger" onclick="excluirProtocolo(${card.dataset.id}); event.stopPropagation()">
            Excluir
        </button>
    `;
}

/* =========================================================
   EXIBIR/OCULTAR COLUNA ARQUIVADOS
   ======================================================= */

const toggleArchivedBtn = document.getElementById('toggle-archived');
const colunaArquivados = document.getElementById('coluna-arquivados');

if (toggleArchivedBtn && colunaArquivados) {
    toggleArchivedBtn.addEventListener('click', () => {
        const hidden = colunaArquivados.classList.toggle('hidden');
        toggleArchivedBtn.textContent = hidden ? 'Mostrar arquivados' : 'Ocultar arquivados';
        toggleArchivedBtn.setAttribute('aria-expanded', hidden ? 'false' : 'true');
    });
}

/* =========================================================
   AÇÕES DO CARD (BOTÕES)
   ======================================================= */

function moveCardImediato(id, novoStatus) {
    const card = document.querySelector(`.card[data-id="${id}"]`);
    const coluna = document.getElementById(novoStatus);
    if (!card || !coluna) return;

    const oldStatus = card.closest('.cards')?.id;
    const oldRect = card.getBoundingClientRect();

    card.dataset.status = novoStatus;
    atualizarAcoesCard(card, novoStatus);
    coluna.prepend(card);

    if (oldStatus && oldStatus !== novoStatus) {
        if (typeof window.adjustColumnCount === 'function') {
            window.adjustColumnCount(oldStatus, -1);
            window.adjustColumnCount(novoStatus, 1);
        }
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

export function arquivarProtocolo(id) {
    if (!confirm('Arquivar este protocolo?')) return;
    moveCardImediato(id, 'ARQUIVADOS');
    atualizarStatus(id, 'ARQUIVADOS');
}

export function restaurarProtocolo(id) {
    moveCardImediato(id, 'PARA_DISTRIBUIR');
    atualizarStatus(id, 'PARA_DISTRIBUIR');
}

export function excluirProtocolo(id) {
    if (!confirm('Excluir definitivamente este protocolo?')) return;

    fetch(apiUrl('api/protocolos.php?action=delete'), {
        method: 'POST',
        body: new URLSearchParams({ id })
    })
    .then(() => {
        const card = document.querySelector(`.card[data-id="${id}"]`);
        const status = card?.dataset?.status;
        card?.remove();
        if (typeof window.adjustColumnCount === 'function') {
            window.adjustColumnCount(status, -1);
        }
    })
    .catch(err => console.error(err));
}

/* =========================================================
   CRIAR NOVO PROTOCOLO
   ======================================================= */

export function criarProtocolo() {
    fetch(apiUrl('api/protocolos.php?action=create'), { method: 'POST' })
        .then(r => r.json())
        .then(json => {
            if (!json.success || !json.id) return;

            if (typeof window.buscarProtocolos === 'function') {
                const termo = document.getElementById('search')?.value ?? '';
                window.buscarProtocolos(termo);
            }

            if (typeof window.abrirModal === 'function') {
                window.abrirModal(json.id);
            }
        })
        .catch(err => console.error(err));
}

// Expor no window para onclick handlers inline no PHP
window.arquivarProtocolo = arquivarProtocolo;
window.restaurarProtocolo = restaurarProtocolo;
window.excluirProtocolo = excluirProtocolo;
window.criarProtocolo = criarProtocolo;
window.atualizarAcoesCard = atualizarAcoesCard;
