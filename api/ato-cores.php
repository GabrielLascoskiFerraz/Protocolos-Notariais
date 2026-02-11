<?php
header('Content-Type: application/json; charset=utf-8');

$cores = require __DIR__ . '/../config/ato-cores.php';

echo json_encode($cores);
