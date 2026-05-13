<?php
/**
 * Configuração das raízes permitidas para pastas de documentos.
 *
 * Em produção Windows, mantenha o caminho UNC abaixo ou sobrescreva com a
 * variável de ambiente PROTOCOLOS_DOCUMENTOS_BASE.
 *
 * Para testes locais, também é possível informar raízes adicionais em
 * PROTOCOLOS_DOCUMENTOS_EXTRA_BASES, separadas por PATH_SEPARATOR
 * (: no macOS/Linux, ; no Windows).
 */

$defaultBasePath = getenv('PROTOCOLOS_DOCUMENTOS_BASE')
    ?: '\\\\Srv01\\d\\Disco F\\A FAZER - ESCRITURAS';

$extraBasePaths = array_filter(array_map(
    static fn ($path) => trim((string) $path),
    explode(PATH_SEPARATOR, (string) (getenv('PROTOCOLOS_DOCUMENTOS_EXTRA_BASES') ?: ''))
));

$localTestBasePath = '/Users/gabriel/Downloads';
$projectTestBasePath = dirname(__DIR__) . '/documentos-teste';

$allowedBasePaths = array_values(array_unique(array_filter(array_merge(
    [$defaultBasePath],
    $extraBasePaths,
    [$localTestBasePath, $projectTestBasePath]
))));

return [
    'base_path' => $defaultBasePath,
    'allowed_base_paths' => $allowedBasePaths,
    'max_items' => 600,
];
