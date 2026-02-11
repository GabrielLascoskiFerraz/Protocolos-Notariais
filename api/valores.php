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

    /* =========================================================
     * LISTAR VALORES DE UM PROTOCOLO
     * =======================================================*/
    if ($action === 'list') {

        $protocoloId = (int)($_GET['protocolo_id'] ?? 0);

        $stmt = $pdo->prepare("
            SELECT 
                id,
                descricao,
                valor
            FROM protocolos_valores
            WHERE protocolo_id = ?
            ORDER BY created_at ASC
        ");
        $stmt->execute([$protocoloId]);

        echo json_encode($stmt->fetchAll());
        exit;
    }

    /* =========================================================
     * ADICIONAR VALOR
     * =======================================================*/
    if ($action === 'create') {

        $protocoloId = (int)$_POST['protocolo_id'];
        $descricao   = trim($_POST['descricao'] ?? '');
        $valor       = normalizarDinheiro($_POST['valor'] ?? '');

        if (!is_numeric($valor)) {
            http_response_code(400);
            echo json_encode(['error' => 'Valor inválido']);
            exit;
        }

        if (mb_strlen($descricao, 'UTF-8') > 200) {
            http_response_code(400);
            echo json_encode(['error' => 'Descrição do valor excede 200 caracteres']);
            exit;
        }

        if ((float)$valor > 99999999.99) {
            http_response_code(400);
            echo json_encode(['error' => 'Valor excede o máximo permitido']);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO protocolos_valores (protocolo_id, descricao, valor)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$protocoloId, $descricao, $valor]);

        $touch = $pdo->prepare("UPDATE protocolos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $touch->execute([$protocoloId]);

        // recalcula total
        $total = totalValores($pdo, $protocoloId);

        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'total' => $total
        ]);
        exit;
    }

    /* =========================================================
     * ATUALIZAR VALOR
     * =======================================================*/
    if ($action === 'update') {

        $id          = (int)$_POST['id'];
        $descricao   = trim($_POST['descricao'] ?? '');
        $valor       = normalizarDinheiro($_POST['valor'] ?? '');

        if (!is_numeric($valor)) {
            http_response_code(400);
            echo json_encode(['error' => 'Valor inválido']);
            exit;
        }

        if (mb_strlen($descricao, 'UTF-8') > 200) {
            http_response_code(400);
            echo json_encode(['error' => 'Descrição do valor excede 200 caracteres']);
            exit;
        }

        if ((float)$valor > 99999999.99) {
            http_response_code(400);
            echo json_encode(['error' => 'Valor excede o máximo permitido']);
            exit;
        }

        // descobre o protocolo para recalcular o total depois
        $stmt = $pdo->prepare("
            SELECT protocolo_id
            FROM protocolos_valores
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Valor não encontrado']);
            exit;
        }

        $protocoloId = (int)$row['protocolo_id'];

        $stmt = $pdo->prepare("
            UPDATE protocolos_valores
            SET descricao = ?, valor = ?
            WHERE id = ?
        ");
        $stmt->execute([$descricao, $valor, $id]);

        $touch = $pdo->prepare("UPDATE protocolos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $touch->execute([$protocoloId]);

        $total = totalValores($pdo, $protocoloId);

        echo json_encode([
            'success' => true,
            'total' => $total
        ]);
        exit;
    }

    /* =========================================================
     * REMOVER VALOR
     * =======================================================*/
    if ($action === 'delete') {

        $id = (int)$_POST['id'];

        // descobre o protocolo antes de apagar
        $stmt = $pdo->prepare("
            SELECT protocolo_id
            FROM protocolos_valores
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Valor não encontrado']);
            exit;
        }

        $protocoloId = (int)$row['protocolo_id'];

        $stmt = $pdo->prepare("
            DELETE FROM protocolos_valores
            WHERE id = ?
        ");
        $stmt->execute([$id]);

        $touch = $pdo->prepare("UPDATE protocolos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $touch->execute([$protocoloId]);

        $total = totalValores($pdo, $protocoloId);

        echo json_encode([
            'success' => true,
            'total' => $total
        ]);
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
        'error' => 'Erro interno',
        'detail' => $e->getMessage()
    ]);
}


/* =============================================================
 * FUNÇÃO AUXILIAR: TOTAL DE VALORES DO PROTOCOLO
 * ===========================================================*/
function totalValores(PDO $pdo, int $protocoloId): float
{
    $stmt = $pdo->prepare("
        SELECT COALESCE(SUM(valor),0)
        FROM protocolos_valores
        WHERE protocolo_id = ?
    ");
    $stmt->execute([$protocoloId]);

    return (float)$stmt->fetchColumn();
}
