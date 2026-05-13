<?php
require __DIR__ . '/components/app-layout.php';

protocolos_render_head(
    'Gerador de QR Codes',
    'Cole o link, gere o QR Code e baixe o PNG final.',
    'apps/qrcode/index.js?v=' . protocolos_asset_version('apps/qrcode/index.js'),
    [
        'body_class' => 'apollo-body',
        'extra_head' => [
            '<script src="assets/vendor/qr-code-styling/qr-code-styling.js?v=' . protocolos_asset_version('assets/vendor/qr-code-styling/qr-code-styling.js') . '"></script>',
        ],
    ]
);

protocolos_render_app_start(
    'gerador-qrcode.php',
    'Ferramentas',
    'QR Code',
    'Cole o link, gere o QR Code e baixe o PNG final.',
    [],
    ['page_class' => 'page-protocol-tool']
);
?>
    <section class="protocol-tool-shell qr-tool-shell">
        <section class="surface protocol-tool-panel">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow">Link</span>
                    <h2>Destino do QR Code</h2>
                </div>
            </div>

            <label class="field" for="qr-link">
                <span>Link de destino</span>
                <textarea id="qr-link" rows="6" placeholder="https://exemplo.com.br" spellcheck="false"></textarea>
            </label>

            <div class="surface-actions">
                <button id="generate-qr" class="button button-primary" type="button">Gerar QR Code</button>
                <button id="download-qr" class="button button-secondary" type="button" disabled>Baixar PNG</button>
            </div>

            <p id="qr-feedback" class="feedback-text protocol-tool-feedback" aria-live="polite"></p>
        </section>

        <section class="surface protocol-tool-panel protocol-preview-panel">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow">Pré-visualização</span>
                    <h2>PNG final</h2>
                </div>
            </div>

            <div class="qr-stage protocol-qr-stage">
                <div id="qr-placeholder" class="qr-placeholder">
                    <div class="protocol-qr-placeholder-mark">QR</div>
                    <p>O QR Code aparecerá aqui.</p>
                </div>
                <div id="qr-output" class="qr-output hidden"></div>
            </div>

            <div class="protocol-target-box">
                <span class="eyebrow">Destino atual</span>
                <p id="qr-target">Nenhum link gerado.</p>
            </div>
        </section>
    </section>
<?php protocolos_render_app_end(); ?>
