<?php
declare(strict_types=1);

require __DIR__ . '/../config/db.php';
require __DIR__ . '/../config/schema.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

ensureProtocolosDocumentosSchema($pdo);

function protocols_json(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function protocols_money($value)
{
    $value = trim((string) $value);
    if ($value === '') return $value;
    if (str_contains($value, ',')) {
        $value = str_replace(['.', ' '], '', $value);
        return str_replace(',', '.', $value);
    }
    if (substr_count($value, '.') > 1) {
        $parts = explode('.', $value);
        $decimal = array_pop($parts);
        return implode('', $parts) . '.' . $decimal;
    }
    return $value;
}

function protocols_now(PDO $pdo): string
{
    return (string) $pdo->query('SELECT NOW()')->fetchColumn();
}

function protocols_total(PDO $pdo, int $protocolId): float
{
    $stmt = $pdo->prepare('SELECT COALESCE(SUM(valor), 0) FROM protocolos_valores WHERE protocolo_id = ?');
    $stmt->execute([$protocolId]);
    return (float) $stmt->fetchColumn();
}

function protocols_touch(PDO $pdo, int $protocolId): void
{
    if ($protocolId <= 0) return;
    $stmt = $pdo->prepare('UPDATE protocolos SET updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deletado = 0');
    $stmt->execute([$protocolId]);
}

function protocols_fetch_protocol(PDO $pdo, int $id, bool $includeDeleted = false): ?array
{
    $deletedSql = $includeDeleted ? '' : 'AND p.deletado = 0';
    $stmt = $pdo->prepare("\n        SELECT\n            p.*,\n            (\n                SELECT COALESCE(SUM(v.valor), 0)\n                FROM protocolos_valores v\n                WHERE v.protocolo_id = p.id\n            ) AS total_valores,\n            t.cor AS tag_cor\n        FROM protocolos p\n        LEFT JOIN protocolos_tags t ON t.ato = p.ato\n        WHERE p.id = :id {$deletedSql}\n    ");
    $stmt->execute([':id' => $id]);
    $protocol = $stmt->fetch(PDO::FETCH_ASSOC);
    return $protocol ?: null;
}

function protocols_require_active_protocol(PDO $pdo, int $id): array
{
    $protocol = protocols_fetch_protocol($pdo, $id);
    if (!$protocol) protocols_json(['error' => 'Protocolo não encontrado'], 404);
    return $protocol;
}

function protocols_normalize_document_path(string $path): string
{
    $path = trim(str_replace(["\0", "\r", "\n"], '', $path));
    if ($path === '') return '';
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

function protocols_document_base_paths(): array
{
    $config = require __DIR__ . '/../config/documentos.php';
    $paths = $config['allowed_base_paths'] ?? [$config['base_path'] ?? ''];
    if (is_string($paths)) $paths = [$paths];
    $normalized = [];
    foreach ($paths as $path) {
        $path = protocols_normalize_document_path((string) $path);
        if ($path !== '') $normalized[] = $path;
    }
    return array_values(array_unique($normalized));
}

function protocols_document_separator(string $basePath): string
{
    return str_contains($basePath, '/') && !str_contains($basePath, '\\') ? '/' : '\\';
}

function protocols_validate_document_path(string $path, bool $allowEmpty = true): string
{
    $path = protocols_normalize_document_path($path);
    if ($path === '' && $allowEmpty) return '';
    if ($path === '') protocols_json(['error' => 'Nenhuma pasta de documentos foi vinculada a este protocolo.'], 400);

    $segments = preg_split('/[\\\\\/]+/', $path) ?: [];
    if (in_array('..', $segments, true)) {
        protocols_json(['error' => 'Caminho da pasta de documentos inválido'], 400);
    }

    $basePaths = protocols_document_base_paths();
    $pathLower = mb_strtolower($path, 'UTF-8');
    foreach ($basePaths as $basePath) {
        $separator = protocols_document_separator($basePath);
        $baseLower = mb_strtolower($basePath, 'UTF-8');
        if ($pathLower === $baseLower || str_starts_with($pathLower, $baseLower . $separator)) {
            return $path;
        }
    }

    protocols_json([
        'error' => 'A pasta de documentos deve estar dentro de uma das raízes configuradas',
        'base_paths' => $basePaths,
    ], 400);
}

function protocols_normalized_field_value(string $field, $value): string
{
    if ($field === 'ficha') return $value === null || $value === '' ? '' : preg_replace('/\D/', '', (string) $value);
    if ($field === 'urgente') return ((int) $value) === 1 ? '1' : '0';
    if ($field === 'valor_ato') $value = protocols_money($value);
    return trim((string) ($value ?? ''));
}

function protocols_assert_expected_field(PDO $pdo, array $protocol, string $field, $expected): void
{
    $current = protocols_normalized_field_value($field, $protocol[$field] ?? null);
    $expected = protocols_normalized_field_value($field, $expected);
    if ($current === $expected) return;
    protocols_json([
        'error' => 'Este campo foi alterado em outro lugar. Reabra o protocolo antes de salvar novamente.',
        'code' => 'conflict',
        'field' => $field,
        'current_value' => $protocol[$field] ?? null,
        'protocol' => $protocol,
        'server_now' => protocols_now($pdo),
    ], 409);
}

function protocols_expected_field_sql(string $field): string
{
    if ($field === 'urgente') return "CAST(COALESCE({$field}, 0) AS CHAR) = :expected_value";
    return "COALESCE(CAST({$field} AS CHAR), '') = :expected_value";
}

function protocols_protocol_id_for(PDO $pdo, string $table, int $id): int
{
    $allowed = ['protocolos_imoveis', 'protocolos_valores', 'protocolos_andamentos'];
    if (!in_array($table, $allowed, true)) return 0;
    $stmt = $pdo->prepare("SELECT protocolo_id FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    return (int) $stmt->fetchColumn();
}

function protocols_distinct(PDO $pdo, string $field): array
{
    $allowed = ['ato', 'digitador', 'tag_custom'];
    if (!in_array($field, $allowed, true)) return [];
    $stmt = $pdo->query("SELECT DISTINCT {$field} FROM protocolos WHERE deletado = 0 AND {$field} IS NOT NULL AND {$field} <> '' ORDER BY {$field} ASC");
    $values = $stmt->fetchAll(PDO::FETCH_COLUMN);
    $map = [];
    foreach ($values as $value) {
        $value = trim((string) $value);
        $key = mb_strtolower($value, 'UTF-8');
        if ($key !== '' && !isset($map[$key])) $map[$key] = $value;
    }
    ksort($map, SORT_NATURAL | SORT_FLAG_CASE);
    return array_values($map);
}

function protocols_handle_protocols(PDO $pdo, string $action): void
{
    if ($action === 'create') {
        $stmt = $pdo->prepare("INSERT INTO protocolos (ato, status, data_apresentacao) VALUES ('', 'PARA_DISTRIBUIR', CURRENT_DATE())");
        $stmt->execute();
        protocols_json(['success' => true, 'id' => $pdo->lastInsertId(), 'server_now' => protocols_now($pdo)]);
    }

    if ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        protocols_require_active_protocol($pdo, $id);
        $stmt = $pdo->prepare('UPDATE protocolos SET deletado = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deletado = 0');
        $stmt->execute([$id]);
        protocols_json(['success' => true, 'id' => $id, 'protocol' => protocols_fetch_protocol($pdo, $id, true), 'server_now' => protocols_now($pdo)]);
    }

    if ($action === 'search') {
        $q = trim((string) ($_GET['q'] ?? ''));
        $ato = trim((string) ($_GET['ato'] ?? ''));
        $digitador = trim((string) ($_GET['digitador'] ?? ''));
        $urgente = trim((string) ($_GET['urgente'] ?? ''));
        $tagCustom = trim((string) ($_GET['tag_custom'] ?? ''));
        $status = trim((string) ($_GET['status'] ?? ''));
        $limit = max(1, min(200, (int) ($_GET['limit'] ?? 50)));
        $offset = max(0, (int) ($_GET['offset'] ?? 0));
        $where = ['p.deletado = 0'];
        $binds = [];
        if ($status !== '') { $where[] = 'p.status = :status'; $binds[':status'] = $status; }
        if ($ato !== '') { $where[] = 'LOWER(TRIM(p.ato)) = :ato'; $binds[':ato'] = mb_strtolower($ato, 'UTF-8'); }
        if ($digitador !== '') { $where[] = 'p.digitador = :digitador'; $binds[':digitador'] = $digitador; }
        if ($urgente !== '') { $where[] = 'p.urgente = :urgente'; $binds[':urgente'] = (int) $urgente; }
        if ($tagCustom !== '') { $where[] = 'LOWER(TRIM(p.tag_custom)) = :tag_custom'; $binds[':tag_custom'] = mb_strtolower($tagCustom, 'UTF-8'); }
        if ($q !== '') {
            $where[] = '(CAST(p.ficha AS CHAR) LIKE :q1 OR p.digitador LIKE :q2 OR p.apresentante LIKE :q3 OR p.outorgantes LIKE :q4 OR p.outorgados LIKE :q5 OR p.ato LIKE :q6)';
            $like = "%{$q}%";
            foreach (range(1, 6) as $index) $binds[":q{$index}"] = $like;
        }
        $whereSql = 'WHERE ' . implode(' AND ', $where);
        $stmt = $pdo->prepare("\n            SELECT p.*, (SELECT COALESCE(SUM(v.valor), 0) FROM protocolos_valores v WHERE v.protocolo_id = p.id) AS total_valores, t.cor AS tag_cor\n            FROM protocolos p\n            LEFT JOIN protocolos_tags t ON t.ato = p.ato\n            {$whereSql}\n            ORDER BY p.urgente DESC, p.id DESC\n            LIMIT :limit OFFSET :offset\n        ");
        foreach ($binds as $key => $value) $stmt->bindValue($key, $value, $key === ':urgente' ? PDO::PARAM_INT : PDO::PARAM_STR);
        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        $countStmt = $pdo->prepare("SELECT COUNT(*) FROM protocolos p {$whereSql}");
        foreach ($binds as $key => $value) $countStmt->bindValue($key, $value, $key === ':urgente' ? PDO::PARAM_INT : PDO::PARAM_STR);
        $countStmt->execute();
        protocols_json(['items' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'total' => (int) $countStmt->fetchColumn(), 'server_now' => protocols_now($pdo)]);
    }

    if ($action === 'changes') {
        $since = trim((string) ($_GET['since'] ?? ''));
        if ($since === '') protocols_json(['items' => [], 'server_now' => protocols_now($pdo)]);
        $stmt = $pdo->prepare("\n            SELECT p.*, (SELECT COALESCE(SUM(v.valor), 0) FROM protocolos_valores v WHERE v.protocolo_id = p.id) AS total_valores, t.cor AS tag_cor\n            FROM protocolos p\n            LEFT JOIN protocolos_tags t ON t.ato = p.ato\n            WHERE p.updated_at >= DATE_SUB(:since, INTERVAL 2 SECOND)\n            ORDER BY p.updated_at ASC\n        ");
        $stmt->bindValue(':since', $since);
        $stmt->execute();
        protocols_json(['items' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'server_now' => protocols_now($pdo)]);
    }

    if ($action === 'get') {
        $id = (int) ($_GET['id'] ?? 0);
        protocols_json(protocols_require_active_protocol($pdo, $id));
    }

    if ($action === 'update') {
        $id = (int) ($_POST['id'] ?? 0);
        $field = (string) ($_POST['field'] ?? '');
        $value = $_POST['value'] ?? null;
        $allowed = ['ficha', 'ato', 'digitador', 'apresentante', 'data_apresentacao', 'contato', 'outorgantes', 'outorgados', 'matricula', 'area', 'valor_ato', 'observacoes', 'pasta_documentos', 'urgente', 'tag_custom'];
        if (!in_array($field, $allowed, true)) protocols_json(['error' => 'Campo inválido'], 400);
        protocols_require_active_protocol($pdo, $id);
        $hasExpectedValue = array_key_exists('expected_value', $_POST);
        $expectedValue = $hasExpectedValue ? protocols_normalized_field_value($field, $_POST['expected_value']) : '';
        $maxLengths = ['ato' => 120, 'digitador' => 120, 'apresentante' => 150, 'contato' => 255, 'outorgantes' => 2000, 'outorgados' => 2000, 'matricula' => 120, 'area' => 60, 'observacoes' => 5000, 'pasta_documentos' => 1024, 'tag_custom' => 120, 'valor_ato' => 20];
        if (isset($maxLengths[$field]) && mb_strlen((string) $value, 'UTF-8') > $maxLengths[$field]) protocols_json(['error' => "Campo '{$field}' excede o limite permitido"], 400);
        if ($field === 'ficha') {
            $value = preg_replace('/\D/', '', (string) $value);
            if ($value !== '' && (int) $value > 9999999) protocols_json(['error' => 'Ficha deve ter no máximo 7 dígitos'], 400);
            $value = $value === '' ? null : (int) $value;
        }
        if ($field === 'urgente') $value = (int) $value;
        if ($field === 'valor_ato') {
            $value = protocols_money($value);
            if ($value !== '' && !is_numeric($value)) protocols_json(['error' => 'Valor do ato inválido'], 400);
        }
        if ($field === 'pasta_documentos') $value = protocols_validate_document_path((string) $value, true);
        if ($field === 'data_apresentacao' && $value !== '') {
            $date = DateTime::createFromFormat('Y-m-d', (string) $value);
            if (!$date || $date->format('Y-m-d') !== $value) protocols_json(['error' => 'Data de apresentação inválida'], 400);
        }
        $matchSql = $hasExpectedValue ? ' AND ' . protocols_expected_field_sql($field) : '';
        $stmt = $pdo->prepare("UPDATE protocolos SET {$field} = :value, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND deletado = 0{$matchSql}");
        $stmt->bindValue(':value', $value);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        if ($hasExpectedValue) $stmt->bindValue(':expected_value', $expectedValue);
        $stmt->execute();
        if ($hasExpectedValue && $stmt->rowCount() === 0) {
            $protocol = protocols_require_active_protocol($pdo, $id);
            protocols_assert_expected_field($pdo, $protocol, $field, $expectedValue);
        }
        protocols_json(['success' => true, 'protocol' => protocols_fetch_protocol($pdo, $id), 'server_now' => protocols_now($pdo)]);
    }

    if ($action === 'status') {
        $id = (int) ($_POST['id'] ?? 0);
        $status = (string) ($_POST['status'] ?? '');
        $valid = ['PARA_DISTRIBUIR', 'EM_ANDAMENTO', 'PARA_CORRECAO', 'LAVRADOS', 'ARQUIVADOS'];
        if (!in_array($status, $valid, true)) protocols_json(['error' => 'Status inválido'], 400);
        protocols_require_active_protocol($pdo, $id);
        $stmt = $pdo->prepare('UPDATE protocolos SET status = :status, updated_at = CURRENT_TIMESTAMP WHERE id = :id AND deletado = 0');
        $stmt->execute([':status' => $status, ':id' => $id]);
        protocols_json(['success' => true, 'protocol' => protocols_fetch_protocol($pdo, $id), 'server_now' => protocols_now($pdo)]);
    }

    protocols_json(['error' => 'Ação desconhecida'], 400);
}

function protocols_handle_properties(PDO $pdo, string $action): void
{
    if ($action === 'list') {
        $stmt = $pdo->prepare('SELECT id, matricula, area FROM protocolos_imoveis WHERE protocolo_id = ? ORDER BY id ASC');
        $stmt->execute([(int) ($_GET['protocolo_id'] ?? 0)]);
        protocols_json($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    if ($action === 'create') {
        $protocolId = (int) ($_POST['protocolo_id'] ?? 0);
        protocols_require_active_protocol($pdo, $protocolId);
        $stmt = $pdo->prepare('INSERT INTO protocolos_imoveis (protocolo_id, matricula, area) VALUES (?, ?, ?)');
        $stmt->execute([$protocolId, trim((string) ($_POST['matricula'] ?? '')), trim((string) ($_POST['area'] ?? ''))]);
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'id' => $pdo->lastInsertId(), 'protocol_id' => $protocolId, 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    if ($action === 'update') {
        $id = (int) ($_POST['id'] ?? 0);
        $protocolId = protocols_protocol_id_for($pdo, 'protocolos_imoveis', $id);
        if (!$protocolId) protocols_json(['error' => 'Imóvel não encontrado'], 404);
        protocols_require_active_protocol($pdo, $protocolId);
        $stmt = $pdo->prepare('UPDATE protocolos_imoveis SET matricula = ?, area = ? WHERE id = ?');
        $stmt->execute([trim((string) ($_POST['matricula'] ?? '')), trim((string) ($_POST['area'] ?? '')), $id]);
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'protocol_id' => $protocolId, 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    if ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        $protocolId = protocols_protocol_id_for($pdo, 'protocolos_imoveis', $id);
        if (!$protocolId) protocols_json(['error' => 'Imóvel não encontrado'], 404);
        protocols_require_active_protocol($pdo, $protocolId);
        $stmt = $pdo->prepare('DELETE FROM protocolos_imoveis WHERE id = ?');
        $stmt->execute([$id]);
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'protocol_id' => $protocolId, 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    protocols_json(['error' => 'Ação desconhecida'], 400);
}

function protocols_handle_values(PDO $pdo, string $action): void
{
    if ($action === 'list') {
        $stmt = $pdo->prepare('SELECT id, descricao, valor FROM protocolos_valores WHERE protocolo_id = ? ORDER BY created_at ASC');
        $stmt->execute([(int) ($_GET['protocolo_id'] ?? 0)]);
        protocols_json($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    if ($action === 'create') {
        $protocolId = (int) ($_POST['protocolo_id'] ?? 0);
        protocols_require_active_protocol($pdo, $protocolId);
        $value = protocols_money($_POST['valor'] ?? '0');
        if (!is_numeric($value)) protocols_json(['error' => 'Valor inválido'], 400);
        $description = trim((string) ($_POST['descricao'] ?? ''));
        if (mb_strlen($description, 'UTF-8') > 255) protocols_json(['error' => 'Descrição do valor excede 255 caracteres'], 400);
        $stmt = $pdo->prepare('INSERT INTO protocolos_valores (protocolo_id, descricao, valor) VALUES (?, ?, ?)');
        $stmt->execute([$protocolId, $description, $value]);
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'id' => $pdo->lastInsertId(), 'protocol_id' => $protocolId, 'total' => protocols_total($pdo, $protocolId), 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    if ($action === 'update') {
        $id = (int) ($_POST['id'] ?? 0);
        $protocolId = protocols_protocol_id_for($pdo, 'protocolos_valores', $id);
        if (!$protocolId) protocols_json(['error' => 'Valor não encontrado'], 404);
        protocols_require_active_protocol($pdo, $protocolId);
        $value = protocols_money($_POST['valor'] ?? '0');
        if (!is_numeric($value)) protocols_json(['error' => 'Valor inválido'], 400);
        $description = trim((string) ($_POST['descricao'] ?? ''));
        if (mb_strlen($description, 'UTF-8') > 255) protocols_json(['error' => 'Descrição do valor excede 255 caracteres'], 400);
        $stmt = $pdo->prepare('UPDATE protocolos_valores SET descricao = ?, valor = ? WHERE id = ?');
        $stmt->execute([$description, $value, $id]);
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'protocol_id' => $protocolId, 'total' => protocols_total($pdo, $protocolId), 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    if ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        $protocolId = protocols_protocol_id_for($pdo, 'protocolos_valores', $id);
        if (!$protocolId) protocols_json(['error' => 'Valor não encontrado'], 404);
        protocols_require_active_protocol($pdo, $protocolId);
        $stmt = $pdo->prepare('DELETE FROM protocolos_valores WHERE id = ?');
        $stmt->execute([$id]);
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'protocol_id' => $protocolId, 'total' => protocols_total($pdo, $protocolId), 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    protocols_json(['error' => 'Ação desconhecida'], 400);
}

function protocols_handle_notes(PDO $pdo, string $action): void
{
    if ($action === 'list') {
        $stmt = $pdo->prepare('SELECT id, descricao, created_at FROM protocolos_andamentos WHERE protocolo_id = ? ORDER BY created_at DESC');
        $stmt->execute([(int) ($_GET['protocolo_id'] ?? 0)]);
        protocols_json($stmt->fetchAll(PDO::FETCH_ASSOC));
    }
    if ($action === 'create') {
        $protocolId = (int) ($_POST['protocolo_id'] ?? 0);
        protocols_require_active_protocol($pdo, $protocolId);
        $description = trim((string) ($_POST['descricao'] ?? ''));
        if ($description === '') protocols_json(['error' => 'Descrição obrigatória'], 400);
        if (mb_strlen($description, 'UTF-8') > 2000) protocols_json(['error' => 'Descrição excede 2000 caracteres'], 400);
        $stmt = $pdo->prepare('INSERT INTO protocolos_andamentos (protocolo_id, descricao) VALUES (?, ?)');
        $stmt->execute([$protocolId, $description]);
        $insertedId = $pdo->lastInsertId();
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'id' => $insertedId, 'protocol_id' => $protocolId, 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    if ($action === 'update') {
        $id = (int) ($_POST['id'] ?? 0);
        $protocolId = protocols_protocol_id_for($pdo, 'protocolos_andamentos', $id);
        if (!$protocolId) protocols_json(['error' => 'Andamento não encontrado'], 404);
        protocols_require_active_protocol($pdo, $protocolId);
        $description = trim((string) ($_POST['descricao'] ?? ''));
        if ($description === '') protocols_json(['error' => 'Descrição obrigatória'], 400);
        if (mb_strlen($description, 'UTF-8') > 2000) protocols_json(['error' => 'Descrição excede 2000 caracteres'], 400);
        $stmt = $pdo->prepare('UPDATE protocolos_andamentos SET descricao = ? WHERE id = ?');
        $stmt->execute([$description, $id]);
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'protocol_id' => $protocolId, 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    if ($action === 'delete') {
        $id = (int) ($_POST['id'] ?? 0);
        $protocolId = protocols_protocol_id_for($pdo, 'protocolos_andamentos', $id);
        if (!$protocolId) protocols_json(['error' => 'Andamento não encontrado'], 404);
        protocols_require_active_protocol($pdo, $protocolId);
        $stmt = $pdo->prepare('DELETE FROM protocolos_andamentos WHERE id = ?');
        $stmt->execute([$id]);
        protocols_touch($pdo, $protocolId);
        protocols_json(['success' => true, 'protocol_id' => $protocolId, 'protocol' => protocols_fetch_protocol($pdo, $protocolId), 'server_now' => protocols_now($pdo)]);
    }
    protocols_json(['error' => 'Ação desconhecida'], 400);
}

function protocols_human_file_size($bytes): string
{
    $units = ['B', 'KB', 'MB', 'GB', 'TB'];
    $size = max(0, (float) $bytes);
    $index = 0;
    while ($size >= 1024 && $index < count($units) - 1) { $size /= 1024; $index++; }
    return ($index === 0 ? (string) (int) $size : number_format($size, 1, ',', '.')) . ' ' . $units[$index];
}

function protocols_problem_reason(string $name, string $extension, bool $isDirectory): ?string
{
    if ($isDirectory) return null;
    $lowerName = mb_strtolower($name, 'UTF-8');
    $lowerExt = mb_strtolower($extension, 'UTF-8');
    if ($lowerName === 'thumbs.db') return 'Arquivo de sistema do Windows';
    if ($lowerExt === '') return 'Arquivo sem extensão';
    if (in_array($lowerExt, ['download', 'crdownload', 'tmp', 'exe', 'bat'], true)) return 'Extensão potencialmente problemática';
    return null;
}

function protocols_list_folder_items(string $path, int $maxItems): array
{
    if (!is_dir($path)) protocols_json(['error' => 'A pasta vinculada não existe ou não está acessível neste computador.', 'code' => 'FOLDER_NOT_FOUND', 'path' => $path], 404);
    if (!is_readable($path)) protocols_json(['error' => 'Sem permissão para ler a pasta vinculada.', 'code' => 'FOLDER_NOT_READABLE', 'path' => $path], 403);
    $names = scandir($path);
    if ($names === false) protocols_json(['error' => 'Não foi possível listar os arquivos desta pasta.', 'code' => 'SCAN_FAILED', 'path' => $path], 500);
    $items = [];
    foreach ($names as $name) {
        if ($name === '.' || $name === '..') continue;
        $fullPath = rtrim($path, "\\/") . DIRECTORY_SEPARATOR . $name;
        $isDirectory = is_dir($fullPath);
        $extension = $isDirectory ? '' : pathinfo($name, PATHINFO_EXTENSION);
        $problem = protocols_problem_reason($name, $extension, $isDirectory);
        $modified = @filemtime($fullPath) ?: null;
        $size = $isDirectory ? null : (@filesize($fullPath) ?: 0);
        $items[] = [
            'name' => $name,
            'type' => $isDirectory ? 'folder' : 'file',
            'extension' => $isDirectory ? 'Pasta' : ($extension !== '' ? mb_strtoupper($extension, 'UTF-8') : 'Sem extensão'),
            'size' => $size,
            'size_human' => $isDirectory ? '—' : protocols_human_file_size((int) $size),
            'modified' => $modified ? date(DATE_ATOM, $modified) : null,
            'problem' => $problem !== null,
            'problem_reason' => $problem,
        ];
    }
    usort($items, static function (array $a, array $b): int {
        if ($a['problem'] !== $b['problem']) return $a['problem'] ? -1 : 1;
        if ($a['type'] !== $b['type']) return $a['type'] === 'folder' ? -1 : 1;
        return strcasecmp($a['name'], $b['name']);
    });
    $truncated = count($items) > $maxItems;
    if ($truncated) $items = array_slice($items, 0, $maxItems);
    return ['items' => $items, 'truncated' => $truncated];
}

function protocols_handle_documents(PDO $pdo, string $action): void
{
    if ($action !== 'list') protocols_json(['error' => 'Ação desconhecida'], 400);
    $protocolId = (int) ($_GET['protocolo_id'] ?? 0);
    if ($protocolId <= 0) protocols_json(['error' => 'Protocolo inválido'], 400);
    $stmt = $pdo->prepare('SELECT pasta_documentos FROM protocolos WHERE id = ? AND deletado = 0');
    $stmt->execute([$protocolId]);
    $path = protocols_validate_document_path((string) ($stmt->fetchColumn() ?: ''), false);
    $config = require __DIR__ . '/../config/documentos.php';
    $maxItems = max(50, min(2000, (int) ($config['max_items'] ?? 600)));
    $result = protocols_list_folder_items($path, $maxItems);
    $items = $result['items'];
    protocols_json([
        'success' => true,
        'path' => $path,
        'items' => $items,
        'summary' => [
            'total' => count($items),
            'files' => count(array_filter($items, static fn (array $item): bool => $item['type'] === 'file')),
            'folders' => count(array_filter($items, static fn (array $item): bool => $item['type'] === 'folder')),
            'problematic' => count(array_filter($items, static fn (array $item): bool => (bool) $item['problem'])),
            'truncated' => (bool) $result['truncated'],
            'max_items' => $maxItems,
        ],
    ]);
}

function protocols_handle_metadata(PDO $pdo, string $action): void
{
    if ($action !== 'list') protocols_json(['error' => 'Ação desconhecida'], 400);
    protocols_json([
        'atos' => protocols_distinct($pdo, 'ato'),
        'digitadores' => protocols_distinct($pdo, 'digitador'),
        'tags' => protocols_distinct($pdo, 'tag_custom'),
        'server_now' => protocols_now($pdo),
    ]);
}

try {
    if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        $json = json_decode((string) file_get_contents('php://input'), true);
        if (is_array($json)) {
            foreach (($json['params'] ?? []) as $key => $value) $_REQUEST[$key] = $_GET[$key] = $_POST[$key] = $value;
            foreach (($json['body'] ?? []) as $key => $value) $_REQUEST[$key] = $_POST[$key] = $value;
        }
    }

    $resource = preg_replace('/[^a-z_-]/', '', (string) ($_GET['resource'] ?? $_POST['resource'] ?? 'protocolos'));
    $action = (string) ($_REQUEST['action'] ?? '');
    if ($action === '') protocols_json(['error' => 'Ação não informada'], 400);

    switch ($resource) {
        case 'protocolos': protocols_handle_protocols($pdo, $action); break;
        case 'imoveis': protocols_handle_properties($pdo, $action); break;
        case 'valores': protocols_handle_values($pdo, $action); break;
        case 'andamentos': protocols_handle_notes($pdo, $action); break;
        case 'documentos': protocols_handle_documents($pdo, $action); break;
        case 'metadata': protocols_handle_metadata($pdo, $action); break;
        default: protocols_json(['error' => 'Recurso de protocolos não encontrado'], 404);
    }
} catch (Throwable $error) {
    protocols_json(['error' => 'Erro interno', 'detail' => $error->getMessage()], 500);
}
