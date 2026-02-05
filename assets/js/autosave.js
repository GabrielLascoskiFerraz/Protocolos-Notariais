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
    if (!window.protocoloAtual) return;

    const field = el.dataset.field;
    let value;

    if (el.type === 'checkbox') {
        value = el.checked ? 1 : 0;
    } else {
        value = el.value;
    }

    // Normaliza campo monetário antes de salvar
    if (el.classList.contains('money')) {
        const digits = String(value).replace(/\D/g, '');
        value = digits ? (parseInt(digits, 10) / 100).toFixed(2) : '';
    }

    clearTimeout(autosaveTimeout);

    autosaveTimeout = setTimeout(() => {
        salvarCampo(field, value);
    }, 500);
});

/* =========================================================
   SALVAR CAMPO NO BACKEND
   ======================================================= */

function salvarCampo(field, value) {
    fetch(apiUrl('api/protocolos.php?action=update'), {
        method: 'POST',
        body: new URLSearchParams({
            id: window.protocoloAtual,
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

        // Atualiza o card no board
        if (typeof atualizarCard === 'function') {
            atualizarCard(window.protocoloAtual);
        }
    })
    .catch(err => console.error(err));
}

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

    // Permite atalhos (Ctrl+C, Ctrl+V, Ctrl+A etc)
    if (e.ctrlKey || e.metaKey) return;

    // Permite teclas de controle
    if (allowedKeys.includes(e.key)) return;

    // Permite apenas números
    if (/^[0-9]$/.test(e.key)) return;

    // Bloqueia qualquer outra coisa
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
