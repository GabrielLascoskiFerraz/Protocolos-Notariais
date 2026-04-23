<?php
require __DIR__ . '/config/db.php';

$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$baseHref = ($basePath === '') ? '/' : $basePath . '/';

$board = [
    'PARA_DISTRIBUIR' => [],
    'EM_ANDAMENTO'   => [],
    'PARA_CORRECAO'  => [],
    'LAVRADOS'       => [],
    'ARQUIVADOS'     => []
];

$atosRaw = $pdo->query("
    SELECT DISTINCT ato
    FROM protocolos
    WHERE deletado = 0 AND ato IS NOT NULL AND ato <> ''
")->fetchAll(PDO::FETCH_COLUMN);

$atosMap = [];
foreach ($atosRaw as $ato) {
    $key = mb_strtolower(trim($ato), 'UTF-8');
    if ($key === '') continue;
    if (!isset($atosMap[$key])) {
        $atosMap[$key] = $ato;
    }
}
ksort($atosMap, SORT_NATURAL | SORT_FLAG_CASE);

$digitadores = $pdo->query("
    SELECT DISTINCT digitador
    FROM protocolos
    WHERE deletado = 0 AND digitador IS NOT NULL AND digitador <> ''
    ORDER BY digitador
")->fetchAll(PDO::FETCH_COLUMN);

$tagsRaw = $pdo->query("
    SELECT DISTINCT tag_custom
    FROM protocolos
    WHERE deletado = 0 AND tag_custom IS NOT NULL AND tag_custom <> ''
")->fetchAll(PDO::FETCH_COLUMN);

$tagsMap = [];
foreach ($tagsRaw as $tag) {
    $key = mb_strtolower(trim($tag), 'UTF-8');
    if ($key === '') continue;
    if (!isset($tagsMap[$key])) {
        $tagsMap[$key] = $tag;
    }
}
ksort($tagsMap, SORT_NATURAL | SORT_FLAG_CASE);
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Protocolos Notariais</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <base href="<?= htmlspecialchars($baseHref) ?>">

    <link rel="icon" href="assets/img/logo.png">
    <link rel="stylesheet" href="assets/css/style.css">

    <script>window.BASE_URL = <?= json_encode($baseHref) ?>;</script>
    <script type="module" src="assets/js/board.js"></script>
    <script type="module" src="assets/js/modal.js"></script>
    <script type="module" src="assets/js/autosave.js"></script>
    <script type="module" src="assets/js/search.js"></script>
    <script type="module" src="assets/js/tags.js"></script>
</head>

<body>

<header class="topbar">
    <h1>Protocolos</h1>
    <div class="search-wrapper">
        <input
            type="search"
            id="search"
            placeholder="Buscar por ficha, apresentante, outorgante, outorgado, digitador ou ato…"
            autocomplete="off"
        >
    </div>
    <div class="filters">
        <select id="filter-ato">
            <option value="">Todos os atos</option>
            <?php foreach ($atosMap as $key => $ato): ?>
                <option value="<?= htmlspecialchars($key) ?>"><?= htmlspecialchars($ato) ?></option>
            <?php endforeach; ?>
        </select>
        <select id="filter-urgente">
            <option value="">Todos</option>
            <option value="1">Somente urgentes</option>
        </select>
        <select id="filter-tag">
            <option value="">Todas as tags</option>
            <?php foreach ($tagsMap as $key => $tag): ?>
                <option value="<?= htmlspecialchars($key) ?>"><?= htmlspecialchars($tag) ?></option>
            <?php endforeach; ?>
        </select>
        <select id="filter-digitador">
            <option value="">Todos os digitadores</option>
            <?php foreach ($digitadores as $dig): ?>
                <option value="<?= htmlspecialchars($dig) ?>"><?= htmlspecialchars($dig) ?></option>
            <?php endforeach; ?>
        </select>
    </div>
    <button id="toggle-archived" class="btn-toggle-archived" aria-expanded="false" type="button">
        Mostrar arquivados
    </button>
    <div class="topbar-tools-menu">
        <button
            id="tools-menu-toggle"
            class="btn-secondary topbar-link topbar-icon-link"
            type="button"
            aria-label="Abrir menu de ferramentas"
            title="Ferramentas"
            aria-haspopup="true"
            aria-expanded="false"
        >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 7a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5A1 1 0 0 1 4 7Zm0 5a1 1 0 0 1 1-1h14a1 1 0 1 1 0 2H5a1 1 0 0 1-1-1Zm1 4a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H5Z" fill="currentColor"/>
            </svg>
        </button>
        <div id="tools-menu-dropdown" class="tools-menu-dropdown hidden" role="menu" aria-label="Ferramentas rápidas">
            <a class="tools-menu-item" href="gerador-qrcode.php" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M3 3h8v8H3V3Zm2 2v4h4V5H5Zm8-2h8v8h-8V3Zm2 2v4h4V5h-4ZM3 13h8v8H3v-8Zm2 2v4h4v-4H5Zm10-2h2v2h-2v-2Zm-2 2h2v2h-2v-2Zm4 0h4v2h-4v-2Zm-2 2h2v2h-2v-2Zm4 0h2v4h-2v-4Zm-6 2h4v2h-4v-2Z" fill="currentColor"/>
                </svg>
                <span>Gerador de QR Code</span>
            </a>
            <a class="tools-menu-item" href="certidoes.php" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M7 3a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9.41a2 2 0 0 0-.59-1.41l-3.41-3.41A2 2 0 0 0 13.59 4H7Zm6 1.5V8a1 1 0 0 0 1 1h3.5V19a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V5A.5.5 0 0 1 7 4.5h6ZM8.75 12.5a.75.75 0 0 1 .75-.75h5a.75.75 0 0 1 0 1.5h-5a.75.75 0 0 1-.75-.75Zm0 3a.75.75 0 0 1 .75-.75h5.75a.75.75 0 0 1 0 1.5H9.5a.75.75 0 0 1-.75-.75Z" fill="currentColor"/>
                </svg>
                <span>Leitor de Certidões</span>
            </a>
            <a class="tools-menu-item" href="calendario.php" role="menuitem">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <path d="M7 2a1 1 0 0 1 1 1v1h8V3a1 1 0 1 1 2 0v1h1.5A2.5 2.5 0 0 1 22 6.5v12A2.5 2.5 0 0 1 19.5 21h-15A2.5 2.5 0 0 1 2 18.5v-12A2.5 2.5 0 0 1 4.5 4H6V3a1 1 0 0 1 1-1Zm12.5 8h-15v8.5a.5.5 0 0 0 .5.5h14a.5.5 0 0 0 .5-.5V10ZM5 6a.5.5 0 0 0-.5.5V8h15V6.5A.5.5 0 0 0 19 6H5Zm2 7h3v3H7v-3Zm5 0h3v3h-3v-3Z" fill="currentColor"/>
                </svg>
                <span>Consultar Agenda</span>
            </a>
        </div>
    </div>
    <div id="active-filters" class="filter-chips"></div>
</header>

<main>
    <?php include __DIR__ . '/components/board.php'; ?>
</main>

<?php include __DIR__ . '/components/modal.php'; ?>

<div id="toast-container" aria-live="polite" aria-atomic="true"></div>

<!-- Template reutilizado pelo JS para criar cards (fonte unica de estrutura) -->
<template id="card-template">
    <div class="card card-appear" draggable="true">
        <div class="card-tag"></div>
        <div class="card-body">
            <div class="card-ficha"></div>
            <div class="card-apresentante"><span class="card-icon">👤</span><span class="card-text"></span></div>
            <div class="card-digitador"><span class="card-icon">⌨️</span><span class="card-text"></span></div>
            <div class="card-outorgantes"><span class="card-icon">📝</span><span class="card-text"></span></div>
            <div class="card-outorgados"><span class="card-icon">🧾</span><span class="card-text"></span></div>
            <div class="card-data"><span class="card-icon">📅</span><span class="card-text"></span></div>
        </div>
        <div class="card-footer">
            <div class="card-actions"></div>
            <div class="card-valores"></div>
            <div class="card-handle" title="Arrastar">⋮⋮</div>
        </div>
    </div>
</template>

<script type="module" src="assets/js/tools-menu.js"></script>

</body>
</html>
