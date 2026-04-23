const toggle = document.getElementById('tools-menu-toggle');
const dropdown = document.getElementById('tools-menu-dropdown');
const densityMinus = document.getElementById('ui-density-minus');
const densityPlus = document.getElementById('ui-density-plus');
const densityReset = document.getElementById('ui-density-reset');
const densityLabel = document.getElementById('ui-density-label');

const densityStorageKey = 'protocolos.ui.scale.v1';
const densityLevels = [-1, 0, 1, 2];
const densityLabels = {
    '-1': 'Compacta',
    0: 'Padrão',
    1: 'Confortável',
    2: 'Ampla',
};
const dropdownMargin = 12;
const dropdownOffset = 10;

function clampDensity(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(densityLevels[0], Math.min(densityLevels[densityLevels.length - 1], Math.trunc(number)));
}

function currentDensity() {
    try {
        return clampDensity(document.documentElement.dataset.uiScale || localStorage.getItem(densityStorageKey) || 0);
    } catch {
        return clampDensity(document.documentElement.dataset.uiScale || 0);
    }
}

function applyDensity(value) {
    const level = clampDensity(value);
    document.documentElement.dataset.uiScale = String(level);

    try {
        localStorage.setItem(densityStorageKey, String(level));
    } catch {
        // A preferência é opcional; se o navegador bloquear storage, aplica só na sessão atual.
    }

    if (densityLabel) {
        densityLabel.textContent = densityLabels[level] || densityLabels[0];
    }

    if (densityMinus) densityMinus.disabled = level <= densityLevels[0];
    if (densityPlus) densityPlus.disabled = level >= densityLevels[densityLevels.length - 1];
}

applyDensity(currentDensity());

function changeDensity(delta) {
    applyDensity(currentDensity() + delta);
    requestAnimationFrame(positionDropdown);
}

function positionDropdown() {
    if (!toggle || !dropdown || dropdown.classList.contains('hidden')) return;

    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const viewportHeight = document.documentElement.clientHeight || window.innerHeight;
    const toggleRect = toggle.getBoundingClientRect();
    dropdown.style.left = '0px';
    dropdown.style.right = 'auto';
    dropdown.style.width = `${Math.min(300, Math.max(220, viewportWidth - (dropdownMargin * 2)))}px`;
    dropdown.style.maxWidth = `${Math.max(220, viewportWidth - (dropdownMargin * 2))}px`;
    dropdown.style.top = `${toggleRect.bottom + dropdownOffset}px`;
    dropdown.style.bottom = '';
    dropdown.style.maxHeight = '';

    const dropdownRect = dropdown.getBoundingClientRect();
    const dropdownWidth = Math.min(dropdownRect.width, viewportWidth - (dropdownMargin * 2));
    const maxLeft = Math.max(dropdownMargin, viewportWidth - dropdownWidth - dropdownMargin);
    const left = Math.min(Math.max(dropdownMargin, toggleRect.right - dropdownWidth), maxLeft);

    dropdown.style.left = `${left}px`;

    const availableBelow = viewportHeight - toggleRect.bottom - dropdownOffset - dropdownMargin;
    const availableAbove = toggleRect.top - dropdownOffset - dropdownMargin;

    if (dropdownRect.height > availableBelow && availableAbove > availableBelow) {
        dropdown.style.top = '';
        dropdown.style.bottom = `${Math.max(dropdownMargin, viewportHeight - toggleRect.top + dropdownOffset)}px`;
        dropdown.style.maxHeight = `${Math.max(180, availableAbove)}px`;
    } else {
        dropdown.style.maxHeight = `${Math.max(180, availableBelow)}px`;
    }
}

if (toggle && dropdown) {
    const closeMenu = () => {
        dropdown.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
        dropdown.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
        requestAnimationFrame(positionDropdown);
    };

    toggle.addEventListener('click', (event) => {
        event.stopPropagation();
        if (dropdown.classList.contains('hidden')) {
            openMenu();
        } else {
            closeMenu();
        }
    });

    dropdown.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    document.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });

    window.addEventListener('resize', positionDropdown);
    window.addEventListener('scroll', positionDropdown, true);
}

densityMinus?.addEventListener('click', () => changeDensity(-1));
densityPlus?.addEventListener('click', () => changeDensity(1));
densityReset?.addEventListener('click', () => applyDensity(0));
