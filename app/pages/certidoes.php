<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../views/app-layout.php';

protocolos_render_head(
    'Leitor de Certidões',
    'Envie PDFs com texto selecionável para montar a saída pronta para copiar.',
    'assets/js/apps/certidoes/index.js?v=' . protocolos_asset_version('assets/js/apps/certidoes/index.js'),
    ['body_class' => 'protocolos-body']
);

protocolos_render_app_start(
    'certidoes.php',
    'Ferramentas',
    'Certidões',
    'Envie PDFs com texto selecionável para montar a saída pronta para copiar.',
    [],
    ['page_class' => 'page-protocol-tool']
);
?>
    <section class="protocol-tool-shell protocol-cert-shell">
        <section class="surface protocol-tool-panel">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow"><?= protocolos_tool_icon_markup('file') ?>Arquivos</span>
                    <h2>Certidões em PDF</h2>
                </div>
                <button class="button button-secondary" id="cert-clear" type="button">
                    <?= protocolos_tool_icon_markup('clear') ?><span>Limpar</span>
                </button>
            </div>

            <div id="cert-warning" class="protocol-warning hidden" aria-live="polite"></div>
            <div id="cert-processing" class="cert-processing-status hidden" aria-live="polite">
                <span class="cert-processing-spinner" aria-hidden="true"></span>
                <div>
                    <strong>Processando certidões</strong>
                    <span id="cert-processing-text">Preparando leitura dos PDFs.</span>
                </div>
            </div>

            <div id="cert-dropzone" class="protocol-dropzone" tabindex="0" role="button" aria-label="Arraste PDFs aqui ou clique para selecionar arquivos">
                <div class="protocol-dropzone-icon" aria-hidden="true"><?= protocolos_tool_icon_markup('pdf') ?></div>
                <strong>Arraste os PDFs aqui</strong>
                <p>ou selecione vários arquivos de uma vez.</p>
                <label class="button button-primary" for="cert-file-input">
                    <?= protocolos_tool_icon_markup('upload') ?><span>Selecionar arquivos</span>
                </label>
                <input id="cert-file-input" type="file" accept="application/pdf" multiple hidden>
            </div>

            <p class="protocol-tool-note">Funciona melhor com PDFs que tenham texto selecionável.</p>
        </section>

        <section class="surface protocol-tool-panel">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow"><?= protocolos_tool_icon_markup('output') ?>Texto final</span>
                    <h2>Saída para copiar</h2>
                </div>
                <button class="button button-primary" id="cert-copy" type="button">
                    <?= protocolos_tool_icon_markup('copy') ?><span data-button-label>Copiar</span>
                </button>
            </div>

            <div class="protocol-cert-output-wrap">
                <div id="cert-output-highlight" class="protocol-cert-output-highlight" aria-hidden="true"></div>
                <textarea id="cert-output" class="protocol-cert-output" placeholder="O texto gerado aparecerá aqui."></textarea>
            </div>
        </section>

        <section class="surface protocol-tool-panel protocol-cert-results">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow"><?= protocolos_tool_icon_markup('file') ?>Leitura</span>
                    <h2>Arquivos processados</h2>
                </div>
            </div>
            <div id="cert-results" class="protocol-cert-results-list"></div>
        </section>
    </section>

    <dialog id="cert-alert-modal" class="protocol-modal protocol-modal-dialog hidden" aria-hidden="true">
        <div id="cert-alert-overlay" class="protocol-modal-overlay"></div>
        <div class="protocol-modal-panel" role="dialog" aria-modal="true" aria-labelledby="cert-alert-title">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow"><?= protocolos_tool_icon_markup('alert') ?>Atenção</span>
                    <h2 id="cert-alert-title">Certidões com alerta</h2>
                </div>
                <button id="cert-alert-close" class="chat-icon-button" type="button" aria-label="Fechar alerta">×</button>
            </div>
            <p class="protocol-tool-note">Foram identificadas certidões positivas, vencidas ou não emitidas neste lote.</p>
            <div id="cert-alert-list" class="protocol-cert-alert-list"></div>
        </div>
    </dialog>
<?php protocolos_render_app_end(); ?>
