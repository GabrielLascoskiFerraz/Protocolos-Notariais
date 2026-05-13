<?php
declare(strict_types=1);

define('PROTOCOLOS_FORCE_RESOURCE', 'imoveis');
$_GET['resource'] = $_REQUEST['resource'] = $_POST['resource'] = 'imoveis';
require __DIR__ . '/protocolos_app.php';
