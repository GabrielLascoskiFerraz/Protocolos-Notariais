import { apiUrl } from './base.js';
import { getProtocoloAtual } from './state.js';

/* =========================================================
   AUTOSAVE GENÉRICO DO MODAL
   ======================================================= */

let autosaveTimeout = null;

/* =========================================================
   AUTOSAVE (INPUTS COM data-field)
   ======================================================= */

document.addEventListener('input', function (e) {
    const el = e.target;

    if (!el.matches('[data-field]')) return;
    if (!getProtocoloAtual()) return;

    const field = el.dataset.field;
    let value;

    if (el.type === 'checkbox') {
        value = el.checked ? 1 : 0;
    } else {
        value = el.value;
    }

    if (el.classList.contains('money')) {
        const digits = String(value).replace(/\D/g, '');
        value = digits ? (parseInt(digits, 10) / 100).toFixed(2) : '';
    }

    // Feedback visual se excedeu maxlength (para textareas onde maxlength não bloqueia)
    if (el.maxLength > 0 && el.value.length >= el.maxLength) {
        el.style.borderColor = '#f59e0b';
        el.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.15)';
    } else {
        el.style.borderColor = '';
        el.style.boxShadow = '';
    }

    clearTimeout(autosaveTimeout);

    autosaveTimeout = setTimeout(() => {
        salvarCampo(field, value);
    }, 500);
});

/* =========================================================
   SALVAR CAMPO NO BACKEND
   ======================================================= */

export function salvarCampo(field, value) {
    fetch(apiUrl('api/protocolos.php?action=update'), {
        method: 'POST',
        body: new URLSearchParams({
            id: getProtocoloAtual(),
            field,
            value
        })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao salvar campo', json);
            return;
        }

        if (typeof window.atualizarCard === 'function') {
            window.atualizarCard(getProtocoloAtual());
        }
    })
    .catch(err => console.error(err));
}

window.salvarCampo = salvarCampo;

/* =========================================================
   BLOQUEIO DE LETRAS EM CAMPOS MONETÁRIOS
   ======================================================= */

document.addEventListener('keydown', function (e) {
    const el = e.target;

    if (!el.classList.contains('money')) return;

    const allowedKeys = [
        'Backspace', 'Tab', 'ArrowLeft', 'ArrowRight',
        'Delete', 'Home', 'End'
    ];

    if (e.ctrlKey || e.metaKey) return;
    if (allowedKeys.includes(e.key)) return;
    if (/^[0-9]$/.test(e.key)) return;

    e.preventDefault();
});

/* =========================================================
   FORMATAÇÃO MONETÁRIA EM TEMPO REAL
   ======================================================= */

document.addEventListener('input', function (e) {
    const el = e.target;

    if (!el.classList.contains('money')) return;

    let valor = el.value.replace(/\D/g, '');

    if (!valor) {
        el.value = '';
        return;
    }

    valor = (parseInt(valor, 10) / 100).toFixed(2);

    el.value = Number(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
});
