<?php
declare(strict_types=1);

define('PROTOCOLOS_FORCE_RESOURCE', 'andamentos');
$_GET['resource'] = $_REQUEST['resource'] = $_POST['resource'] = 'andamentos';
require __DIR__ . '/protocolos_app.php';
