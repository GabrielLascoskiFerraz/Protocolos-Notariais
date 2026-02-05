(function () {
    const containerId = 'toast-container';

    function ensureContainer() {
        let el = document.getElementById(containerId);
        if (!el) {
            el = document.createElement('div');
            el.id = containerId;
            el.setAttribute('aria-live', 'polite');
            el.setAttribute('aria-atomic', 'true');
            document.body.appendChild(el);
        }
        return el;
    }

    window.showToast = function (message, type = 'info', timeout = 2200) {
        const container = ensureContainer();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 250);
        }, timeout);
    };
})();
