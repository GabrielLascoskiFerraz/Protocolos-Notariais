import { apiUrl } from './base.js';

/* =========================================================
   TAGS (CORES DOS ATOS)
   ======================================================= */

let tagsMap = {};

export function carregarTags() {
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

export function aplicarTags() {
    document.querySelectorAll('.card').forEach(card => {
        const tag = card.querySelector('.card-tag');
        if (!tag) return;

        const ato = tag.textContent.trim();
        if (tagsMap[ato]) {
            tag.style.backgroundColor = tagsMap[ato];
        }
    });
}

export function salvarTag(ato, cor) {
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

export function gerarCorPadrao(ato) {
    let hash = 0;
    for (let i = 0; i < ato.length; i++) {
        hash = ato.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 65%, 45%)`;
}

/* Observar mudanças no DOM (busca / drag) */
const observer = new MutationObserver(() => {
    aplicarTags();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

/* Init */
document.addEventListener('DOMContentLoaded', () => {
    carregarTags();
});
