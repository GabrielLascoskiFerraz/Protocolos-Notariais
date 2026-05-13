const dom = {
    grid: document.getElementById("agenda-grid"),
    upcoming: document.getElementById("agenda-upcoming"),
    monthLabel: document.getElementById("agenda-month-label"),
    feedback: document.getElementById("agenda-feedback"),
    refresh: document.getElementById("agenda-refresh"),
    prev: document.getElementById("agenda-prev"),
    next: document.getElementById("agenda-next"),
    today: document.getElementById("agenda-today"),
    eventModal: document.getElementById("agenda-event-modal"),
    eventClose: document.getElementById("agenda-event-close"),
    eventTitle: document.getElementById("agenda-event-title"),
    eventDate: document.getElementById("agenda-event-date"),
    eventTime: document.getElementById("agenda-event-time"),
    eventLocation: document.getElementById("agenda-event-location"),
    eventDescription: document.getElementById("agenda-event-description"),
    dayModal: document.getElementById("agenda-day-modal"),
    dayClose: document.getElementById("agenda-day-close"),
    dayTitle: document.getElementById("agenda-day-title"),
    dayLabel: document.getElementById("agenda-day-label"),
    dayEvents: document.getElementById("agenda-day-events")
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const dayFormatter = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
const timeFormatter = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

let events = [];
let visibleDate = startOfMonth(new Date());
const modalCloseTimers = new WeakMap();

function endpoint(path) {
    return new URL(path, document.baseURI || window.location.href).toString();
}

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDate(left, right) {
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function dateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

function parseEventDate(value) {
    return new Date(value);
}

function escapeHtml(value) {
    return String(value || "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function eventTimeLabel(event) {
    if (event.all_day) return "Dia inteiro";
    const start = parseEventDate(event.start);
    const end = parseEventDate(event.end);
    return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

function eventCountLabel(count) {
    return count === 1 ? "1 compromisso" : `${count} compromissos`;
}

function setFeedback(message, state = "soft") {
    if (!dom.feedback) return;
    dom.feedback.hidden = false;
    dom.feedback.textContent = message;
    dom.feedback.className = `status-pill ${state === "success" ? "status-pill-success" : (state === "error" ? "status-pill-offline" : "status-pill-soft")}`;
    dom.feedback.dataset.state = state;
}

function setRefreshState(isRefreshing) {
    if (!dom.refresh) return;
    dom.refresh.disabled = isRefreshing;
    dom.refresh.classList.toggle("is-refreshing", isRefreshing);
    dom.refresh.setAttribute("aria-label", isRefreshing ? "Atualizando calendário" : "Atualizar calendário");
}

function openModal(modal) {
    if (!modal) return;
    const closeTimer = modalCloseTimers.get(modal);
    if (closeTimer) {
        clearTimeout(closeTimer);
        modalCloseTimers.delete(modal);
    }
    modal.classList.remove("is-closing");
    modal.setAttribute("tabindex", "-1");
    if (!modal.open) modal.showModal();
    requestAnimationFrame(() => {
        modal.classList.add("is-open");
        modal.focus({ preventScroll: true });
    });
}

function closeModal(modal) {
    if (!modal?.open || modal.classList.contains("is-closing")) return;
    modal.classList.remove("is-open");
    modal.classList.add("is-closing");
    const timer = window.setTimeout(() => {
        modal.classList.remove("is-closing");
        if (modal.open) modal.close();
        modalCloseTimers.delete(modal);
    }, 230);
    modalCloseTimers.set(modal, timer);
}

function eventsByDate() {
    const grouped = new Map();
    events.forEach((event) => {
        if (!grouped.has(event.date)) grouped.set(event.date, []);
        grouped.get(event.date).push(event);
    });
    return grouped;
}

function sortedEventsForDay(key) {
    return events
        .filter((event) => event.date === key)
        .sort((left, right) => parseEventDate(left.start) - parseEventDate(right.start));
}

function renderCalendar() {
    if (!dom.grid || !dom.monthLabel) return;

    const grouped = eventsByDate();
    const today = new Date();
    const year = visibleDate.getFullYear();
    const month = visibleDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);

    dom.monthLabel.textContent = monthFormatter.format(visibleDate).replace(/^\w/u, (match) => match.toUpperCase());
    dom.grid.classList.remove("is-ready");
    dom.grid.innerHTML = "";

    for (let index = 0; index < 42; index += 1) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        const key = dateKey(day);
        const dayEvents = (grouped.get(key) || []).sort((left, right) => parseEventDate(left.start) - parseEventDate(right.start));

        const cell = document.createElement("article");
        cell.className = "agenda-day";
        cell.dataset.dayKey = key;
        cell.style.setProperty("--agenda-cell-index", String(index));
        if (day.getMonth() !== month) cell.classList.add("is-muted");
        if (sameDate(day, today)) cell.classList.add("is-today");
        if (dayEvents.length) cell.classList.add("has-events");

        const eventPreview = dayEvents.slice(0, 2).map((event) => `
            <button type="button" class="agenda-event-pill" data-event-id="${escapeHtml(event.id)}" title="${escapeHtml(event.title)}">
                <span>${escapeHtml(eventTimeLabel(event))}</span>
                ${escapeHtml(event.title || "Compromisso sem título")}
            </button>
        `).join("");

        const overflow = dayEvents.length > 2
            ? `<button type="button" class="agenda-more" data-day-key="${escapeHtml(key)}" aria-label="Ver todos os compromissos de ${dayFormatter.format(day)}">+${dayEvents.length - 2}</button>`
            : "";

        cell.innerHTML = `
            <div class="agenda-day-head">
                <span class="agenda-day-number">${day.getDate()}</span>
                ${dayEvents.length ? `<button type="button" class="agenda-day-count" data-day-key="${escapeHtml(key)}">${eventCountLabel(dayEvents.length)}</button>` : ""}
            </div>
            <div class="agenda-day-events">
                ${eventPreview || '<span class="agenda-empty-dot"></span>'}
                ${overflow}
            </div>
        `;

        dom.grid.appendChild(cell);
    }
    requestAnimationFrame(() => dom.grid?.classList.add("is-ready"));
}

function renderUpcoming() {
    if (!dom.upcoming) return;

    const now = new Date();
    const upcoming = events
        .filter((event) => parseEventDate(event.end) >= now)
        .sort((left, right) => parseEventDate(left.start) - parseEventDate(right.start))
        .slice(0, 12);

    if (!upcoming.length) {
        dom.upcoming.innerHTML = '<div class="agenda-empty-state">Nenhum compromisso futuro encontrado.</div>';
        return;
    }

    dom.upcoming.innerHTML = upcoming.map((event, index) => {
        const start = parseEventDate(event.start);
        return `
            <button type="button" class="agenda-upcoming-item" data-event-id="${escapeHtml(event.id)}" style="--agenda-item-index: ${index}">
                <div class="agenda-upcoming-date">
                    <span>${escapeHtml(dayFormatter.format(start))}</span>
                    <strong>${escapeHtml(eventTimeLabel(event))}</strong>
                </div>
                <div class="agenda-upcoming-copy">
                    <h3>${escapeHtml(event.title || "Compromisso sem título")}</h3>
                    ${event.location ? `<p>${escapeHtml(event.location)}</p>` : ""}
                    ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ""}
                </div>
            </button>
        `;
    }).join("");
}

function openEventDetails(event) {
    if (!dom.eventModal || !event) return;
    const start = parseEventDate(event.start);
    dom.eventTitle.textContent = event.title || "Compromisso sem título";
    dom.eventDate.textContent = dayFormatter.format(start);
    dom.eventTime.textContent = eventTimeLabel(event);
    dom.eventLocation.textContent = event.location || "Não informado";
    dom.eventDescription.textContent = event.description || "Sem descrição.";
    openModal(dom.eventModal);
}

function closeEventDetails() {
    closeModal(dom.eventModal);
}

function openDayDetails(key) {
    if (!dom.dayModal || !dom.dayEvents) return;
    const dayEvents = sortedEventsForDay(key);
    if (!dayEvents.length) return;

    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    dom.dayLabel.textContent = dayFormatter.format(date);
    dom.dayTitle.textContent = eventCountLabel(dayEvents.length);
    dom.dayEvents.innerHTML = dayEvents.map((event) => `
        <button type="button" class="agenda-day-list-item" data-event-id="${escapeHtml(event.id)}">
            <span>${escapeHtml(eventTimeLabel(event))}</span>
            <strong>${escapeHtml(event.title || "Compromisso sem título")}</strong>
            ${event.location ? `<small>${escapeHtml(event.location)}</small>` : ""}
        </button>
    `).join("");
    openModal(dom.dayModal);
}

function closeDayDetails() {
    closeModal(dom.dayModal);
}

function eventById(id) {
    return events.find((event) => event.id === id);
}

function handleEventClick(event) {
    const button = event.target.closest("[data-event-id]");
    if (!button) return;
    const selected = eventById(button.getAttribute("data-event-id"));
    if (!selected) return;
    closeDayDetails();
    openEventDetails(selected);
}

function handleDayClick(event) {
    if (event.target.closest("[data-event-id]")) return;
    const trigger = event.target.closest("[data-day-key]");
    const cell = event.target.closest(".agenda-day[data-day-key]");
    const key = trigger?.getAttribute("data-day-key") || cell?.getAttribute("data-day-key");
    if (key) openDayDetails(key);
}

async function loadCalendar({ refresh = false } = {}) {
    setFeedback(refresh ? "Atualizando calendário..." : "Carregando compromissos...");
    setRefreshState(refresh);
    dom.grid?.classList.toggle("is-syncing", refresh);
    dom.upcoming?.classList.toggle("is-syncing", refresh);
    try {
        const apiPath = refresh ? "api/calendar.php?refresh=1" : "api/calendar.php";
        const response = await fetch(endpoint(apiPath), { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || data.success === false) {
            throw new Error(data.error || "Falha ao carregar calendário.");
        }

        events = Array.isArray(data.events) ? data.events : [];
        renderCalendar();
        renderUpcoming();

        if (data.warning) {
            setFeedback(data.warning, "soft");
            return;
        }

        const updatedAt = data.generated_at ? timeFormatter.format(new Date(data.generated_at)) : "";
        setFeedback(updatedAt ? `Atualizado às ${updatedAt}` : "Agenda atualizada", "success");
    } catch (error) {
        events = [];
        renderCalendar();
        renderUpcoming();
        setFeedback(error?.message || "Não foi possível carregar o calendário.", "error");
    } finally {
        setRefreshState(false);
        dom.grid?.classList.remove("is-syncing");
        dom.upcoming?.classList.remove("is-syncing");
    }
}

function bind() {
    dom.prev?.addEventListener("click", () => {
        visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1);
        renderCalendar();
    });
    dom.next?.addEventListener("click", () => {
        visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1);
        renderCalendar();
    });
    dom.today?.addEventListener("click", () => {
        visibleDate = startOfMonth(new Date());
        renderCalendar();
    });
    dom.refresh?.addEventListener("click", () => {
        void loadCalendar({ refresh: true });
    });
    dom.grid?.addEventListener("click", handleEventClick);
    dom.grid?.addEventListener("click", handleDayClick);
    dom.upcoming?.addEventListener("click", handleEventClick);
    dom.dayEvents?.addEventListener("click", handleEventClick);
    dom.eventClose?.addEventListener("click", closeEventDetails);
    dom.dayClose?.addEventListener("click", closeDayDetails);
    dom.eventModal?.addEventListener("click", (event) => {
        if (event.target === dom.eventModal) closeEventDetails();
    });
    dom.dayModal?.addEventListener("click", (event) => {
        if (event.target === dom.dayModal) closeDayDetails();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeEventDetails();
            closeDayDetails();
        }
    });
}

bind();
renderCalendar();
renderUpcoming();
void loadCalendar();
