import {
    apiUrl,
    buildQrOptions,
    buildQrTimestampFileName,
    normalizeQrLink
} from "../../functions/qrcode/index.js";

const linkInput = document.getElementById('qr-link');
const generateButton = document.getElementById('generate-qr');
const downloadButton = document.getElementById('download-qr');
const feedback = document.getElementById('qr-feedback');
const placeholder = document.getElementById('qr-placeholder');
const output = document.getElementById('qr-output');
const targetText = document.getElementById('qr-target');

const logoPath = apiUrl('assets/img/logo-cartorio-mono.svg');

let qrCode = null;
let hasRendered = false;
let generatedLink = '';
let logoDataUri = '';

function setFeedback(message, type = 'info') {
    if (!feedback) return;
    feedback.textContent = message;
    feedback.dataset.state = type;
}

function ensureQrLibrary() {
    if (typeof window.QRCodeStyling === 'function') {
        return true;
    }

    setFeedback('Nao foi possivel carregar a biblioteca de QR Code. Verifique a conexao com a internet e recarregue a pagina.', 'error');
    return false;
}

async function ensureLogoDataUri() {
    if (logoDataUri) {
        return logoDataUri;
    }

    const response = await fetch(logoPath, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Nao foi possivel carregar a marca central do QR Code.');
    }

    const svg = await response.text();
    logoDataUri = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    return logoDataUri;
}

function resetPreview(message = '', type = 'info') {
    if (placeholder) {
        placeholder.classList.remove('hidden');
    }

    if (output) {
        output.classList.add('hidden');
    }

    if (downloadButton) {
        downloadButton.disabled = true;
    }

    if (targetText) {
        targetText.textContent = 'Nenhum link gerado.';
    }

    generatedLink = '';
    hasRendered = false;
    setFeedback(message, type);
}

function createQrInstance(imageSource) {
    qrCode = new window.QRCodeStyling(buildQrOptions({
        data: 'https://cartorio.local',
        image: imageSource
    }));

    qrCode.append(output);
}

async function renderQr() {
    if (!ensureQrLibrary()) return;

    const normalizedLink = normalizeQrLink(linkInput?.value);

    if (!normalizedLink) {
        resetPreview('Informe um link para gerar o QR Code.', 'error');
        return;
    }

    try {
        new URL(normalizedLink);
    } catch (error) {
        resetPreview('O link informado nao parece valido.', 'error');
        return;
    }

    try {
        const imageSource = await ensureLogoDataUri();

        if (!qrCode) {
            createQrInstance(imageSource);
        }

        qrCode.update({
            data: normalizedLink,
            image: imageSource
        });

        if (placeholder) {
            placeholder.classList.add('hidden');
        }

        output.classList.remove('hidden');
        targetText.textContent = normalizedLink;
        downloadButton.disabled = false;
        generatedLink = normalizedLink;
        hasRendered = true;
        setFeedback('QR Code gerado com sucesso.', 'success');
    } catch (error) {
        resetPreview(error.message || 'Nao foi possivel gerar o QR Code.', 'error');
    }
}

function downloadQr() {
    if (!qrCode || !hasRendered) return;

    qrCode.download({
        name: buildQrTimestampFileName(),
        extension: 'png'
    });
}

if (generateButton) {
    generateButton.addEventListener('click', renderQr);
}

if (downloadButton) {
    downloadButton.addEventListener('click', downloadQr);
}

if (linkInput) {
    linkInput.addEventListener('input', () => {
        const normalizedLink = normalizeQrLink(linkInput.value);

        if (!generatedLink || normalizedLink === generatedLink) {
            return;
        }

        resetPreview('Link alterado. Gere novamente para atualizar o QR Code.', 'info');
    });

    linkInput.addEventListener('keydown', (event) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
            void renderQr();
        }
    });
}

if (!ensureQrLibrary()) {
    if (generateButton) {
        generateButton.disabled = true;
    }
    if (downloadButton) {
        downloadButton.disabled = true;
    }
}
