import { apiUrl } from './base.js';
import { getProtocoloAtual, setProtocoloAtual } from './state.js';
import { salvarCampo } from './autosave.js';

/* =========================================================
   MODAL / PAINEL DO PROTOCOLO
   ======================================================= */

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
const btnFecharModal = document.getElementById('modal-close');

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

        if (getProtocoloAtual()) {
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

        if (getProtocoloAtual()) {
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

        if (getProtocoloAtual()) {
            salvarCampo('digitador', value);
        }
    });
}

if (btnFecharModal) {
    btnFecharModal.addEventListener('click', fecharModal);
}

document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal || modal.classList.contains('hidden')) return;
    fecharModal();
});

/* =========================================================
   ABRIR MODAL
   ======================================================= */

export function abrirModal(id) {
    setProtocoloAtual(id);

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const content = modal.querySelector('.modal-content');
    if (content) {
        content.scrollTop = 0;
    }

    carregarProtocolo(id);
    carregarImoveis(id);
    carregarValores(id);
    carregarAndamentos(id);
}

/* =========================================================
   FECHAR MODAL
   ======================================================= */

export function fecharModal() {
    modal.classList.add('closing');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('closing');
        document.body.style.overflow = '';
        setProtocoloAtual(null);
    }, 200);
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
    if (typeof window.atualizarCard === 'function') {
        window.atualizarCard(getProtocoloAtual());
    }
}

/* =========================================================
   IMÓVEIS
   ======================================================= */

function carregarImoveis(id) {
    fetch(apiUrl(`api/imoveis.php?action=list&protocolo_id=${id}`))
        .then(res => res.json())
        .then(imoveis => {
            const lista = document.getElementById('lista-imoveis');
            if (!lista) return;
            lista.innerHTML = '';

            if (!Array.isArray(imoveis)) {
                console.error('Resposta inválida de imóveis:', imoveis);
                return;
            }

            if (!imoveis.length) {
                lista.innerHTML = '<div class="timeline-empty">Nenhum imóvel registrado.</div>';
                return;
            }

            imoveis.forEach(i => {
                const div = document.createElement('div');
                div.className = 'valor-item';
                div.dataset.id = i.id;

                div.innerHTML = `
                    <input
                        type="text"
                        class="imovel-matricula"
                        placeholder="Matrícula"
                        value="${i.matricula ?? ''}"
                        onblur="atualizarImovel(${i.id})"
                    >
                    <input
                        type="text"
                        class="imovel-area"
                        placeholder="Área"
                        value="${i.area ?? ''}"
                        onblur="atualizarImovel(${i.id})"
                    >
                    <button class="btn-delete-valor" onclick="removerImovel(${i.id})">🗑</button>
                `;

                lista.appendChild(div);
            });
        })
        .catch(err => console.error(err));
}

export function adicionarImovel() {
    if (!getProtocoloAtual()) return;

    fetch(apiUrl('api/imoveis.php?action=create'), {
        method: 'POST',
        body: new URLSearchParams({
            protocolo_id: getProtocoloAtual(),
            matricula: '',
            area: ''
        })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao adicionar imóvel', json);
            return;
        }
        carregarImoveis(getProtocoloAtual());
        if (typeof window.atualizarCard === 'function') {
            window.atualizarCard(getProtocoloAtual());
        }
    })
    .catch(err => console.error(err));
}

export function atualizarImovel(id) {
    const item = document.querySelector(`.valor-item[data-id="${id}"]`);
    if (!item) return;

    const matricula = item.querySelector('.imovel-matricula')?.value ?? '';
    const area = item.querySelector('.imovel-area')?.value ?? '';

    fetch(apiUrl('api/imoveis.php?action=update'), {
        method: 'POST',
        body: new URLSearchParams({ id, matricula, area })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao atualizar imóvel', json);
            return;
        }
        if (typeof window.atualizarCard === 'function') {
            window.atualizarCard(getProtocoloAtual());
        }
    })
    .catch(err => console.error(err));
}

export function removerImovel(id) {
    if (!confirm('Remover este imóvel?')) return;

    fetch(apiUrl('api/imoveis.php?action=delete'), {
        method: 'POST',
        body: new URLSearchParams({ id })
    })
    .then(res => res.json())
    .then(json => {
        if (!json.success) {
            console.error('Erro ao remover imóvel', json);
            return;
        }
        carregarImoveis(getProtocoloAtual());
        if (typeof window.atualizarCard === 'function') {
            window.atualizarCard(getProtocoloAtual());
        }
    })
    .catch(err => console.error(err));
}

/* =========================================================
   ANDAMENTOS
   ======================================================= */

export function adicionarAndamento() {
    if (!getProtocoloAtual()) return;

    const textarea = document.getElementById('novo-andamento-texto');
    if (!textarea) return;
    const texto = textarea.value.trim();

    if (!texto) return;

    fetch(apiUrl('api/andamentos.php?action=create'), {
        method: 'POST',
        body: new URLSearchParams({
            protocolo_id: getProtocoloAtual(),
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
        carregarAndamentos(getProtocoloAtual());
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

export function editarAndamento(id) {
    if (!getProtocoloAtual()) return;
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
        carregarAndamentos(getProtocoloAtual());
    })
    .catch(err => console.error(err));
}

export function removerAndamento(id) {
    if (!getProtocoloAtual()) return;
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
        carregarAndamentos(getProtocoloAtual());
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

export function formatarValor(valor) {
    return Number(valor).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

export function formatarDataHora(data) {
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

export function gerarPdfFicha() {
    if (!getProtocoloAtual()) return;

    const id = getProtocoloAtual();

    Promise.all([
        fetch(apiUrl(`api/protocolos.php?action=get&id=${id}`)).then(r => r.json()),
        fetch(apiUrl(`api/valores.php?action=list&protocolo_id=${id}`)).then(r => r.json()),
        fetch(apiUrl(`api/andamentos.php?action=list&protocolo_id=${id}`)).then(r => r.json()),
        fetch(apiUrl(`api/imoveis.php?action=list&protocolo_id=${id}`)).then(r => r.json())
    ])
    .then(([p, valores, andamentos, imoveis]) => {
        if (!p || p.error) return;

        const totalAdicional = (valores || []).reduce((acc, v) => acc + parseFloat(v.valor || 0), 0);
        const hasValoresAdicionais = Array.isArray(valores) && valores.length > 0;
        const hasImoveis = Array.isArray(imoveis) && imoveis.length > 0;

        const html = `
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
            <meta charset="UTF-8">
            <title>Ficha ${p.ficha || p.id}</title>

            <style>
            @page { 
            size: A4; 
            margin: 18mm; 
            }

            body {
            font-family: "Times New Roman", serif;
            font-size: 12.5px;
            color: #000;
            }

            /* evita quebra feia */
            * {
            page-break-inside: avoid;
            }

            .header {
            display: grid;
            grid-template-columns: 78px 1fr;
            gap: 12px;
            align-items: start;
            margin-bottom: 12px;
            }

            .logo {
            width: 72px;
            border-radius: 10px;
            }

            .inst {
            text-align: center;
            line-height: 1.15;
            }

            .inst .top { font-weight: 700; font-size: 13px; }
            .inst .mid { font-size: 12.5px; }
            .inst .tit { font-weight: 700; font-size: 14px; margin-top: 2px; }
            .inst .nome { font-weight: 700; font-size: 13px; margin-top: 2px; }
            .inst .sub { font-size: 12.5px; }

            .grid-campos {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px 16px;
            margin-bottom: 10px;
            }

            .campo {
            display: grid;
            grid-template-columns: 115px 1fr;
            gap: 8px;
            align-items: end;
            }

            .label {
            font-weight: 700;
            white-space: nowrap;
            }

            .linha {
            border-bottom: 1px solid #000;
            min-height: 18px;
            padding: 1px 3px 2px;
            }

            .span-2 { grid-column: 1 / -1; }

            .section { margin-top: 10px; }

            .section .title {
            font-weight: 700;
            margin-bottom: 4px;
            letter-spacing: .2px;
            }

            .checkbox-ato {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            background: #e0f2fe;
            border: 1px solid #0284c7;
            border-radius: 5px;
            font-weight: 700;
            font-size: 13.5px;
            }

            .checkbox-box {
            width: 14px;
            height: 14px;
            background: #0284c7;
            border: 1px solid #0284c7;
            }

            .big-box {
            border: 1px solid #000;
            padding: 6px;
            min-height: 42px;
            }

            .tabela {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            }

            .tabela th, .tabela td {
            border-bottom: 1px solid #000;
            padding: 4px 3px;
            }

            .tabela th {
            font-weight: 700;
            text-align: left;
            }

            .right { text-align: right; }

            .valor-ato {
            font-size: 14px;
            font-weight: 700;
            }

            .total {
            font-weight: 700;
            }
            </style>
            </head>

            <body>

            <div class="header">
            <img class="logo" src="${apiUrl('assets/img/logo.png')}" alt="Logo">
            <div class="inst">
                <div class="top">REPÚBLICA FEDERATIVA DO BRASIL</div>
                <div class="mid">Estado do Paraná - Comarca de Irati</div>
                <div class="tit">2º Tabelionato de Notas de Irati</div>
                <div class="nome">CRISTINA TONET COLODEL</div>
                <div class="sub">Tabeliã de Notas</div>
            </div>
            </div>

            <div class="grid-campos">
            <div class="campo">
                <div class="label">Capa/Ficha:</div>
                <div class="linha">${p.ficha || ''}</div>
            </div>

            <div class="campo">
                <div class="label">Data:</div>
                <div class="linha">${
                p.data_apresentacao
                    ? new Date(String(p.data_apresentacao) + 'T00:00:00').toLocaleDateString('pt-BR')
                    : ''
                }</div>
            </div>

            <div class="campo span-2">
                <div class="label">Apresentante:</div>
                <div class="linha">${p.apresentante || ''}</div>
            </div>

            <div class="campo">
                <div class="label">Contato:</div>
                <div class="linha">${p.contato || ''}</div>
            </div>

            <div class="campo">
                <div class="label">Digitador:</div>
                <div class="linha">${p.digitador || ''}</div>
            </div>
            </div>

            <div class="section">
            <div class="title">ATO</div>
            <div class="checkbox-ato">
                <div class="checkbox-box"></div>
                ${p.ato || ''}
            </div>
            </div>

            <div class="section">
            <div class="title">OUTORGANTE(S)</div>
            <div class="big-box">${p.outorgantes || ''}</div>
            </div>

            <div class="section">
            <div class="title">OUTORGADO(S)</div>
            <div class="big-box">${p.outorgados || ''}</div>
            </div>

            <div class="section">
            <div class="title">ÁREA / MATRÍCULA</div>
            <div class="big-box">
                ${
                (Array.isArray(imoveis) && imoveis.length)
                    ? imoveis.map(i => `
                        <div>${(i.matricula || '')}${(i.area ? ' — ' + i.area : '')}</div>
                    `).join('')
                    : ''
                }
            </div>
            </div>

            <div class="section">
            <div class="title">VALORES</div>

            <div class="campo" style="margin-bottom:8px;">
                <div class="label">Valor do ato:</div>
                <div class="linha valor-ato">
                ${
                    (p.valor_ato && Number(p.valor_ato) > 0)
                    ? `R$ ${Number(p.valor_ato).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : ''
                }
                </div>
            </div>

            ${
                (Array.isArray(valores) && valores.length)
                ? `
                    <table class="tabela">
                    <thead>
                        <tr>
                        <th>Valores adicionais</th>
                        <th class="right" style="width:120px;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${valores.map(v => `
                        <tr>
                            <td>${v.descricao || ''}</td>
                            <td class="right">R$ ${Number(v.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                        `).join('')}
                        <tr>
                        <td class="total">Total adicional</td>
                        <td class="right total">R$ ${Number(totalAdicional || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        </tr>
                    </tbody>
                    </table>
                `
                : ''
            }
            </div>

            <div class="section">
            <div class="title">OBSERVAÇÕES</div>
            <div class="big-box">${p.observacoes || ''}</div>
            </div>

            <script>
            window.onload = function() {
            setTimeout(() => window.print(), 250);
            };
            </script>

            </body>
            </html>
`;

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

export function adicionarValor() {
    if (!getProtocoloAtual()) return;

    fetch(apiUrl('api/valores.php?action=create'), {
        method: 'POST',
        body: new URLSearchParams({
            protocolo_id: getProtocoloAtual(),
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

        carregarValores(getProtocoloAtual());
    })
    .catch(err => console.error(err));
}

export function atualizarValor(id) {
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

        if (typeof window.atualizarCard === 'function') {
            window.atualizarCard(getProtocoloAtual());
        }
    })
    .catch(err => console.error(err));
}

export function removerValor(id) {
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

        carregarValores(getProtocoloAtual());

        if (typeof window.atualizarCard === 'function') {
            window.atualizarCard(getProtocoloAtual());
        }
    })
    .catch(err => console.error(err));
}

// Expor no window para onclick handlers inline do PHP
window.abrirModal = abrirModal;
window.fecharModal = fecharModal;
window.gerarPdfFicha = gerarPdfFicha;
window.adicionarAndamento = adicionarAndamento;
window.editarAndamento = editarAndamento;
window.removerAndamento = removerAndamento;
window.adicionarImovel = adicionarImovel;
window.atualizarImovel = atualizarImovel;
window.removerImovel = removerImovel;
window.adicionarValor = adicionarValor;
window.atualizarValor = atualizarValor;
window.removerValor = removerValor;
