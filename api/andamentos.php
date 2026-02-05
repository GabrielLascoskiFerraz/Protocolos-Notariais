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
     * LISTAR ANDAMENTOS DE UM PROTOCOLO
     * =======================================================*/
    if ($action === 'list') {

        $protocoloId = (int)($_GET['protocolo_id'] ?? 0);

        $stmt = $pdo->prepare("
            SELECT 
                id,
                descricao,
                created_at
            FROM protocolos_andamentos
            WHERE protocolo_id = ?
            ORDER BY created_at DESC
        ");
        $stmt->execute([$protocoloId]);

        echo json_encode($stmt->fetchAll());
        exit;
    }

    /* =========================================================
     * ADICIONAR ANDAMENTO
     * =======================================================*/
    if ($action === 'create') {

        $protocoloId = (int)$_POST['protocolo_id'];
        $descricao   = trim($_POST['descricao'] ?? '');

        if ($descricao === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Descrição obrigatória']);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO protocolos_andamentos (protocolo_id, descricao)
            VALUES (?, ?)
        ");
        $stmt->execute([$protocoloId, $descricao]);

        echo json_encode([
            'success' => true,
            'id' => $pdo->lastInsertId(),
            'created_at' => date('Y-m-d H:i:s')
        ]);
        exit;
    }

    /* =========================================================
     * ATUALIZAR ANDAMENTO
     * =======================================================*/
    if ($action === 'update') {

        $id        = (int)$_POST['id'];
        $descricao = trim($_POST['descricao'] ?? '');

        if ($descricao === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Descrição obrigatória']);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE protocolos_andamentos
            SET descricao = ?
            WHERE id = ?
        ");
        $stmt->execute([$descricao, $id]);

        echo json_encode(['success' => true]);
        exit;
    }

    /* =========================================================
     * REMOVER ANDAMENTO
     * =======================================================*/
    if ($action === 'delete') {

        $id = (int)$_POST['id'];

        $stmt = $pdo->prepare("
            DELETE FROM protocolos_andamentos
            WHERE id = ?
        ");
        $stmt->execute([$id]);

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