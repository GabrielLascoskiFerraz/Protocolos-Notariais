<?php
declare(strict_types=1);

/**
 * Conexão com banco de dados.
 *
 * As credenciais podem ser sobrescritas por variáveis de ambiente para evitar
 * editar este arquivo em cada instalação local.
 */

$host = getenv('PROTOCOLOS_DB_HOST') ?: 'localhost';
$db   = getenv('PROTOCOLOS_DB_NAME') ?: 'dash-protocolos';
$user = getenv('PROTOCOLOS_DB_USER') ?: 'root';
$pass = getenv('PROTOCOLOS_DB_PASS') ?: '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    $requestUri = (string)($_SERVER['REQUEST_URI'] ?? '');
    $accept = (string)($_SERVER['HTTP_ACCEPT'] ?? '');
    $isApiRequest = str_contains($requestUri, '/api/') || str_contains($accept, 'application/json');

    if ($isApiRequest) {
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['success' => false, 'error' => 'Erro ao conectar ao banco de dados.'], JSON_UNESCAPED_UNICODE);
    } else {
        echo 'Erro ao conectar ao banco de dados.';
    }
    exit;
}
