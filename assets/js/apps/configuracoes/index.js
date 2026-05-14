import { apiUrl } from "../../shared/base.js";
import {
    loadUserPreferences,
    requestHealthNotificationPermission,
    saveUserPreferences
} from "../../shared/user-preferences.js";

const serverForm = document.getElementById("settings-server-form");
const serverStatus = document.getElementById("settings-server-status");
const serverReload = document.getElementById("settings-server-reload");
const personalForm = document.getElementById("settings-personal-form");
const personalStatus = document.getElementById("settings-personal-status");
const personalReset = document.getElementById("settings-personal-reset");
const fontScaleLabel = document.getElementById("settings-font-scale-label");
const densityPreview = document.querySelector("[data-settings-density-preview]");
const densityPreviewLabel = document.getElementById("settings-density-preview-label");
let personalStatusTimer = 0;

const defaultPreferences = {
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

function setStatus(element, message, mode = "soft") {
    if (!element) return;
    element.textContent = message;
    element.className = `status-pill ${mode === "success" ? "status-pill-success" : mode === "error" ? "status-pill-offline" : "status-pill-soft"}`;
}

async function parseJson(response) {
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.success === false) {
        throw new Error(data.error || "Falha na operação.");
    }
    return data;
}

function formDataObject(form) {
    const data = new FormData(form);
    return Object.fromEntries(data.entries());
}

function fillServerForm(settings) {
    if (!serverForm || !settings) return;
    serverForm.elements.calendar_ics_url.value = settings.calendar_ics_url || "";
    serverForm.elements.calendar_cache_ttl_seconds.value = settings.calendar_cache_ttl_seconds || 1800;
    serverForm.elements.documentos_base_path.value = settings.documentos_base_path || "";
    serverForm.elements.documentos_extra_base_paths.value = Array.isArray(settings.documentos_extra_base_paths)
        ? settings.documentos_extra_base_paths.join("\n")
        : "";
    serverForm.elements.documentos_max_items.value = settings.documentos_max_items || 600;
}

async function loadServerSettings() {
    setStatus(serverStatus, "Carregando...");
    const response = await fetch(apiUrl("api/settings.php"), { cache: "no-store" });
    const data = await parseJson(response);
    fillServerForm(data.settings);
    setStatus(serverStatus, "Atualizado", "success");
}

function updateFontScaleLabel(value) {
    if (!fontScaleLabel) return;
    fontScaleLabel.textContent = `${Math.round(Number(value || 1) * 100)}%`;
}

function densityLabel(density) {
    const labels = {
        compact: "Componentes mais próximos para caber mais informação.",
        comfortable: "Espaçamento equilibrado para uso diário.",
        spacious: "Componentes maiores e mais respiro visual."
    };
    return labels[density] || labels.comfortable;
}

function updateDensityPreview(density) {
    if (densityPreview) densityPreview.dataset.settingsDensityPreview = density || "comfortable";
    if (densityPreviewLabel) densityPreviewLabel.textContent = densityLabel(density);
}

function setPersonalStatus(message, mode = "success") {
    window.clearTimeout(personalStatusTimer);
    setStatus(personalStatus, message, mode);
    if (mode === "success") {
        personalStatusTimer = window.setTimeout(() => {
            setStatus(personalStatus, "Salvo automaticamente");
        }, 1800);
    }
}

function fillPersonalForm(preferences = loadUserPreferences()) {
    if (!personalForm) return;
    personalForm.elements.theme.value = preferences.theme;
    personalForm.elements.density.value = preferences.density;
    personalForm.elements.fontScale.value = String(preferences.fontScale);
    personalForm.elements.health_enabled.checked = Boolean(preferences.health.enabled);
    personalForm.elements.health_browser_notifications.checked = Boolean(preferences.health.browserNotifications);
    personalForm.elements.health_intensity.value = preferences.health.intensity;
    personalForm.elements.health_type_vision.checked = Boolean(preferences.health.types.vision);
    personalForm.elements.health_type_posture.checked = Boolean(preferences.health.types.posture);
    personalForm.elements.health_type_movement.checked = Boolean(preferences.health.types.movement);
    personalForm.elements.health_type_stretch.checked = Boolean(preferences.health.types.stretch);
    personalForm.elements.health_type_hydration.checked = Boolean(preferences.health.types.hydration);
    updateFontScaleLabel(preferences.fontScale);
    updateDensityPreview(preferences.density);
}

function preferencesFromForm() {
    const data = formDataObject(personalForm);
    const theme = ["system", "light", "dark"].includes(data.theme) ? data.theme : "system";
    return {
        theme,
        density: data.density || "comfortable",
        fontScale: Number(data.fontScale || 1),
        health: {
            enabled: Boolean(personalForm.elements.health_enabled.checked),
            browserNotifications: Boolean(personalForm.elements.health_browser_notifications.checked),
            intensity: data.health_intensity || "discreet",
            types: {
                vision: Boolean(personalForm.elements.health_type_vision.checked),
                posture: Boolean(personalForm.elements.health_type_posture.checked),
                movement: Boolean(personalForm.elements.health_type_movement.checked),
                stretch: Boolean(personalForm.elements.health_type_stretch.checked),
                hydration: Boolean(personalForm.elements.health_type_hydration.checked)
            }
        }
    };
}

async function savePersonalPreferencesFromForm(event) {
    const preferences = preferencesFromForm();
    const target = event?.target;
    const shouldRequestNotifications = target?.name === "health_browser_notifications"
        && Boolean(personalForm.elements.health_browser_notifications.checked);

    if (shouldRequestNotifications) {
        const permission = await requestHealthNotificationPermission();
        if (permission !== "granted") {
            preferences.health.browserNotifications = false;
            personalForm.elements.health_browser_notifications.checked = false;
            saveUserPreferences(preferences);
            setPersonalStatus("Notificação não autorizada", "error");
            return;
        }
    }

    saveUserPreferences(preferences);
    setPersonalStatus("Salvo automaticamente", "success");
}

serverForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setStatus(serverStatus, "Salvando...");
    try {
        const response = await fetch(apiUrl("api/settings.php"), {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
            body: new URLSearchParams(formDataObject(serverForm))
        });
        const data = await parseJson(response);
        fillServerForm(data.settings);
        setStatus(serverStatus, "Globais salvas", "success");
    } catch (error) {
        setStatus(serverStatus, error.message || "Erro ao salvar", "error");
    }
});

serverReload?.addEventListener("click", () => {
    loadServerSettings().catch((error) => setStatus(serverStatus, error.message || "Erro ao carregar", "error"));
});

personalForm?.addEventListener("input", (event) => {
    if (event.target?.name === "fontScale") {
        updateFontScaleLabel(event.target.value);
        savePersonalPreferencesFromForm(event);
    }
});

personalForm?.addEventListener("change", (event) => {
    if (event.target?.name === "fontScale") {
        updateFontScaleLabel(event.target.value);
    }
    if (event.target?.name === "density") {
        updateDensityPreview(event.target.value);
    }
    savePersonalPreferencesFromForm(event);
});

personalForm?.addEventListener("submit", (event) => {
    event.preventDefault();
});

personalReset?.addEventListener("click", () => {
    const preferences = saveUserPreferences(defaultPreferences);
    fillPersonalForm(preferences);
    setPersonalStatus("Padrão restaurado", "success");
});

fillPersonalForm();
loadServerSettings().catch((error) => setStatus(serverStatus, error.message || "Erro ao carregar", "error"));
