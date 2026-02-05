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
     * LISTAR TODAS AS TAGS
     * =======================================================*/
    if ($action === 'list') {

        $stmt = $pdo->query("
            SELECT ato, cor
            FROM protocolos_tags
            ORDER BY ato ASC
        ");

        echo json_encode($stmt->fetchAll());
        exit;
    }

    /* =========================================================
     * CRIAR TAG PARA UM ATO
     * =======================================================*/
    if ($action === 'create') {

        $ato = trim($_POST['ato'] ?? '');
        $cor = trim($_POST['cor'] ?? '#64748b');

        if ($ato === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Ato obrigatório']);
            exit;
        }

        $stmt = $pdo->prepare("
            INSERT INTO protocolos_tags (ato, cor)
            VALUES (?, ?)
            ON DUPLICATE KEY UPDATE cor = VALUES(cor)
        ");
        $stmt->execute([$ato, $cor]);

        echo json_encode(['success' => true]);
        exit;
    }

    /* =========================================================
     * ATUALIZAR COR DE UM ATO
     * =======================================================*/
    if ($action === 'update') {

        $ato = trim($_POST['ato'] ?? '');
        $cor = trim($_POST['cor'] ?? '');

        if ($ato === '' || $cor === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Dados inválidos']);
            exit;
        }

        $stmt = $pdo->prepare("
            UPDATE protocolos_tags
            SET cor = ?
            WHERE ato = ?
        ");
        $stmt->execute([$cor, $ato]);

        echo json_encode(['success' => true]);
        exit;
    }

    /* =========================================================
     * REMOVER TAG
     * =======================================================*/
    if ($action === 'delete') {

        $ato = trim($_POST['ato'] ?? '');

        if ($ato === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Ato inválido']);
            exit;
        }

        $stmt = $pdo->prepare("
            DELETE FROM protocolos_tags
            WHERE ato = ?
        ");
        $stmt->execute([$ato]);

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