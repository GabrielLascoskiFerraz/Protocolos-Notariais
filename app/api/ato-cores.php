<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}


header('Content-Type: application/json; charset=utf-8');

$cores = require __DIR__ . '/../config/ato-cores.php';

echo json_encode($cores);
