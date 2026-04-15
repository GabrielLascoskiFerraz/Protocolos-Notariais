<?php
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$baseHref = ($basePath === '') ? '/' : $basePath . '/';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Leitor de Certidões</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <base href="<?= htmlspecialchars($baseHref) ?>">

    <link rel="icon" href="assets/img/logo.png">
    <link rel="stylesheet" href="assets/css/style.css">

    <script>window.BASE_URL = <?= json_encode($baseHref) ?>;</script>
    <script type="module" src="assets/js/certidoes.js"></script>
</head>
<body class="cert-page-body">
    <header class="topbar">
        <div class="cert-topbar-copy">
            <h1>Leitor de Certidões</h1>
            <p class="cert-topbar-subtitle">Ferramenta interna para analisar certidões de débitos e montar o texto final.</p>
        </div>
        <div class="topbar-actions">
            <a class="btn-secondary topbar-link" href="index.php">Voltar aos protocolos</a>
        </div>
    </header>

    <main class="cert-main">
        <section class="cert-shell">
            <div class="cert-panel cert-upload-panel">
                <h2 class="cert-title">Envie os PDFs das certidões</h2>
                <p class="cert-subtle">
                    O sistema processa certidões municipal, estadual, federal e TST, extrai os dados principais, verifica a validade e gera o texto pronto para copiar.
                </p>

                <div id="cert-warning" class="cert-warning hidden" aria-live="polite"></div>

                <div id="cert-dropzone" class="cert-dropzone" tabindex="0" role="button" aria-label="Arraste PDFs aqui ou clique para selecionar arquivos">
                    <div class="cert-dropzone-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24" focusable="false">
                            <path d="M12 3a1 1 0 0 1 1 1v7.59l2.3-2.3a1 1 0 1 1 1.4 1.42l-4 3.98a1 1 0 0 1-1.4 0l-4-3.98a1 1 0 0 1 1.4-1.42L11 11.6V4a1 1 0 0 1 1-1Zm-7 14a1 1 0 0 1 1 1v1h12v-1a1 1 0 1 1 2 0v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1a1 1 0 0 1 1-1Z" fill="currentColor"/>
                        </svg>
                    </div>
                    <strong>Arraste os PDFs aqui</strong>
                    <p>ou selecione vários arquivos de uma vez</p>
                    <div class="cert-actions cert-actions-centered">
                        <label class="btn-primary cert-file-trigger" for="cert-file-input">Selecionar arquivos</label>
                        <button class="btn-secondary" id="cert-clear" type="button">Limpar tudo</button>
                    </div>
                    <input id="cert-file-input" type="file" accept="application/pdf" multiple hidden>
                </div>

                <p class="cert-footnote">
                    Melhor resultado com PDFs que tenham texto selecionável. Arquivos escaneados em imagem não passam por OCR nesta versão.
                </p>
            </div>

            <div class="cert-grid">
                <section class="cert-panel cert-results-panel">
                    <div class="cert-section-head">
                        <div>
                            <span class="cert-eyebrow">Arquivos processados</span>
                            <h2 class="cert-title">Leitura individual</h2>
                        </div>
                    </div>
                    <div id="cert-results" class="cert-results-list"></div>
                </section>

                <section class="cert-panel cert-output-panel">
                    <div class="cert-section-head">
                        <div>
                            <span class="cert-eyebrow">Texto final</span>
                            <h2 class="cert-title">Saída estruturada</h2>
                        </div>
                    </div>

                    <p class="cert-subtle">
                        O texto é montado no formato pronto para copiar e colar, agrupado por nome quando necessário.
                    </p>

                    <textarea id="cert-output" class="cert-output" placeholder="O texto gerado aparecerá aqui."></textarea>

                    <div class="cert-actions">
                        <button class="btn-primary" id="cert-copy" type="button">Copiar texto</button>
                    </div>
                </section>
            </div>
        </section>
    </main>

    <div id="cert-alert-modal" class="modal hidden" aria-hidden="true">
        <div id="cert-alert-overlay" class="modal-overlay"></div>
        <div class="modal-panel cert-alert-panel" role="dialog" aria-modal="true" aria-labelledby="cert-alert-title">
            <div class="modal-header">
                <div>
                    <h3 id="cert-alert-title">Atenção nas certidões</h3>
                </div>
                <button id="cert-alert-close" class="modal-close" type="button" aria-label="Fechar alerta">×</button>
            </div>
            <div class="modal-content cert-alert-content">
                <p class="cert-subtle">Foram identificadas certidões positivas ou vencidas neste lote.</p>
                <div id="cert-alert-list" class="cert-alert-list"></div>
            </div>
        </div>
    </div>
</body>
</html>
