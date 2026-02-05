<?php
require __DIR__ . '/../config/db.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_REQUEST['action'] ?? null;

if (!$action) {
    http_response_code(400);
    echo json_encode(['error' => 'Ação não informada']);
    exit;
}

try {
    function normalizarDinheiro($v) {
        $v = trim((string)$v);
        if ($v === '') return $v;

        if (strpos($v, ',') !== false) {
            $v = str_replace(['.', ' '], '', $v);
            $v = str_replace(',', '.', $v);
            return $v;
        }

        $dots = substr_count($v, '.');
        if ($dots > 1) {
            $parts = explode('.', $v);
            $dec = array_pop($parts);
            $v = implode('', $parts) . '.' . $dec;
        }

        return $v;
    }

    function serverNow(PDO $pdo) {
        return $pdo->query("SELECT NOW()")->fetchColumn();
    }

    /* =========================================================
     * CRIAR NOVO PROTOCOLO
     * =======================================================*/
    if ($action === 'create') {

        $stmt = $pdo->prepare("
            INSERT INTO protocolos (ato, status, data_apresentacao)
            VALUES ('', 'PARA_DISTRIBUIR', CURRENT_DATE())
        ");
        $stmt->execute();

        echo json_encode([
            'success' => true,
            'id'      => $pdo->lastInsertId(),
            'server_now' => serverNow($pdo)
        ]);
        exit;
    }

    /* =========================================================
     * SOFT DELETE
     * =======================================================*/
    if ($action === 'delete') {

        $id = (int)($_POST['id'] ?? 0);

        $stmt = $pdo->prepare("
            UPDATE protocolos
            SET deletado = 1
            WHERE id = ?
        ");
        $stmt->execute([$id]);

        echo json_encode(['success' => true, 'server_now' => serverNow($pdo)]);
        exit;
    }

    /* =========================================================
     * BUSCA GLOBAL (TODOS OS STATUS)
     * =======================================================*/
    if ($action === 'search') {

        $q = trim($_GET['q'] ?? '');
        $ato = trim($_GET['ato'] ?? '');
        $digitador = trim($_GET['digitador'] ?? '');
        $urgente = trim($_GET['urgente'] ?? '');
        $tagCustom = trim($_GET['tag_custom'] ?? '');
        $status = trim($_GET['status'] ?? '');
        $limit = (int)($_GET['limit'] ?? 50);
        $offset = (int)($_GET['offset'] ?? 0);

        if ($limit <= 0) $limit = 50;
        if ($limit > 200) $limit = 200;
        if ($offset < 0) $offset = 0;

        $sql = "
            SELECT
                p.*,
                (
                    SELECT COALESCE(SUM(v.valor), 0)
                    FROM protocolos_valores v
                    WHERE v.protocolo_id = p.id
                ) AS total_valores,
                t.cor AS tag_cor
            FROM protocolos p
            LEFT JOIN protocolos_tags t ON t.ato = p.ato
            WHERE p.deletado = 0
        ";

        if ($status !== '') {
            $sql .= " AND p.status = :status";
        }

        if ($ato !== '') {
            $sql .= " AND LOWER(TRIM(p.ato)) = :ato";
        }

        if ($digitador !== '') {
            $sql .= " AND p.digitador = :digitador";
        }

        if ($urgente !== '') {
            $sql .= " AND p.urgente = :urgente";
        }

        if ($tagCustom !== '') {
            $sql .= " AND LOWER(TRIM(p.tag_custom)) = :tag_custom";
        }

        if ($q !== '') {
            $sql .= "
                AND (
                    CAST(p.ficha AS CHAR) LIKE :q1
                    OR p.digitador LIKE :q2
                    OR p.apresentante LIKE :q3
                    OR p.outorgantes LIKE :q4
                    OR p.outorgados LIKE :q5
                    OR p.ato LIKE :q6
                )
            ";
        }

        $sql .= " ORDER BY p.urgente DESC, p.id DESC";
        $sql .= " LIMIT :limit OFFSET :offset";

        $stmt = $pdo->prepare($sql);

        if ($status !== '') {
            $stmt->bindValue(':status', $status);
        }
        if ($ato !== '') {
            $stmt->bindValue(':ato', mb_strtolower($ato, 'UTF-8'));
        }
        if ($digitador !== '') {
            $stmt->bindValue(':digitador', $digitador);
        }
        if ($urgente !== '') {
            $stmt->bindValue(':urgente', (int)$urgente, PDO::PARAM_INT);
        }
        if ($tagCustom !== '') {
            $stmt->bindValue(':tag_custom', mb_strtolower($tagCustom, 'UTF-8'));
        }

        if ($q !== '') {
            $like = "%{$q}%";
            $stmt->bindValue(':q1', $like);
            $stmt->bindValue(':q2', $like);
            $stmt->bindValue(':q3', $like);
            $stmt->bindValue(':q4', $like);
            $stmt->bindValue(':q5', $like);
            $stmt->bindValue(':q6', $like);
        }

        $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);

        $stmt->execute();

        echo json_encode([
            'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'server_now' => serverNow($pdo)
        ]);
        exit;
    }

    /* =========================================================
     * SINCRONIZAR ALTERACOES
     * =======================================================*/
    if ($action === 'changes') {

        $since = trim($_GET['since'] ?? '');
        if ($since === '') {
            echo json_encode(['items' => [], 'server_now' => serverNow($pdo)]);
            exit;
        }

        $stmt = $pdo->prepare("
            SELECT
                p.*,
                (
                    SELECT COALESCE(SUM(v.valor), 0)
                    FROM protocolos_valores v
                    WHERE v.protocolo_id = p.id
                ) AS total_valores,
                t.cor AS tag_cor
            FROM protocolos p
            LEFT JOIN protocolos_tags t ON t.ato = p.ato
            WHERE p.updated_at >= DATE_SUB(:since, INTERVAL 2 SECOND)
            ORDER BY p.updated_at ASC
        ");
        $stmt->bindValue(':since', $since);
        $stmt->execute();

        echo json_encode([
            'items' => $stmt->fetchAll(PDO::FETCH_ASSOC),
            'server_now' => serverNow($pdo)
        ]);
        exit;
    }

    /* =========================================================
     * OBTER DADOS DO PROTOCOLO (MODAL)
     * =======================================================*/
    if ($action === 'get') {

        $id = (int)($_GET['id'] ?? 0);

        $stmt = $pdo->prepare("
            SELECT
                p.*,
                (
                    SELECT COALESCE(SUM(v.valor), 0)
                    FROM protocolos_valores v
                    WHERE v.protocolo_id = p.id
                ) AS total_valores,
                t.cor AS tag_cor
            FROM protocolos p
            LEFT JOIN protocolos_tags t ON t.ato = p.ato
            WHERE p.id = ?
            AND p.deletado = 0
        ");
        $stmt->execute([$id]);

        $protocolo = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$protocolo) {
            http_response_code(404);
            echo json_encode(['error' => 'Protocolo não encontrado']);
            exit;
        }

        echo json_encode($protocolo);
        exit;
    }

    /* =========================================================
     * AUTOSAVE (UPDATE DE CAMPOS)
     * =======================================================*/
    if ($action === 'update') {

        $id    = (int)($_POST['id'] ?? 0);
        $field = $_POST['field'] ?? null;
        $value = $_POST['value'] ?? null;

        $allowed = [
            'ficha',
            'ato',
            'digitador',
            'apresentante',
            'data_apresentacao',
            'contato',
            'outorgantes',
            'outorgados',
            'matricula',
            'area',
            'valor_ato',
            'observacoes',
            'urgente',
            'tag_custom'
        ];

        if (!in_array($field, $allowed, true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Campo inválido']);
            exit;
        }

        if ($field === 'urgente') {
            $value = (int)$value;
        }

        if ($field === 'valor_ato') {
            $value = normalizarDinheiro($value);
        }

        $stmt = $pdo->prepare("
            UPDATE protocolos
            SET {$field} = :value
            WHERE id = :id
            AND deletado = 0
        ");

        $stmt->bindValue(':value', $value);
        $stmt->bindValue(':id', $id, PDO::PARAM_INT);
        $stmt->execute();

        echo json_encode(['success' => true]);
        exit;
    }

    /* =========================================================
     * ALTERAR STATUS (DRAG & DROP / ARQUIVAR / RESTAURAR)
     * =======================================================*/
    if ($action === 'status') {

    $id     = (int)$_POST['id'];
    $status = $_POST['status'] ?? null;

    $valid = [
        'PARA_DISTRIBUIR',
        'EM_ANDAMENTO',
        'PARA_CORRECAO',
        'LAVRADOS',
        'ARQUIVADOS'
    ];

    if (!$status || !in_array($status, $valid, true)) {
        http_response_code(400);
        echo json_encode(['error' => 'Status inválido']);
        exit;
    }

    $stmt = $pdo->prepare("
        UPDATE protocolos
        SET status = :status
        WHERE id = :id
        AND deletado = 0
    ");

    $stmt->execute([
        ':status' => $status,
        ':id'     => $id
    ]);

    echo json_encode(['success' => true]);
    exit;
}

    /* =========================================================
     * FALLBACK
     * =======================================================*/
    http_response_code(400);
    echo json_encode(['error' => 'Ação desconhecida']);
    exit;

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'error'  => 'Erro interno',
        'detail' => $e->getMessage()
    ]);
}
