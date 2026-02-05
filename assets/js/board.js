/* =========================================================
   DRAG & DROP DO KANBAN
   ======================================================= */

let draggedCard = null;
window.isDraggingCard = false;

/* =========================
   INÍCIO DO DRAG
   ========================= */
document.addEventListener('dragstart', function (e) {
    const card = e.target.closest('.card');
    if (!card) return;

    draggedCard = card;
    window.isDraggingCard = true;
    card.classList.add('dragging');

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
});

/* =========================
   FIM DO DRAG
   ========================= */
document.addEventListener('dragend', function () {
    if (draggedCard) {
        draggedCard.classList.remove('dragging');
        draggedCard = null;
    }
    window.isDraggingCard = false;
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

        if (!draggedCard) return;

        const id = draggedCard.dataset.id;
        const novoStatus = column.id;

        // Move visualmente
        column.appendChild(draggedCard);
        draggedCard.dataset.status = novoStatus;
        atualizarAcoesCard(draggedCard, novoStatus);

        // Atualiza backend
        atualizarStatus(id, novoStatus);
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
        if (typeof atualizarCard === 'function') {
            atualizarCard(id);
        }
    })
    .catch(err => console.error(err));
}

/* =========================================================
   ATUALIZAR BOTÕES DO CARD (ARQUIVAR/RESTAURAR)
   ======================================================= */

function atualizarAcoesCard(card, status) {
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

function arquivarProtocolo(id) {
    if (!confirm('Arquivar este protocolo?')) return;
    atualizarStatus(id, 'ARQUIVADOS');
}

function restaurarProtocolo(id) {
    atualizarStatus(id, 'PARA_DISTRIBUIR');
}

function excluirProtocolo(id) {
    if (!confirm('Excluir definitivamente este protocolo?')) return;

    fetch(apiUrl('api/protocolos.php?action=delete'), {
        method: 'POST',
        body: new URLSearchParams({ id })
    })
    .then(() => {
        document.querySelector(`.card[data-id="${id}"]`)?.remove();
    })
    .catch(err => console.error(err));
}

/* =========================================================
   CRIAR NOVO PROTOCOLO
   ======================================================= */

function criarProtocolo() {
    fetch(apiUrl('api/protocolos.php?action=create'), { method: 'POST' })
        .then(r => r.json())
        .then(json => {
            if (!json.success || !json.id) return;

            // Recarrega o board respeitando busca atual
            if (typeof buscarProtocolos === 'function') {
                const termo = document.getElementById('search')?.value ?? '';
                buscarProtocolos(termo);
            }

            // Abre modal do novo protocolo
            if (typeof abrirModal === 'function') {
                abrirModal(json.id);
            }
        })
        .catch(err => console.error(err));
}
