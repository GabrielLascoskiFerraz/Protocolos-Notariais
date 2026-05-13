<?php
declare(strict_types=1);

function ensureProtocolosDocumentosSchema(PDO $pdo): void
{
    static $done = false;
    if ($done) {
        return;
    }

    $stmt = $pdo->query("SHOW COLUMNS FROM `protocolos` LIKE 'pasta_documentos'");
    if (!$stmt || !$stmt->fetch()) {
        $pdo->exec("
            ALTER TABLE `protocolos`
            ADD COLUMN `pasta_documentos` varchar(1024) DEFAULT NULL AFTER `observacoes`
        ");
    }

    $done = true;
}
