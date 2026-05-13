<?php
declare(strict_types=1);

require __DIR__ . '/../config/db.php';
require __DIR__ . '/../config/schema.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$config = require __DIR__ . '/../config/documentos.php';
$action = $_REQUEST['action'] ?? null;

ensureProtocolosDocumentosSchema($pdo);

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function normalizeDocumentPath(string $path): string
{
    $path = trim(str_replace(["\0", "\r", "\n"], '', $path));
    if ($path === '') {
        return '';
    }

    if (str_starts_with($path, '/') && !str_starts_with($path, '//')) {
        $path = preg_replace('#/+#', '/', $path);
        return rtrim((string) $path, "/ \t");
    }

    $path = str_replace('/', '\\', $path);

    if (str_starts_with($path, '\\\\')) {
        $path = '\\\\' . preg_replace('/\\\\+/', '\\', substr($path, 2));
    } else {
        $path = preg_replace('/\\\\+/', '\\', $path);
    }

    return rtrim((string) $path, "\\ \t");
}

function configuredBasePaths(array $config): array
{
    $paths = $config['allowed_base_paths'] ?? [$config['base_path'] ?? ''];
    if (is_string($paths)) {
        $paths = [$paths];
    }

    $normalized = [];
    foreach ($paths as $path) {
        $path = normalizeDocumentPath((string) $path);
        if ($path !== '') {
            $normalized[] = $path;
        }
    }

    return array_values(array_unique($normalized));
}

function documentPathSeparator(string $basePath): string
{
    return str_contains($basePath, '/') && !str_contains($basePath, '\\') ? '/' : '\\';
}

function hasPathTraversal(string $path): bool
{
    $segments = preg_split('/[\\\\\/]+/', $path) ?: [];
    return in_array('..', $segments, true);
}

function resolveAllowedBasePath(string $path, array $basePaths): string
{
    $path = normalizeDocumentPath($path);

    if ($path === '') {
        jsonResponse([
            'success' => false,
            'error' => 'Nenhuma pasta de documentos foi vinculada a este protocolo.',
            'code' => 'EMPTY_PATH',
        ], 400);
    }

    if (!$basePaths) {
        jsonResponse([
            'success' => false,
            'error' => 'A pasta base de documentos não foi configurada.',
            'code' => 'BASE_NOT_CONFIGURED',
        ], 500);
    }

    if (hasPathTraversal($path)) {
        jsonResponse([
            'success' => false,
            'error' => 'Caminho inválido.',
            'code' => 'INVALID_PATH',
        ], 400);
    }

    $pathLower = mb_strtolower($path, 'UTF-8');
    foreach ($basePaths as $basePath) {
        $basePath = normalizeDocumentPath($basePath);
        if ($basePath === '') {
            continue;
        }

        $separator = documentPathSeparator($basePath);
        $baseLower = mb_strtolower($basePath, 'UTF-8');
        if ($pathLower === $baseLower || str_starts_with($pathLower, $baseLower . $separator)) {
            return $basePath;
        }
    }

    jsonResponse([
        'success' => false,
        'error' => 'A pasta informada está fora das raízes permitidas de documentos.',
        'code' => 'OUTSIDE_BASE',
        'base_paths' => $basePaths,
    ], 403);
}

function humanFileSize(int|float $bytes): string
{
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $size = max(0, (float) $bytes);
    $index = 0;

    while ($size >= 1024 && $index < count($units) - 1) {
        $size /= 1024;
        $index++;
    }

    return ($index === 0 ? (string) (int) $size : number_format($size, 1, ',', '.')) . ' ' . $units[$index];
}

function problemReason(string $name, string $extension, bool $isDirectory): ?string
{
    if ($isDirectory) {
        return null;
    }

    $lowerName = mb_strtolower($name, 'UTF-8');
    $lowerExt = mb_strtolower($extension, 'UTF-8');
    $problemExtensions = ['download', 'crdownload', 'tmp', 'exe', 'bat'];

    if ($lowerName === 'thumbs.db') {
        return 'Arquivo de sistema do Windows';
    }

    if ($lowerExt === '') {
        return 'Arquivo sem extensão';
    }

    if (in_array($lowerExt, $problemExtensions, true)) {
        return 'Extensão potencialmente problemática';
    }

    return null;
}

function listFolderItems(string $path, int $maxItems): array
{
    if (!is_dir($path)) {
        jsonResponse([
            'success' => false,
            'error' => 'A pasta vinculada não existe ou não está acessível neste computador.',
            'code' => 'FOLDER_NOT_FOUND',
            'path' => $path,
        ], 404);
    }

    if (!is_readable($path)) {
        jsonResponse([
            'success' => false,
            'error' => 'Sem permissão para ler a pasta vinculada.',
            'code' => 'FOLDER_NOT_READABLE',
            'path' => $path,
        ], 403);
    }

    $names = scandir($path);
    if ($names === false) {
        jsonResponse([
            'success' => false,
            'error' => 'Não foi possível listar os arquivos desta pasta.',
            'code' => 'SCAN_FAILED',
            'path' => $path,
        ], 500);
    }

    $items = [];
    foreach ($names as $name) {
        if ($name === '.' || $name === '..') {
            continue;
        }

        $fullPath = rtrim($path, "\\/") . DIRECTORY_SEPARATOR . $name;
        $isDirectory = is_dir($fullPath);
        $extension = $isDirectory ? '' : pathinfo($name, PATHINFO_EXTENSION);
        $problem = problemReason($name, $extension, $isDirectory);
        $modified = @filemtime($fullPath) ?: null;
        $size = $isDirectory ? null : (@filesize($fullPath) ?: 0);

        $items[] = [
            'name' => $name,
            'type' => $isDirectory ? 'folder' : 'file',
            'extension' => $isDirectory ? 'Pasta' : ($extension !== '' ? mb_strtoupper($extension, 'UTF-8') : 'Sem extensão'),
            'size' => $size,
            'size_human' => $isDirectory ? '—' : humanFileSize((int) $size),
            'modified' => $modified ? date(DATE_ATOM, $modified) : null,
            'problem' => $problem !== null,
            'problem_reason' => $problem,
        ];
    }

    usort($items, static function (array $a, array $b): int {
        if ($a['problem'] !== $b['problem']) {
            return $a['problem'] ? -1 : 1;
        }

        if ($a['type'] !== $b['type']) {
            return $a['type'] === 'folder' ? -1 : 1;
        }

        return strcasecmp($a['name'], $b['name']);
    });

    $truncated = count($items) > $maxItems;
    if ($truncated) {
        $items = array_slice($items, 0, $maxItems);
    }

    return [
        'items' => $items,
        'truncated' => $truncated,
    ];
}

if (!$action) {
    jsonResponse(['success' => false, 'error' => 'Ação não informada'], 400);
}

try {
    if ($action !== 'list') {
        jsonResponse(['success' => false, 'error' => 'Ação desconhecida'], 400);
    }

    $protocoloId = (int) ($_GET['protocolo_id'] ?? 0);
    if ($protocoloId <= 0) {
        jsonResponse(['success' => false, 'error' => 'Protocolo inválido'], 400);
    }

    $stmt = $pdo->prepare("
        SELECT pasta_documentos
        FROM protocolos
        WHERE id = ?
        AND deletado = 0
    ");
    $stmt->execute([$protocoloId]);
    $path = (string) ($stmt->fetchColumn() ?: '');
    $path = normalizeDocumentPath($path);
    $basePaths = configuredBasePaths($config);

    $basePath = resolveAllowedBasePath($path, $basePaths);

    $maxItems = max(50, min(2000, (int) ($config['max_items'] ?? 600)));
    $result = listFolderItems($path, $maxItems);
    $items = $result['items'];
    $problemCount = count(array_filter($items, static fn (array $item): bool => (bool) $item['problem']));

    jsonResponse([
        'success' => true,
        'path' => $path,
        'base_path' => $basePath,
        'base_paths' => $basePaths,
        'items' => $items,
        'summary' => [
            'total' => count($items),
            'files' => count(array_filter($items, static fn (array $item): bool => $item['type'] === 'file')),
            'folders' => count(array_filter($items, static fn (array $item): bool => $item['type'] === 'folder')),
            'problematic' => $problemCount,
            'truncated' => (bool) $result['truncated'],
            'max_items' => $maxItems,
        ],
    ]);
} catch (Throwable $error) {
    jsonResponse([
        'success' => false,
        'error' => 'Erro interno ao listar documentos.',
        'detail' => $error->getMessage(),
    ], 500);
}
