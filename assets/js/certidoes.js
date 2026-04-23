import { apiUrl } from './base.js';
import * as pdfjsLib from '../vendor/pdfjs/pdf.js';

if (typeof Response !== 'undefined' && !Response.prototype.bytes) {
    Response.prototype.bytes = async function () {
        return new Uint8Array(await this.arrayBuffer());
    };
}

if (typeof Blob !== 'undefined' && !Blob.prototype.bytes) {
    Blob.prototype.bytes = async function () {
        return new Uint8Array(await this.arrayBuffer());
    };
}

if (typeof ReadableStream !== 'undefined' && !ReadableStream.prototype[Symbol.asyncIterator]) {
    ReadableStream.prototype[Symbol.asyncIterator] = async function* () {
        const reader = this.getReader();
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) return;
                yield value;
            }
        } finally {
            reader.releaseLock();
        }
    };
}

pdfjsLib.GlobalWorkerOptions.workerSrc = apiUrl('assets/vendor/pdfjs/pdf.worker.js');

const fileInput = document.getElementById('cert-file-input');
const dropzone = document.getElementById('cert-dropzone');
const resultsEl = document.getElementById('cert-results');
const outputEl = document.getElementById('cert-output');
const copyBtn = document.getElementById('cert-copy');
const clearBtn = document.getElementById('cert-clear');
const warningBox = document.getElementById('cert-warning');
const alertModal = document.getElementById('cert-alert-modal');
const alertOverlay = document.getElementById('cert-alert-overlay');
const alertCloseBtn = document.getElementById('cert-alert-close');
const alertList = document.getElementById('cert-alert-list');

let parsedDocs = [];
let nextDocId = 1;

const TYPE_ORDER = ['municipal', 'estadual', 'federal', 'trabalhista', 'desconhecido'];
const TYPE_LABELS = {
    municipal: 'Municipal',
    estadual: 'Estadual',
    federal: 'Federal',
    trabalhista: 'TST',
    desconhecido: 'Não identificado'
};

function showWarning(message) {
    if (!warningBox) return;
    warningBox.textContent = message;
    warningBox.classList.remove('hidden');
}

function hideWarning() {
    if (!warningBox) return;
    warningBox.textContent = '';
    warningBox.classList.add('hidden');
}

function normalizeSpaces(value) {
    return String(value || '')
        .replace(/\u00AD/g, '')
        .replace(/\u00A0/g, ' ')
        .replace(/([A-Za-zÀ-ÿ])-\s*\n\s*([A-Za-zÀ-ÿ])/g, '$1$2')
        .replace(/[ \t]+/g, ' ')
        .replace(/\s+\n/g, '\n')
        .replace(/\n\s+/g, '\n')
        .trim();
}

function normalizeLineText(value) {
    return normalizeSpaces(value).replace(/\n/g, ' ');
}

function normalizeForDetection(value) {
    return normalizeLineText(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
}

function formatDate(value) {
    const match = String(value || '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : '';
}

function parseDate(value) {
    const match = String(value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return null;
    const [, dd, mm, yyyy] = match;
    return new Date(Number(yyyy), Number(mm) - 1, Number(dd), 12, 0, 0, 0);
}

function addDays(date, days) {
    const next = new Date(date.getTime());
    next.setDate(next.getDate() + days);
    return next;
}

function toDateString(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('pt-BR');
}

function normalizeName(value) {
    return normalizeLineText(value)
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function escapeHtml(text) {
    return String(text || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

function detectType(text) {
    const t = normalizeForDetection(text);
    if (
        t.includes('prefeitura municipal') ||
        t.includes('secretaria municipal da fazenda') ||
        t.includes('certidao negativa de debitos municipais') ||
        t.includes('certidao positiva de debitos') ||
        t.includes('tributos municipais')
    ) {
        return 'municipal';
    }
    if (
        t.includes('receita estadual do parana') ||
        t.includes('divida ativa estadual') ||
        t.includes('debitos tributarios e de divida ativa estadual') ||
        t.includes('portal de emissao de certidoes')
    ) {
        return 'estadual';
    }
    if (t.includes('procuradoria-geral da fazenda nacional') || t.includes('tributos federais e a divida ativa da uniao')) {
        return 'federal';
    }
    if (t.includes('tribunal superior do trabalho') || t.includes('debitos trabalhistas') || t.includes('cndt')) {
        return 'trabalhista';
    }
    return 'desconhecido';
}

function isPortalPendenciaEstadual(text, type) {
    if (type !== 'estadual') return false;
    const t = normalizeForDetection(text);
    return t.includes('existe(m) pendencia(s) que impede(m) a emissao de certidao negativa ou positiva com efeito de negativa');
}

function detectStatus(text) {
    const t = normalizeForDetection(text);
    const hasPositivePendencias = t.includes('constam pendencias') && !t.includes('nao constam pendencias');
    const hasPositiveInadimplencia = t.includes('consta como inadimplente') && !t.includes('nao consta como inadimplente');
    const hasPositiveAcoes = t.includes('constam acoes trabalhistas') && !t.includes('nao constam acoes trabalhistas');

    if (t.includes('positiva com efeitos de negativa') || t.includes('positiva com efeito de negativa')) {
        return 'positiva com efeitos de negativa';
    }

    if (
        t.includes('certidao positiva de debitos') ||
        t.includes('certidao positiva para cpf ou cnpj que possua debito exigivel') ||
        t.includes('constam debitos') ||
        hasPositivePendencias ||
        hasPositiveInadimplencia ||
        hasPositiveAcoes ||
        t.includes('existe(m) pendencia(s) que impede(m) a emissao de certidao negativa ou positiva com efeito de negativa')
    ) {
        return 'positiva';
    }

    if (
        t.includes('certidao negativa') ||
        t.includes('situacao regular') ||
        t.includes('nao constam pendencias') ||
        t.includes('nao existir pendencias') ||
        t.includes('nao consta como inadimplente') ||
        t.includes('nao constam acoes trabalhistas') ||
        t.includes('nao possui debito')
    ) {
        return 'negativa';
    }

    return 'nao identificado';
}

function extractCpf(text) {
    const match = text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    return match ? match[0] : '';
}

function normalizeCpf(value) {
    return String(value || '').replace(/\D+/g, '');
}

function extractName(text) {
    const line = normalizeLineText(text);
    const patterns = [
        /Contribuinte:\s*(.*?)\s*CPF\/CNPJ:/i,
        /Nome:\s*(.*?)\s*CPF:/i,
        /Nome:\s*(.*?)\s*Ressalvado/i,
        /Certifica-se que\s+([^,]+),\s+inscrito/i,
        /Nome do contribuinte\s*:?\s*(.*?)\s*(?:CPF|CNPJ|Documento)/i,
        /Interessado\(a\)\s*:?\s*(.*?)\s*(?:CPF|CNPJ|Documento)/i
    ];

    for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[1]) {
            return normalizeName(match[1].replace(/CPF NÃO CONSTA.+$/i, '').replace(/CPF NAO CONSTA.+$/i, ''));
        }
    }

    return '';
}

function extractNumber(text, type) {
    const patternsByType = {
        municipal: [
            /Certid[aã]o[^\n]*?N[º°]?\s*([\d\s/.-]+)/i,
            /N[º°]?\s*([\d\s/.-]{5,})/i
        ],
        estadual: [
            /N[º°]\s*([\d\-/.]+)/i,
            /Certid[aã]o[^\n]*?N[º°]\s*([\d\-/.]+)/i
        ],
        federal: [
            /C[oó]digo de controle da certid[aã]o:\s*([A-Z0-9.\-]+)/i
        ],
        trabalhista: [
            /Certid[aã]o n[º°]:\s*([\d/.-]+)/i,
            /Certid[aã]o nº:\s*([\d/.-]+)/i,
            /N[uú]mero:\s*([\d/.-]+)/i
        ]
    };

    const patterns = patternsByType[type] || [];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
            return match[1].replace(/\s+/g, '').trim();
        }
    }
    return '';
}

function extractIssueDate(text, type) {
    const patternsByType = {
        municipal: [
            /IRATI,\s*(\d{2}\/\d{2}\/\d{4})/i,
            /Emitida em\s*(\d{2}\/\d{2}\/\d{4})/i,
            /(\d{2}\/\d{2}\/\d{4})/i
        ],
        estadual: [
            /Emitido via Portal de Emiss[aã]o de Certid[oõ]es\s*\((\d{2}\/\d{2}\/\d{4})/i,
            /Emitida em\s*(\d{2}\/\d{2}\/\d{4})/i,
            /(\d{2}\/\d{2}\/\d{4})/i
        ],
        federal: [
            /Emitida [^\n]*? dia\s*(\d{2}\/\d{2}\/\d{4})/i,
            /Emitida em\s*(\d{2}\/\d{2}\/\d{4})/i,
            /(\d{2}\/\d{2}\/\d{4})/i
        ],
        trabalhista: [
            /Expedi[cç][aã]o:\s*(\d{2}\/\d{2}\/\d{4})/i,
            /Emitida em\s*(\d{2}\/\d{2}\/\d{4})/i,
            /(\d{2}\/\d{2}\/\d{4})/i
        ]
    };

    const patterns = patternsByType[type] || [/(\d{2}\/\d{2}\/\d{4})/i];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) return formatDate(match[1]);
    }
    return '';
}

function extractExpiryDate(text, type, issueDate) {
    const patternsByType = {
        municipal: [
            /V[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i,
            /Validade\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i,
            /at[eé]\s*o dia\s*(\d{2}\/\d{2}\/\d{4})/i
        ],
        estadual: [
            /V[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i,
            /Validade\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i
        ],
        federal: [
            /V[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i,
            /esta certid[aã]o [^\n]*? v[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i,
            /validade\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i
        ],
        trabalhista: [
            /Validade:\s*(\d{2}\/\d{2}\/\d{4})/i,
            /V[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i,
            /v[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i
        ]
    };

    const patterns = patternsByType[type] || [];
    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match && match[1]) return formatDate(match[1]);
    }

    const issue = parseDate(issueDate);
    if (!issue) return '';

    if (type === 'municipal') {
        return toDateString(addDays(issue, 90));
    }

    if (type === 'federal' || type === 'trabalhista') {
        return toDateString(addDays(issue, 180));
    }

    return '';
}

function getIssuer(type) {
    if (type === 'municipal') return 'Prefeitura Municipal';
    if (type === 'estadual') return 'Receita Estadual';
    if (type === 'federal') return 'PGFN / Receita Federal';
    if (type === 'trabalhista') return 'Tribunal Superior do Trabalho';
    return '';
}

function getValidityState(expiryDate) {
    const expiry = parseDate(expiryDate);
    if (!expiry) {
        return 'nao identificada';
    }

    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
    return expiry < todayMid ? 'vencida' : 'valida';
}

function getGroupKey(doc) {
    const cpf = normalizeCpf(doc.cpf);
    if (cpf) return `cpf:${cpf}`;
    const name = normalizeName(doc.name || '');
    if (name) return `name:${name}`;
    return '';
}

function resolveIdentities(docs) {
    const nameByCpf = new Map();

    docs.forEach(doc => {
        doc.name = normalizeName(doc.extractedName || '');
    });

    docs.forEach(doc => {
        const cpf = normalizeCpf(doc.cpf);
        const name = normalizeName(doc.name || '');
        if (cpf && name) {
            nameByCpf.set(cpf, name);
        }
    });

    docs.forEach(doc => {
        const cpf = normalizeCpf(doc.cpf);
        if (!doc.name && cpf && nameByCpf.has(cpf)) {
            doc.name = nameByCpf.get(cpf);
        }
    });
}

function updateWarnings() {
    const messages = [];

    const failures = parsedDocs
        .filter(doc => doc.error)
        .map(doc => `${doc.fileName}: ${doc.error}`);

    if (failures.length) {
        messages.push(`Alguns arquivos não foram lidos completamente. ${failures.join(' | ')}`);
    }

    const expired = parsedDocs
        .filter(doc => doc.validityState === 'vencida')
        .map(doc => `${doc.fileName} venceu em ${doc.expiryDate}`);

    if (expired.length) {
        messages.push(`Certidões vencidas identificadas: ${expired.join(' | ')}`);
    }

    const notIssued = parsedDocs
        .filter(doc => doc.status === 'nao emitida')
        .map(doc => `${doc.fileName} não gerou certidão emitida por existir pendência no portal`);

    if (notIssued.length) {
        messages.push(`Certidões não emitidas identificadas: ${notIssued.join(' | ')}`);
    }

    if (messages.length) {
        showWarning(messages.join(' '));
    } else {
        hideWarning();
    }
}

function buildSentence(doc) {
    const status = doc.status || 'nao identificado';

    if (doc.type === 'municipal') {
        return `Certidão ${status} de débitos municipais sob o nº ${doc.number}, expedida pela Prefeitura Municipal de Irati/PR, emitida em ${doc.issueDate}`;
    }

    if (doc.type === 'estadual') {
        return `Certidão ${status} de débitos tributários e de dívida ativa estadual, sob o nº ${doc.number}, emitida pela Receita Estadual do Paraná em ${doc.issueDate}`;
    }

    if (doc.type === 'federal') {
        return `Certidão ${status} de débitos relativos aos tributos federais e à dívida ativa da União, com código de controle nº ${doc.number}, emitida em ${doc.issueDate}`;
    }

    if (doc.type === 'trabalhista') {
        return `Certidão ${status} de débitos trabalhistas expedida pelo Tribunal Superior do Trabalho  TST, sob o nº ${doc.number}, emitida em ${doc.issueDate}`;
    }

    return '';
}

function isComplete(doc) {
    if (!doc.name) return false;
    if (!doc.type || doc.type === 'desconhecido') return false;
    if (!doc.status || doc.status === 'nao identificado') return false;
    if (!doc.issueDate) return false;
    if (doc.excludeFromOutput) return false;
    if (['municipal', 'estadual', 'federal', 'trabalhista'].includes(doc.type) && !doc.number) return false;
    return true;
}

function compareDocs(a, b) {
    const aIndex = TYPE_ORDER.indexOf(a.type);
    const bIndex = TYPE_ORDER.indexOf(b.type);
    return (aIndex === -1 ? TYPE_ORDER.length : aIndex) - (bIndex === -1 ? TYPE_ORDER.length : bIndex);
}

function getStatusBadgeClass(status) {
    if (status === 'negativa') return 'ok';
    if (status === 'positiva' || status === 'positiva com efeitos de negativa') return 'bad';
    if (status === 'nao emitida') return 'warn';
    return 'warn';
}

function getValidityBadgeClass(state) {
    if (state === 'valida') return 'ok';
    if (state === 'vencida') return 'bad';
    return 'warn';
}

function getValidityLabel(state) {
    if (state === 'valida') return 'Válida';
    if (state === 'vencida') return 'Vencida';
    return 'Validade não identificada';
}

function getStatusLabel(status) {
    if (status === 'nao identificado') return 'Status não identificado';
    if (status === 'nao emitida') return 'Não emitida';
    return status;
}

function openAlertModal(items) {
    if (!alertModal || !alertList || !items.length) return;

    alertList.innerHTML = items.map(item => `
        <div class="cert-alert-item">
            <div class="cert-alert-item-title">${escapeHtml(item.fileName)}</div>
            <div class="cert-alert-item-meta">${escapeHtml(item.message)}</div>
        </div>
    `).join('');

    alertModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    alertModal.setAttribute('aria-hidden', 'false');
}

function closeAlertModal() {
    if (!alertModal) return;
    alertModal.classList.add('hidden');
    alertModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

function renderResults() {
    if (!resultsEl) return;
    resultsEl.innerHTML = '';

    if (!parsedDocs.length) {
        resultsEl.innerHTML = '<div class="cert-result-item"><div class="cert-empty-state">Nenhum arquivo processado ainda.</div></div>';
        return;
    }

    parsedDocs.forEach(doc => {
        const item = document.createElement('article');
        item.className = 'cert-result-item';
        item.innerHTML = `
            <div class="cert-item-top">
                <div>
                    <div class="cert-file-name">${escapeHtml(doc.fileName)}</div>
                    <div class="cert-item-tags">
                        <span class="cert-badge ${getStatusBadgeClass(doc.status)}">${escapeHtml(getStatusLabel(doc.status))}</span>
                        <span class="cert-badge ${getValidityBadgeClass(doc.validityState)}">${escapeHtml(getValidityLabel(doc.validityState))}</span>
                    </div>
                </div>
                <button type="button" class="cert-remove-btn" data-remove-cert-id="${escapeHtml(doc.id)}" aria-label="Excluir certidão">
                    Excluir
                </button>
            </div>
            <div class="cert-meta-grid">
                <div><strong>Tipo</strong><span>${escapeHtml(TYPE_LABELS[doc.type] || doc.type)}</span></div>
                <div><strong>Nome</strong><span>${escapeHtml(doc.name || 'Não identificado')}</span></div>
                <div><strong>CPF</strong><span>${escapeHtml(doc.cpf || 'Não identificado')}</span></div>
                <div><strong>Número / código</strong><span>${escapeHtml(doc.number || 'Não identificado')}</span></div>
                <div><strong>Órgão emissor</strong><span>${escapeHtml(doc.issuer || 'Não identificado')}</span></div>
                <div><strong>Data de emissão</strong><span>${escapeHtml(doc.issueDate || 'Não identificado')}</span></div>
                <div><strong>Validade</strong><span>${escapeHtml(doc.expiryDate || 'Não identificada')}</span></div>
                <div><strong>Observação</strong><span>${escapeHtml(doc.note || doc.error || 'Leitura concluída')}</span></div>
            </div>
        `;
        resultsEl.appendChild(item);
    });
}

function generateOutput() {
    if (!outputEl) return;

    const validDocs = parsedDocs.filter(isComplete).sort(compareDocs);
    if (!validDocs.length) {
        outputEl.value = '';
        return;
    }

    const groups = new Map();
    for (const doc of validDocs) {
        const key = getGroupKey(doc);
        if (!key) continue;
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key).push(doc);
    }

    const blocks = [];
    groups.forEach((docs) => {
        const displayName = docs.find(doc => doc.name)?.name || docs[0]?.cpf || 'PESSOA NÃO IDENTIFICADA';
        const parts = docs.map(buildSentence).filter(Boolean);
        if (parts.length) {
            blocks.push(`${displayName}: ${parts.join('; ')};`);
        }
    });

    outputEl.value = blocks.join('\n\n');
}

async function extractPdfText(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pageTexts = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        const items = content.items.map(item => item.str || '').filter(Boolean);
        pageTexts.push(items.join(' '));
    }

    const text = normalizeSpaces(pageTexts.join('\n'));
    if (!text) {
        throw new Error('O PDF não possui texto selecionável.');
    }
    return text;
}

function sanitizeDoc(doc) {
    if (doc.type === 'municipal' && doc.number) {
        doc.number = doc.number.replace(/\s+/g, '');
    }
    if (doc.type === 'federal' && doc.number) {
        doc.number = doc.number.toUpperCase();
    }
    if (doc.name) {
        doc.name = normalizeName(doc.name);
    }
    return doc;
}

async function parseFile(file) {
    const text = await extractPdfText(file);
    const type = detectType(text);
    const portalPendenciaEstadual = isPortalPendenciaEstadual(text, type);
    const status = portalPendenciaEstadual ? 'nao emitida' : detectStatus(text);
    const extractedName = extractName(text);
    const cpf = extractCpf(text);
    const number = extractNumber(text, type);
    const issueDate = extractIssueDate(text, type);
    const expiryDate = extractExpiryDate(text, type, issueDate);
    const issuer = getIssuer(type);
    const validityState = getValidityState(expiryDate);

    return sanitizeDoc({
        id: nextDocId++,
        fileName: file.name,
        text,
        type,
        status,
        extractedName,
        name: extractedName,
        cpf,
        number,
        issueDate,
        expiryDate,
        validityState,
        issuer,
        excludeFromOutput: portalPendenciaEstadual,
        note: portalPendenciaEstadual ? 'Pendências no portal impedem a emissão da certidão estadual.' : '',
        error: ''
    });
}

async function handleFiles(files) {
    const pdfFiles = Array.from(files).filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
    if (!pdfFiles.length) return;
    const batchDocs = [];

    for (const file of pdfFiles) {
        try {
            const parsed = await parseFile(file);
            parsedDocs.push(parsed);
            batchDocs.push(parsed);
        } catch (error) {
            const fallback = {
                id: nextDocId++,
                fileName: file.name,
                type: 'desconhecido',
                status: 'nao identificado',
                extractedName: '',
                name: '',
                cpf: '',
                number: '',
                issueDate: '',
                expiryDate: '',
                validityState: 'nao identificada',
                issuer: '',
                excludeFromOutput: false,
                note: '',
                error: error?.message || 'Erro ao processar arquivo.'
            };
            parsedDocs.push(fallback);
            batchDocs.push(fallback);
        }
    }
    
    resolveIdentities(parsedDocs);
    updateWarnings();

    renderResults();
    generateOutput();

    const alertItems = [];
    batchDocs.forEach(doc => {
        if (doc.validityState === 'vencida') {
            alertItems.push({
                fileName: doc.fileName,
                message: `Certidão vencida${doc.expiryDate ? ` em ${doc.expiryDate}` : ''}.`
            });
        }

        if (doc.status === 'positiva' || doc.status === 'positiva com efeitos de negativa') {
            alertItems.push({
                fileName: doc.fileName,
                message: `Certidão ${doc.status}.`
            });
        }

        if (doc.status === 'nao emitida') {
            alertItems.push({
                fileName: doc.fileName,
                message: 'Pendências no portal impedem a emissão desta certidão estadual.'
            });
        }
    });

    if (alertItems.length) {
        openAlertModal(alertItems);
    }
}

function removeDoc(docId) {
    parsedDocs = parsedDocs.filter(doc => String(doc.id) !== String(docId));
    resolveIdentities(parsedDocs);
    updateWarnings();
    renderResults();
    generateOutput();
    closeAlertModal();
}

async function copyOutput() {
    if (!outputEl || !outputEl.value.trim()) return;
    try {
        await navigator.clipboard.writeText(outputEl.value);
        const original = copyBtn.textContent;
        copyBtn.textContent = 'Copiado';
        setTimeout(() => {
            copyBtn.textContent = original;
        }, 1500);
    } catch {
        outputEl.select();
        document.execCommand('copy');
    }
}

function clearAll() {
    parsedDocs = [];
    hideWarning();
    closeAlertModal();
    renderResults();
    generateOutput();
}

['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, event => {
        event.preventDefault();
    });
    document.addEventListener(eventName, event => {
        event.preventDefault();
    });
});

if (fileInput) {
    fileInput.addEventListener('change', event => {
        void handleFiles(event.target.files || []);
        fileInput.value = '';
    });
}

if (dropzone) {
    dropzone.addEventListener('click', event => {
        if (event.target.closest('button, label')) return;
        fileInput?.click();
    });

    dropzone.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            fileInput?.click();
        }
    });

    dropzone.addEventListener('dragover', event => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragenter', event => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', event => {
        event.preventDefault();
        event.stopPropagation();
        if (!dropzone.contains(event.relatedTarget)) {
            dropzone.classList.remove('dragover');
        }
    });

    dropzone.addEventListener('drop', event => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.remove('dragover');
        void handleFiles(event.dataTransfer?.files || []);
    });
}

resultsEl?.addEventListener('click', event => {
    const removeButton = event.target.closest('[data-remove-cert-id]');
    if (!removeButton) return;
    removeDoc(removeButton.getAttribute('data-remove-cert-id'));
});

copyBtn?.addEventListener('click', () => {
    void copyOutput();
});

clearBtn?.addEventListener('click', clearAll);
alertCloseBtn?.addEventListener('click', closeAlertModal);
alertOverlay?.addEventListener('click', closeAlertModal);

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeAlertModal();
    }
});

renderResults();
