<?php
declare(strict_types=1);

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
        ['group' => 'Ferramentas', 'href' => 'certidoes.php', 'label' => 'Leitor de Certidões', 'short' => 'Certidões', 'icon' => 'certificate'],
        ['group' => 'Ferramentas', 'href' => 'gerador-qrcode.php', 'label' => 'Gerador de QR Code', 'short' => 'QR Code', 'icon' => 'qrcode'],
    ];
}

function protocolos_nav_icon_markup(string $icon): string
{
    $paths = [
        'protocols' => '<path d="M7.5 8.5h13"></path><path d="M7.5 13.5h13"></path><path d="M7.5 18.5h13"></path><path d="M5 6.5h18a1.8 1.8 0 0 1 1.8 1.8v11.4A1.8 1.8 0 0 1 23 21.5H5a1.8 1.8 0 0 1-1.8-1.8V8.3A1.8 1.8 0 0 1 5 6.5Z"></path><path d="M10.5 6.5v15"></path><path d="M17.5 6.5v15"></path>',
        'calendar' => '<rect x="6.5" y="7.5" width="15" height="13" rx="2"></rect><path d="M10 5.5v4"></path><path d="M18 5.5v4"></path><path d="M6.5 11h15"></path><path d="M10 14h2.2M15 14h2.2M10 17h2.2M15 17h2.2"></path>',
        'qrcode' => '<path d="M7.5 7.5h5v5h-5z"></path><path d="M15.5 7.5h5v5h-5z"></path><path d="M7.5 15.5h5v5h-5z"></path><path d="M16 16h1.8v1.8H16z"></path><path d="M19.3 16h1.2v4.5h-4.5v-1.2"></path>',
        'certificate' => '<path d="M8.5 6.5h11a2 2 0 0 1 2 2v13l-3-1.5-3 1.5-3-1.5-3 1.5-3-1.5v-13a2 2 0 0 1 2-2Z"></path><path d="M10.5 10.5h7"></path><path d="M10.5 13.5h7"></path><path d="M10.5 16.5h4"></path>',
        'tools' => '<path d="M7 9.5h7"></path><path d="M18 9.5h3"></path><circle cx="16" cy="9.5" r="1.8"></circle><path d="M7 14h3"></path><path d="M14 14h7"></path><circle cx="12" cy="14" r="1.8"></circle><path d="M7 18.5h8"></path><path d="M19 18.5h2"></path><circle cx="17" cy="18.5" r="1.8"></circle>',
    ];

    $content = $paths[$icon] ?? $paths['protocols'];
    return sprintf('<span class="studio-nav-icon" aria-hidden="true"><svg viewBox="0 0 28 28" focusable="false" role="img">%s</svg></span>', $content);
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
    $file = dirname(__DIR__) . '/' . ltrim($path, '/');
    if (!is_file($file)) {
        return (string) time();
    }
    return (string) filemtime($file) . '-' . substr((string) md5_file($file), 0, 8);
}

function protocolos_render_head(string $title, string $description, ?string $scriptPath = null, array $options = []): void
{
    $baseHref = protocolos_base_href();
    $bodyClass = trim('apollo-product-ui ' . (string) ($options['body_class'] ?? ''));
    $cssPath = 'assets/css/apollo-product.css';
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
    <link rel="stylesheet" href="<?= htmlspecialchars($cssPath . '?v=' . protocolos_asset_version($cssPath), ENT_QUOTES, 'UTF-8') ?>">
    <script>
        window.BASE_URL = <?= json_encode($baseHref) ?>;
        window.PROTOCOLOS_BASE_URL = window.BASE_URL;
        window.APOLLO_BASE_URL = window.BASE_URL;
    </script>
<?php foreach ($extraHead as $tag): ?>
    <?= $tag . PHP_EOL ?>
<?php endforeach; ?>
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
    <div class="apollo-studio">
        <header class="studio-topbar">
            <div class="studio-identity">
                <?= protocolos_brand_markup() ?>
            </div>

            <nav class="studio-switcher" aria-label="Navegação principal">
<?php
$dropdownGroups = [
    'Ferramentas' => ['label' => 'Ferramentas', 'icon' => 'tools', 'aria' => 'Ferramentas dos Protocolos'],
];
$dropdownRendered = [];
$currentGroup = null;
foreach ($navItems as $item):
    $group = (string) ($item['group'] ?? '');
    if (isset($dropdownGroups[$group])):
        if (!($dropdownRendered[$group] ?? false)):
            $dropdownRendered[$group] = true;
            $dropdownItems = array_values(array_filter($navItems, static fn (array $navItem): bool => ($navItem['group'] ?? '') === $group));
            $dropdownActive = in_array($activeHref, array_column($dropdownItems, 'href'), true);
            $dropdownMeta = $dropdownGroups[$group];
?>
                <div class="studio-tools-menu<?= $dropdownActive ? ' is-active' : '' ?>">
                    <button class="studio-switcher-link studio-tools-trigger<?= $dropdownActive ? ' is-active' : '' ?>" type="button" aria-haspopup="true" aria-expanded="false">
                        <?= protocolos_nav_icon_markup((string) $dropdownMeta['icon']) ?>
                        <span><?= htmlspecialchars((string) $dropdownMeta['label'], ENT_QUOTES, 'UTF-8') ?></span>
                        <span class="studio-tools-chevron" aria-hidden="true">⌄</span>
                    </button>
                    <div class="studio-tools-panel" role="menu" aria-label="<?= htmlspecialchars((string) $dropdownMeta['aria'], ENT_QUOTES, 'UTF-8') ?>">
<?php foreach ($dropdownItems as $tool): ?>
                        <a class="studio-tools-link<?= $activeHref === $tool['href'] ? ' is-active' : '' ?>" href="<?= htmlspecialchars($tool['href'], ENT_QUOTES, 'UTF-8') ?>" role="menuitem">
                            <?= protocolos_nav_icon_markup((string) ($tool['icon'] ?? 'protocols')) ?>
                            <span>
                                <strong><?= htmlspecialchars($tool['short'], ENT_QUOTES, 'UTF-8') ?></strong>
                                <small><?= htmlspecialchars($tool['label'], ENT_QUOTES, 'UTF-8') ?></small>
                            </span>
                        </a>
<?php endforeach; ?>
                    </div>
                </div>
<?php
        endif;
        continue;
    endif;
    if ($group !== '' && $group !== $currentGroup):
        $currentGroup = $group;
?>
                <span class="studio-switcher-group"><?= htmlspecialchars($currentGroup, ENT_QUOTES, 'UTF-8') ?></span>
<?php endif; ?>
                <a class="studio-switcher-link<?= $activeHref === $item['href'] ? ' is-active' : '' ?>" href="<?= htmlspecialchars($item['href'], ENT_QUOTES, 'UTF-8') ?>" title="<?= htmlspecialchars($item['label'], ENT_QUOTES, 'UTF-8') ?>">
                    <?= protocolos_nav_icon_markup((string) ($item['icon'] ?? 'protocols')) ?>
                    <span><?= htmlspecialchars($item['short'], ENT_QUOTES, 'UTF-8') ?></span>
                </a>
<?php endforeach; ?>
            </nav>
        </header>

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
