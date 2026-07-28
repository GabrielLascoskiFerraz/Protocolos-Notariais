import {
  loadUserPreferences,
  requestHealthNotificationPermission,
  saveUserPreferences
} from "./shared/user-preferences.js";

const $ = (selector) => document.querySelector(selector);
let settings = null;
let legacyConnection = null;
const userKey = "protocolos.node.user.v1";
const personalForm = $("#settings-personal-form");
const defaultPreferences = {
  theme: "system", density: "comfortable", fontScale: 1,
  health: { enabled: true, browserNotifications: false, intensity: "discreet", types: { vision: true, posture: true, movement: true, stretch: true, hydration: true } }
};
function localId() { return typeof globalThis.crypto?.randomUUID === "function" ? globalThis.crypto.randomUUID() : `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`; }
window.addEventListener("protocolos:user-identity", (event) => {
  const field = $("#user-form")?.elements.name;
  if (field && event.detail?.name) field.value = event.detail.name;
});
function toast(message, type = "success") { $("#toasts").innerHTML = `<div class="protocols-toast protocols-toast-${type}">${message}</div>`; setTimeout(() => $("#toasts").replaceChildren(), 3000); }
async function api(url, options = {}) { const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json" }, body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body }); const data = await response.json().catch(() => ({})); if (!response.ok) throw new Error([data.error, data.detail].filter(Boolean).join(" ") || "Falha no servidor."); return data; }
function formObject(form) { return Object.fromEntries(new FormData(form)); }
function renderNetworkAccess(access = {}) {
  const friendly = $("#network-friendly-url");
  const fallbacks = $("#network-local-urls");
  const state = $("#network-mdns-state");
  const help = $("#network-access-help");
  const mdns = access.mdns || {};

  friendly.hidden = !access.friendlyUrl;
  friendly.href = access.friendlyUrl || "#";
  friendly.textContent = access.friendlyUrl || "";
  fallbacks.replaceChildren();
  for (const url of access.localUrls || []) {
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = url;
    fallbacks.append(link);
  }

  const labels = {
    online: "Endereço ativo",
    starting: "Ativando endereço",
    error: "Anúncio indisponível",
    disabled: "Endereço desativado"
  };
  state.textContent = labels[mdns.state] || "Verificando";
  state.className = `settings-network-state${mdns.state === "online" ? " is-online" : mdns.state === "error" ? " is-error" : ""}`;

  if (!access.networkListening) {
    help.textContent = "O servidor está restrito a esta máquina. Use 0.0.0.0 no endereço de escuta para permitir acesso pela rede.";
  } else if (mdns.error) {
    help.textContent = `O endereço amigável não pôde ser anunciado. Use um dos endereços IP acima. ${mdns.error}`;
  } else if (access.friendlyUrl) {
    help.textContent = "Use preferencialmente o endereço amigável. Os endereços IP permanecem disponíveis como alternativa.";
  } else {
    help.textContent = "O endereço amigável está desativado. Use um dos endereços IP acima.";
  }
}
function updatePersonalPreview(preferences) {
  $("#settings-font-scale-label").textContent = `${Math.round(preferences.fontScale * 100)}%`;
  const descriptions = { compact: "Componentes mais próximos para caber mais informação.", comfortable: "Espaçamento equilibrado para uso diário.", spacious: "Componentes maiores e mais respiro visual." };
  const preview = document.querySelector("[data-settings-density-preview]");
  preview.dataset.settingsDensityPreview = preferences.density;
  $("#settings-density-preview-label").textContent = descriptions[preferences.density];
}
function fillPersonalForm(preferences = loadUserPreferences()) {
  personalForm.elements.theme.value = preferences.theme;
  personalForm.elements.density.value = preferences.density;
  personalForm.elements.fontScale.value = String(preferences.fontScale);
  personalForm.elements.health_enabled.checked = preferences.health.enabled;
  personalForm.elements.health_browser_notifications.checked = preferences.health.browserNotifications;
  personalForm.elements.health_intensity.value = preferences.health.intensity;
  for (const type of ["vision", "posture", "movement", "stretch", "hydration"]) personalForm.elements[`health_type_${type}`].checked = preferences.health.types[type];
  updatePersonalPreview(preferences);
}
function personalPreferencesFromForm() {
  const data = formObject(personalForm);
  return {
    theme: data.theme || "system",
    density: data.density || "comfortable",
    fontScale: Number(data.fontScale || 1),
    health: {
      enabled: personalForm.elements.health_enabled.checked,
      browserNotifications: personalForm.elements.health_browser_notifications.checked,
      intensity: data.health_intensity || "discreet",
      types: Object.fromEntries(["vision", "posture", "movement", "stretch", "hydration"].map((type) => [type, personalForm.elements[`health_type_${type}`].checked]))
    }
  };
}
async function savePersonal(event) {
  const preferences = personalPreferencesFromForm();
  if (event.target?.name === "health_browser_notifications" && preferences.health.browserNotifications) {
    const permission = await requestHealthNotificationPermission();
    if (permission !== "granted") {
      preferences.health.browserNotifications = false;
      personalForm.elements.health_browser_notifications.checked = false;
    }
  }
  const saved = saveUserPreferences(preferences);
  updatePersonalPreview(saved);
}
async function load() {
  fillPersonalForm();
  settings = await api("/api/settings");
  const localUser = JSON.parse(localStorage.getItem(userKey) || "null");
  $("#user-form").elements.name.value = localUser?.name || "Usuário local";
  for (const [key, value] of Object.entries(settings.server)) {
    const field = $("#server-form").elements[key];
    if (!field) continue;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else field.value = value;
  }
  for (const [key, value] of Object.entries(settings.backup)) { const field = $("#backup-form").elements[key]; if (!field) continue; if (field.type === "checkbox") field.checked = Boolean(value); else field.value = value; }
  for (const [key, value] of Object.entries(settings.calendar || {})) { const field = $("#calendar-form").elements[key]; if (field) field.value = value; }
  const health = await api("/api/health");
  renderNetworkAccess(settings.access || health.access);
  $("#diagnostics").innerHTML = `<div class="compact-form-grid compact-form-grid-3"><article class="surface surface-nested"><span class="eyebrow">Banco</span><h3>${health.database === "ok" ? "Íntegro" : health.database}</h3></article><article class="surface surface-nested"><span class="eyebrow">Arquivo</span><h3>${(settings.database.size / 1024 / 1024).toFixed(2)} MB</h3></article><article class="surface surface-nested"><span class="eyebrow">Servidor</span><h3>Em execução</h3></article></div>`;
  await loadBackups();
}
async function loadBackups() { const data = await api("/api/backups"); $("#backup-restore").innerHTML = `<option value="">Selecione um arquivo</option>${data.items.map((item) => `<option value="${item.path}">${item.name} — ${(item.size / 1024 / 1024).toFixed(2)} MB</option>`).join("")}`; }
async function save(section, data) {
  const result = await api("/api/settings", { method: "PUT", body: { [section]: data } });
  if (result.restartRequired) $("#restart-badge").textContent = "Reinicie o programa para aplicar as alterações";
  toast("Configuração salva.");
  settings = await api("/api/settings");
  renderNetworkAccess(settings.access);
}
personalForm.addEventListener("input", (event) => {
  if (event.target.name === "fontScale") savePersonal(event);
});
personalForm.addEventListener("change", (event) => savePersonal(event));
personalForm.addEventListener("submit", (event) => event.preventDefault());
$("#settings-personal-reset").addEventListener("click", () => fillPersonalForm(saveUserPreferences(defaultPreferences)));
$("#user-form").addEventListener("submit", (event) => { event.preventDefault(); const name = event.currentTarget.elements.name.value.trim(); if (!name) { event.currentTarget.elements.name.focus(); return; } const current = JSON.parse(localStorage.getItem(userKey) || "{}"); const nextUser = { id: current.id || localId(), color: current.color || "#2563eb", name }; localStorage.setItem(userKey, JSON.stringify(nextUser)); localStorage.setItem("protocolos.userName", name); window.dispatchEvent(new CustomEvent("protocolos:user-identity", { detail: nextUser })); toast("Identificação salva."); });
$("#server-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = formObject(event.currentTarget);
  data.port = Number(data.port);
  data.friendlyHost = String(data.friendlyHost || "").replace(/\.local\.?$/i, "");
  data.mdnsEnabled = event.currentTarget.elements.mdnsEnabled.checked;
  save("server", data).catch((error) => toast(error.message, "error"));
});
$("#backup-form").addEventListener("submit", (event) => { event.preventDefault(); const data = formObject(event.currentTarget); data.enabled = event.currentTarget.elements.enabled.checked; data.weekDay = Number(data.weekDay); data.retentionDays = Number(data.retentionDays); save("backup", data).catch((error) => toast(error.message, "error")); });
$("#calendar-form").addEventListener("submit", (event) => { event.preventDefault(); const data = formObject(event.currentTarget); data.cacheSeconds = Number(data.cacheSeconds); save("calendar", data).catch((error) => toast(error.message, "error")); });
$("#backup-now").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  const originalLabel = button.textContent;
  button.disabled = true;
  button.textContent = "Criando backup…";
  $("#backup-status").textContent = "Criando e verificando o arquivo…";
  try {
    const result = await api("/api/backups", { method: "POST", body: {} });
    if (!result.success || !result.destination) throw new Error("O servidor não confirmou a criação do backup.");
    const filename = String(result.destination).split(/[\\/]/).pop();
    $("#backup-status").textContent = `Último backup: ${filename}`;
    await loadBackups();
    $("#backup-restore").value = result.destination;
    toast("Backup criado e verificado com sucesso.");
  } catch (error) {
    $("#backup-status").textContent = "Não foi possível criar o backup.";
    toast(error.message, "error");
  } finally {
    button.disabled = false;
    button.textContent = originalLabel;
  }
});
$("#restore-backup").addEventListener("click", async () => { const path = $("#backup-restore").value; if (!path || !confirm("Restaurar este backup na próxima inicialização? O banco atual será substituído.")) return; try { await api("/api/backups/restore", { method:"POST", body:{path} }); toast("Restauração agendada. Reinicie o programa."); } catch (error) { toast(error.message, "error"); } });
$("#inspect-migration").addEventListener("click", async () => { try { legacyConnection = formObject($("#migration-form")); legacyConnection.port = Number(legacyConnection.port); const result = await api("/api/migration/inspect", { method: "POST", body: legacyConnection }); $("#migration-preview").innerHTML = Object.entries(result.counts).map(([table, count]) => `<article class="surface surface-nested"><span class="eyebrow">${table}</span><strong>${count === null ? "Não encontrada" : `${count} registros`}</strong></article>`).join(""); $("#run-migration").disabled = false; } catch (error) { toast(error.message, "error"); } });
$("#run-migration").addEventListener("click", async () => { if (!legacyConnection || !confirm("Importar o banco legado? Os dados atuais serão substituídos após a criação de um backup.")) return; try { const result = await api("/api/migration/run", { method: "POST", body: { connection: legacyConnection, operationId: localId() } }); toast(`Migração concluída: ${result.imported.protocolos || 0} protocolos.`); } catch (error) { toast(error.message, "error"); } });
load().catch((error) => toast(error.message, "error"));
