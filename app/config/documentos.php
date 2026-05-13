<?php
if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}

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

require_once __DIR__ . '/settings.php';

$settings = protocolos_settings_read();
$defaultBasePath = (string) ($settings['documentos_base_path'] ?? '');

$extraBasePaths = array_filter(array_map(
    static fn ($path) => trim((string) $path),
    explode(PATH_SEPARATOR, (string) (getenv('PROTOCOLOS_DOCUMENTOS_EXTRA_BASES') ?: ''))
));
$settingsExtraBasePaths = $settings['documentos_extra_base_paths'] ?? [];
if (!is_array($settingsExtraBasePaths)) {
    $settingsExtraBasePaths = [];
}

$localDevBasePath = trim((string) (getenv('PROTOCOLOS_DOCUMENTOS_DEV_BASE') ?: ''));
$projectTestBasePath = dirname(__DIR__, 2) . '/storage/documentos-teste';

$allowedBasePaths = array_values(array_unique(array_filter(array_merge(
    [$defaultBasePath],
    $extraBasePaths,
    $settingsExtraBasePaths,
    [$localDevBasePath, $projectTestBasePath]
))));

return [
    'base_path' => $defaultBasePath,
    'allowed_base_paths' => $allowedBasePaths,
    'max_items' => (int) ($settings['documentos_max_items'] ?? 600),
];
