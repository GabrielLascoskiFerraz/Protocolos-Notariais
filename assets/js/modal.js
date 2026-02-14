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
<meta charset="UTF-8" />
<title>Ficha ${p.ficha || p.id}</title>

<style>
@page { size: A4; margin: 14mm; }

html, body { margin: 0; padding: 0; }

:root{
  --ink: #0f172a;
  --muted: #475569;
  --line: rgba(15,23,42,.25);
  --soft: rgba(15,23,42,.08);
  --brand: #0f172a;
  --accent: #0284c7;
}

body{
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif;
  color: var(--ink);
  font-size: 11.6px;
  line-height: 1.25;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

.sheet{
  width: 100%;
}

/* =========================
   HEADER INSTITUCIONAL
========================= */

.header{
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 16px;
  align-items: center;
  border-bottom: 2px solid var(--brand);
  padding-bottom: 10px;
  margin-bottom: 14px;
}

.logo{
  width: 74px;
  border-radius: 12px;
}

.inst{
  line-height: 1.15;
}

.inst .top{
  font-weight: 800;
  font-size: 12.5px;
  letter-spacing: .4px;
}

.inst .mid{
  font-size: 11.8px;
  color: var(--muted);
}

.inst .tit{
  font-weight: 800;
  font-size: 13.5px;
  margin-top: 2px;
}

.inst .nome{
  font-weight: 700;
  font-size: 12.5px;
  margin-top: 2px;
}

.ficha-box{
  text-align: right;
}

.ficha-box .label{
  font-size: 10px;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: .8px;
}

.ficha-box .numero{
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 1px;
}

/* =========================
   BLOCO SUPERIOR RESUMO
========================= */

.top-grid{
  display: grid;
  grid-template-columns: 1.2fr .8fr;
  gap: 14px;
  margin-bottom: 12px;
}

.card{
  border: 1px solid var(--soft);
  padding: 10px 12px;
  border-radius: 12px;
}

.card h4{
  margin: 0 0 6px 0;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .6px;
  color: var(--muted);
}

.info-line{
  margin-bottom: 4px;
}

.info-line strong{
  font-weight: 700;
}

/* =========================
   ATO DESTACADO
========================= */

.ato-box{
  border: 1px solid var(--accent);
  background: rgba(2,132,199,.08);
  padding: 12px;
  border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 12px;
}

.ato-box::before{
  content:"";
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 4px;
}

/* =========================
   PARTES
========================= */

.section{
  margin-top: 10px;
}

.section h3{
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: .6px;
  margin-bottom: 4px;
  color: var(--muted);
}

.box{
  border: 1px solid var(--line);
  padding: 8px 10px;
  border-radius: 10px;
  min-height: 40px;
}

/* =========================
   IMÓVEIS
========================= */

.imovel-list div{
  margin-bottom: 3px;
}

/* =========================
   VALORES
========================= */

.valores{
  margin-top: 10px;
  border-top: 1px solid var(--line);
  padding-top: 10px;
}

.valor-ato{
  font-size: 13.5px;
  font-weight: 900;
  margin-bottom: 8px;
}

/* “card” da tabela */
.valores-box{
  border: 1px solid var(--soft);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(15,23,42,.02);
}

/* cabeçalho da tabela mais legível */
.tabela{
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11.5px;
}

.tabela thead th{
  background: rgba(2,132,199,.08);
  color: #0f172a;
  font-weight: 800;
  padding: 8px 10px;
  border-bottom: 1px solid rgba(2,132,199,.25);
}

.tabela thead th:first-child{
  border-top-left-radius: 12px;
}

.tabela thead th:last-child{
  border-top-right-radius: 12px;
}

.tabela tbody td{
  padding: 7px 10px;
  vertical-align: top;
  border-bottom: 1px solid rgba(15,23,42,.08);
}

.tabela tbody tr:nth-child(even) td{
  background: rgba(255,255,255,.7);
}

/* coluna de valor bem “colada” à direita, com número mais forte */
.tabela td.right,
.tabela th.right{
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.tabela td.right{
  font-weight: 700;
}

/* total separado, com destaque visual */
.total-card{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 9px 10px;
  background: rgba(2,132,199,.10);
  border-top: 1px solid rgba(2,132,199,.25);
  font-weight: 900;
}

.total-card .muted{
  font-size: 10px;
  color: var(--muted);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: .6px;
}

.total-card .amount{
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
}

/* =========================
   OBSERVAÇÕES
========================= */

.obs{
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}

</style>
</head>

<body>
<div class="sheet">

<div class="header">
  <img class="logo" src="${apiUrl('assets/img/logo.png')}" />
  <div class="inst">
    <div class="top">REPÚBLICA FEDERATIVA DO BRASIL</div>
    <div class="mid">Estado do Paraná – Comarca de Irati</div>
    <div class="tit">2º Tabelionato de Notas de Irati</div>
    <div class="nome">CRISTINA TONET COLODEL</div>
  </div>
  <div class="ficha-box">
    <div class="label">Ficha</div>
    <div class="numero">${p.ficha || ''}</div>
  </div>
</div>

<div class="top-grid">
  <div class="card">
    <h4>Apresentação</h4>
    <div class="info-line"><strong>Data:</strong> ${
      p.data_apresentacao
        ? new Date(String(p.data_apresentacao) + 'T00:00:00').toLocaleDateString('pt-BR')
        : ''
    }</div>
    <div class="info-line"><strong>Apresentante:</strong> ${p.apresentante || ''}</div>
    <div class="info-line"><strong>Contato:</strong> ${p.contato || ''}</div>
    <div class="info-line"><strong>Digitador:</strong> ${p.digitador || ''}</div>
  </div>

  <div class="card">
    <h4>Ato</h4>
    <div class="ato-box">${p.ato || ''}</div>
  </div>
</div>

<div class="section">
  <h3>Outorgante(s)</h3>
  <div class="box">${p.outorgantes || ''}</div>
</div>

<div class="section">
  <h3>Outorgado(s)</h3>
  <div class="box">${p.outorgados || ''}</div>
</div>

<div class="section">
  <h3>Área / Matrícula</h3>
  <div class="box imovel-list">
    ${
      (Array.isArray(imoveis) && imoveis.length)
        ? imoveis.map(i => `
          <div>${(i.matricula || '')}${(i.area ? ' — ' + i.area : '')}</div>
        `).join('')
        : ''
    }
  </div>
</div>

<div class="valores">
  <div class="valor-ato">
    Valor do ato: ${
      (p.valor_ato && Number(p.valor_ato) > 0)
        ? `R$ ${Number(p.valor_ato).toLocaleString('pt-BR',{minimumFractionDigits:2})}`
        : ''
    }
  </div>

  ${
  (Array.isArray(valores) && valores.length)
    ? `
    <div class="valores-box">
      <table class="tabela">
        <thead>
          <tr>
            <th>Valores adicionais</th>
            <th class="right">Valor</th>
          </tr>
        </thead>
        <tbody>
          ${valores.map(v => `
            <tr>
              <td>${v.descricao || ''}</td>
              <td class="right">R$ ${Number(v.valor || 0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <div class="total-card">
        <div>
          <div class="muted">Total adicional</div>
        </div>
        <div class="amount">R$ ${Number(totalAdicional || 0).toLocaleString('pt-BR',{minimumFractionDigits:2})}</div>
      </div>
    </div>
    `
    : ''
}
</div>

<div class="obs">
  <h3>Observações</h3>
  <div class="box">${p.observacoes || ''}</div>
</div>

</div>

<script>
window.onload = () => setTimeout(() => window.print(), 200);
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
