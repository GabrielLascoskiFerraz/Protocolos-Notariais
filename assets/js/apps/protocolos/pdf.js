function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };

        return entities[char] || char;
    });
}

function formatCurrency(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "";
    return `R$ ${number.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;
}

function hasFicha(value) {
    const ficha = String(value ?? "").trim();
    return ficha !== "" && /[1-9]/.test(ficha);
}

function fichaLabel(value) {
    return hasFicha(value) ? String(value).trim() : "Não Possui Ficha";
}

function printableFichaHtml(value) {
    return hasFicha(value) ? escapeHtml(String(value).trim()) : "&nbsp;";
}

export async function printProtocolSheet({ current, apiGet, protocolTitle, logoPath }) {
    if (!current?.id) return;

    const [protocol, values, notes, properties] = await Promise.all([
        apiGet("protocolos", { action: "get", id: current.id }),
        apiGet("valores", { action: "list", protocolo_id: current.id }),
        apiGet("andamentos", { action: "list", protocolo_id: current.id }),
        apiGet("imoveis", { action: "list", protocolo_id: current.id })
    ]);

    if (!protocol || protocol.error) return;

    const totalAdditional = (Array.isArray(values) ? values : []).reduce((sum, item) => sum + parseFloat(item.valor || 0), 0);
    const printableValues = Array.isArray(values)
        ? values.map((item) => ({
            descricao: item?.descricao ?? "",
            valor: item?.valor ?? ""
        }))
        : [];

    while (printableValues.length < 3) {
        printableValues.push({ descricao: "", valor: "" });
    }

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(protocolTitle ? protocolTitle(protocol) : fichaLabel(protocol.ficha))}</title>
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
.sheet{ width: 100%; }
.header{
  display: grid;
  grid-template-columns: 80px 1fr auto;
  gap: 16px;
  align-items: center;
  border-bottom: 2px solid var(--brand);
  padding-bottom: 10px;
  margin-bottom: 14px;
}
.logo{ width: 74px; border-radius: 12px; }
.inst{ line-height: 1.15; }
.inst .top{ font-weight: 800; font-size: 12.5px; letter-spacing: .4px; }
.inst .mid{ font-size: 11.8px; color: var(--muted); }
.inst .tit{ font-weight: 800; font-size: 13.5px; margin-top: 2px; }
.inst .nome{ font-weight: 700; font-size: 12.5px; margin-top: 2px; }
.ficha-box{ text-align: right; }
.header-side{ display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.tag-urgente{
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  background: #dc2626;
  color: #fff;
  font-size: 10px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: .7px;
}
.tag-urgente::before{
  content:"";
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(255,255,255,.95);
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
.info-line{ margin-bottom: 4px; }
.info-line strong{ font-weight: 700; }
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
.section{ margin-top: 10px; }
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
.text-preserve{ white-space: pre-wrap; }
.imovel-list div{ margin-bottom: 3px; }
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
.valores-box{
  border: 1px solid var(--soft);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(15,23,42,.02);
}
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
.tabela thead th:first-child{ border-top-left-radius: 12px; }
.tabela thead th:last-child{ border-top-right-radius: 12px; }
.tabela tbody tr{ height: 42px; }
.tabela tbody td{
  padding: 10px 10px;
  vertical-align: middle;
  border-bottom: 1px solid rgba(15,23,42,.08);
}
.tabela tbody tr:nth-child(even) td{ background: rgba(255,255,255,.7); }
.tabela td.right,
.tabela th.right{
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.tabela td.right{ font-weight: 700; }
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
.obs{
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--line);
}
.obs-box{
  min-height: 96px;
  line-height: 1.45;
}
</style>
</head>
<body>
<div class="sheet">
<div class="header">
  <img class="logo" src="${logoPath}" />
  <div class="inst">
    <div class="top">REPÚBLICA FEDERATIVA DO BRASIL</div>
    <div class="mid">Estado do Paraná – Comarca de Irati</div>
    <div class="tit">2º Tabelionato de Notas de Irati</div>
    <div class="nome">CRISTINA TONET COLODEL</div>
  </div>
  <div class="header-side">
    ${protocol.urgente == 1 ? '<div class="tag-urgente">Urgente</div>' : ''}
    <div class="ficha-box">
      <div class="label">Ficha</div>
      <div class="numero">${printableFichaHtml(protocol.ficha)}</div>
    </div>
  </div>
</div>
<div class="top-grid">
  <div class="card">
    <h4>Apresentação</h4>
    <div class="info-line"><strong>Data:</strong> ${
        protocol.data_apresentacao
            ? new Date(String(protocol.data_apresentacao) + 'T00:00:00').toLocaleDateString('pt-BR')
            : ''
    }</div>
    <div class="info-line"><strong>Apresentante:</strong> ${escapeHtml(protocol.apresentante || '')}</div>
    <div class="info-line"><strong>Contato:</strong> ${escapeHtml(protocol.contato || '')}</div>
    <div class="info-line"><strong>Digitador:</strong> ${escapeHtml(protocol.digitador || '')}</div>
  </div>
  <div class="card">
    <h4>Ato</h4>
    <div class="ato-box">${escapeHtml(protocol.ato || '')}</div>
  </div>
</div>
<div class="section">
  <h3>Outorgante(s)</h3>
  <div class="box text-preserve">${escapeHtml(protocol.outorgantes || '')}</div>
</div>
<div class="section">
  <h3>Outorgado(s)</h3>
  <div class="box text-preserve">${escapeHtml(protocol.outorgados || '')}</div>
</div>
<div class="section">
  <h3>Matrícula / Área</h3>
  <div class="box imovel-list">
    ${
        (Array.isArray(properties) && properties.length)
            ? properties.map((item) => `<div>${escapeHtml(item.matricula || '')}${(item.area ? ' - ' + escapeHtml(item.area) : '')}</div>`).join('')
            : ''
    }
  </div>
</div>
<div class="valores">
  <div class="valor-ato">
    Valor do ato: ${
        (protocol.valor_ato && Number(protocol.valor_ato) > 0)
            ? formatCurrency(protocol.valor_ato)
            : ''
    }
  </div>
  <div class="valores-box">
    <table class="tabela">
      <thead>
        <tr>
          <th>Valores adicionais</th>
          <th class="right">Valor</th>
        </tr>
      </thead>
      <tbody>
        ${printableValues.map((item) => `
          <tr>
            <td>${escapeHtml(item.descricao || '')}</td>
            <td class="right">${
                item.valor === '' || item.valor === null || typeof item.valor === 'undefined'
                    ? ''
                    : formatCurrency(item.valor)
            }</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    <div class="total-card">
      <div><div class="muted">Total adicional</div></div>
      <div class="amount">${formatCurrency(totalAdditional)}</div>
    </div>
  </div>
</div>
<div class="obs">
  <h3>Observações</h3>
  <div class="box obs-box text-preserve">${escapeHtml(protocol.observacoes || '')}</div>
</div>
</div>
<script>
window.onload = () => setTimeout(() => window.print(), 200);
</script>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    void notes;
    void protocolTitle;
}
