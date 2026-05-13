const PROTOCOLS_ENDPOINT = new URL("api/protocolos_app.php", document.baseURI || window.location.href).toString();
const PROTOCOLS_CLIENT_KEY = "protocolos.clientId.v1";

function protocolsClientId() {
    try {
        const existing = window.sessionStorage.getItem(PROTOCOLS_CLIENT_KEY);
        if (existing) return existing;
        const next = window.crypto?.randomUUID?.() || `protocols-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        window.sessionStorage.setItem(PROTOCOLS_CLIENT_KEY, next);
        return next;
    } catch {
        return `protocols-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}

const PROTOCOLS_CLIENT_ID = protocolsClientId();

function protocolsServerUrl(params = {}) {
    const url = new URL(PROTOCOLS_ENDPOINT);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            url.searchParams.set(key, value);
        }
    });
    return url.toString();
}

async function parseApiResponse(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error || data.ok === false || data.success === false) {
        const error = new Error(data.detail || data.error || "Falha nos Protocolos.");
        error.status = response.status;
        error.data = data;
        throw error;
    }
    return data;
}

export async function apiGet(resource, params = {}) {
    const response = await fetch(protocolsServerUrl({
        ...params,
        resource,
        client_id: PROTOCOLS_CLIENT_ID
    }), { cache: "no-store" });
    return parseApiResponse(response);
}

export async function apiPost(resource, params = {}, body = {}) {
    const payload = new URLSearchParams();
    payload.set("client_id", PROTOCOLS_CLIENT_ID);
    payload.set("resource", resource);
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") payload.set(key, value);
    });
    Object.entries(body).forEach(([key, value]) => {
        if (value !== undefined && value !== null) payload.set(key, value);
    });

    const response = await fetch(PROTOCOLS_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body: payload
    });
    return parseApiResponse(response);
}
