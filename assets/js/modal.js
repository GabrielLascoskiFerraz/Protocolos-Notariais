/* =========================================================
   MODAL / PAINEL DO PROTOCOLO
   ======================================================= */

window.protocoloAtual = null;

const modal = document.getElementById('protocolo-modal');
const modalAto = document.getElementById('modal-ato');
const modalFicha = document.getElementById('modal-ficha');
const atoSelect = document.getElementById('ato-select');
const atoOutrosWrapper = document.getElementById('ato-outros-wrapper');
const atoOutrosInput = document.getElementById('ato-outros-input');
const tagSelect = document.getElementById('tag-custom-select');
const tagOutrosWrapper = document.getElementById('tag-custom-outros');
const tagOutrosInput = document.getElementById('tag-custom-input');
const digitadorSelect = document.getElementById('digitador-select');
const digitadorOutrosWrapper = document.getElementById('digitador-outros');
const digitadorInput = document.getElementById('digitador-input');

if (atoSelect && atoOutrosWrapper && atoOutrosInput) {
    atoSelect.addEventListener('change', () => {
        const value = atoSelect.value;

        if (value === 'OUTROS') {
            atoOutrosWrapper.classList.remove('hidden');
            atoOutrosInput.value = '';
            atoOutrosInput.focus();
            return;
        }

        atoOutrosWrapper.classList.add('hidden');
        atoOutrosInput.value = value;

        if (typeof salvarCampo === 'function' && window.protocoloAtual) {
            salvarCampo('ato', value);
        }
    });
}

if (tagSelect && tagOutrosWrapper && tagOutrosInput) {
    tagSelect.addEventListener('change', () => {
        const value = tagSelect.value;

        if (value === 'OUTROS') {
            tagOutrosWrapper.classList.remove('hidden');
            tagOutrosInput.value = '';
            tagOutrosInput.focus();
            return;
        }

        tagOutrosWrapper.classList.add('hidden');
        tagOutrosInput.value = value;

        if (typeof salvarCampo === 'function' && window.protocoloAtual) {
            salvarCampo('tag_custom', value);
        }
    });
}

if (digitadorSelect && digitadorOutrosWrapper && digitadorInput) {
    digitadorSelect.addEventListener('change', () => {
        const value = digitadorSelect.value;

        if (value === 'OUTROS') {
            digitadorOutrosWrapper.classList.remove('hidden');
            digitadorInput.value = '';
            digitadorInput.focus();
            return;
        }

        digitadorOutrosWrapper.classList.add('hidden');
        digitadorInput.value = value;

        if (typeof salvarCampo === 'function' && window.protocoloAtual) {
            salvarCampo('digitador', value);
        }
    });
}

/* =========================================================
   ABRIR MODAL
   ======================================================= */

function abrirModal(id) {
    window.protocoloAtual = id;

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const content = modal.querySelector('.modal-content');
    if (content) {
        content.scrollTop = 0;
    }

    carregarProtocolo(id);
    carregarValores(id);
    carregarAndamentos(id);
}

/* =========================================================
   FECHAR MODAL
   ======================================================= */

function fecharModal() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';

    window.protocoloAtual = null;
}

/* =========================================================
   CARREGAR DADOS DO PROTOCOLO
   ======================================================= */

function carregarProtocolo(id) {
    fetch(apiUrl(`api/protocolos.php?action=get&id=${id}`))
        .then(res => res.json())
        .then(p => {

            modalAto.textContent = p.ato || 'Protocolo';
            modalFicha.textContent = p.ficha ? `Ficha ${p.ficha}` : '';

            document.querySelectorAll('[data-field]').forEach(el => {
                const field = el.dataset.field;

                if (el.type === 'checkbox') {
                    el.checked = p[field] == 1;
                    return;
                }

                if (el.classList.contains('money') && p[field]) {
                    el.value = Number(p[field]).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                    return;
                }

                el.value = p[field] ?? '';
            });

            if (atoSelect && atoOutrosWrapper && atoOutrosInput) {
                const atoValue = p.ato ?? '';
                const hasOption = Array.from(atoSelect.options).some(opt => opt.value === atoValue);

                if (atoValue && hasOption) {
                    atoSelect.value = atoValue;
                    atoOutrosWrapper.classList.add('hidden');
                    atoOutrosInput.value = atoValue;
                } else if (atoValue) {
                    atoSelect.value = 'OUTROS';
                    atoOutrosWrapper.classList.remove('hidden');
                    atoOutrosInput.value = atoValue;
                } else {
                    atoSelect.value = '';
                    atoOutrosWrapper.classList.add('hidden');
                    atoOutrosInput.value = '';
                }
            }

            if (tagSelect && tagOutrosWrapper && tagOutrosInput) {
                const tagValue = p.tag_custom ?? '';
                const hasTagOption = Array.from(tagSelect.options).some(opt => opt.value === tagValue);

                if (tagValue && hasTagOption) {
                    tagSelect.value = tagValue;
                    tagOutrosWrapper.classList.add('hidden');
                    tagOutrosInput.value = tagValue;
                } else if (tagValue) {
                    tagSelect.value = 'OUTROS';
                    tagOutrosWrapper.classList.remove('hidden');
                    tagOutrosInput.value = tagValue;
                } else {
                    tagSelect.value = '';
                    tagOutrosWrapper.classList.add('hidden');
                    tagOutrosInput.value = '';
                }
            }

            if (digitadorSelect && digitadorOutrosWrapper && digitadorInput) {
                const digValue = p.digitador ?? '';
                const hasDigOption = Array.from(digitadorSelect.options).some(opt => opt.value === digValue);

                if (digValue && hasDigOption) {
                    digitadorSelect.value = digValue;
                    digitadorOutrosWrapper.classList.add('hidden');
                    digitadorInput.value = digValue;
                } else if (digValue) {
                    digitadorSelect.value = 'OUTROS';
                    digitadorOutrosWrapper.classList.remove('hidden');
                    digitadorInput.value = digValue;
                } else {
                    digitadorSelect.value = '';
                    digitadorOutrosWrapper.classList.add('hidden');
                    digitadorInput.value = '';
                }
            }

        })
        .catch(err => console.error(err));
}

/* =========================================================
   CARREGAR VALORES ADICIONAIS
   ======================================================= */

function carregarValores(id) {
    fetch(apiUrl(`api/valores.php?action=list&protocolo_id=${id}`))
        .then(res => res.json())
        .then(valores => {

            const lista = document.getElementById('lista-valores');
            lista.innerHTML = '';

            let total = 0;

            valores.forEach(v => {
                total += parseFloat(v.valor);

                const div = document.createElement('div');
                div.className = 'valor-item';
                div.dataset.id = v.id;

               div.innerHTML = `
                    <input
                        type="text"
                        class="valor-descricao"
                        value="${v.descricao ?? ''}"
                        onblur="atualizarValor(${v.id})"
                    >
                    <input
                        type="text"
                        class="valor-valor money"
                        value="${formatarValor(v.valor)}"
                        placeholder="0,00"
                        inputmode="decimal"
                        onblur="atualizarValor(${v.id})"
                    >
                    <button class="btn-delete-valor" onclick="removerValor(${v.id})">🗑</button>
                `;

                lista.appendChild(div);
            });

            atualizarTotalValores(total);
        })
        .catch(err => console.error(err));
    // Atualiza o card no board
    if (typeof atualizarCard === 'function') {
        atualizarCard(window.protocoloAtual);
    }
}

/* =========================================================
   ANDAMENTOS
   ======================================================= */

function adicionarAndamento() {
    if (!window.protocoloAtual) return;

    const textarea = document.getElementById('novo-andamento-texto');
    if (!textarea) return;
    const texto = textarea.value.trim();

    if (!texto) return;

    fetch(apiUrl('api/andamentos.php?action=create'), {
        method: 'POST',
        body: new URLSearchParams({
            protocolo_id: window.protocoloAtual,
            descricao: texto
        })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao adicionar andamento', json);
            return;
        }

        textarea.value = '';
        carregarAndamentos(window.protocoloAtual);
    })
    .catch(err => console.error(err));
}

/* =========================================================
   CARREGAR ANDAMENTOS
   ======================================================= */

function carregarAndamentos(id) {
    fetch(apiUrl(`api/andamentos.php?action=list&protocolo_id=${id}`))
        .then(res => res.json())
        .then(andamentos => {

            const lista = document.getElementById('lista-andamentos');
            if (!lista) return;
            lista.innerHTML = '';

            if (!Array.isArray(andamentos)) {
                console.error('Resposta inválida de andamentos:', andamentos);
                return;
            }

            if (!andamentos.length) {
                lista.innerHTML = '<div class="timeline-empty">Nenhum andamento registrado.</div>';
                return;
            }

            andamentos.forEach(a => {
                const item = document.createElement('div');
                item.className = 'timeline-item';
                item.dataset.id = a.id;

                item.innerHTML = `
                    <div class="timeline-marker"></div>
                    <div class="timeline-content">
                        <div class="timeline-header">
                            <span class="timeline-date">${formatarDataHora(a.created_at)}</span>
                            <div class="timeline-actions">
                                <button onclick="editarAndamento(${a.id})">✎</button>
                                <button onclick="removerAndamento(${a.id})">🗑</button>
                            </div>
                        </div>
                        <div class="timeline-text" data-id="${a.id}">
                            ${a.descricao.replace(/\n/g, '<br>')}
                        </div>
                    </div>
                `;

                lista.appendChild(item);
            });
        })
        .catch(err => console.error(err));
}

/* =========================================================
   EDITAR / REMOVER ANDAMENTO
   ======================================================= */

function editarAndamento(id) {
    if (!window.protocoloAtual) return;
    const textoEl = document.querySelector(`.timeline-text[data-id="${id}"]`);
    if (!textoEl) return;

    const atual = textoEl.textContent.trim();
    const novo = prompt('Editar andamento:', atual);
    if (novo === null) return;

    const descricao = novo.trim();
    if (!descricao) return;

    fetch(apiUrl('api/andamentos.php?action=update'), {
        method: 'POST',
        body: new URLSearchParams({ id, descricao })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao atualizar andamento', json);
            return;
        }
        carregarAndamentos(window.protocoloAtual);
    })
    .catch(err => console.error(err));
}

function removerAndamento(id) {
    if (!window.protocoloAtual) return;
    if (!confirm('Remover este andamento?')) return;

    fetch(apiUrl('api/andamentos.php?action=delete'), {
        method: 'POST',
        body: new URLSearchParams({ id })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao remover andamento', json);
            return;
        }
        carregarAndamentos(window.protocoloAtual);
    })
    .catch(err => console.error(err));
}

/* =========================================================
   HELPERS
   ======================================================= */

function atualizarTotalValores(total) {
    document.getElementById('total-valores').textContent =
        formatarValor(total);
}

function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function formatarDataHora(data) {
    if (!data) return '';
    const d = new Date(data.replace(' ', 'T'));
    return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/* =========================================================
   GERAR PDF (FICHA)
   ======================================================= */

function gerarPdfFicha() {
    if (!window.protocoloAtual) return;

    const id = window.protocoloAtual;

    Promise.all([
        fetch(apiUrl(`api/protocolos.php?action=get&id=${id}`)).then(r => r.json()),
        fetch(apiUrl(`api/valores.php?action=list&protocolo_id=${id}`)).then(r => r.json()),
        fetch(apiUrl(`api/andamentos.php?action=list&protocolo_id=${id}`)).then(r => r.json())
    ])
    .then(([p, valores, andamentos]) => {
        if (!p || p.error) return;

        const totalAdicional = (valores || []).reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);

        const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Ficha ${p.ficha || p.id}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: Arial, sans-serif; color: #0f172a; }
    .header { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px; }
    .title { font-size: 18px; font-weight: 700; }
    .meta { font-size: 12px; color: #64748b; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; background: #0ea5e9; color: #fff; margin-left: 6px; }
    .badge-urgent { background: #dc2626; }
    .section { margin-bottom: 14px; }
    .section + .section { margin-top: 6px; }
    .section h3 { font-size: 12px; letter-spacing: .3px; color: #64748b; text-transform: uppercase; margin: 0 0 8px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; font-size: 12px; }
    .row { display: flex; gap: 6px; }
    .label { color: #64748b; min-width: 110px; }
    .box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px; font-size: 12px; }
    .box + .box { margin-top: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 4px; text-align: left; }
    th { color: #64748b; font-weight: 600; }
    .right { text-align: right; }
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="${apiUrl('assets/img/logo.png')}" alt="Logo" style="width:36px; height:auto;">
    <div class="title">Ficha ${(!p.ficha || p.ficha == 0) ? '__________' : p.ficha} — ${p.ato || ''}</div>
    </div>
    <div class="meta">${new Date().toLocaleDateString('pt-BR')}</div>
  </div>

  <div class="section">
    <h3>Identificação</h3>
    <div class="grid">
      <div class="row"><div class="label">Digitador:</div><div>${p.digitador || ''}</div></div>
      <div class="row"><div class="label">Apresentante:</div><div>${p.apresentante || ''}</div></div>
      <div class="row"><div class="label">Data:</div><div>${p.data_apresentacao ? new Date(p.data_apresentacao).toLocaleDateString('pt-BR') : ''}</div></div>
      <div class="row"><div class="label">Contato:</div><div>${p.contato || ''}</div></div>
      <div class="row"><div class="label">Urgente:</div><div>${p.urgente == 1 ? 'Sim' : 'Não'}</div></div>
      <div class="row"><div class="label">Tag:</div><div>${p.tag_custom || ''}</div></div>
    </div>
  </div>

  <div class="section">
    <h3>Partes</h3>
    <div class="box"><strong>Outorgantes:</strong> ${p.outorgantes || ''}</div>
    <div style="height:6px"></div>
    <div class="box"><strong>Outorgados:</strong> ${p.outorgados || ''}</div>
  </div>

  <div class="section">
    <h3>Imóvel</h3>
    <div class="grid">
      <div class="row"><div class="label">Matrícula:</div><div>${p.matricula || ''}</div></div>
      <div class="row"><div class="label">Área:</div><div>${p.area || ''}</div></div>
    </div>
  </div>

  <div class="section">
    <h3>Valores</h3>
    <div class="row"><div class="label">Valor do ato:</div><div>R$ ${Number(p.valor_ato || 0).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2})}</div></div>
    <table>
      <thead>
        <tr><th>Descrição</th><th class="right">Valor</th></tr>
      </thead>
      <tbody>
        ${(valores || []).map(v => `<tr><td>${v.descricao || ''}</td><td class="right">R$ ${Number(v.valor || 0).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}</td></tr>`).join('') || '<tr><td colspan="2">Sem valores adicionais</td></tr>'}
        <tr><td><strong>Total adicional</strong></td><td class="right"><strong>R$ ${Number(totalAdicional).toLocaleString('pt-BR',{minimumFractionDigits:2, maximumFractionDigits:2})}</strong></td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>Andamentos</h3>
    <table>
      <thead>
        <tr><th>Data</th><th>Descrição</th></tr>
      </thead>
      <tbody>
        ${(andamentos || []).map(a => `<tr><td>${formatarDataHora(a.created_at)}</td><td>${(a.descricao || '').replace(/\\n/g, '<br>')}</td></tr>`).join('') || '<tr><td colspan="2">Sem andamentos</td></tr>'}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h3>Observações</h3>
    <div class="box">${p.observacoes || ''}</div>
  </div>
</body>
<script>
  (function() {
    const imgs = Array.from(document.images || []);
    const wait = imgs.map(img => new Promise(resolve => {
      if (img.complete) return resolve();
      img.onload = () => resolve();
      img.onerror = () => resolve();
    }));
    Promise.all(wait).then(() => {
      setTimeout(() => {
        window.print();
      }, 100);
    });
  })();
</script>
</html>`;

        const w = window.open('', '_blank');
        if (!w) return;
        w.document.open();
        w.document.write(html);
        w.document.close();
        w.focus();
    })
    .catch(err => console.error(err));
}

/* =========================================================
   VALORES ADICIONAIS
   ======================================================= */

function adicionarValor() {
    if (!window.protocoloAtual) return;

    fetch(apiUrl('api/valores.php?action=create'), {
        method: 'POST',
        body: new URLSearchParams({
            protocolo_id: window.protocoloAtual,
            descricao: '',
            valor: '0'
        })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao adicionar valor', json);
            return;
        }

        carregarValores(window.protocoloAtual);
    })
    .catch(err => console.error(err));
}

function atualizarValor(id) {
    const item = document.querySelector(`.valor-item[data-id="${id}"]`);
    if (!item) return;

    const descricao = item.querySelector('.valor-descricao').value;
    let valor = item.querySelector('.valor-valor').value;
    const digits = String(valor).replace(/\D/g, '');
    valor = digits ? (parseInt(digits, 10) / 100).toFixed(2) : '';

    fetch(apiUrl('api/valores.php?action=update'), {
        method: 'POST',
        body: new URLSearchParams({
            id,
            descricao,
            valor
        })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao atualizar valor', json);
            return;
        }

        atualizarTotalValores(json.total);

        // Atualiza card no board
        if (typeof atualizarCard === 'function') {
            atualizarCard(window.protocoloAtual);
        }
    })
    .catch(err => console.error(err));
}

function removerValor(id) {
    if (!confirm('Remover este valor?')) return;

    fetch(apiUrl('api/valores.php?action=delete'), {
        method: 'POST',
        body: new URLSearchParams({ id })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao remover valor', json);
            return;
        }

        carregarValores(window.protocoloAtual);

        // Atualiza card no board
        if (typeof atualizarCard === 'function') {
            atualizarCard(window.protocoloAtual);
        }
    })
    .catch(err => console.error(err));
}
