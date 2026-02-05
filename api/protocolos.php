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
            'id'      => $pdo->lastInsertId()
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

        echo json_encode(['success' => true]);
        exit;
    }

    /* =========================================================
     * BUSCA GLOBAL (TODOS OS STATUS)
     * =======================================================*/
    if ($action === 'search') {

        $q = trim($_GET['q'] ?? '');
        $ato = trim($_GET['ato'] ?? '');
        $digitador = trim($_GET['digitador'] ?? '');

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

        if ($ato !== '') {
            $sql .= " AND LOWER(TRIM(p.ato)) = :ato";
        }

        if ($digitador !== '') {
            $sql .= " AND p.digitador = :digitador";
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

        $stmt = $pdo->prepare($sql);

        if ($ato !== '') {
            $stmt->bindValue(':ato', mb_strtolower($ato, 'UTF-8'));
        }
        if ($digitador !== '') {
            $stmt->bindValue(':digitador', $digitador);
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

        $stmt->execute();

        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
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
            'urgente'
        ];

        if (!in_array($field, $allowed, true)) {
            http_response_code(400);
            echo json_encode(['error' => 'Campo inválido']);
            exit;
        }

        if ($field === 'urgente') {
            $value = (int)$value;
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
