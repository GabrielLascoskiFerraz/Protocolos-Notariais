<?php
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$baseHref = ($basePath === '') ? '/' : $basePath . '/';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Gerador de QR Codes</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <base href="<?= htmlspecialchars($baseHref) ?>">

    <link rel="icon" href="assets/img/logo.png">
    <link rel="stylesheet" href="assets/css/style.css">

    <script>window.BASE_URL = <?= json_encode($baseHref) ?>;</script>
    <script src="https://unpkg.com/qr-code-styling@1.5.0/lib/qr-code-styling.js"></script>
    <script type="module" src="assets/js/qr-generator.js"></script>
</head>
<body class="qr-page-body">
    <header class="topbar">
        <div class="qr-topbar-copy">
            <h1>Gerador de QR Codes</h1>
            <p class="qr-topbar-subtitle">Ferramenta interna para criar QR Codes.</p>
        </div>
        <div class="topbar-actions">
            <a class="btn-secondary topbar-link" href="index.php">Voltar aos protocolos</a>
        </div>
    </header>

    <main class="qr-main">
        <section class="qr-shell">
            <div class="qr-panel qr-form-panel">
                <span class="qr-eyebrow">Ferramenta interna</span>
                <h2 class="qr-title">Cole o link e gere o QR Code</h2>

                <label class="qr-field" for="qr-link">
                    <span>Link de destino</span>
                    <textarea
                        id="qr-link"
                        rows="5"
                        placeholder="https://exemplo.com.br"
                        spellcheck="false"
                    ></textarea>
                </label>

                <div class="qr-actions">
                    <button id="generate-qr" class="btn-primary" type="button">Gerar QR Code</button>
                    <button id="download-qr" class="btn-secondary" type="button" disabled>Baixar PNG</button>
                </div>

                <p id="qr-feedback" class="qr-feedback" aria-live="polite"></p>
            </div>

            <div class="qr-panel qr-preview-panel">
                <div class="qr-preview-header">
                    <div>
                        <span class="qr-eyebrow">Pré-visualização</span>
                        <h2 class="qr-title">PNG final</h2>
                    </div>
                </div>

                <div class="qr-stage">
                    <div id="qr-placeholder" class="qr-placeholder">
                        <div class="qr-placeholder-icon">QR</div>
                        <p>O QR Code aparecerá aqui após a geração.</p>
                    </div>
                    <div id="qr-output" class="qr-output hidden"></div>
                </div>

                <div class="qr-preview-meta">
                    <span class="qr-meta-label">Destino atual</span>
                    <p id="qr-target" class="qr-target-text">Nenhum link gerado.</p>
                </div>
            </div>
        </section>
    </main>
</body>
</html>
