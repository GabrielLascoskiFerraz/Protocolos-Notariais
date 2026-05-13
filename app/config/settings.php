<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}

function protocolos_settings_file(): string
{
    return dirname(__DIR__, 2) . '/storage/server-settings.json';
}

function protocolos_settings_defaults(): array
{
    return [
        'calendar_ics_url' => getenv('PROTOCOLOS_CALENDAR_ICS_URL')
            ?: 'https://calendar.google.com/calendar/ical/2cartorio.irati%40gmail.com/private-d2973bdcdead518993031b26f88c612a/basic.ics',
        'calendar_cache_ttl_seconds' => 1800,
        'documentos_base_path' => getenv('PROTOCOLOS_DOCUMENTOS_BASE')
            ?: '\\\\Srv01\\d\\Disco F\\A FAZER - ESCRITURAS',
        'documentos_extra_base_paths' => [],
        'documentos_max_items' => 600,
    ];
}

function protocolos_settings_sanitize(array $settings): array
{
    $defaults = protocolos_settings_defaults();
    $calendarUrl = trim((string) ($settings['calendar_ics_url'] ?? $defaults['calendar_ics_url']));
    $cacheTtl = max(60, min(21600, (int) ($settings['calendar_cache_ttl_seconds'] ?? $defaults['calendar_cache_ttl_seconds'])));
    $documentsBase = trim((string) ($settings['documentos_base_path'] ?? $defaults['documentos_base_path']));
    $maxItems = max(50, min(2000, (int) ($settings['documentos_max_items'] ?? $defaults['documentos_max_items'])));
    $extraBasePaths = $settings['documentos_extra_base_paths'] ?? [];

    if (is_string($extraBasePaths)) {
        $extraBasePaths = preg_split('/\R/u', $extraBasePaths) ?: [];
    }
    if (!is_array($extraBasePaths)) {
        $extraBasePaths = [];
    }

    $extraBasePaths = array_values(array_unique(array_filter(array_map(
        static fn ($path): string => trim((string) $path),
        $extraBasePaths
    ))));

    return [
        'calendar_ics_url' => $calendarUrl,
        'calendar_cache_ttl_seconds' => $cacheTtl,
        'documentos_base_path' => $documentsBase,
        'documentos_extra_base_paths' => $extraBasePaths,
        'documentos_max_items' => $maxItems,
    ];
}

function protocolos_settings_read(): array
{
    $file = protocolos_settings_file();
    $settings = [];
    if (is_file($file)) {
        $raw = file_get_contents($file);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            $settings = $decoded;
        }
    }

    return protocolos_settings_sanitize(array_replace(protocolos_settings_defaults(), $settings));
}

function protocolos_settings_write(array $settings): array
{
    $sanitized = protocolos_settings_sanitize(array_replace(protocolos_settings_read(), $settings));
    $file = protocolos_settings_file();
    $dir = dirname($file);
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('Não foi possível criar a pasta de configurações.');
    }

    $json = json_encode($sanitized, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if (!is_string($json) || file_put_contents($file, $json . PHP_EOL, LOCK_EX) === false) {
        throw new RuntimeException('Não foi possível salvar as configurações.');
    }

    return $sanitized;
}
