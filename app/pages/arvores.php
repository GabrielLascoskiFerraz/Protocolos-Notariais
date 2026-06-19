<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../views/app-layout.php';

$scriptPath = 'assets/js/apps/arvores/index.js';
$stylePath = 'assets/css/arvores.css';

protocolos_render_head(
    'Árvores Genealógicas',
    'Ferramenta para montar e organizar árvores genealógicas.',
    $scriptPath . '?v=' . protocolos_asset_version($scriptPath),
    [
        'body_class' => 'protocolos-body genealogy-body',
        'extra_head' => [
            '<link rel="stylesheet" href="' . htmlspecialchars(
                $stylePath . '?v=' . protocolos_asset_version($stylePath),
                ENT_QUOTES,
                'UTF-8'
            ) . '">',
        ],
    ]
);

protocolos_render_app_start(
    'arvores.php',
    'Genealogia',
    'Árvores Genealógicas',
    '',
    [],
    ['page_class' => 'page-genealogy', 'hide_header' => true]
);

require __DIR__ . '/../views/genealogy-app.php';

protocolos_render_app_end();
