<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../views/app-layout.php';

protocolos_render_head(
    'Consultar Agenda',
    'Agenda sincronizada por calendário externo.',
    'assets/js/apps/agenda/index.js?v=' . protocolos_asset_version('assets/js/apps/agenda/index.js'),
    ['body_class' => 'protocolos-body']
);

protocolos_render_app_start(
    'calendario.php',
    'Agenda',
    'Agenda',
    '',
    [],
    ['page_class' => 'page-agenda', 'hide_header' => true]
);
?>
    <section class="agenda-workspace" aria-label="Agenda do cartório">
        <header class="agenda-command">
            <div>
                <span class="eyebrow">Calendário</span>
                <h2 id="agenda-month-label">Carregando agenda</h2>
                <p>Visualize os compromissos do cartório.</p>
            </div>
            <div class="agenda-actions">
                <span class="status-pill status-pill-soft" id="agenda-feedback" aria-live="polite">Carregando compromissos...</span>
                <button class="button button-secondary agenda-refresh-button" type="button" id="agenda-refresh" aria-label="Atualizar calendário">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </button>
                <button class="button button-secondary" type="button" id="agenda-prev" aria-label="Mês anterior">‹</button>
                <button class="button button-secondary" type="button" id="agenda-today">Hoje</button>
                <button class="button button-secondary" type="button" id="agenda-next" aria-label="Próximo mês">›</button>
            </div>
        </header>

        <div class="agenda-layout">
            <section class="agenda-month-panel surface" aria-label="Calendário mensal">
                <div class="agenda-weekdays" aria-hidden="true">
                    <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span><span>Dom</span>
                </div>
                <div class="agenda-grid" id="agenda-grid" aria-label="Dias do mês"></div>
            </section>

            <aside class="agenda-side-panel surface" aria-label="Próximos compromissos">
                <div class="surface-head surface-head-compact">
                    <div>
                        <span class="eyebrow">Próximos</span>
                        <h2>Compromissos</h2>
                    </div>
                </div>
                <div class="agenda-upcoming" id="agenda-upcoming"></div>
            </aside>
        </div>
    </section>

    <dialog class="agenda-event-modal" id="agenda-event-modal" aria-labelledby="agenda-event-title">
        <div class="agenda-event-shell">
            <header>
                <div>
                    <span class="eyebrow" id="agenda-event-date">Compromisso</span>
                    <h3 id="agenda-event-title">Compromisso</h3>
                </div>
                <button class="agenda-event-close" type="button" id="agenda-event-close" aria-label="Fechar detalhes">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>
                </button>
            </header>
            <div class="agenda-event-meta">
                <div><span>Horário</span><strong id="agenda-event-time">-</strong></div>
                <div><span>Local</span><strong id="agenda-event-location">-</strong></div>
            </div>
            <p id="agenda-event-description" class="agenda-event-description">Sem descrição.</p>
        </div>
    </dialog>

    <dialog class="agenda-event-modal" id="agenda-day-modal" aria-labelledby="agenda-day-title">
        <div class="agenda-event-shell agenda-day-shell">
            <header>
                <div>
                    <span class="eyebrow" id="agenda-day-label">Dia</span>
                    <h3 id="agenda-day-title">Compromissos do dia</h3>
                </div>
                <button class="agenda-event-close" type="button" id="agenda-day-close" aria-label="Fechar lista">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg>
                </button>
            </header>
            <div class="agenda-day-list" id="agenda-day-events"></div>
        </div>
    </dialog>
<?php protocolos_render_app_end(); ?>
