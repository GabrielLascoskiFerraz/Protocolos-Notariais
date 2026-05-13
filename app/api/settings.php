<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/settings.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

function settings_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function settings_body(): array
{
    if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        $decoded = json_decode((string) file_get_contents('php://input'), true);
        return is_array($decoded) ? $decoded : [];
    }

    return $_POST;
}

try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method === 'GET') {
        settings_json(['success' => true, 'settings' => protocolos_settings_read()]);
    }

    if ($method === 'POST') {
        $body = settings_body();
        $calendarUrl = trim((string) ($body['calendar_ics_url'] ?? ''));
        if ($calendarUrl !== '' && !filter_var($calendarUrl, FILTER_VALIDATE_URL)) {
            settings_json(['success' => false, 'error' => 'Informe uma URL válida para a agenda.'], 400);
        }
        if ($calendarUrl !== '' && !preg_match('#^https?://#i', $calendarUrl)) {
            settings_json(['success' => false, 'error' => 'A URL da agenda precisa começar com http:// ou https://.'], 400);
        }

        $extraBasePaths = (string) ($body['documentos_extra_base_paths'] ?? '');
        $settings = protocolos_settings_write([
            'calendar_ics_url' => $calendarUrl,
            'calendar_cache_ttl_seconds' => (int) ($body['calendar_cache_ttl_seconds'] ?? 1800),
            'documentos_base_path' => trim((string) ($body['documentos_base_path'] ?? '')),
            'documentos_extra_base_paths' => preg_split('/\R/u', $extraBasePaths) ?: [],
            'documentos_max_items' => (int) ($body['documentos_max_items'] ?? 600),
        ]);

        settings_json(['success' => true, 'settings' => $settings]);
    }

    settings_json(['success' => false, 'error' => 'Método não permitido.'], 405);
} catch (Throwable $error) {
    error_log('[settings] ' . $error->getMessage());
    settings_json(['success' => false, 'error' => 'Não foi possível salvar as configurações.'], 500);
}
