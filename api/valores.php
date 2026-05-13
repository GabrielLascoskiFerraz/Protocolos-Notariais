<?php
declare(strict_types=1);

define('PROTOCOLOS_INTERNAL', true);

define('PROTOCOLOS_FORCE_RESOURCE', 'valores');
$_GET['resource'] = $_REQUEST['resource'] = $_POST['resource'] = 'valores';
require __DIR__ . '/../app/api/protocolos_app.php';
