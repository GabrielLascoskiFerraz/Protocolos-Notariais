const base = (window.BASE_URL || './').replace(/\\/g, '/');
const normalized = base.endsWith('/') ? base : base + '/';

export const BASE_URL = normalized;

export function apiUrl(path) {
    const clean = String(path || '').replace(/^\/+/, '');
    return normalized + clean;
}

// Retrocompatibilidade: expor no window para onclick handlers inline do PHP
window.BASE_URL = normalized;
window.apiUrl = apiUrl;
