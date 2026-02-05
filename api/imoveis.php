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
     * LISTAR IMÓVEIS DE UM PROTOCOLO
     * =======================================================*/
    if ($action === 'list') {

        $protocoloId = (int)($_GET['protocolo_id'] ?? 0);

        $stmt = $pdo->prepare("
            SELECT id, matricula, area
            FROM protocolos_imoveis
            WHERE protocolo_id = ?
            ORDER BY id ASC
        ");
        $stmt->execute([$protocoloId]);

        echo json_encode($stmt->fetchAll());
        exit;
    }

    /* =========================================================
     * ADICIONAR IMÓVEL
     * =======================================================*/
    if ($action === 'create') {

        $protocoloId = (int)($_POST['protocolo_id'] ?? 0);
        $matricula   = trim($_POST['matricula'] ?? '');
        $area        = trim($_POST['area'] ?? '');

        $stmt = $pdo->prepare("
            INSERT INTO protocolos_imoveis (protocolo_id, matricula, area)
            VALUES (?, ?, ?)
        ");
        $stmt->execute([$protocoloId, $matricula, $area]);

        $touch = $pdo->prepare("UPDATE protocolos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $touch->execute([$protocoloId]);

        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId()
        ]);
        exit;
    }

    /* =========================================================
     * ATUALIZAR IMÓVEL
     * =======================================================*/
    if ($action === 'update') {

        $id        = (int)($_POST['id'] ?? 0);
        $matricula = trim($_POST['matricula'] ?? '');
        $area      = trim($_POST['area'] ?? '');

        $stmt = $pdo->prepare("
            SELECT protocolo_id
            FROM protocolos_imoveis
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Imóvel não encontrado']);
            exit;
        }

        $protocoloId = (int)$row['protocolo_id'];

        $stmt = $pdo->prepare("
            UPDATE protocolos_imoveis
            SET matricula = ?, area = ?
            WHERE id = ?
        ");
        $stmt->execute([$matricula, $area, $id]);

        $touch = $pdo->prepare("UPDATE protocolos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $touch->execute([$protocoloId]);

        echo json_encode(['success' => true]);
        exit;
    }

    /* =========================================================
     * REMOVER IMÓVEL
     * =======================================================*/
    if ($action === 'delete') {

        $id = (int)($_POST['id'] ?? 0);

        $stmt = $pdo->prepare("
            SELECT protocolo_id
            FROM protocolos_imoveis
            WHERE id = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        if (!$row) {
            http_response_code(404);
            echo json_encode(['error' => 'Imóvel não encontrado']);
            exit;
        }

        $protocoloId = (int)$row['protocolo_id'];

        $stmt = $pdo->prepare("
            DELETE FROM protocolos_imoveis
            WHERE id = ?
        ");
        $stmt->execute([$id]);

        $touch = $pdo->prepare("UPDATE protocolos SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $touch->execute([$protocoloId]);

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
        'error' => 'Erro interno',
        'detail' => $e->getMessage()
    ]);
}
