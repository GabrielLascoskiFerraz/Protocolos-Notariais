import * as pdfjsLib from "../../../vendor/pdfjs/pdf.js";

const base = (window.PROTOCOLOS_BASE_URL || window.BASE_URL || "./").replace(/\\/g, "/");
const normalizedBase = base.endsWith("/") ? base : `${base}/`;

if (typeof Response !== "undefined" && !Response.prototype.bytes) {
    Response.prototype.bytes = async function () {
        return new Uint8Array(await this.arrayBuffer());
    };
}

if (typeof Blob !== "undefined" && !Blob.prototype.bytes) {
    Blob.prototype.bytes = async function () {
        return new Uint8Array(await this.arrayBuffer());
    };
}

if (typeof ReadableStream !== "undefined" && !ReadableStream.prototype[Symbol.asyncIterator]) {
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

pdfjsLib.GlobalWorkerOptions.workerSrc = `${normalizedBase}assets/vendor/pdfjs/pdf.worker.js`;

export const TYPE_ORDER = ["municipal", "estadual", "federal", "trabalhista", "desconhecido"];
export const TYPE_LABELS = {
    municipal: "Municipal",
    estadual: "Estadual",
    federal: "Federal",
    trabalhista: "TST",
    desconhecido: "Não identificado"
};

function normalizeSpaces(value) {
    return String(value || "")
        .replace(/\u00AD/g, "")
        .replace(/\u00A0/g, " ")
        .replace(/([A-Za-zÀ-ÿ])-\s*\n\s*([A-Za-zÀ-ÿ])/g, "$1$2")
        .replace(/[ \t]+/g, " ")
        .replace(/\s+\n/g, "\n")
        .replace(/\n\s+/g, "\n")
        .trim();
}

function normalizeLineText(value) {
    return normalizeSpaces(value).replace(/\n/g, " ");
}

function normalizeForDetection(value) {
    return normalizeLineText(value)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function formatDate(value) {
    const match = String(value || "").match(/(\d{2})\/(\d{2})\/(\d{4})/);
    return match ? `${match[1]}/${match[2]}/${match[3]}` : "";
}

function parseDate(value) {
    const match = String(value || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
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
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("pt-BR");
}

export function normalizeCpf(value) {
    return String(value || "").replace(/\D+/g, "");
}

export function normalizeName(value) {
    return normalizeLineText(value).replace(/\s+/g, " ").trim().toUpperCase();
}

function detectType(text) {
    const t = normalizeForDetection(text);
    if (
        t.includes("prefeitura municipal") ||
        t.includes("secretaria municipal da fazenda") ||
        t.includes("certidao negativa de debitos municipais") ||
        t.includes("certidao positiva de debitos") ||
        t.includes("tributos municipais")
    ) return "municipal";

    if (
        t.includes("receita estadual do parana") ||
        t.includes("divida ativa estadual") ||
        t.includes("debitos tributarios e de divida ativa estadual") ||
        t.includes("portal de emissao de certidoes")
    ) return "estadual";

    if (t.includes("procuradoria-geral da fazenda nacional") || t.includes("tributos federais e a divida ativa da uniao")) {
        return "federal";
    }

    if (t.includes("tribunal superior do trabalho") || t.includes("debitos trabalhistas") || t.includes("cndt")) {
        return "trabalhista";
    }

    return "desconhecido";
}

function isPortalPendenciaEstadual(text, type) {
    if (type !== "estadual") return false;
    return normalizeForDetection(text).includes("existe(m) pendencia(s) que impede(m) a emissao de certidao negativa ou positiva com efeito de negativa");
}

function detectStatus(text) {
    const t = normalizeForDetection(text);
    const hasPositivePendencias = t.includes("constam pendencias") && !t.includes("nao constam pendencias");
    const hasPositiveInadimplencia = t.includes("consta como inadimplente") && !t.includes("nao consta como inadimplente");
    const hasPositiveAcoes = t.includes("constam acoes trabalhistas") && !t.includes("nao constam acoes trabalhistas");

    if (t.includes("positiva com efeitos de negativa") || t.includes("positiva com efeito de negativa")) {
        return "positiva com efeitos de negativa";
    }

    if (
        t.includes("certidao positiva de debitos") ||
        t.includes("certidao positiva para cpf ou cnpj que possua debito exigivel") ||
        t.includes("constam debitos") ||
        hasPositivePendencias ||
        hasPositiveInadimplencia ||
        hasPositiveAcoes ||
        t.includes("existe(m) pendencia(s) que impede(m) a emissao de certidao negativa ou positiva com efeito de negativa")
    ) return "positiva";

    if (
        t.includes("certidao negativa") ||
        t.includes("situacao regular") ||
        t.includes("nao constam pendencias") ||
        t.includes("nao existir pendencias") ||
        t.includes("nao consta como inadimplente") ||
        t.includes("nao constam acoes trabalhistas") ||
        t.includes("nao possui debito")
    ) return "negativa";

    return "nao identificado";
}

function extractCpf(text) {
    const match = text.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);
    return match ? match[0] : "";
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
        if (match?.[1]) {
            return normalizeName(match[1].replace(/CPF NÃO CONSTA.+$/i, "").replace(/CPF NAO CONSTA.+$/i, ""));
        }
    }

    return "";
}

function extractNumber(text, type) {
    const patternsByType = {
        municipal: [/Certid[aã]o[^\n]*?N[º°]?\s*([\d\s/.-]+)/i, /N[º°]?\s*([\d\s/.-]{5,})/i],
        estadual: [/N[º°]\s*([\d\-/.]+)/i, /Certid[aã]o[^\n]*?N[º°]\s*([\d\-/.]+)/i],
        federal: [/C[oó]digo de controle da certid[aã]o:\s*([A-Z0-9.\-]+)/i],
        trabalhista: [/Certid[aã]o n[º°]:\s*([\d/.-]+)/i, /Certid[aã]o nº:\s*([\d/.-]+)/i, /N[uú]mero:\s*([\d/.-]+)/i]
    };

    for (const pattern of patternsByType[type] || []) {
        const match = text.match(pattern);
        if (match?.[1]) return match[1].replace(/\s+/g, "").trim();
    }
    return "";
}

function extractIssueDate(text, type) {
    const patternsByType = {
        municipal: [/IRATI,\s*(\d{2}\/\d{2}\/\d{4})/i, /Emitida em\s*(\d{2}\/\d{2}\/\d{4})/i, /(\d{2}\/\d{2}\/\d{4})/i],
        estadual: [/Emitido via Portal de Emiss[aã]o de Certid[oõ]es\s*\((\d{2}\/\d{2}\/\d{4})/i, /Emitida em\s*(\d{2}\/\d{2}\/\d{4})/i, /(\d{2}\/\d{2}\/\d{4})/i],
        federal: [/Emitida [^\n]*? dia\s*(\d{2}\/\d{2}\/\d{4})/i, /Emitida em\s*(\d{2}\/\d{2}\/\d{4})/i, /(\d{2}\/\d{2}\/\d{4})/i],
        trabalhista: [/Expedi[cç][aã]o:\s*(\d{2}\/\d{2}\/\d{4})/i, /Emitida em\s*(\d{2}\/\d{2}\/\d{4})/i, /(\d{2}\/\d{2}\/\d{4})/i]
    };

    for (const pattern of patternsByType[type] || [/(\d{2}\/\d{2}\/\d{4})/i]) {
        const match = text.match(pattern);
        if (match?.[1]) return formatDate(match[1]);
    }
    return "";
}

function extractExpiryDate(text, type, issueDate) {
    const patternsByType = {
        municipal: [/V[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i, /Validade\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i, /at[eé]\s*o dia\s*(\d{2}\/\d{2}\/\d{4})/i],
        estadual: [/V[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i, /Validade\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i],
        federal: [/V[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i, /esta certid[aã]o [^\n]*? v[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i, /validade\s*:?\s*(\d{2}\/\d{2}\/\d{4})/i],
        trabalhista: [/Validade:\s*(\d{2}\/\d{2}\/\d{4})/i, /V[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i, /v[aá]lida at[eé]\s*(\d{2}\/\d{2}\/\d{4})/i]
    };

    for (const pattern of patternsByType[type] || []) {
        const match = text.match(pattern);
        if (match?.[1]) return formatDate(match[1]);
    }

    const issue = parseDate(issueDate);
    if (!issue) return "";
    if (type === "municipal") return toDateString(addDays(issue, 90));
    if (type === "federal" || type === "trabalhista") return toDateString(addDays(issue, 180));
    return "";
}

function getIssuer(type) {
    if (type === "municipal") return "Prefeitura Municipal";
    if (type === "estadual") return "Receita Estadual";
    if (type === "federal") return "PGFN / Receita Federal";
    if (type === "trabalhista") return "Tribunal Superior do Trabalho";
    return "";
}

function getValidityState(expiryDate) {
    const expiry = parseDate(expiryDate);
    if (!expiry) return "nao identificada";
    const today = new Date();
    const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0, 0);
    return expiry < todayMid ? "vencida" : "valida";
}

export function getCertificateGroupKey(doc) {
    const cpf = normalizeCpf(doc.cpf);
    if (cpf) return `cpf:${cpf}`;
    const name = normalizeName(doc.name || "");
    if (name) return `name:${name}`;
    return "";
}

export function resolveCertificateIdentities(docs) {
    const nameByCpf = new Map();
    docs.forEach((doc) => {
        doc.name = normalizeName(doc.extractedName || doc.name || "");
    });
    docs.forEach((doc) => {
        const cpf = normalizeCpf(doc.cpf);
        const name = normalizeName(doc.name || "");
        if (cpf && name) nameByCpf.set(cpf, name);
    });
    docs.forEach((doc) => {
        const cpf = normalizeCpf(doc.cpf);
        if (!doc.name && cpf && nameByCpf.has(cpf)) {
            doc.name = nameByCpf.get(cpf);
        }
    });
    return docs;
}

function buildSentence(doc, options = {}) {
    const status = doc.status || "nao identificado";
    const includeIssueDate = options.includeIssueDate !== false;
    const issueDateSuffix = includeIssueDate ? `, emitida em ${doc.issueDate}` : "";

    if (doc.type === "municipal") return `Certidão ${status} de débitos municipais sob o nº ${doc.number}, expedida pela Prefeitura Municipal de Irati/PR${issueDateSuffix}`;
    if (doc.type === "estadual") {
        const dateSuffix = includeIssueDate ? ` em ${doc.issueDate}` : "";
        return `Certidão ${status} de débitos tributários e de dívida ativa estadual, sob o nº ${doc.number}, emitida pela Receita Estadual do Paraná${dateSuffix}`;
    }
    if (doc.type === "federal") return `Certidão ${status} de débitos relativos aos tributos federais e à dívida ativa da União, com código de controle nº ${doc.number}${issueDateSuffix}`;
    if (doc.type === "trabalhista") return `Certidão ${status} de débitos trabalhistas expedida pelo Tribunal Superior do Trabalho TST, sob o nº ${doc.number}${issueDateSuffix}`;
    return "";
}

function getCommonIssueDate(docs) {
    if (docs.length <= 1) return "";
    const issueDates = [...new Set(docs.map((doc) => doc.issueDate).filter(Boolean))];
    return issueDates.length === 1 ? issueDates[0] : "";
}

export function isCompleteCertificate(doc) {
    if (!doc.name) return false;
    if (!doc.type || doc.type === "desconhecido") return false;
    if (!doc.status || doc.status === "nao identificado") return false;
    if (!doc.issueDate) return false;
    if (doc.excludeFromOutput) return false;
    if (["municipal", "estadual", "federal", "trabalhista"].includes(doc.type) && !doc.number) return false;
    return true;
}

export function compareCertificates(a, b) {
    const aIndex = TYPE_ORDER.indexOf(a.type);
    const bIndex = TYPE_ORDER.indexOf(b.type);
    return (aIndex === -1 ? TYPE_ORDER.length : aIndex) - (bIndex === -1 ? TYPE_ORDER.length : bIndex);
}

export function getStatusBadgeClass(status) {
    if (status === "negativa") return "ok";
    if (status === "positiva" || status === "positiva com efeitos de negativa") return "bad";
    if (status === "nao emitida") return "warn";
    return "warn";
}

export function getValidityBadgeClass(state) {
    if (state === "valida") return "ok";
    if (state === "vencida") return "bad";
    return "warn";
}

export function getValidityLabel(state) {
    if (state === "valida") return "Válida";
    if (state === "vencida") return "Vencida";
    return "Validade não identificada";
}

export function getStatusLabel(status) {
    if (status === "nao identificado") return "Status não identificado";
    if (status === "nao emitida") return "Não emitida";
    return status;
}

export function buildCertificatesOutput(documents) {
    const validDocs = resolveCertificateIdentities([...documents]).filter(isCompleteCertificate).sort(compareCertificates);
    const groups = new Map();
    for (const doc of validDocs) {
        const key = getCertificateGroupKey(doc);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(doc);
    }

    const blocks = [];
    groups.forEach((docs) => {
        const displayName = docs.find((doc) => doc.name)?.name || docs[0]?.cpf || "PESSOA NÃO IDENTIFICADA";
        const commonIssueDate = getCommonIssueDate(docs);
        const parts = docs.map((doc) => buildSentence(doc, { includeIssueDate: !commonIssueDate })).filter(Boolean);
        if (!parts.length) return;
        if (commonIssueDate) {
            blocks.push(`${displayName}: ${parts.join("; ")}; todas emitidas em ${commonIssueDate};`);
        } else {
            blocks.push(`${displayName}: ${parts.join("; ")};`);
        }
    });

    return blocks.join("\n\n");
}

export function buildCertificatesOutputHighlights(documents) {
    const validDocs = resolveCertificateIdentities([...documents]).filter(isCompleteCertificate).sort(compareCertificates);
    const groups = new Map();
    for (const doc of validDocs) {
        const key = getCertificateGroupKey(doc);
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(doc);
    }

    const highlights = [];
    groups.forEach((docs) => {
        const commonIssueDate = getCommonIssueDate(docs);
        docs.forEach((doc) => {
            const isPositive = doc.status === "positiva" || doc.status === "positiva com efeitos de negativa";
            const isExpired = doc.validityState === "vencida";
            if (!isPositive && !isExpired) return;
            highlights.push({
                text: buildSentence(doc, { includeIssueDate: !commonIssueDate }),
                state: isExpired ? "expired" : "positive"
            });
        });
    });

    return highlights;
}

export function buildCertificateWarnings(documents) {
    const messages = [];
    const failures = documents.filter((doc) => doc.error).map((doc) => `${doc.fileName}: ${doc.error}`);
    if (failures.length) messages.push(`Alguns arquivos não foram lidos completamente. ${failures.join(" | ")}`);

    const expired = documents.filter((doc) => doc.validityState === "vencida").map((doc) => `${doc.fileName} venceu em ${doc.expiryDate}`);
    if (expired.length) messages.push(`Certidões vencidas identificadas: ${expired.join(" | ")}`);

    const notIssued = documents.filter((doc) => doc.status === "nao emitida").map((doc) => `${doc.fileName} não gerou certidão emitida por existir pendência no portal`);
    if (notIssued.length) messages.push(`Certidões não emitidas identificadas: ${notIssued.join(" | ")}`);

    return messages;
}

export function buildCertificateAlerts(documents) {
    const alerts = [];
    documents.forEach((doc) => {
        if (doc.validityState === "vencida") {
            alerts.push({ fileName: doc.fileName, message: `Certidão vencida${doc.expiryDate ? ` em ${doc.expiryDate}` : ""}.` });
        }
        if (doc.status === "positiva" || doc.status === "positiva com efeitos de negativa") {
            alerts.push({ fileName: doc.fileName, message: `Certidão ${doc.status}.` });
        }
        if (doc.status === "nao emitida") {
            alerts.push({ fileName: doc.fileName, message: "Pendências no portal impedem a emissão desta certidão estadual." });
        }
    });
    return alerts;
}

async function extractPdfText(file) {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
    const pageTexts = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pageTexts.push(content.items.map((item) => item.str || "").filter(Boolean).join(" "));
    }

    const text = normalizeSpaces(pageTexts.join("\n"));
    if (!text) throw new Error("O PDF não possui texto selecionável.");
    return text;
}

function sanitizeCertificate(doc) {
    if (doc.type === "municipal" && doc.number) doc.number = doc.number.replace(/\s+/g, "");
    if (doc.type === "federal" && doc.number) doc.number = doc.number.toUpperCase();
    if (doc.name) doc.name = normalizeName(doc.name);
    return doc;
}

export async function parseCertificateFile(file, id = 1) {
    const text = await extractPdfText(file);
    const type = detectType(text);
    const portalPendenciaEstadual = isPortalPendenciaEstadual(text, type);
    const status = portalPendenciaEstadual ? "nao emitida" : detectStatus(text);
    const extractedName = extractName(text);
    const issueDate = extractIssueDate(text, type);

    return sanitizeCertificate({
        id,
        fileName: file.name,
        text,
        type,
        status,
        extractedName,
        name: extractedName,
        cpf: extractCpf(text),
        number: extractNumber(text, type),
        issueDate,
        expiryDate: extractExpiryDate(text, type, issueDate),
        validityState: "",
        issuer: getIssuer(type),
        excludeFromOutput: portalPendenciaEstadual,
        note: portalPendenciaEstadual ? "Pendências no portal impedem a emissão da certidão estadual." : "",
        error: ""
    });
}

export async function parseCertificateFiles(files, options = {}) {
    const startId = Number(options.startId || 1);
    const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;
    const pdfFiles = Array.from(files || []).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    const documents = [];
    let nextId = startId;

    for (const [index, file] of pdfFiles.entries()) {
        onProgress?.({
            phase: "reading",
            fileName: file.name,
            index,
            completed: documents.length,
            total: pdfFiles.length
        });
        try {
            const parsed = await parseCertificateFile(file, nextId);
            parsed.validityState = getValidityState(parsed.expiryDate);
            documents.push(parsed);
        } catch (error) {
            documents.push({
                id: nextId,
                fileName: file.name,
                type: "desconhecido",
                status: "nao identificado",
                extractedName: "",
                name: "",
                cpf: "",
                number: "",
                issueDate: "",
                expiryDate: "",
                validityState: "nao identificada",
                issuer: "",
                excludeFromOutput: false,
                note: "",
                error: error?.message || "Erro ao processar arquivo."
            });
        } finally {
            onProgress?.({
                phase: "completed",
                fileName: file.name,
                index,
                completed: documents.length,
                total: pdfFiles.length
            });
            nextId += 1;
        }
    }

    resolveCertificateIdentities(documents);

    return {
        success: true,
        data: {
            documents,
            output: buildCertificatesOutput(documents),
            warnings: buildCertificateWarnings(documents),
            alerts: buildCertificateAlerts(documents)
        },
        documents,
        warnings: buildCertificateWarnings(documents),
        errors: documents.filter((doc) => doc.error).map((doc) => doc.error)
    };
}
