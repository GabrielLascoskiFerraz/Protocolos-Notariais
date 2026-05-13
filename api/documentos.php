<?php
declare(strict_types=1);

define('PROTOCOLOS_INTERNAL', true);

define('PROTOCOLOS_FORCE_RESOURCE', 'documentos');
$_GET['resource'] = $_REQUEST['resource'] = $_POST['resource'] = 'documentos';
require __DIR__ . '/../app/api/protocolos_app.php';
