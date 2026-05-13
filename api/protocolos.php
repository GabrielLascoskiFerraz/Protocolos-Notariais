<?php
declare(strict_types=1);

define('PROTOCOLOS_FORCE_RESOURCE', 'protocolos');
$_GET['resource'] = $_REQUEST['resource'] = $_POST['resource'] = 'protocolos';
require __DIR__ . '/protocolos_app.php';
