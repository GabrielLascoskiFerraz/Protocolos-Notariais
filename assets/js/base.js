(function () {
    const base = (window.BASE_URL || './').replace(/\\/g, '/');
    const normalized = base.endsWith('/') ? base : base + '/';

    window.BASE_URL = normalized;

    window.apiUrl = function (path) {
        const clean = String(path || '').replace(/^\/+/, '');
        return normalized + clean;
    };
})();
