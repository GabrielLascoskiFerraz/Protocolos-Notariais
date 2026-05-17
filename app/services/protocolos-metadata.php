<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}


function protocolos_unique_case_insensitive(array $values): array
{
    $map = [];
    foreach ($values as $value) {
        $text = trim((string) $value);
        $key = mb_strtolower($text, 'UTF-8');
        if ($key === '' || isset($map[$key])) {
            continue;
        }
        $map[$key] = $text;
    }
    ksort($map, SORT_NATURAL | SORT_FLAG_CASE);
    return array_values($map);
}

function protocolos_build_board_metadata(PDO $pdo): array
{
    $atoColors = require dirname(__DIR__) . '/config/ato-cores.php';

    $atos = $pdo->query("\n        SELECT DISTINCT ato\n        FROM protocolos\n        WHERE deletado = 0 AND ato IS NOT NULL AND ato <> ''\n    ")->fetchAll(PDO::FETCH_COLUMN);

    $digitadores = $pdo->query("\n        SELECT DISTINCT digitador\n        FROM protocolos\n        WHERE deletado = 0 AND digitador IS NOT NULL AND digitador <> ''\n        ORDER BY digitador\n    ")->fetchAll(PDO::FETCH_COLUMN);

    $tags = $pdo->query("\n        SELECT DISTINCT tag_custom\n        FROM protocolos\n        WHERE deletado = 0 AND tag_custom IS NOT NULL AND tag_custom <> ''\n    ")->fetchAll(PDO::FETCH_COLUMN);

    return [
        'atos' => protocolos_unique_case_insensitive($atos),
        'atoOptions' => protocolos_unique_case_insensitive(array_merge(array_keys($atoColors), $atos)),
        'atoColors' => $atoColors,
        'digitadores' => array_values(array_filter(array_map('strval', $digitadores))),
        'tags' => protocolos_unique_case_insensitive($tags),
        'available' => true,
        'error' => '',
    ];
}
