<?php
declare(strict_types=1);

if (!defined('PROTOCOLOS_INTERNAL')) {
    http_response_code(404);
    exit;
}

require __DIR__ . '/../config/settings.php';
require __DIR__ . '/../views/app-layout.php';

$settings = protocolos_settings_read();
$scriptPath = 'assets/js/apps/configuracoes/index.js';

function protocolos_settings_icon(string $icon): string
{
    $paths = [
        'system' => '<rect x="4" y="5" width="16" height="11" rx="2"></rect><path d="M9 20h6M12 16v4"></path>',
        'sun' => '<circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"></path>',
        'moon' => '<path d="M20.5 15.4A8.3 8.3 0 0 1 8.6 3.5 8.8 8.8 0 1 0 20.5 15.4Z"></path>',
        'compact' => '<rect x="5" y="6" width="14" height="3" rx="1"></rect><rect x="5" y="11" width="14" height="3" rx="1"></rect><rect x="5" y="16" width="14" height="3" rx="1"></rect>',
        'comfortable' => '<rect x="5" y="5" width="14" height="4" rx="1.5"></rect><rect x="5" y="12" width="14" height="4" rx="1.5"></rect><path d="M8 20h8"></path>',
        'spacious' => '<rect x="5" y="4.5" width="14" height="5" rx="1.5"></rect><rect x="5" y="14.5" width="14" height="5" rx="1.5"></rect>',
        'font' => '<path d="M5 18h3l1.2-3h5.6l1.2 3h3L13.8 5h-3.6L5 18Z"></path><path d="M10.1 12.7h3.8L12 8l-1.9 4.7Z"></path>',
        'health' => '<path d="M12 21s-7-4.4-7-10.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7 2.9C19 16.6 12 21 12 21Z"></path><path d="M9 12h6"></path><path d="M12 9v6"></path>',
        'bell' => '<path d="M18 16.5H6l1.2-1.8V10a4.8 4.8 0 0 1 9.6 0v4.7L18 16.5Z"></path><path d="M10 19a2.2 2.2 0 0 0 4 0"></path>',
        'vision' => '<path d="M3.5 12s3.2-5 8.5-5 8.5 5 8.5 5-3.2 5-8.5 5-8.5-5-8.5-5Z"></path><circle cx="12" cy="12" r="2.4"></circle>',
        'posture' => '<circle cx="12" cy="5.5" r="2"></circle><path d="M12 8v5.5"></path><path d="M8.5 21v-5.5L12 13.5l3.5 2V21"></path><path d="M8 10.5h8"></path>',
        'movement' => '<path d="M13 4.5 10.5 9l3 2-2 4.5"></path><path d="m13.5 11 4 1.5"></path><path d="m10.5 9-4 1"></path><path d="M9.5 20.5h5"></path>',
        'stretch' => '<path d="M7 7.5c2.2-2.2 5.8-2.2 8 0l2 2"></path><path d="M17 5.5v4h-4"></path><path d="M17 16.5c-2.2 2.2-5.8 2.2-8 0l-2-2"></path><path d="M7 18.5v-4h4"></path>',
        'hydration' => '<path d="M12 3.5s5 5.4 5 10a5 5 0 0 1-10 0c0-4.6 5-10 5-10Z"></path><path d="M9.5 14.2a2.6 2.6 0 0 0 2.6 2.6"></path>',
    ];

    $content = $paths[$icon] ?? $paths['system'];
    return '<span class="settings-choice-icon" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">' . $content . '</svg></span>';
}

protocolos_render_head(
    'Configurações',
    'Preferências locais e configurações globais dos Protocolos.',
    $scriptPath . '?v=' . protocolos_asset_version($scriptPath),
    ['body_class' => 'protocolos-body']
);

protocolos_render_app_start(
    'configuracoes.php',
    'Sistema',
    'Configurações',
    'Ajuste primeiro as preferências deste navegador e, abaixo, os parâmetros globais do servidor.',
    [],
    ['page_class' => 'page-settings', 'hide_header' => true]
);
?>
    <section class="settings-page" aria-label="Configurações dos Protocolos">
        <header class="settings-command">
            <div class="settings-command-copy">
                <span class="settings-command-icon" aria-hidden="true"><?= protocolos_settings_icon('system') ?></span>
                <div>
                    <span class="eyebrow">Preferências</span>
                    <h1>Configurações</h1>
                    <p>Personalize este navegador e ajuste os parâmetros compartilhados do sistema.</p>
                </div>
            </div>
        </header>

        <div class="settings-content">
                <form class="settings-form settings-personal-form" id="settings-personal-form" autocomplete="off">
                    <section class="settings-section" id="settings-appearance">
                        <header class="settings-section-head">
                            <span class="settings-section-number">01</span>
                            <div>
                                <h2>Aparência</h2>
                                <p>Tema, densidade e escala de leitura deste navegador.</p>
                            </div>
                        </header>

                        <div class="settings-choice-layout">
                            <fieldset class="settings-choice-fieldset">
                                <legend>Tema</legend>
                                <div class="settings-choice-options">
                                    <label class="settings-choice-option">
                                        <input type="radio" name="theme" value="system">
                                        <?= protocolos_settings_icon('system') ?>
                                        <span class="settings-choice-copy"><strong>Sistema</strong><small>Segue o dispositivo</small></span>
                                    </label>
                                    <label class="settings-choice-option">
                                        <input type="radio" name="theme" value="light">
                                        <?= protocolos_settings_icon('sun') ?>
                                        <span class="settings-choice-copy"><strong>Claro</strong><small>Visual claro</small></span>
                                    </label>
                                    <label class="settings-choice-option">
                                        <input type="radio" name="theme" value="dark">
                                        <?= protocolos_settings_icon('moon') ?>
                                        <span class="settings-choice-copy"><strong>Escuro</strong><small>Menos brilho</small></span>
                                    </label>
                                </div>
                            </fieldset>

                            <fieldset class="settings-choice-fieldset">
                                <legend>Densidade</legend>
                                <div class="settings-choice-options">
                                    <label class="settings-choice-option">
                                        <input type="radio" name="density" value="compact">
                                        <?= protocolos_settings_icon('compact') ?>
                                        <span class="settings-choice-copy"><strong>Compacta</strong><small>Mais conteúdo</small></span>
                                    </label>
                                    <label class="settings-choice-option">
                                        <input type="radio" name="density" value="comfortable">
                                        <?= protocolos_settings_icon('comfortable') ?>
                                        <span class="settings-choice-copy"><strong>Confortável</strong><small>Equilibrada</small></span>
                                    </label>
                                    <label class="settings-choice-option">
                                        <input type="radio" name="density" value="spacious">
                                        <?= protocolos_settings_icon('spacious') ?>
                                        <span class="settings-choice-copy"><strong>Espaçosa</strong><small>Mais respiro</small></span>
                                    </label>
                                </div>
                            </fieldset>
                        </div>

                        <div class="settings-reading-row">
                            <label class="settings-range-card">
                                <span class="settings-range-head">
                                    <span class="settings-range-icon" aria-hidden="true"><?= protocolos_settings_icon('font') ?></span>
                                    <span class="settings-range-copy">
                                        <strong>Tamanho da fonte</strong>
                                        <small>Ajusta textos e componentes.</small>
                                    </span>
                                    <strong class="settings-range-value" id="settings-font-scale-label">100%</strong>
                                </span>
                                <input name="fontScale" type="range" min="0.9" max="1.18" step="0.01">
                            </label>

                            <section class="settings-density-preview" data-settings-density-preview="comfortable" aria-live="polite">
                                <div>
                                    <strong>Prévia da densidade</strong>
                                    <small id="settings-density-preview-label">Espaçamento equilibrado para uso diário.</small>
                                </div>
                                <div class="settings-density-preview-card" aria-hidden="true">
                                    <span></span><span></span><span></span>
                                </div>
                            </section>
                        </div>
                    </section>

                    <section class="settings-section" id="settings-health">
                        <header class="settings-section-head">
                            <span class="settings-section-number">02</span>
                            <div>
                                <h2>Lembretes leves</h2>
                                <p>Pausas locais para visão, postura, movimento e hidratação.</p>
                            </div>
                        </header>

                        <div class="settings-health-primary">
                            <label class="settings-switch-line settings-feature-card">
                                <input name="health_enabled" type="checkbox">
                                <?= protocolos_settings_icon('health') ?>
                                <span><strong>Ativar lembretes</strong><small>Respeita o limite diário configurado.</small></span>
                            </label>
                            <label class="settings-switch-line settings-feature-card">
                                <input name="health_browser_notifications" type="checkbox">
                                <?= protocolos_settings_icon('bell') ?>
                                <span><strong>Notificações do navegador</strong><small>Avisa quando a aba estiver em segundo plano.</small></span>
                            </label>
                            <label class="field settings-intensity-field">
                                <span>Intensidade</span>
                                <select name="health_intensity">
                                    <option value="discreet">Discreta</option>
                                    <option value="normal">Normal</option>
                                    <option value="frequent">Frequente</option>
                                </select>
                            </label>
                        </div>

                        <div class="settings-health-type-grid">
                            <label class="settings-switch-line settings-feature-card settings-health-type"><input name="health_type_vision" type="checkbox"><?= protocolos_settings_icon('vision') ?><span><strong>Visão</strong><small>Descansar os olhos.</small></span></label>
                            <label class="settings-switch-line settings-feature-card settings-health-type"><input name="health_type_posture" type="checkbox"><?= protocolos_settings_icon('posture') ?><span><strong>Postura</strong><small>Ajustar cadeira e pescoço.</small></span></label>
                            <label class="settings-switch-line settings-feature-card settings-health-type"><input name="health_type_movement" type="checkbox"><?= protocolos_settings_icon('movement') ?><span><strong>Levantar</strong><small>Caminhar rapidamente.</small></span></label>
                            <label class="settings-switch-line settings-feature-card settings-health-type"><input name="health_type_stretch" type="checkbox"><?= protocolos_settings_icon('stretch') ?><span><strong>Alongar</strong><small>Soltar punhos e ombros.</small></span></label>
                            <label class="settings-switch-line settings-feature-card settings-health-type"><input name="health_type_hydration" type="checkbox"><?= protocolos_settings_icon('hydration') ?><span><strong>Água</strong><small>Lembrar hidratação.</small></span></label>
                        </div>

                        <div class="settings-section-actions">
                            <button class="button button-secondary" type="button" id="settings-personal-reset">Restaurar padrão local</button>
                        </div>
                    </section>
                </form>

                <form class="settings-form settings-server-form" id="settings-server-form" autocomplete="off">
                    <section class="settings-section settings-server-section" id="settings-server">
                        <header class="settings-section-head">
                            <span class="settings-section-number">03</span>
                            <div>
                                <h2>Servidor</h2>
                                <p>Parâmetros globais compartilhados por todos os usuários.</p>
                            </div>
                            <span class="settings-server-state" id="settings-server-status" aria-live="polite">Carregado</span>
                        </header>

                        <div class="settings-server-grid">
                            <label class="field settings-calendar-url">
                                <span>URL da agenda ICS</span>
                                <input name="calendar_ics_url" type="url" value="<?= htmlspecialchars((string) $settings['calendar_ics_url'], ENT_QUOTES, 'UTF-8') ?>" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics">
                            </label>
                            <label class="field">
                                <span>Cache da agenda</span>
                                <span class="settings-input-with-unit">
                                    <input name="calendar_cache_ttl_seconds" type="number" min="60" max="21600" step="60" value="<?= (int) $settings['calendar_cache_ttl_seconds'] ?>">
                                    <small>segundos</small>
                                </span>
                            </label>
                            <input name="documentos_max_items" type="hidden" value="<?= (int) $settings['documentos_max_items'] ?>">
                            <input name="documentos_base_path" type="hidden" value="<?= htmlspecialchars((string) $settings['documentos_base_path'], ENT_QUOTES, 'UTF-8') ?>">
                            <input name="documentos_extra_base_paths" type="hidden" value="<?= htmlspecialchars(implode("\n", $settings['documentos_extra_base_paths'] ?? []), ENT_QUOTES, 'UTF-8') ?>">
                        </div>
                        <div class="settings-section-actions">
                            <button class="button button-secondary" type="button" id="settings-server-reload">Recarregar</button>
                            <button class="button button-primary" type="submit">Salvar globais</button>
                        </div>
                    </section>
                </form>
        </div>
    </section>
<?php protocolos_render_app_end(); ?>
