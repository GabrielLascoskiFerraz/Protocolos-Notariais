<?php
/**
 * Teste de integração das APIs do Protocolos Notariais.
 *
 * Uso:
 *   php tests/php/ApiTestRunner.php [BASE_URL]
 *
 * Exemplo:
 *   php tests/php/ApiTestRunner.php http://localhost/protocolos/
 *
 * Requisitos:
 *   - PHP CLI com ext-curl
 *   - Servidor rodando com o banco configurado
 */

$baseUrl = rtrim($argv[1] ?? 'http://localhost/protocolos', '/') . '/';

$passed = 0;
$failed = 0;
$errors = [];

function api(string $endpoint, string $method = 'GET', array $data = []): array {
    global $baseUrl;
    $url = $baseUrl . $endpoint;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HEADER, false);

    if ($method === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
    } else {
        $url .= (strpos($url, '?') !== false ? '&' : '?') . http_build_query($data);
    }

    curl_setopt($ch, CURLOPT_URL, $url);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $httpCode,
        'body' => json_decode($response, true) ?? [],
        'raw'  => $response,
    ];
}

function assert_true(bool $condition, string $label): void {
    global $passed, $failed, $errors;
    if ($condition) {
        $passed++;
        echo "  ✓ {$label}\n";
    } else {
        $failed++;
        $errors[] = $label;
        echo "  ✗ {$label}\n";
    }
}

function section(string $title): void {
    echo "\n=== {$title} ===\n";
}

/* =========================================================
   PROTOCOLOS
   ======================================================= */

section('Protocolos — Criar');

$res = api('api/protocolos.php?action=create', 'POST');
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');
assert_true(isset($res['body']['id']), 'Retorna id');

$protocoloId = $res['body']['id'] ?? null;

section('Protocolos — Get');

$res = api("api/protocolos.php?action=get&id={$protocoloId}");
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['id'] == $protocoloId, 'ID correto');
assert_true($res['body']['status'] === 'PARA_DISTRIBUIR', 'Status inicial = PARA_DISTRIBUIR');

section('Protocolos — Update campo');

$res = api('api/protocolos.php?action=update', 'POST', [
    'id'    => $protocoloId,
    'field' => 'ficha',
    'value' => '9999',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');

$res = api("api/protocolos.php?action=get&id={$protocoloId}");
assert_true($res['body']['ficha'] == 9999, 'Ficha atualizada para 9999');

// Testa update de campo ato
$res = api('api/protocolos.php?action=update', 'POST', [
    'id'    => $protocoloId,
    'field' => 'ato',
    'value' => 'Compra e venda',
]);
assert_true($res['body']['success'] === true, 'Ato atualizado');

// Testa update de campo apresentante
$res = api('api/protocolos.php?action=update', 'POST', [
    'id'    => $protocoloId,
    'field' => 'apresentante',
    'value' => 'Teste Apresentante',
]);
assert_true($res['body']['success'] === true, 'Apresentante atualizado');

// Testa campo não permitido
$res = api('api/protocolos.php?action=update', 'POST', [
    'id'    => $protocoloId,
    'field' => 'deletado',
    'value' => '1',
]);
assert_true($res['code'] === 400, 'Campo nao permitido retorna 400');

section('Protocolos — Status');

$res = api('api/protocolos.php?action=status', 'POST', [
    'id'     => $protocoloId,
    'status' => 'EM_ANDAMENTO',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');

$res = api("api/protocolos.php?action=get&id={$protocoloId}");
assert_true($res['body']['status'] === 'EM_ANDAMENTO', 'Status alterado para EM_ANDAMENTO');

// Status invalido
$res = api('api/protocolos.php?action=status', 'POST', [
    'id'     => $protocoloId,
    'status' => 'INVALIDO',
]);
assert_true($res['code'] === 400, 'Status invalido retorna 400');

section('Protocolos — Search');

$res = api('api/protocolos.php?action=search', 'GET', [
    'q'      => '9999',
    'status' => 'EM_ANDAMENTO',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true(isset($res['body']['items']), 'Retorna items');
assert_true(count($res['body']['items']) >= 1, 'Encontrou pelo menos 1 resultado');

section('Protocolos — Changes (sync)');

$res = api('api/protocolos.php?action=changes', 'GET', [
    'since' => '2000-01-01 00:00:00',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true(isset($res['body']['items']), 'Retorna items');
assert_true(isset($res['body']['server_now']), 'Retorna server_now');

/* =========================================================
   ANDAMENTOS
   ======================================================= */

section('Andamentos — Criar');

$res = api('api/andamentos.php?action=create', 'POST', [
    'protocolo_id' => $protocoloId,
    'descricao'    => 'Primeiro andamento de teste',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');
assert_true(isset($res['body']['id']), 'Retorna id');

$andamentoId = $res['body']['id'] ?? null;

section('Andamentos — Listar');

$res = api("api/andamentos.php?action=list&protocolo_id={$protocoloId}");
assert_true($res['code'] === 200, 'Status 200');
assert_true(is_array($res['body']), 'Retorna array');
assert_true(count($res['body']) >= 1, 'Pelo menos 1 andamento');
assert_true($res['body'][0]['descricao'] === 'Primeiro andamento de teste', 'Descricao correta');

section('Andamentos — Atualizar');

$res = api('api/andamentos.php?action=update', 'POST', [
    'id'        => $andamentoId,
    'descricao' => 'Andamento editado',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');

section('Andamentos — Remover');

$res = api('api/andamentos.php?action=delete', 'POST', [
    'id' => $andamentoId,
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');

$res = api("api/andamentos.php?action=list&protocolo_id={$protocoloId}");
assert_true(count($res['body']) === 0, 'Andamento removido');

/* =========================================================
   VALORES
   ======================================================= */

section('Valores — Criar');

$res = api('api/valores.php?action=create', 'POST', [
    'protocolo_id' => $protocoloId,
    'descricao'    => 'ITBI',
    'valor'        => '250.50',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');

$valorId = $res['body']['id'] ?? null;

section('Valores — Listar');

$res = api("api/valores.php?action=list&protocolo_id={$protocoloId}");
assert_true($res['code'] === 200, 'Status 200');
assert_true(count($res['body']) >= 1, 'Pelo menos 1 valor');

section('Valores — Atualizar');

$res = api('api/valores.php?action=update', 'POST', [
    'id'        => $valorId,
    'descricao' => 'ITBI Atualizado',
    'valor'     => '300.00',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');
assert_true(isset($res['body']['total']), 'Retorna total');

section('Valores — Remover');

$res = api('api/valores.php?action=delete', 'POST', [
    'id' => $valorId,
]);
assert_true($res['code'] === 200, 'Status 200');

/* =========================================================
   IMÓVEIS
   ======================================================= */

section('Imoveis — Criar');

$res = api('api/imoveis.php?action=create', 'POST', [
    'protocolo_id' => $protocoloId,
    'matricula'    => '12345',
    'area'         => '500m2',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');

$imovelId = $res['body']['id'] ?? null;

section('Imoveis — Listar');

$res = api("api/imoveis.php?action=list&protocolo_id={$protocoloId}");
assert_true($res['code'] === 200, 'Status 200');
assert_true(count($res['body']) >= 1, 'Pelo menos 1 imovel');

section('Imoveis — Atualizar');

$res = api('api/imoveis.php?action=update', 'POST', [
    'id'        => $imovelId,
    'matricula' => '67890',
    'area'      => '1000m2',
]);
assert_true($res['code'] === 200, 'Status 200');

section('Imoveis — Remover');

$res = api('api/imoveis.php?action=delete', 'POST', [
    'id' => $imovelId,
]);
assert_true($res['code'] === 200, 'Status 200');

/* =========================================================
   TAGS
   ======================================================= */

section('Tags — Criar');

$res = api('api/tags.php?action=create', 'POST', [
    'ato' => '__TESTE_ATO__',
    'cor' => '#ff0000',
]);
assert_true($res['code'] === 200, 'Status 200');
assert_true($res['body']['success'] === true, 'success = true');

section('Tags — Listar');

$res = api('api/tags.php?action=list');
assert_true($res['code'] === 200, 'Status 200');
assert_true(is_array($res['body']), 'Retorna array');

$found = false;
foreach ($res['body'] as $tag) {
    if ($tag['ato'] === '__TESTE_ATO__') {
        $found = true;
        assert_true($tag['cor'] === '#ff0000', 'Cor correta');
    }
}
assert_true($found, 'Tag de teste encontrada');

section('Tags — Atualizar (upsert)');

$res = api('api/tags.php?action=create', 'POST', [
    'ato' => '__TESTE_ATO__',
    'cor' => '#00ff00',
]);
assert_true($res['body']['success'] === true, 'Upsert ok');

section('Tags — Remover');

$res = api('api/tags.php?action=delete', 'POST', [
    'ato' => '__TESTE_ATO__',
]);
assert_true($res['code'] === 200, 'Status 200');

/* =========================================================
   ATO CORES (endpoint JSON estático)
   ======================================================= */

section('Ato Cores — Mapa JSON');

$res = api('api/ato-cores.php');
assert_true($res['code'] === 200, 'Status 200');
assert_true(isset($res['body']['Compra e venda']), 'Contem Compra e venda');
assert_true(preg_match('/^#[0-9a-fA-F]{6}$/', $res['body']['Compra e venda'] ?? '') === 1, 'Cor e hex valido');

/* =========================================================
   CLEANUP — Excluir protocolo de teste
   ======================================================= */

section('Cleanup');

$res = api('api/protocolos.php?action=delete', 'POST', ['id' => $protocoloId]);
assert_true($res['body']['success'] === true, 'Protocolo de teste excluido');

/* =========================================================
   RESULTADO
   ======================================================= */

echo "\n" . str_repeat('=', 50) . "\n";
echo "Resultado: {$passed} passou, {$failed} falhou\n";

if ($failed > 0) {
    echo "\nFalhas:\n";
    foreach ($errors as $e) {
        echo "  ✗ {$e}\n";
    }
    exit(1);
}

echo "Todos os testes passaram!\n";
exit(0);
