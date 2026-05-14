const STORAGE_KEY = "protocolos.userPreferences.v1";
const HEALTH_STATE_KEY = "protocolos.healthReminders.state.v1";
const ONBOARDING_KEY = "protocolos.preferencesOnboarding.v1";
const SYSTEM_THEME_QUERY = "(prefers-color-scheme: dark)";
const THEME_OPTIONS = ["system", "light", "dark"];

const DEFAULT_PREFERENCES = {
    theme: "system",
    density: "comfortable",
    fontScale: 1,
    health: {
        enabled: true,
        browserNotifications: false,
        intensity: "discreet",
        types: {
            vision: true,
            posture: true,
            movement: true,
            stretch: true,
            hydration: true
        }
    }
};

const HEALTH_RULES = {
    discreet: { minMinutes: 75, maxMinutes: 150, dailyLimit: 4 },
    normal: { minMinutes: 55, maxMinutes: 110, dailyLimit: 6 },
    frequent: { minMinutes: 40, maxMinutes: 85, dailyLimit: 8 }
};

const HEALTH_MESSAGES = {
    vision: ["Descanse a visão", "Olhe para um ponto distante por 20 segundos antes de continuar."],
    posture: ["Ajuste a postura", "Encoste as costas, relaxe os ombros e alinhe o pescoço."],
    movement: ["Levante um pouco", "Caminhe por 1 ou 2 minutos para destravar o corpo."],
    stretch: ["Alongue rapidinho", "Solte punhos, ombros e pescoço com cuidado."],
    hydration: ["Beba água", "Tome alguns goles de água antes da próxima ficha."]
};

let healthTimer = 0;
const preferencesRuntime = typeof window !== "undefined"
    ? (window.__protocolosPreferencesRuntime ||= { initialized: false, welcomeOpen: false })
    : { initialized: false, welcomeOpen: false };

function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.max(min, Math.min(max, number));
}

function todayKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readJson(key, fallback) {
    try {
        const parsed = JSON.parse(localStorage.getItem(key) || "");
        return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function writeJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Preferências locais não podem quebrar o sistema se o navegador bloquear storage.
    }
}

function readFlag(key) {
    try {
        return localStorage.getItem(key) === "done";
    } catch {
        return false;
    }
}

function writeFlag(key) {
    try {
        localStorage.setItem(key, "done");
    } catch {
        // O onboarding é apenas conveniência local.
    }
}

function sanitizePreferences(preferences = {}) {
    const health = preferences.health && typeof preferences.health === "object" ? preferences.health : {};
    const healthTypes = health.types && typeof health.types === "object" ? health.types : {};
    const theme = THEME_OPTIONS.includes(preferences.theme) ? preferences.theme : DEFAULT_PREFERENCES.theme;
    const density = ["compact", "comfortable", "spacious"].includes(preferences.density)
        ? preferences.density
        : DEFAULT_PREFERENCES.density;

    return {
        theme,
        density,
        fontScale: clamp(preferences.fontScale ?? DEFAULT_PREFERENCES.fontScale, 0.9, 1.18),
        health: {
            ...DEFAULT_PREFERENCES.health,
            ...health,
            intensity: ["discreet", "normal", "frequent"].includes(health.intensity) ? health.intensity : DEFAULT_PREFERENCES.health.intensity,
            types: {
                ...DEFAULT_PREFERENCES.health.types,
                ...healthTypes
            }
        }
    };
}

function systemThemeMedia() {
    return typeof window !== "undefined" && typeof window.matchMedia === "function"
        ? window.matchMedia(SYSTEM_THEME_QUERY)
        : null;
}

function resolveTheme(theme) {
    if (theme === "system") {
        return systemThemeMedia()?.matches ? "dark" : "light";
    }
    return theme === "dark" ? "dark" : "light";
}

export function loadUserPreferences() {
    return sanitizePreferences(readJson(STORAGE_KEY, DEFAULT_PREFERENCES));
}

export function saveUserPreferences(preferences) {
    const next = sanitizePreferences(preferences);
    writeJson(STORAGE_KEY, next);
    applyUserPreferences(next);
    window.dispatchEvent(new CustomEvent("protocolos:preferences", { detail: next }));
    return next;
}

export function updateUserPreferences(partial) {
    return saveUserPreferences({
        ...loadUserPreferences(),
        ...(partial || {})
    });
}

export function applyUserPreferences(preferences = loadUserPreferences()) {
    const root = document.documentElement;
    const resolvedTheme = resolveTheme(preferences.theme);
    root.dataset.theme = resolvedTheme;
    root.dataset.themePreference = preferences.theme;
    root.dataset.density = preferences.density;
    root.style.colorScheme = resolvedTheme;
    root.style.setProperty("--user-font-scale", String(preferences.fontScale));
}

function healthState() {
    const state = readJson(HEALTH_STATE_KEY, {});
    const day = todayKey();
    if (state.day !== day) {
        return { day, count: 0, nextAt: 0, lastType: "", pending: null };
    }
    const pending = state.pending && typeof state.pending === "object"
        ? {
            id: String(state.pending.id || ""),
            type: String(state.pending.type || ""),
            createdAt: Number(state.pending.createdAt || 0)
        }
        : null;
    return {
        day,
        count: Number(state.count || 0),
        nextAt: Number(state.nextAt || 0),
        lastType: String(state.lastType || ""),
        pending: pending?.id && HEALTH_MESSAGES[pending.type] ? pending : null
    };
}

function saveHealthState(state) {
    writeJson(HEALTH_STATE_KEY, state);
}

function randomBetween(min, max) {
    return min + Math.floor(Math.random() * Math.max(1, max - min));
}

function nextDelay(preferences) {
    const rule = HEALTH_RULES[preferences.health.intensity] || HEALTH_RULES.discreet;
    return randomBetween(rule.minMinutes, rule.maxMinutes) * 60 * 1000;
}

function enabledHealthTypes(preferences) {
    return Object.entries(preferences.health.types || {})
        .filter(([, enabled]) => Boolean(enabled))
        .map(([type]) => type)
        .filter((type) => HEALTH_MESSAGES[type]);
}

function pickHealthType(preferences, lastType = "") {
    const types = enabledHealthTypes(preferences);
    if (!types.length) return "";
    const usable = types.length > 1 ? types.filter((type) => type !== lastType) : types;
    return usable[Math.floor(Math.random() * usable.length)] || types[0];
}

function ensureHealthHost() {
    let host = document.querySelector(".protocol-health-reminder-stack");
    if (!host) {
        host = document.createElement("section");
        host.className = "protocol-health-reminder-stack";
        host.setAttribute("aria-live", "polite");
        host.setAttribute("aria-label", "Lembretes leves");
        document.body.appendChild(host);
    }
    return host;
}

function clearPendingHealthReminder(pendingId = "") {
    const state = healthState();
    if (!state.pending) return;
    if (pendingId && state.pending.id !== pendingId) return;
    state.pending = null;
    saveHealthState(state);
}

function showInternalHealthReminder(type, pendingId = "") {
    const [title, message] = HEALTH_MESSAGES[type] || HEALTH_MESSAGES.vision;
    document.querySelector(".protocol-health-reminder-stack")?.remove();
    const host = ensureHealthHost();
    const card = document.createElement("article");
    card.className = "protocol-health-reminder";
    card.innerHTML = `
        <div class="protocol-health-reminder-icon" aria-hidden="true">•</div>
        <div>
            <strong></strong>
            <p></p>
        </div>
        <div class="protocol-health-reminder-actions">
            ${"Notification" in window && Notification.permission === "default" ? '<button type="button" data-health-permission>Ativar notificações</button>' : ""}
            <button type="button" data-health-dismiss>Entendi</button>
        </div>
    `;
    card.querySelector("strong").textContent = title;
    card.querySelector("p").textContent = message;
    const close = () => {
        clearPendingHealthReminder(pendingId);
        card.classList.add("is-leaving");
        window.setTimeout(() => host.remove(), 180);
    };
    card.querySelector("[data-health-dismiss]")?.addEventListener("click", close);
    card.querySelector("[data-health-permission]")?.addEventListener("click", async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        const permission = await requestHealthNotificationPermission();
        if (permission === "granted") {
            const preferences = loadUserPreferences();
            saveUserPreferences({
                ...preferences,
                health: {
                    ...preferences.health,
                    browserNotifications: true
                }
            });
            button.textContent = "Notificações ativadas";
        } else {
            button.textContent = "Permissão não ativada";
        }
    });
    host.appendChild(card);
}

function showBrowserHealthReminder(type) {
    const preferences = loadUserPreferences();
    if (!preferences.health.browserNotifications || !("Notification" in window) || Notification.permission !== "granted" || !document.hidden) {
        return false;
    }
    const [title, message] = HEALTH_MESSAGES[type] || HEALTH_MESSAGES.vision;
    new Notification(title, { body: message, silent: true, tag: `protocolos-health-${type}` });
    return true;
}

function scheduleNextHealthReminder(preferences = loadUserPreferences(), base = Date.now()) {
    const state = healthState();
    state.nextAt = base + nextDelay(preferences);
    saveHealthState(state);
    return state.nextAt;
}

function showPendingHealthReminder(state = healthState(), preferences = loadUserPreferences()) {
    if (!preferences.health.enabled || !state.pending) return false;
    if (document.hidden) {
        showBrowserHealthReminder(state.pending.type);
        return true;
    }
    showInternalHealthReminder(state.pending.type, state.pending.id);
    return true;
}

function createPendingHealthReminder(preferences = loadUserPreferences()) {
    const state = healthState();
    const rule = HEALTH_RULES[preferences.health.intensity] || HEALTH_RULES.discreet;
    if (state.pending) {
        showPendingHealthReminder(state, preferences);
        return false;
    }
    if (!preferences.health.enabled || state.count >= rule.dailyLimit) return false;

    const type = pickHealthType(preferences, state.lastType);
    if (!type) return false;

    state.count += 1;
    state.lastType = type;
    state.pending = {
        id: `${state.day}-${state.count}-${Date.now()}`,
        type,
        createdAt: Date.now()
    };
    state.nextAt = Date.now() + nextDelay(preferences);
    saveHealthState(state);
    showPendingHealthReminder(state, preferences);
    return true;
}

function clearHealthTimer() {
    if (healthTimer) window.clearTimeout(healthTimer);
    healthTimer = 0;
}

function startHealthLoop() {
    clearHealthTimer();
    const preferences = loadUserPreferences();
    if (!preferences.health.enabled) return;

    const state = healthState();
    const rule = HEALTH_RULES[preferences.health.intensity] || HEALTH_RULES.discreet;
    const now = Date.now();
    showPendingHealthReminder(state, preferences);

    if (!state.pending && state.nextAt > 0 && state.nextAt <= now && state.count < rule.dailyLimit) {
        createPendingHealthReminder(preferences);
        startHealthLoop();
        return;
    }

    const nextAt = state.nextAt > now ? state.nextAt : scheduleNextHealthReminder(preferences, now);
    const delay = Math.max(30 * 1000, nextAt - now);

    healthTimer = window.setTimeout(() => {
        const current = healthState();
        const latest = loadUserPreferences();
        const latestRule = HEALTH_RULES[latest.health.intensity] || HEALTH_RULES.discreet;
        if (!latest.health.enabled || current.count >= latestRule.dailyLimit) {
            startHealthLoop();
            return;
        }

        createPendingHealthReminder(latest);
        startHealthLoop();
    }, delay);
}

export async function requestHealthNotificationPermission() {
    if (!("Notification" in window)) return "unsupported";
    if (Notification.permission !== "default") return Notification.permission;
    return Notification.requestPermission();
}

function welcomeSvg(name) {
    const icons = {
        sun: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"></circle><path d="M12 2.5v3M12 18.5v3M4.6 4.6l2.1 2.1M17.3 17.3l2.1 2.1M2.5 12h3M18.5 12h3M4.6 19.4l2.1-2.1M17.3 6.7l2.1-2.1"></path></svg>',
        moon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 15.4A8.3 8.3 0 0 1 8.6 3.5 8.8 8.8 0 1 0 20.5 15.4Z"></path></svg>',
        system: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="11" rx="2"></rect><path d="M9 20h6M12 16v4"></path></svg>',
        compact: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="6" width="14" height="3" rx="1"></rect><rect x="5" y="11" width="14" height="3" rx="1"></rect><rect x="5" y="16" width="14" height="3" rx="1"></rect></svg>',
        comfortable: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="4" rx="1.5"></rect><rect x="5" y="12" width="14" height="4" rx="1.5"></rect><path d="M8 20h8"></path></svg>',
        spacious: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4.5" width="14" height="5" rx="1.5"></rect><rect x="5" y="14.5" width="14" height="5" rx="1.5"></rect></svg>',
        font: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 18h3l1.2-3h5.6l1.2 3h3L13.8 5h-3.6L5 18Z"></path><path d="M10.1 12.7h3.8L12 8l-1.9 4.7Z"></path></svg>'
    };
    return icons[name] || icons.comfortable;
}

function welcomeIcon(name) {
    return `<span class="protocol-welcome-option-icon">${welcomeSvg(name)}</span>`;
}

function preferenceOption(name, value, label, checked = false, icon = "", description = "") {
    return `
        <label class="protocol-welcome-option">
            <input type="radio" name="${name}" value="${value}"${checked ? " checked" : ""}>
            ${welcomeIcon(icon)}
            <span class="protocol-welcome-option-copy">
                <strong>${label}</strong>
                ${description ? `<small>${description}</small>` : ""}
            </span>
        </label>
    `;
}

function buildWelcomeModal(preferences) {
    const wrapper = document.createElement("section");
    wrapper.className = "protocol-welcome";
    wrapper.setAttribute("role", "dialog");
    wrapper.setAttribute("aria-modal", "true");
    wrapper.setAttribute("aria-labelledby", "protocol-welcome-title");
    wrapper.innerHTML = `
        <div class="protocol-welcome-backdrop"></div>
        <form class="protocol-welcome-card">
            <span class="eyebrow">Primeiro acesso</span>
            <h2 id="protocol-welcome-title">Bem-vindo aos Protocolos</h2>
            <p>Antes de começar, escolha como prefere visualizar o sistema neste navegador. Você pode trocar tudo depois em <strong>Configurações</strong>.</p>

            <div class="protocol-welcome-grid">
                <fieldset>
                    <legend>Tema</legend>
                    <div class="protocol-welcome-options">
                        ${preferenceOption("theme", "system", "Sistema", preferences.theme === "system", "system", "Segue o dispositivo")}
                        ${preferenceOption("theme", "light", "Claro", preferences.theme === "light", "sun", "Visual claro")}
                        ${preferenceOption("theme", "dark", "Escuro", preferences.theme === "dark", "moon", "Menos brilho")}
                    </div>
                </fieldset>

                <fieldset>
                    <legend>Densidade</legend>
                    <div class="protocol-welcome-options">
                        ${preferenceOption("density", "compact", "Compacta", preferences.density === "compact", "compact", "Mais conteúdo")}
                        ${preferenceOption("density", "comfortable", "Confortável", preferences.density === "comfortable", "comfortable", "Equilibrada")}
                        ${preferenceOption("density", "spacious", "Espaçosa", preferences.density === "spacious", "spacious", "Mais respiro")}
                    </div>
                </fieldset>
            </div>

            <section class="protocol-welcome-preview" data-welcome-density-preview="${preferences.density}" aria-live="polite">
                <div>
                    <strong>Prévia da densidade</strong>
                    <small data-welcome-density-label>${densityLabel(preferences.density)}</small>
                </div>
                <div class="protocol-welcome-preview-card" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </section>

            <label class="protocol-welcome-range">
                <span class="protocol-welcome-range-head">
                    <span class="protocol-welcome-font-icon" aria-hidden="true">${welcomeSvg("font")}</span>
                    <span class="protocol-welcome-range-copy">
                        <strong>Tamanho da fonte</strong>
                        <small>Ajusta textos e componentes neste navegador.</small>
                    </span>
                    <strong data-welcome-font-label>${Math.round(preferences.fontScale * 100)}%</strong>
                </span>
                <input name="fontScale" type="range" min="0.9" max="1.18" step="0.01" value="${preferences.fontScale}">
            </label>

            <label class="protocol-welcome-check">
                <input name="health_enabled" type="checkbox"${preferences.health.enabled ? " checked" : ""}>
                <span class="protocol-welcome-health-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24"><path d="M12 21s-7-4.4-7-10.4A4.1 4.1 0 0 1 12 7.7a4.1 4.1 0 0 1 7 2.9C19 16.6 12 21 12 21Z"></path><path d="M9 12h6"></path><path d="M12 9v6"></path></svg>
                </span>
                <span>
                    <strong>Ativar lembretes leves de saúde</strong>
                    <small>Pausas discretas para visão, postura, movimento, hidratação e notificações quando a aba estiver em segundo plano.</small>
                </span>
            </label>

            <div class="protocol-welcome-actions">
                <button class="button button-primary" type="submit">Continuar</button>
            </div>
        </form>
    `;
    return wrapper;
}

function densityLabel(density) {
    const labels = {
        compact: "Componentes mais próximos para caber mais informação.",
        comfortable: "Espaçamento equilibrado para uso diário.",
        spacious: "Componentes maiores e mais respiro visual."
    };
    return labels[density] || labels.comfortable;
}

function updateWelcomeDensityPreview(modal, density) {
    const preview = modal?.querySelector("[data-welcome-density-preview]");
    const label = modal?.querySelector("[data-welcome-density-label]");
    if (preview) preview.dataset.welcomeDensityPreview = density;
    if (label) label.textContent = densityLabel(density);
}

function closeWelcomeModal(modal) {
    if (!modal || modal.classList.contains("is-leaving")) return;
    modal.classList.add("is-leaving");
    window.setTimeout(() => {
        modal.remove();
        preferencesRuntime.welcomeOpen = false;
    }, 180);
}

function preferencesFromWelcomeForm(form, browserNotifications = null) {
    const current = loadUserPreferences();
    const data = new FormData(form);
    const healthEnabled = Boolean(form.elements.health_enabled.checked);
    const shouldUseBrowserNotifications = browserNotifications ?? current.health.browserNotifications;
    return {
        ...current,
        theme: THEME_OPTIONS.includes(String(data.get("theme"))) ? String(data.get("theme")) : "system",
        density: ["compact", "comfortable", "spacious"].includes(String(data.get("density"))) ? String(data.get("density")) : "comfortable",
        fontScale: Number(data.get("fontScale") || current.fontScale),
        health: {
            ...current.health,
            enabled: healthEnabled,
            browserNotifications: Boolean(healthEnabled && shouldUseBrowserNotifications)
        }
    };
}

function maybeShowWelcomeModal() {
    if (readFlag(ONBOARDING_KEY)) return;
    if (!document.body) return;
    if (preferencesRuntime.welcomeOpen || document.querySelector(".protocol-welcome")) return;
    preferencesRuntime.welcomeOpen = true;

    const initialPreferences = loadUserPreferences();
    initialPreferences.health.enabled = true;

    const modal = buildWelcomeModal(initialPreferences);
    const form = modal.querySelector("form");
    const fontInput = modal.querySelector("[name='fontScale']");
    const fontLabel = modal.querySelector("[data-welcome-font-label]");

    fontInput?.addEventListener("input", () => {
        if (fontLabel) fontLabel.textContent = `${Math.round(Number(fontInput.value || 1) * 100)}%`;
        applyUserPreferences(preferencesFromWelcomeForm(form));
    });

    form?.addEventListener("change", () => {
        const preferences = preferencesFromWelcomeForm(form);
        applyUserPreferences(preferences);
        updateWelcomeDensityPreview(modal, preferences.density);
    });

    form?.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submitButton = form.querySelector('button[type="submit"]');
        const originalLabel = submitButton?.textContent || "";
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Aplicando...";
        }

        let browserNotifications = false;
        if (form.elements.health_enabled.checked) {
            browserNotifications = await requestHealthNotificationPermission() === "granted";
        }

        saveUserPreferences(preferencesFromWelcomeForm(form, browserNotifications));
        writeFlag(ONBOARDING_KEY);
        closeWelcomeModal(modal);

        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalLabel;
        }
    });

    document.body.appendChild(modal);
    window.setTimeout(() => modal.classList.add("is-visible"), 20);
}

function initializePreferencesRuntime() {
    if (preferencesRuntime.initialized) return;
    preferencesRuntime.initialized = true;

    applyUserPreferences();
    startHealthLoop();

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", maybeShowWelcomeModal, { once: true });
    } else {
        maybeShowWelcomeModal();
    }

    window.addEventListener("storage", (event) => {
        if (event.key === STORAGE_KEY) {
            applyUserPreferences();
            startHealthLoop();
        }
    });

    window.addEventListener("protocolos:preferences", () => {
        startHealthLoop();
    });

    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            showPendingHealthReminder();
            startHealthLoop();
        }
    });

    const systemTheme = systemThemeMedia();
    const handleSystemThemeChange = () => {
        const preferences = loadUserPreferences();
        if (preferences.theme === "system") applyUserPreferences(preferences);
    };
    if (systemTheme) {
        if (typeof systemTheme.addEventListener === "function") {
            systemTheme.addEventListener("change", handleSystemThemeChange);
        } else if (typeof systemTheme.addListener === "function") {
            systemTheme.addListener(handleSystemThemeChange);
        }
    }
}

initializePreferencesRuntime();

if (typeof window !== "undefined") window.ProtocolosPreferences = {
    load: loadUserPreferences,
    save: saveUserPreferences,
    update: updateUserPreferences,
    apply: applyUserPreferences,
    requestHealthNotificationPermission
};
