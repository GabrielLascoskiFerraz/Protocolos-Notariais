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
    ['page_class' => 'page-settings']
);
?>
    <section class="settings-workspace" aria-label="Configurações dos Protocolos">
        <article class="surface settings-panel settings-server-panel">
            <div class="surface-head">
                <div class="protocol-section-heading">
                    <span class="protocol-section-icon" aria-hidden="true"><?= protocolos_tool_icon_markup('server', 'protocol-inline-icon') ?></span>
                    <div>
                        <span class="eyebrow">Servidor</span>
                        <h2>Configurações globais</h2>
                        <p>Valem para todos os usuários que acessam este sistema.</p>
                    </div>
                </div>
                <span class="status-pill status-pill-soft" id="settings-server-status" aria-live="polite">Carregado</span>
            </div>

            <form class="settings-form" id="settings-server-form" autocomplete="off">
                <div class="compact-form-grid compact-form-grid-2">
                    <label class="field field-span-2">
                        <span>URL da agenda ICS</span>
                        <input name="calendar_ics_url" type="url" value="<?= htmlspecialchars((string) $settings['calendar_ics_url'], ENT_QUOTES, 'UTF-8') ?>" placeholder="https://calendar.google.com/calendar/ical/.../basic.ics">
                    </label>
                    <label class="field">
                        <span>Cache da agenda em segundos</span>
                        <input name="calendar_cache_ttl_seconds" type="number" min="60" max="21600" step="60" value="<?= (int) $settings['calendar_cache_ttl_seconds'] ?>">
                    </label>
                    <input name="documentos_max_items" type="hidden" value="<?= (int) $settings['documentos_max_items'] ?>">
                    <input name="documentos_base_path" type="hidden" value="<?= htmlspecialchars((string) $settings['documentos_base_path'], ENT_QUOTES, 'UTF-8') ?>">
                    <input name="documentos_extra_base_paths" type="hidden" value="<?= htmlspecialchars(implode("\n", $settings['documentos_extra_base_paths'] ?? []), ENT_QUOTES, 'UTF-8') ?>">
                </div>
                <div class="surface-actions settings-actions">
                    <button class="button button-secondary" type="button" id="settings-server-reload">Recarregar</button>
                    <button class="button button-primary" type="submit">Salvar globais</button>
                </div>
            </form>
        </article>

        <article class="surface settings-panel settings-personal-panel">
            <div class="surface-head">
                <div class="protocol-section-heading">
                    <span class="protocol-section-icon" aria-hidden="true"><?= protocolos_tool_icon_markup('file', 'protocol-inline-icon') ?></span>
                    <div>
                        <span class="eyebrow">Este navegador</span>
                        <h2>Preferências visuais e lembretes</h2>
                        <p>Ficam salvas apenas no navegador do usuário atual.</p>
                    </div>
                </div>
                <span class="status-pill status-pill-soft" id="settings-personal-status" aria-live="polite">Salvo automaticamente</span>
            </div>

            <form class="settings-form" id="settings-personal-form" autocomplete="off">
                <div class="settings-card-grid">
                    <section class="settings-subpanel">
                        <div class="settings-subpanel-title">
                            <strong>Aparência</strong>
                            <small>Modo escuro, tamanho de fonte e densidade da interface.</small>
                        </div>
                        <div class="compact-form-grid compact-form-grid-2">
                            <label class="field">
                                <span>Tema</span>
                                <select name="theme">
                                    <option value="system">Sistema</option>
                                    <option value="light">Claro</option>
                                    <option value="dark">Escuro</option>
                                </select>
                            </label>
                            <label class="field">
                                <span>Densidade</span>
                                <select name="density">
                                    <option value="compact">Compacta</option>
                                    <option value="comfortable">Confortável</option>
                                    <option value="spacious">Espaçosa</option>
                                </select>
                            </label>
                            <label class="field field-span-2">
                                <span>Tamanho da fonte</span>
                                <input name="fontScale" type="range" min="0.9" max="1.18" step="0.01">
                                <small class="settings-range-value" id="settings-font-scale-label">100%</small>
                            </label>
                        </div>
                    </section>

                    <section class="settings-subpanel">
                        <div class="settings-subpanel-title">
                            <strong>Lembretes leves</strong>
                            <small>Pausas discretas para visão, postura, movimento, alongamento e hidratação.</small>
                        </div>
                        <label class="settings-switch-line">
                            <input name="health_enabled" type="checkbox">
                            <span>
                                <strong>Ativar lembretes neste navegador</strong>
                                <small>Os avisos são locais e respeitam limite diário.</small>
                            </span>
                        </label>
                        <label class="settings-switch-line">
                            <input name="health_browser_notifications" type="checkbox">
                            <span>
                                <strong>Usar notificação do navegador quando a aba estiver em segundo plano</strong>
                                <small>O navegador pode pedir permissão.</small>
                            </span>
                        </label>
                        <label class="field">
                            <span>Intensidade</span>
                            <select name="health_intensity">
                                <option value="discreet">Discreta</option>
                                <option value="normal">Normal</option>
                                <option value="frequent">Frequente</option>
                            </select>
                        </label>
                        <div class="settings-health-type-grid">
                            <label class="settings-switch-line"><input name="health_type_vision" type="checkbox"><span><strong>Visão</strong><small>Descansar os olhos.</small></span></label>
                            <label class="settings-switch-line"><input name="health_type_posture" type="checkbox"><span><strong>Postura</strong><small>Ajustar cadeira e pescoço.</small></span></label>
                            <label class="settings-switch-line"><input name="health_type_movement" type="checkbox"><span><strong>Levantar</strong><small>Caminhar rapidamente.</small></span></label>
                            <label class="settings-switch-line"><input name="health_type_stretch" type="checkbox"><span><strong>Alongar</strong><small>Soltar punhos e ombros.</small></span></label>
                            <label class="settings-switch-line"><input name="health_type_hydration" type="checkbox"><span><strong>Água</strong><small>Lembrar hidratação.</small></span></label>
                        </div>
                    </section>
                </div>

                <div class="surface-actions settings-actions">
                    <button class="button button-secondary" type="button" id="settings-personal-reset">Restaurar padrão local</button>
                </div>
            </form>
        </article>
    </section>
<?php protocolos_render_app_end(); ?>
