import {
    TYPE_LABELS,
    buildCertificateAlerts,
    buildCertificateWarnings,
    buildCertificatesOutput,
    buildCertificatesOutputHighlights,
    getStatusBadgeClass,
    getStatusLabel,
    getValidityBadgeClass,
    getValidityLabel,
    parseCertificateFiles,
    resolveCertificateIdentities
} from "../../features/certidoes/index.js";

const fileInput = document.getElementById("cert-file-input");
const dropzone = document.getElementById("cert-dropzone");
const resultsEl = document.getElementById("cert-results");
const outputEl = document.getElementById("cert-output");
const outputHighlightEl = document.getElementById("cert-output-highlight");
const copyBtn = document.getElementById("cert-copy");
const clearBtn = document.getElementById("cert-clear");
const warningBox = document.getElementById("cert-warning");
const processingBox = document.getElementById("cert-processing");
const processingText = document.getElementById("cert-processing-text");
const alertModal = document.getElementById("cert-alert-modal");
const alertOverlay = document.getElementById("cert-alert-overlay");
const alertCloseBtn = document.getElementById("cert-alert-close");
const alertList = document.getElementById("cert-alert-list");
let alertCloseTimer = 0;

let parsedDocs = [];
let nextDocId = 1;
let processingState = {
    active: false,
    total: 0,
    completed: 0,
    fileName: ""
};

function escapeHtml(text) {
    return String(text || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function certIcon(name) {
    const icons = {
        file: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z"></path><path d="M14 4.5V9h4"></path></svg>',
        type: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6.5 5.5h11a2 2 0 0 1 2 2v11l-3-1.5-3 1.5-3-1.5-3 1.5v-11a2 2 0 0 1 2-2Z"></path><path d="M9.5 9.5h5"></path><path d="M9.5 12.5h5"></path></svg>',
        user: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"></path><path d="M5 20a7 7 0 0 1 14 0"></path></svg>',
        id: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4.5" y="6.5" width="15" height="11" rx="2"></rect><path d="M8.5 10.5h3.5"></path><path d="M8.5 13.5h7"></path><path d="M15.5 10.5h.01"></path></svg>',
        number: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8.5 4.5 6.5 19.5"></path><path d="M17.5 4.5l-2 15"></path><path d="M5 9h14"></path><path d="M4 15h14"></path></svg>',
        issuer: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 20.5h15"></path><path d="M6 17.5h12"></path><path d="M7.5 17.5v-7"></path><path d="M12 17.5v-7"></path><path d="M16.5 17.5v-7"></path><path d="M4.5 10.5 12 5l7.5 5.5Z"></path></svg>',
        calendar: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4" y="5.5" width="16" height="14" rx="2"></rect><path d="M8 3.5v4"></path><path d="M16 3.5v4"></path><path d="M4 9.5h16"></path></svg>',
        check: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 7 10 17l-5-5"></path><path d="M4.5 19.5h15"></path></svg>',
        note: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 4.5h10A1.5 1.5 0 0 1 18.5 6v12L14 14.5H7A1.5 1.5 0 0 1 5.5 13V6A1.5 1.5 0 0 1 7 4.5Z"></path></svg>',
        trash: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4.5 7.5h15"></path><path d="M9 7.5v-2h6v2"></path><path d="M8 10.5v6"></path><path d="M12 10.5v6"></path><path d="M16 10.5v6"></path><path d="M6.5 7.5 7.2 19a1.5 1.5 0 0 0 1.5 1.4h6.6a1.5 1.5 0 0 0 1.5-1.4l.7-11.5"></path></svg>'
    };

    return `<span class="cert-inline-icon cert-inline-icon-${escapeHtml(name)}">${icons[name] || icons.file}</span>`;
}

function certMeta(icon, label, value) {
    return `
        <div class="cert-meta-item">
            ${certIcon(icon)}
            <div>
                <strong>${escapeHtml(label)}</strong>
                <span>${escapeHtml(value)}</span>
            </div>
        </div>
    `;
}

function renderOutputHighlights(value = outputEl?.value || "") {
    if (!outputHighlightEl) return;
    const highlights = buildCertificatesOutputHighlights(parsedDocs).filter((item) => item.text);
    let cursor = 0;
    let html = "";

    highlights.forEach((item) => {
        const index = value.indexOf(item.text, cursor);
        if (index === -1) return;
        html += escapeHtml(value.slice(cursor, index));
        html += `<mark class="cert-output-mark cert-output-mark-${escapeHtml(item.state)}">${escapeHtml(item.text)}</mark>`;
        cursor = index + item.text.length;
    });

    html += escapeHtml(value.slice(cursor));
    outputHighlightEl.innerHTML = html || "";
    outputHighlightEl.scrollTop = outputEl?.scrollTop || 0;
    outputHighlightEl.scrollLeft = outputEl?.scrollLeft || 0;
}

function certCardState(doc) {
    if (doc.validityState === "vencida") return "is-expired";
    if (doc.status === "positiva" || doc.status === "positiva com efeitos de negativa") return "is-positive";
    if (doc.status === "nao emitida") return "is-warning";
    return "";
}

function showWarning(message) {
    if (!warningBox) return;
    warningBox.textContent = message;
    warningBox.classList.remove("hidden");
}

function hideWarning() {
    if (!warningBox) return;
    warningBox.textContent = "";
    warningBox.classList.add("hidden");
}

function updateWarnings() {
    const messages = buildCertificateWarnings(parsedDocs);
    if (messages.length) {
        showWarning(messages.join(" "));
    } else {
        hideWarning();
    }
}

function processingLabel() {
    const total = Number(processingState.total || 0);
    const completed = Number(processingState.completed || 0);
    const current = Math.min(total, completed + 1);
    const fileName = processingState.fileName ? ` ${processingState.fileName}` : "";
    if (!total) return "Preparando leitura dos PDFs.";
    if (completed >= total) return `Finalizando ${total} ${total === 1 ? "PDF" : "PDFs"} e montando o texto.`;
    return `Lendo ${current} de ${total}:${fileName}`;
}

function setProcessingState(nextState) {
    processingState = { ...processingState, ...nextState };
    const active = Boolean(processingState.active);

    if (processingBox) {
        processingBox.classList.toggle("hidden", !active);
    }
    if (processingText && active) {
        processingText.textContent = processingLabel();
    }
    if (dropzone) {
        dropzone.classList.toggle("is-processing", active);
        dropzone.setAttribute("aria-busy", active ? "true" : "false");
    }
    if (fileInput) fileInput.disabled = active;
    if (copyBtn) copyBtn.disabled = active;
    if (clearBtn) clearBtn.disabled = active;

    renderResults();
}

function resetProcessingState() {
    setProcessingState({
        active: false,
        total: 0,
        completed: 0,
        fileName: ""
    });
}

function renderProcessingCard() {
    const total = Number(processingState.total || 0);
    const completed = Math.min(Number(processingState.completed || 0), total || 0);
    const percent = total ? Math.max(8, Math.round((completed / total) * 100)) : 12;

    return `
        <article class="cert-result-item cert-processing-card" aria-live="polite">
            <div class="cert-processing-card-head">
                <span class="cert-processing-spinner" aria-hidden="true"></span>
                <div>
                    <strong>Processando PDFs</strong>
                    <span>${escapeHtml(processingLabel())}</span>
                </div>
            </div>
            <div class="cert-processing-bar" aria-hidden="true">
                <span style="width: ${percent}%"></span>
            </div>
            <div class="cert-processing-lines" aria-hidden="true">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </article>
    `;
}

function openAlertModal(items) {
    if (!alertModal || !alertList || !items.length) return;
    window.clearTimeout(alertCloseTimer);
    alertList.innerHTML = items.map((item) => `
        <div class="cert-alert-item">
            <div class="cert-alert-item-title">${escapeHtml(item.fileName)}</div>
            <div class="cert-alert-item-meta">${escapeHtml(item.message)}</div>
        </div>
    `).join("");
    alertModal.classList.remove("is-closing");
    alertModal.classList.remove("hidden");
    if (typeof alertModal.showModal === "function" && !alertModal.open) {
        alertModal.showModal();
    }
    alertModal.classList.add("is-opening");
    alertModal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    window.setTimeout(() => alertModal.classList.remove("is-opening"), 260);
}

function closeAlertModal() {
    if (!alertModal || alertModal.classList.contains("hidden") || alertModal.classList.contains("is-closing")) return;
    alertModal.classList.remove("is-opening");
    alertModal.classList.add("is-closing");
    window.clearTimeout(alertCloseTimer);
    alertCloseTimer = window.setTimeout(() => {
        if (typeof alertModal.close === "function" && alertModal.open) {
            alertModal.close();
        }
        alertModal.classList.add("hidden");
        alertModal.classList.remove("is-closing");
        alertModal.setAttribute("aria-hidden", "true");
        document.body.style.overflow = "";
    }, 200);
}

function renderResults() {
    if (!resultsEl) return;
    resultsEl.innerHTML = "";

    if (processingState.active) {
        resultsEl.insertAdjacentHTML("beforeend", renderProcessingCard());
    }

    if (!parsedDocs.length) {
        if (!processingState.active) {
            resultsEl.innerHTML = '<div class="cert-result-item"><div class="cert-empty-state">Nenhum arquivo processado ainda.</div></div>';
        }
        return;
    }

    parsedDocs.forEach((doc) => {
        const item = document.createElement("article");
        item.className = `cert-result-item ${certCardState(doc)}`.trim();
        item.innerHTML = `
            <div class="cert-item-top">
                <div class="cert-file-heading">
                    ${certIcon("file")}
                    <div>
                        <div class="cert-file-name">${escapeHtml(doc.fileName)}</div>
                        <small>Certidão processada</small>
                    </div>
                    <div class="cert-item-tags">
                        <span class="cert-badge ${getStatusBadgeClass(doc.status)}">${escapeHtml(getStatusLabel(doc.status))}</span>
                        <span class="cert-badge ${getValidityBadgeClass(doc.validityState)}">${escapeHtml(getValidityLabel(doc.validityState))}</span>
                    </div>
                </div>
                <button type="button" class="cert-remove-btn" data-remove-cert-id="${escapeHtml(doc.id)}" aria-label="Excluir certidão">
                    ${certIcon("trash")}<span>Excluir</span>
                </button>
            </div>
            <div class="cert-meta-grid">
                ${certMeta("type", "Tipo", TYPE_LABELS[doc.type] || doc.type)}
                ${certMeta("user", "Nome", doc.name || "Não identificado")}
                ${certMeta("id", "CPF", doc.cpf || "Não identificado")}
                ${certMeta("number", "Número / código", doc.number || "Não identificado")}
                ${certMeta("issuer", "Órgão emissor", doc.issuer || "Não identificado")}
                ${certMeta("calendar", "Data de emissão", doc.issueDate || "Não identificado")}
                ${certMeta("check", "Validade", doc.expiryDate || "Não identificada")}
                ${certMeta("note", "Observação", doc.note || doc.error || "Leitura concluída")}
            </div>
        `;
        resultsEl.appendChild(item);
    });
}

function regenerateOutput() {
    resolveCertificateIdentities(parsedDocs);
    if (outputEl) {
        outputEl.value = buildCertificatesOutput(parsedDocs);
    }
    renderOutputHighlights();
}

async function handleFiles(files) {
    if (processingState.active) return;
    const pdfFiles = Array.from(files || []).filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (!pdfFiles.length) return;

    setProcessingState({
        active: true,
        total: pdfFiles.length,
        completed: 0,
        fileName: pdfFiles[0]?.name || ""
    });

    await new Promise((resolve) => requestAnimationFrame(() => resolve()));

    let result;
    try {
        result = await parseCertificateFiles(pdfFiles, {
            startId: nextDocId,
            onProgress: (progress) => {
                setProcessingState({
                    active: true,
                    total: progress.total,
                    completed: progress.completed,
                    fileName: progress.fileName || ""
                });
            }
        });
    } finally {
        resetProcessingState();
    }
    if (!result?.documents?.length) return;

    parsedDocs.push(...result.documents);
    nextDocId += result.documents.length;
    resolveCertificateIdentities(parsedDocs);
    updateWarnings();
    renderResults();
    regenerateOutput();

    const alerts = buildCertificateAlerts(result.documents);
    if (alerts.length) {
        openAlertModal(alerts);
    }
}

function removeDoc(docId) {
    parsedDocs = parsedDocs.filter((doc) => String(doc.id) !== String(docId));
    updateWarnings();
    renderResults();
    regenerateOutput();
    closeAlertModal();
}

async function copyOutput() {
    if (!outputEl || !outputEl.value.trim()) return;
    try {
        await navigator.clipboard.writeText(outputEl.value);
    } catch {
        outputEl.select();
        document.execCommand("copy");
    }

    if (copyBtn) {
        const label = copyBtn.querySelector("[data-button-label]");
        const original = label ? label.textContent : copyBtn.textContent;
        if (label) {
            label.textContent = "Copiado";
        } else {
            copyBtn.textContent = "Copiado";
        }
        window.setTimeout(() => {
            if (label) {
                label.textContent = original;
            } else {
                copyBtn.textContent = original;
            }
        }, 1500);
    }
}

function clearAll() {
    parsedDocs = [];
    resetProcessingState();
    hideWarning();
    closeAlertModal();
    renderResults();
    regenerateOutput();
}

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    window.addEventListener(eventName, (event) => event.preventDefault());
    document.addEventListener(eventName, (event) => event.preventDefault());
});

fileInput?.addEventListener("change", (event) => {
    void handleFiles(event.target.files || []);
    fileInput.value = "";
});

if (dropzone) {
    dropzone.addEventListener("click", (event) => {
        if (event.target.closest("button, label")) return;
        fileInput?.click();
    });

    dropzone.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInput?.click();
        }
    });

    dropzone.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragenter", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!dropzone.contains(event.relatedTarget)) {
            dropzone.classList.remove("dragover");
        }
    });

    dropzone.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        dropzone.classList.remove("dragover");
        void handleFiles(event.dataTransfer?.files || []);
    });
}

resultsEl?.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-cert-id]");
    if (!removeButton) return;
    removeDoc(removeButton.getAttribute("data-remove-cert-id"));
});

copyBtn?.addEventListener("click", () => void copyOutput());
clearBtn?.addEventListener("click", clearAll);
outputEl?.addEventListener("scroll", () => {
    if (!outputHighlightEl) return;
    outputHighlightEl.scrollTop = outputEl.scrollTop;
    outputHighlightEl.scrollLeft = outputEl.scrollLeft;
});
outputEl?.addEventListener("input", () => renderOutputHighlights());
alertCloseBtn?.addEventListener("click", closeAlertModal);
alertOverlay?.addEventListener("click", closeAlertModal);
alertModal?.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeAlertModal();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAlertModal();
});

renderResults();
