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

</body>
</html>
