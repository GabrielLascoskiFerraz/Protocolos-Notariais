const toggle = document.getElementById('tools-menu-toggle');
const dropdown = document.getElementById('tools-menu-dropdown');

if (toggle && dropdown) {
    const closeMenu = () => {
        dropdown.classList.add('hidden');
        toggle.setAttribute('aria-expanded', 'false');
    };

    const openMenu = () => {
        dropdown.classList.remove('hidden');
        toggle.setAttribute('aria-expanded', 'true');
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
}
