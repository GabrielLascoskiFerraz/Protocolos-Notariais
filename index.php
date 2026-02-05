<?php
require __DIR__ . '/config/db.php';

$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$baseHref = ($basePath === '') ? '/' : $basePath . '/';

$stmt = $pdo->query("
    SELECT 
        p.*,
        COALESCE(SUM(v.valor),0) AS total_valores,
        t.cor AS tag_cor
    FROM protocolos p
    LEFT JOIN protocolos_valores v ON v.protocolo_id = p.id
    LEFT JOIN protocolos_tags t ON t.ato = p.ato
    WHERE p.deletado = 0
    GROUP BY p.id
    ORDER BY p.urgente DESC, p.id DESC
");

$protocolos = $stmt->fetchAll(PDO::FETCH_ASSOC);

$board = [
    'PARA_DISTRIBUIR' => [],
    'EM_ANDAMENTO'   => [],
    'PARA_CORRECAO'  => [],
    'LAVRADOS'       => [],
    'ARQUIVADOS'     => []
];

foreach ($protocolos as $p) {
    $board[$p['status']][] = $p;
}

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
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Protocolos Notariais</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <base href="<?= htmlspecialchars($baseHref) ?>">

    <link rel="stylesheet" href="assets/css/style.css">

    <script>window.BASE_URL = <?= json_encode($baseHref) ?>;</script>
    <script defer src="assets/js/base.js"></script>
    <script defer src="assets/js/board.js"></script>
    <script defer src="assets/js/modal.js"></script>
    <script defer src="assets/js/autosave.js"></script>
    <script defer src="assets/js/search.js"></script>
    <script defer src="assets/js/tags.js"></script>
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
</header>

<main>
    <?php include __DIR__ . '/components/board.php'; ?>
</main>

<?php include __DIR__ . '/components/modal.php'; ?>

</body>
</html>
