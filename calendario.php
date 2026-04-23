<?php
$basePath = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'])), '/');
$baseHref = ($basePath === '') ? '/' : $basePath . '/';
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <title>Consultar Agenda</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    <base href="<?= htmlspecialchars($baseHref) ?>">

    <link rel="icon" href="assets/img/logo.png">
    <link rel="stylesheet" href="assets/css/style.css">

    <script>window.BASE_URL = <?= json_encode($baseHref) ?>;</script>
    <script type="module" src="assets/js/calendar.js"></script>
</head>
<body class="calendar-page-body">
    <header class="topbar">
        <div class="calendar-topbar-copy">
            <h1>Consultar Agenda</h1>
            <p class="calendar-topbar-subtitle">Compromissos sincronizados da agenda do cartório.</p>
        </div>
        <div class="topbar-actions">
            <a class="btn-secondary topbar-link" href="index.php">Voltar aos protocolos</a>
        </div>
    </header>

    <main class="calendar-main">
        <section class="calendar-shell">
            <div class="calendar-toolbar">
                <div>
                    <span class="calendar-eyebrow">Agenda</span>
                    <h2 id="calendar-month-label" class="calendar-title">Carregando...</h2>
                </div>
                <div class="calendar-actions">
                    <button id="calendar-prev" class="btn-secondary" type="button" aria-label="Mês anterior">‹</button>
                    <button id="calendar-today" class="btn-secondary" type="button">Hoje</button>
                    <button id="calendar-next" class="btn-secondary" type="button" aria-label="Próximo mês">›</button>
                </div>
            </div>

            <div id="calendar-feedback" class="calendar-feedback" aria-live="polite"></div>

            <div class="calendar-layout">
                <section class="calendar-panel calendar-month-panel">
                    <div class="calendar-weekdays" aria-hidden="true">
                        <span>Seg</span>
                        <span>Ter</span>
                        <span>Qua</span>
                        <span>Qui</span>
                        <span>Sex</span>
                        <span>Sáb</span>
                        <span>Dom</span>
                    </div>
                    <div id="calendar-grid" class="calendar-grid" aria-label="Calendário mensal"></div>
                </section>

                <aside class="calendar-panel calendar-agenda-panel">
                    <div class="calendar-section-head">
                        <span class="calendar-eyebrow">Próximos</span>
                        <h2 class="calendar-side-title">Compromissos</h2>
                    </div>
                    <div id="calendar-upcoming" class="calendar-upcoming"></div>
                </aside>
            </div>
        </section>
    </main>

    <div id="calendar-event-modal" class="calendar-event-modal hidden" aria-hidden="true">
        <div id="calendar-event-overlay" class="calendar-event-overlay"></div>
        <section class="calendar-event-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-event-title">
            <div class="calendar-event-dialog-head">
                <div>
                    <span id="calendar-event-date" class="calendar-event-date-label"></span>
                    <h2 id="calendar-event-title"></h2>
                </div>
                <button id="calendar-event-close" class="calendar-event-close" type="button" aria-label="Fechar detalhes">×</button>
            </div>
            <div class="calendar-event-detail-grid">
                <div>
                    <strong>Horário</strong>
                    <span id="calendar-event-time"></span>
                </div>
                <div>
                    <strong>Local</strong>
                    <span id="calendar-event-location"></span>
                </div>
            </div>
            <div id="calendar-event-description" class="calendar-event-description"></div>
        </section>
    </div>

    <div id="calendar-day-modal" class="calendar-event-modal hidden" aria-hidden="true">
        <div id="calendar-day-overlay" class="calendar-event-overlay"></div>
        <section class="calendar-event-dialog calendar-day-dialog" role="dialog" aria-modal="true" aria-labelledby="calendar-day-title">
            <div class="calendar-event-dialog-head">
                <div>
                    <span id="calendar-day-label" class="calendar-event-date-label"></span>
                    <h2 id="calendar-day-title">Compromissos do dia</h2>
                </div>
                <button id="calendar-day-close" class="calendar-event-close" type="button" aria-label="Fechar lista">×</button>
            </div>
            <div id="calendar-day-events" class="calendar-day-list"></div>
        </section>
    </div>
</body>
</html>
