/* =========================================================
   TAGS (CORES DOS ATOS)
   ======================================================= */

let tagsMap = {};

/* =========================================================
   CARREGAR TAGS DO BACKEND
   ======================================================= */

function carregarTags() {
    fetch(apiUrl('api/tags.php?action=list'))
        .then(res => res.json())
        .then(tags => {
            tagsMap = {};
            tags.forEach(t => {
                tagsMap[t.ato] = t.cor;
            });

            aplicarTags();
        })
        .catch(err => console.error(err));
}

/* =========================================================
   APLICAR CORES NOS CARDS
   ======================================================= */

function aplicarTags() {
    document.querySelectorAll('.card').forEach(card => {

        const tag = card.querySelector('.card-tag');
        if (!tag) return;

        const ato = tag.textContent.trim();

        if (tagsMap[ato]) {
            tag.style.backgroundColor = tagsMap[ato];
        }
    });
}

/* =========================================================
   CRIAR / ATUALIZAR TAG AUTOMATICAMENTE
   ======================================================= */

function salvarTag(ato, cor) {
    if (!ato || !cor) return;

    fetch(apiUrl('api/tags.php?action=create'), {
        method: 'POST',
        body: new URLSearchParams({ ato, cor })
    })
    .then(res => res.json())
    .then(json => {
        if (json.success) {
            tagsMap[ato] = cor;
            aplicarTags();
        }
    })
    .catch(err => console.error(err));
}

/* =========================================================
   GERAR COR PADRÃO (CASO NÃO TENHA)
   ======================================================= */

function gerarCorPadrao(ato) {
    // hash simples e consistente
    let hash = 0;
    for (let i = 0; i < ato.length; i++) {
        hash = ato.charCodeAt(i) + ((hash << 5) - hash);
    }

    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
}

/* =========================================================
   OBSERVAR MUDANÇAS NO DOM (BUSCA / DRAG)
   ======================================================= */

const observer = new MutationObserver(() => {
    aplicarTags();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

/* =========================================================
   INIT
   ======================================================= */

document.addEventListener('DOMContentLoaded', () => {
    carregarTags();
});
