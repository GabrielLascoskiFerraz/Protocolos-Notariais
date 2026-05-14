<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../config/db.php';
require __DIR__ . '/../services/protocolos-metadata.php';
require __DIR__ . '/../views/app-layout.php';

$metadata = protocolos_build_board_metadata($pdo);
$showDocumentsFeature = false;

$initialBoardColumns = [
    ['status' => 'PARA_DISTRIBUIR', 'label' => 'Para distribuir', 'icon' => 'inbox'],
    ['status' => 'EM_ANDAMENTO', 'label' => 'Em andamento', 'icon' => 'progress'],
    ['status' => 'PARA_CORRECAO', 'label' => 'Para correção', 'icon' => 'correction'],
    ['status' => 'LAVRADOS', 'label' => 'Lavrados', 'icon' => 'done'],
];

function protocolos_initial_skeleton_card(): string
{
    return '
        <article class="protocol-card protocol-skeleton-card" aria-hidden="true">
            <div class="protocol-skeleton-line is-pill"></div>
            <div class="protocol-skeleton-line is-title"></div>
            <div class="protocol-skeleton-grid">
                <div class="protocol-skeleton-line"></div>
                <div class="protocol-skeleton-line"></div>
                <div class="protocol-skeleton-line"></div>
            </div>
        </article>
    ';
}

function protocolos_initial_board_skeleton(array $columns): string
{
    ob_start();
    foreach ($columns as $column):
        $status = (string) $column['status'];
        $label = (string) $column['label'];
        $icon = (string) $column['icon'];
        $classSuffix = strtolower(str_replace('_', '-', $status));
?>
        <section class="protocol-column protocol-column-<?= htmlspecialchars($classSuffix, ENT_QUOTES, 'UTF-8') ?>" data-status="<?= htmlspecialchars($status, ENT_QUOTES, 'UTF-8') ?>">
            <header>
                <div>
                    <span class="protocol-column-title"><span data-protocol-icon="<?= htmlspecialchars($icon, ENT_QUOTES, 'UTF-8') ?>" aria-hidden="true"></span><span class="eyebrow"><?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?></span></span>
                    <strong class="protocol-column-count" data-column-count-status="<?= htmlspecialchars($status, ENT_QUOTES, 'UTF-8') ?>">0</strong>
                </div>
            </header>
            <div class="protocol-column-cards" data-drop-status="<?= htmlspecialchars($status, ENT_QUOTES, 'UTF-8') ?>" data-scroll-status="<?= htmlspecialchars($status, ENT_QUOTES, 'UTF-8') ?>" aria-label="<?= htmlspecialchars($label, ENT_QUOTES, 'UTF-8') ?>">
                <?= protocolos_initial_skeleton_card() ?>
                <?= protocolos_initial_skeleton_card() ?>
                <?= protocolos_initial_skeleton_card() ?>
                <?= protocolos_initial_skeleton_card() ?>
            </div>
        </section>
<?php
    endforeach;
    return (string) ob_get_clean();
}

$scriptPath = 'assets/js/apps/protocolos/index.js';
$scriptVersion = protocolos_asset_version($scriptPath);

protocolos_render_head(
    'Protocolos Notariais',
    'Board operacional para acompanhar, editar e movimentar fichas.',
    $scriptPath . '?v=' . $scriptVersion,
    [
        'body_class' => 'protocolos-body',
        'extra_head' => [
            '<script>window.PROTOCOLOS_METADATA = ' . json_encode($metadata, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ';</script>',
            '<script type="module" src="assets/js/shared/calendar-alerts.js?v=' . protocolos_asset_version('assets/js/shared/calendar-alerts.js') . '"></script>',
        ],
    ]
);

protocolos_render_app_start(
    'index.php',
    'Protocolos Notariais',
    'Protocolos',
    'Board operacional para acompanhar, editar e movimentar fichas.',
    [],
    ['page_class' => 'page-protocols', 'hide_header' => true]
);
?>
    <section class="protocols-native-shell">
        <section class="surface protocols-control-panel">
            <div class="protocols-filter-line">
                <label class="field protocols-search-field">
                    <span class="protocols-field-label">
                        <span class="protocols-filter-icon" data-protocol-icon="search" aria-hidden="true"></span>
                        Buscar protocolos
                    </span>
                    <input id="protocols-search" type="search" placeholder="Ficha, apresentante, partes, digitador ou ato">
                </label>
                <label class="field">
                    <span class="protocols-field-label">
                        <span class="protocols-filter-icon" data-protocol-icon="stamp" aria-hidden="true"></span>
                        Ato
                    </span>
                    <select id="protocols-filter-ato">
                        <option value="">Todos</option>
                        <?php foreach ($metadata['atos'] as $ato): ?>
                            <option value="<?= htmlspecialchars(mb_strtolower($ato, 'UTF-8'), ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($ato, ENT_QUOTES, 'UTF-8') ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>

                <label class="field">
                    <span class="protocols-field-label">
                        <span class="protocols-filter-icon" data-protocol-icon="keyboard" aria-hidden="true"></span>
                        Digitador
                    </span>
                    <select id="protocols-filter-digitador">
                        <option value="">Todos</option>
                        <?php foreach ($metadata['digitadores'] as $digitador): ?>
                            <option value="<?= htmlspecialchars($digitador, ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($digitador, ENT_QUOTES, 'UTF-8') ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>

                <label class="field">
                    <span class="protocols-field-label">
                        <span class="protocols-filter-icon" data-protocol-icon="tag" aria-hidden="true"></span>
                        Etiqueta
                    </span>
                    <select id="protocols-filter-tag">
                        <option value="">Todas</option>
                        <?php foreach ($metadata['tags'] as $tag): ?>
                            <option value="<?= htmlspecialchars(mb_strtolower($tag, 'UTF-8'), ENT_QUOTES, 'UTF-8') ?>"><?= htmlspecialchars($tag, ENT_QUOTES, 'UTF-8') ?></option>
                        <?php endforeach; ?>
                    </select>
                </label>

                <label class="protocols-toggle protocols-toggle-urgent">
                    <input id="protocols-filter-urgente" type="checkbox">
                    <span class="protocols-filter-icon" data-protocol-icon="alert" aria-hidden="true"></span>
                    <span>Urgentes</span>
                </label>

                <label class="protocols-toggle">
                    <input id="protocols-toggle-archived" type="checkbox">
                    <span class="protocols-filter-icon" data-protocol-icon="archive" aria-hidden="true"></span>
                    <span>Mostrar arquivados</span>
                </label>
            </div>

            <div class="protocols-active-filters" id="protocols-active-filters" aria-live="polite"></div>
        </section>

        <section class="protocols-board" id="protocols-board" aria-live="polite" aria-busy="true">
            <?= protocolos_initial_board_skeleton($initialBoardColumns) ?>
        </section>
    </section>

    <dialog class="protocols-dialog" id="protocols-dialog">
        <form method="dialog" class="protocols-dialog-shell">
            <header class="protocols-dialog-head">
                <div>
                    <span class="eyebrow">Protocolo</span>
                    <h2 id="protocols-modal-title">Ficha</h2>
                    <p id="protocols-modal-subtitle">Autosave ativo nos campos editáveis.</p>
                </div>
                <div class="protocols-dialog-actions">
                    <button class="button button-secondary" type="button" id="protocols-print">Imprimir Ficha</button>
                    <button class="chat-icon-button" type="button" id="protocols-close" aria-label="Fechar">×</button>
                </div>
            </header>

            <div class="protocols-modal-notice is-hidden" id="protocols-modal-notice" role="status" aria-live="polite"></div>

            <section class="protocols-modal-overview">
                <article class="protocols-overview-card is-ficha">
                    <div class="protocols-overview-card-top">
                        <span class="protocols-overview-icon" data-protocol-icon="file" aria-hidden="true"></span>
                        <span class="eyebrow">Ficha</span>
                    </div>
                    <strong id="protocols-overview-ficha">-</strong>
                </article>
                <article class="protocols-overview-card is-ato">
                    <div class="protocols-overview-card-top">
                        <span class="protocols-overview-icon" data-protocol-icon="stamp" aria-hidden="true"></span>
                        <span class="eyebrow">Ato</span>
                    </div>
                    <strong id="protocols-overview-ato">-</strong>
                </article>
                <article class="protocols-overview-card is-digitador">
                    <div class="protocols-overview-card-top">
                        <span class="protocols-overview-icon" data-protocol-icon="keyboard" aria-hidden="true"></span>
                        <span class="eyebrow">Digitador</span>
                    </div>
                    <strong id="protocols-overview-digitador">-</strong>
                </article>
                <article class="protocols-overview-card is-data">
                    <div class="protocols-overview-card-top">
                        <span class="protocols-overview-icon" data-protocol-icon="calendar" aria-hidden="true"></span>
                        <span class="eyebrow">Data</span>
                    </div>
                    <strong id="protocols-overview-data">-</strong>
                </article>
            </section>

            <div class="protocols-dialog-body">
                <section class="surface surface-nested protocols-modal-section protocols-data-section">
                    <div class="surface-head surface-head-compact">
                        <div class="protocol-section-heading">
                            <span class="protocol-section-icon" data-protocol-icon="file" aria-hidden="true"></span>
                            <div>
                                <span class="eyebrow">Dados</span>
                                <h2>Identificação</h2>
                            </div>
                        </div>
                        <label class="protocols-urgent-toggle">
                            <input type="checkbox" data-protocol-field="urgente" value="1">
                            <span>Urgente</span>
                        </label>
                    </div>

                    <div class="compact-form-grid compact-form-grid-3">
                        <label class="field">
                            <span>Ficha</span>
                            <input type="number" data-protocol-field="ficha" min="0" max="9999999">
                        </label>
                        <label class="field field-span-2">
                            <span>Ato</span>
                            <input type="text" data-protocol-field="ato" list="protocols-ato-options">
                        </label>
                        <label class="field">
                            <span>Digitador</span>
                            <input type="text" data-protocol-field="digitador" list="protocols-digitador-options">
                        </label>
                        <label class="field">
                            <span>Data</span>
                            <input type="date" data-protocol-field="data_apresentacao">
                        </label>
                        <label class="field">
                            <span>Contato</span>
                            <input type="text" data-protocol-field="contato">
                        </label>
                        <label class="field field-span-2">
                            <span>Apresentante</span>
                            <input type="text" data-protocol-field="apresentante">
                        </label>
                        <label class="field">
                            <span>Etiqueta</span>
                            <input type="text" data-protocol-field="tag_custom" list="protocols-tag-options">
                        </label>
                    </div>
                </section>

                <section class="surface surface-nested protocols-modal-section protocols-timeline-section">
                    <div class="surface-head surface-head-compact">
                        <div class="protocol-section-heading">
                            <span class="protocol-section-icon" data-protocol-icon="note" aria-hidden="true"></span>
                            <div>
                                <span class="eyebrow">Andamentos</span>
                                <h2>Histórico</h2>
                            </div>
                        </div>
                    </div>
                    <div class="protocols-add-note">
                        <textarea id="protocols-new-note" rows="2" placeholder="Registrar novo andamento"></textarea>
                        <button class="button button-primary protocols-add-note-action" type="button" id="protocols-add-note" aria-label="Adicionar andamento" title="Adicionar andamento">
                            <span data-protocol-icon="plus" aria-hidden="true"></span>
                        </button>
                    </div>
                    <div class="protocols-timeline-frame" id="protocols-notes-frame">
                        <div class="protocols-timeline" id="protocols-notes"></div>
                        <div class="protocols-timeline-hint is-hidden" id="protocols-notes-hint" aria-hidden="true">Role para ver mais andamentos</div>
                    </div>
                </section>

                <section class="surface surface-nested protocols-modal-section">
                    <div class="surface-head surface-head-compact">
                        <div class="protocol-section-heading">
                            <span class="protocol-section-icon" data-protocol-icon="user" aria-hidden="true"></span>
                            <div>
                                <span class="eyebrow">Partes</span>
                                <h2>Outorgantes e outorgados</h2>
                            </div>
                        </div>
                    </div>
                    <div class="compact-form-grid compact-form-grid-2">
                        <label class="field">
                            <span>Outorgantes</span>
                            <textarea data-protocol-field="outorgantes" rows="5"></textarea>
                        </label>
                        <label class="field">
                            <span>Outorgados</span>
                            <textarea data-protocol-field="outorgados" rows="5"></textarea>
                        </label>
                    </div>
                </section>

                <section class="surface surface-nested protocols-modal-section">
                    <div class="surface-head surface-head-compact">
                        <div class="protocol-section-heading">
                            <span class="protocol-section-icon" data-protocol-icon="map" aria-hidden="true"></span>
                            <div>
                                <span class="eyebrow">Imóveis</span>
                                <h2>Matrículas</h2>
                            </div>
                        </div>
                        <button class="button button-secondary" type="button" id="protocols-add-property">Adicionar</button>
                    </div>
                    <div class="protocols-sublist" id="protocols-properties"></div>
                </section>

                <section class="surface surface-nested protocols-modal-section">
                    <div class="surface-head surface-head-compact">
                        <div class="protocol-section-heading">
                            <span class="protocol-section-icon" data-protocol-icon="money" aria-hidden="true"></span>
                            <div>
                                <span class="eyebrow">Valores</span>
                                <h2>Custas e adicionais</h2>
                            </div>
                        </div>
                        <button class="button button-secondary" type="button" id="protocols-add-value">Adicionar</button>
                    </div>
                    <label class="field">
                        <span>Valor do ato</span>
                        <input type="text" data-protocol-field="valor_ato" inputmode="decimal" placeholder="0,00">
                    </label>
                    <div class="protocols-sublist" id="protocols-values"></div>
                    <div class="protocols-total" id="protocols-values-total">Total: R$ 0,00</div>
                </section>

                <section class="surface surface-nested protocols-modal-section protocols-notes-section protocols-observations-section">
                    <div class="surface-head surface-head-compact">
                        <div class="protocol-section-heading">
                            <span class="protocol-section-icon" data-protocol-icon="note" aria-hidden="true"></span>
                            <div>
                                <span class="eyebrow">Observações</span>
                                <h2>Anotações internas</h2>
                            </div>
                        </div>
                    </div>
                    <label class="field protocols-observations-field">
                        <textarea data-protocol-field="observacoes" rows="9"></textarea>
                    </label>
                </section>

                <?php if ($showDocumentsFeature): ?>
                    <section class="surface surface-nested protocols-modal-section protocols-documents-section">
                        <div class="surface-head surface-head-compact">
                            <div class="protocol-section-heading">
                                <span class="protocol-section-icon" data-protocol-icon="archive" aria-hidden="true"></span>
                                <div>
                                    <span class="eyebrow">Documentos</span>
                                    <h2>Pasta vinculada</h2>
                                </div>
                            </div>
                        </div>
                        <label class="field">
                            <span>Caminho da pasta</span>
                            <input type="text" data-protocol-field="pasta_documentos" id="protocols-documents-path" placeholder="\\Srv01\d\Disco F\A FAZER - ESCRITURAS\...">
                        </label>
                        <div class="surface-actions protocols-documents-actions">
                            <button class="button button-secondary" type="button" id="protocols-copy-documents-path">Copiar caminho</button>
                            <button class="button button-secondary" type="button" id="protocols-open-documents-path">Abrir pasta</button>
                            <button class="button button-primary" type="button" id="protocols-refresh-documents">Atualizar lista</button>
                        </div>
                        <div class="protocols-documents-feedback" id="protocols-documents-feedback">Informe o caminho da pasta para listar os documentos.</div>
                        <div class="protocols-documents-summary" id="protocols-documents-summary"></div>
                        <div class="protocols-documents-list" id="protocols-documents-list"></div>
                    </section>
                <?php endif; ?>
            </div>
        </form>
    </dialog>

    <datalist id="protocols-ato-options">
        <?php foreach ($metadata['atos'] as $ato): ?>
            <option value="<?= htmlspecialchars($ato, ENT_QUOTES, 'UTF-8') ?>"></option>
        <?php endforeach; ?>
    </datalist>
    <datalist id="protocols-digitador-options">
        <?php foreach ($metadata['digitadores'] as $digitador): ?>
            <option value="<?= htmlspecialchars($digitador, ENT_QUOTES, 'UTF-8') ?>"></option>
        <?php endforeach; ?>
    </datalist>
    <datalist id="protocols-tag-options">
        <?php foreach ($metadata['tags'] as $tag): ?>
            <option value="<?= htmlspecialchars($tag, ENT_QUOTES, 'UTF-8') ?>"></option>
        <?php endforeach; ?>
    </datalist>

    <div id="protocols-delete-modal" class="protocol-modal hidden" aria-hidden="true">
        <div id="protocols-delete-overlay" class="protocol-modal-overlay"></div>
        <div class="protocol-modal-panel protocols-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="protocols-delete-title">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow">Confirmação</span>
                    <h2 id="protocols-delete-title">Excluir protocolo?</h2>
                </div>
                <button id="protocols-delete-close" class="chat-icon-button" type="button" aria-label="Fechar">×</button>
            </div>
            <p class="protocol-tool-note">Esta ação marca o protocolo como excluído. Os dados não serão apagados fisicamente.</p>
            <div class="protocols-confirm-summary" id="protocols-delete-summary">Selecione um protocolo para excluir.</div>
            <div class="surface-actions">
                <button class="button button-secondary" id="protocols-delete-cancel" type="button">Cancelar</button>
                <button class="button button-primary danger" id="protocols-delete-confirm" type="button">Excluir protocolo</button>
            </div>
        </div>
    </div>

    <dialog id="protocols-note-delete-modal" class="protocol-modal protocol-modal-dialog hidden" aria-hidden="true">
        <div id="protocols-note-delete-overlay" class="protocol-modal-overlay"></div>
        <div class="protocol-modal-panel protocols-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="protocols-note-delete-title">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow">Confirmação</span>
                    <h2 id="protocols-note-delete-title">Excluir andamento?</h2>
                </div>
                <button id="protocols-note-delete-close" class="chat-icon-button" type="button" aria-label="Fechar">×</button>
            </div>
            <p class="protocol-tool-note">Esta ação remove o andamento selecionado deste protocolo.</p>
            <div class="protocols-confirm-summary" id="protocols-note-delete-summary">Selecione um andamento para excluir.</div>
            <div class="surface-actions">
                <button class="button button-secondary" id="protocols-note-delete-cancel" type="button">Cancelar</button>
                <button class="button button-primary danger" id="protocols-note-delete-confirm" type="button">Excluir andamento</button>
            </div>
        </div>
    </dialog>

    <div id="dashboard-calendar-modal" class="protocol-modal hidden" aria-hidden="true">
        <div id="dashboard-calendar-overlay" class="protocol-modal-overlay"></div>
        <div class="protocol-modal-panel protocols-confirm-panel" role="dialog" aria-modal="true" aria-labelledby="dashboard-calendar-title">
            <div class="surface-head surface-head-compact">
                <div>
                    <span class="eyebrow">Agenda de hoje</span>
                    <h2 id="dashboard-calendar-title">Novo compromisso</h2>
                </div>
                <button id="dashboard-calendar-close" class="chat-icon-button" type="button" aria-label="Fechar aviso">×</button>
            </div>
            <p id="dashboard-calendar-summary" class="protocol-tool-note"></p>
            <div id="dashboard-calendar-events" class="dashboard-calendar-events"></div>
            <div class="surface-actions">
                <a class="button button-secondary" href="calendario.php">Abrir agenda</a>
                <button id="dashboard-calendar-ok" class="button button-primary" type="button">Entendi</button>
            </div>
        </div>
    </div>
<?php protocolos_render_app_end(); ?>
