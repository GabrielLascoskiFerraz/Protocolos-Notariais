const base = (window.APOLLO_BASE_URL || window.BASE_URL || "./").replace(/\\/g, "/");
const normalizedBase = base.endsWith("/") ? base : `${base}/`;

export function apiUrl(path) {
    const clean = String(path || "").replace(/^\/+/, "");
    return normalizedBase + clean;
}

export function normalizeQrLink(rawValue) {
    const value = String(rawValue || "").trim();
    if (!value) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value;
    return `https://${value}`;
}

export function buildQrTimestampFileName(date = new Date()) {
    const parts = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
        String(date.getHours()).padStart(2, "0"),
        String(date.getMinutes()).padStart(2, "0"),
        String(date.getSeconds()).padStart(2, "0")
    ];

    return `QR_Code_${parts.join("")}`;
}

export function buildQrOptions({ data, image }) {
    return {
        width: 920,
        height: 920,
        type: "canvas",
        margin: 28,
        data,
        image,
        qrOptions: {
            errorCorrectionLevel: "H"
        },
        dotsOptions: {
            color: "#000000",
            type: "extra-rounded"
        },
        cornersSquareOptions: {
            color: "#000000",
            type: "extra-rounded"
        },
        cornersDotOptions: {
            color: "#000000",
            type: "dot"
        },
        backgroundOptions: {
            color: "#ffffff"
        },
        imageOptions: {
            hideBackgroundDots: true,
            imageSize: 0.26,
            margin: 10
        }
    };
}
