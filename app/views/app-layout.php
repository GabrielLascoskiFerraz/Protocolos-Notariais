<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}


function protocolos_base_href(): string
{
    $scriptName = str_replace('\\', '/', $_SERVER['SCRIPT_NAME'] ?? '/');
    $basePath = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
    return $basePath === '' ? '/' : $basePath . '/';
}

function protocolos_nav_items(): array
{
    return [
        ['group' => 'Trabalho', 'href' => 'index.php', 'label' => 'Protocolos', 'short' => 'Protocolos', 'icon' => 'protocols'],
        ['group' => 'Trabalho', 'href' => 'calendario.php', 'label' => 'Consultar Agenda', 'short' => 'Agenda', 'icon' => 'calendar'],
        ['group' => 'Trabalho', 'href' => 'arvores.php', 'label' => 'Árvores Genealógicas', 'short' => 'Árvores', 'icon' => 'tree'],
        ['group' => 'Ferramentas', 'href' => 'certidoes.php', 'label' => 'Leitor de Certidões', 'short' => 'Certidões', 'icon' => 'certificate'],
        ['group' => 'Ferramentas', 'href' => 'gerador-qrcode.php', 'label' => 'Gerador de QR Code', 'short' => 'QR Code', 'icon' => 'qrcode'],
        ['group' => 'Sistema', 'href' => 'configuracoes.php', 'label' => 'Configurações', 'short' => 'Configurações', 'icon' => 'settings'],
    ];
}

function protocolos_nav_icon_markup(string $icon): string
{
    $paths = [
        'protocols' => '<path d="M7.5 8.5h13"></path><path d="M7.5 13.5h13"></path><path d="M7.5 18.5h13"></path><path d="M5 6.5h18a1.8 1.8 0 0 1 1.8 1.8v11.4A1.8 1.8 0 0 1 23 21.5H5a1.8 1.8 0 0 1-1.8-1.8V8.3A1.8 1.8 0 0 1 5 6.5Z"></path><path d="M10.5 6.5v15"></path><path d="M17.5 6.5v15"></path>',
        'calendar' => '<rect x="6.5" y="7.5" width="15" height="13" rx="2"></rect><path d="M10 5.5v4"></path><path d="M18 5.5v4"></path><path d="M6.5 11h15"></path><path d="M10 14h2.2M15 14h2.2M10 17h2.2M15 17h2.2"></path>',
        'qrcode' => '<path d="M7.5 7.5h5v5h-5z"></path><path d="M15.5 7.5h5v5h-5z"></path><path d="M7.5 15.5h5v5h-5z"></path><path d="M16 16h1.8v1.8H16z"></path><path d="M19.3 16h1.2v4.5h-4.5v-1.2"></path>',
        'certificate' => '<path d="M8.5 6.5h11a2 2 0 0 1 2 2v13l-3-1.5-3 1.5-3-1.5-3 1.5-3-1.5v-13a2 2 0 0 1 2-2Z"></path><path d="M10.5 10.5h7"></path><path d="M10.5 13.5h7"></path><path d="M10.5 16.5h4"></path>',
        'tree' => '<path d="M14 23V10"></path><path d="M14 15c-4-.6-6.8-3.1-7.6-6.6 4.4-.4 7.1 2 7.6 6.6Z"></path><path d="M14 18.5c4.6-.5 7.5-3.1 8.3-7-4.8-.4-7.8 2.2-8.3 7Z"></path><path d="M14 10.5c2.8-.5 4.5-2.5 4.6-5.4-3.1.1-4.9 2.2-4.6 5.4Z"></path><path d="M10 23h8"></path>',
        'settings' => '<path d="M14 9.2a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6Z"></path><path d="M14 5.4v2.1M14 20.5v2.1M5.4 14h2.1M20.5 14h2.1M7.9 7.9l1.5 1.5M18.6 18.6l1.5 1.5M20.1 7.9l-1.5 1.5M9.4 18.6l-1.5 1.5"></path>',
        'tools' => '<path d="M7 9.5h7"></path><path d="M18 9.5h3"></path><circle cx="16" cy="9.5" r="1.8"></circle><path d="M7 14h3"></path><path d="M14 14h7"></path><circle cx="12" cy="14" r="1.8"></circle><path d="M7 18.5h8"></path><path d="M19 18.5h2"></path><circle cx="17" cy="18.5" r="1.8"></circle>',
    ];

    $content = $paths[$icon] ?? $paths['protocols'];
    return sprintf('<span class="studio-nav-icon" aria-hidden="true"><svg viewBox="0 0 28 28" focusable="false" role="img">%s</svg></span>', $content);
}

function protocolos_tool_icon_markup(string $icon, string $class = 'tool-inline-icon'): string
{
    $paths = [
        'alert' => '<path d="M12 4.5 20 19H4L12 4.5Z"></path><path d="M12 9.5v4.5"></path><path d="M12 17h.01"></path>',
        'clear' => '<path d="M5 7h14"></path><path d="M9 7V5h6v2"></path><path d="M8 10v8"></path><path d="M12 10v8"></path><path d="M16 10v8"></path><path d="M7 7l.7 13h8.6L17 7"></path>',
        'copy' => '<rect x="8" y="8" width="10" height="12" rx="2"></rect><path d="M6 16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"></path>',
        'download' => '<path d="M12 4v10"></path><path d="m8 10 4 4 4-4"></path><path d="M5 19h14"></path>',
        'file' => '<path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z"></path><path d="M14 4.5V9h4"></path>',
        'link' => '<path d="M10 13.5a4 4 0 0 0 5.7 0l2.2-2.2a4 4 0 0 0-5.7-5.7L11 6.8"></path><path d="M14 10.5a4 4 0 0 0-5.7 0l-2.2 2.2a4 4 0 0 0 5.7 5.7L13 17.2"></path>',
        'output' => '<path d="M6.5 4.5h11A1.5 1.5 0 0 1 19 6v12a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 18V6a1.5 1.5 0 0 1 1.5-1.5Z"></path><path d="M8.5 9h7"></path><path d="M8.5 12h7"></path><path d="M8.5 15h4"></path>',
        'pdf' => '<path d="M7 4.5h7l4 4V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 19V6A1.5 1.5 0 0 1 7.5 4.5Z"></path><path d="M14 4.5V9h4"></path><path d="M8.5 14.5h1.2a1.2 1.2 0 1 0 0-2.4H8.5v4.8"></path><path d="M12.3 12.1v4.8h1.1a2.4 2.4 0 0 0 0-4.8h-1.1Z"></path>',
        'qrcode' => '<path d="M4.5 4.5h6v6h-6z"></path><path d="M13.5 4.5h6v6h-6z"></path><path d="M4.5 13.5h6v6h-6z"></path><path d="M14 14h2v2h-2z"></path><path d="M18 14h1.5v5.5H14V18"></path>',
        'server' => '<rect x="5" y="4.5" width="14" height="5.5" rx="1.8"></rect><rect x="5" y="14" width="14" height="5.5" rx="1.8"></rect><path d="M8 7.25h.01"></path><path d="M8 16.75h.01"></path><path d="M11 7.25h5"></path><path d="M11 16.75h5"></path><path d="M12 10v4"></path>',
        'target' => '<circle cx="12" cy="12" r="7.5"></circle><circle cx="12" cy="12" r="3"></circle><path d="M12 2.5v3"></path><path d="M12 18.5v3"></path><path d="M2.5 12h3"></path><path d="M18.5 12h3"></path>',
        'upload' => '<path d="M12 16V4"></path><path d="m7.5 8.5 4.5-4.5 4.5 4.5"></path><path d="M5 19.5h14"></path>',
    ];

    $content = $paths[$icon] ?? $paths['file'];
    return sprintf(
        '<span class="%s" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false" role="img">%s</svg></span>',
        htmlspecialchars($class, ENT_QUOTES, 'UTF-8'),
        $content
    );
}

function protocolos_brand_markup(): string
{
    ob_start();
    ?>
    <a class="brand-block" href="index.php" aria-label="Ir para a página inicial dos Protocolos">
        <span class="brand-mark" aria-hidden="true">
            <svg class="brand-column-icon" viewBox="0 0 28 28" focusable="false" role="img">
                <path d="M7.2 5.6h13.6l1.8 2.3v1.2H5.4V7.9l1.8-2.3Z" fill="currentColor" opacity=".95"></path>
                <path d="M6.3 19.7h15.4l1.1 1.7v1H5.2v-1l1.1-1.7Z" fill="currentColor" opacity=".95"></path>
                <path d="M8 10.2h12v1.7H8v-1.7Z" fill="currentColor" opacity=".42"></path>
                <path d="M8.6 17.8h10.8v1.4H8.6v-1.4Z" fill="currentColor" opacity=".42"></path>
                <path d="M9.6 11.5h1.8v6.9H9.6v-6.9Zm3.1 0h2.6v6.9h-2.6v-6.9Zm3.9 0h1.8v6.9h-1.8v-6.9Z" fill="currentColor"></path>
            </svg>
        </span>
        <span class="brand-copy">
            <span class="eyebrow">Cartório</span>
            <strong>Protocolos</strong>
        </span>
    </a>
    <?php
    return (string) ob_get_clean();
}

function protocolos_asset_version(string $path): string
{
    $file = dirname(__DIR__, 2) . '/' . ltrim($path, '/');
    if (!is_file($file)) {
        return (string) time();
    }
    return (string) filemtime($file) . '-' . substr((string) md5_file($file), 0, 8);
}

function protocolos_render_head(string $title, string $description, ?string $scriptPath = null, array $options = []): void
{
    $baseHref = protocolos_base_href();
    $bodyClass = trim('protocolos-product-ui ' . (string) ($options['body_class'] ?? ''));
    $foundationCssPath = 'assets/css/protocolos-foundation.css';
    $redesignCssPath = 'assets/css/protocolos-redesign.css';
    $faviconPath = 'assets/img/favicon.svg';
    $faviconVersion = protocolos_asset_version($faviconPath);
    $extraHead = $options['extra_head'] ?? [];
    if (!is_array($extraHead)) {
        $extraHead = [$extraHead];
    }
    ?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="<?= htmlspecialchars($description, ENT_QUOTES, 'UTF-8') ?>">
    <title><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></title>
    <base href="<?= htmlspecialchars($baseHref, ENT_QUOTES, 'UTF-8') ?>">
    <link rel="icon" type="image/svg+xml" href="<?= htmlspecialchars($faviconPath . '?v=' . $faviconVersion, ENT_QUOTES, 'UTF-8') ?>">
    <link rel="shortcut icon" type="image/svg+xml" href="<?= htmlspecialchars($faviconPath . '?v=' . $faviconVersion, ENT_QUOTES, 'UTF-8') ?>">
    <link rel="apple-touch-icon" href="<?= htmlspecialchars($faviconPath . '?v=' . $faviconVersion, ENT_QUOTES, 'UTF-8') ?>">
    <script>
        (function () {
            try {
                var prefs = JSON.parse(localStorage.getItem('protocolos.userPreferences.v1') || '{}');
                var root = document.documentElement;
                var themePreference = ['system', 'light', 'dark'].indexOf(prefs.theme) >= 0 ? prefs.theme : 'system';
                var resolvedTheme = themePreference === 'system'
                    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
                    : themePreference;
                root.dataset.theme = resolvedTheme;
                root.dataset.themePreference = themePreference;
                root.dataset.density = ['compact', 'comfortable', 'spacious'].indexOf(prefs.density) >= 0 ? prefs.density : 'comfortable';
                root.style.colorScheme = resolvedTheme;
                var scale = Number(prefs.fontScale || 1);
                root.style.setProperty('--user-font-scale', String(Math.max(0.9, Math.min(1.18, scale))));
            } catch (error) {}
        })();
    </script>
    <link rel="stylesheet" href="<?= htmlspecialchars($foundationCssPath . '?v=' . protocolos_asset_version($foundationCssPath), ENT_QUOTES, 'UTF-8') ?>">
    <link rel="stylesheet" href="<?= htmlspecialchars($redesignCssPath . '?v=' . protocolos_asset_version($redesignCssPath), ENT_QUOTES, 'UTF-8') ?>">
    <script>
        window.BASE_URL = <?= json_encode($baseHref) ?>;
        window.PROTOCOLOS_BASE_URL = window.BASE_URL;
    </script>
<?php foreach ($extraHead as $tag): ?>
    <?= $tag . PHP_EOL ?>
<?php endforeach; ?>
    <script type="module" src="assets/js/shared/user-preferences.js?v=<?= htmlspecialchars(protocolos_asset_version('assets/js/shared/user-preferences.js'), ENT_QUOTES, 'UTF-8') ?>"></script>
<?php if ($scriptPath): ?>
    <script type="module" src="<?= htmlspecialchars($scriptPath, ENT_QUOTES, 'UTF-8') ?>"></script>
<?php endif; ?>
</head>
<body<?= $bodyClass ? ' class="' . htmlspecialchars($bodyClass, ENT_QUOTES, 'UTF-8') . '"' : '' ?>>
<?php
}

function protocolos_render_app_start(string $activeHref, string $eyebrow, string $title, string $description = '', array $actions = [], array $options = []): void
{
    $pageClass = trim((string) ($options['page_class'] ?? ''));
    $hideHeader = (bool) ($options['hide_header'] ?? false);
    $navItems = protocolos_nav_items();
    ?>
    <div class="protocolos-studio">
        <aside class="studio-topbar">
            <div class="studio-identity">
                <?= protocolos_brand_markup() ?>
            </div>

            <nav class="studio-switcher" aria-label="Navegação principal">
<?php foreach ($navItems as $item): ?>
                <a class="studio-switcher-link<?= $activeHref === $item['href'] ? ' is-active' : '' ?>" href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>" title="<?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>" data-nav-label="<?= htmlspecialchars($item['short'], ENT_QUOTES, 'UTF-8') ?>">
                    <?= protocolos_nav_icon_markup((string) ($item['icon'] ?? 'protocols')) ?>
                    <span><?= htmlspecialchars($item['short'], ENT_QUOTES, 'UTF-8') ?></span>
                </a>
<?php endforeach; ?>
            </nav>
        </aside>

        <div class="studio-workspace">
<?php if (!$hideHeader): ?>
            <header class="page-header">
                <div class="page-header-copy">
                    <span class="eyebrow"><?= htmlspecialchars($eyebrow, ENT_QUOTES, 'UTF-8') ?></span>
                    <h1><?= htmlspecialchars($title, ENT_QUOTES, 'UTF-8') ?></h1>
<?php if ($description !== ''): ?>
                    <p><?= htmlspecialchars($description, ENT_QUOTES, 'UTF-8') ?></p>
<?php endif; ?>
                </div>
<?php if ($actions): ?>
                <div class="page-header-actions">
                    <?= implode("\n", $actions) ?>
                </div>
<?php endif; ?>
            </header>
<?php endif; ?>
            <main class="page-shell<?= $pageClass ? ' ' . htmlspecialchars($pageClass, ENT_QUOTES, 'UTF-8') : '' ?>">
<?php
}

function protocolos_render_app_end(): void
{
    ?>
            </main>
        </div>
    </div>
</body>
</html>
<?php
}
