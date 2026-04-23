import { apiUrl } from './base.js';

const gridEl = document.getElementById('calendar-grid');
const upcomingEl = document.getElementById('calendar-upcoming');
const monthLabelEl = document.getElementById('calendar-month-label');
const feedbackEl = document.getElementById('calendar-feedback');
const prevBtn = document.getElementById('calendar-prev');
const nextBtn = document.getElementById('calendar-next');
const todayBtn = document.getElementById('calendar-today');
const eventModal = document.getElementById('calendar-event-modal');
const eventOverlay = document.getElementById('calendar-event-overlay');
const eventCloseBtn = document.getElementById('calendar-event-close');
const eventTitleEl = document.getElementById('calendar-event-title');
const eventDateEl = document.getElementById('calendar-event-date');
const eventTimeEl = document.getElementById('calendar-event-time');
const eventLocationEl = document.getElementById('calendar-event-location');
const eventDescriptionEl = document.getElementById('calendar-event-description');
const dayModal = document.getElementById('calendar-day-modal');
const dayOverlay = document.getElementById('calendar-day-overlay');
const dayCloseBtn = document.getElementById('calendar-day-close');
const dayTitleEl = document.getElementById('calendar-day-title');
const dayLabelEl = document.getElementById('calendar-day-label');
const dayEventsEl = document.getElementById('calendar-day-events');

const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const dayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

let events = [];
let visibleDate = startOfMonth(new Date());

function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameDate(left, right) {
    return left.getFullYear() === right.getFullYear()
        && left.getMonth() === right.getMonth()
        && left.getDate() === right.getDate();
}

function dateKey(date) {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${date.getFullYear()}-${month}-${day}`;
}

function parseEventDate(value) {
    return new Date(value);
}

function eventTimeLabel(event) {
    if (event.all_day) {
        return 'Dia inteiro';
    }

    const start = parseEventDate(event.start);
    const end = parseEventDate(event.end);
    return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

function eventCountLabel(count) {
    if (count === 1) return '1 compromisso';
    return `${count} compromissos`;
}

function setFeedback(message, state = '') {
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    feedbackEl.dataset.state = state;
}

function eventsByDate() {
    const grouped = new Map();
    events.forEach(event => {
        const key = event.date;
        if (!grouped.has(key)) {
            grouped.set(key, []);
        }
        grouped.get(key).push(event);
    });
    return grouped;
}

function sortedEventsForDay(key) {
    return events
        .filter(event => event.date === key)
        .sort((left, right) => parseEventDate(left.start) - parseEventDate(right.start));
}

function renderCalendar() {
    if (!gridEl || !monthLabelEl) return;

    const grouped = eventsByDate();
    const today = new Date();
    const year = visibleDate.getFullYear();
    const month = visibleDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const gridStart = new Date(year, month, 1 - startOffset);

    monthLabelEl.textContent = monthFormatter.format(visibleDate).replace(/^\w/, match => match.toUpperCase());
    gridEl.innerHTML = '';

    for (let index = 0; index < 42; index += 1) {
        const day = new Date(gridStart);
        day.setDate(gridStart.getDate() + index);
        const key = dateKey(day);
        const dayEvents = grouped.get(key) || [];

        const cell = document.createElement('article');
        cell.className = 'calendar-day';
        cell.dataset.dayKey = key;
        if (day.getMonth() !== month) cell.classList.add('is-muted');
        if (sameDate(day, today)) cell.classList.add('is-today');
        if (dayEvents.length) cell.classList.add('has-events');

        const eventPreview = dayEvents.slice(0, 4).map(event => `
            <button type="button" class="calendar-event-pill" data-event-id="${event.id}" title="${escapeHtml(event.title)}">
                <span>${escapeHtml(eventTimeLabel(event))}</span>
                ${escapeHtml(event.title)}
            </button>
        `).join('');

        const overflow = dayEvents.length > 4
            ? `<button type="button" class="calendar-more" data-day-key="${key}" aria-label="Ver todos os compromissos de ${dayFormatter.format(day)}">+${dayEvents.length - 4}</button>`
            : '';

        cell.innerHTML = `
            <div class="calendar-day-head">
                <span class="calendar-day-number">${day.getDate()}</span>
                ${dayEvents.length ? `<button type="button" class="calendar-day-count" data-day-key="${key}" aria-label="Ver compromissos de ${dayFormatter.format(day)}">${eventCountLabel(dayEvents.length)}</button>` : ''}
            </div>
            <div class="calendar-day-events">
                ${eventPreview || '<span class="calendar-empty-dot"></span>'}
                ${overflow}
            </div>
        `;

        gridEl.appendChild(cell);
    }
}

function renderUpcoming() {
    if (!upcomingEl) return;

    const now = new Date();
    const upcoming = events
        .filter(event => parseEventDate(event.end) >= now)
        .sort((left, right) => parseEventDate(left.start) - parseEventDate(right.start))
        .slice(0, 12);

    if (!upcoming.length) {
        upcomingEl.innerHTML = '<div class="calendar-empty-state">Nenhum compromisso futuro encontrado.</div>';
        return;
    }

    upcomingEl.innerHTML = upcoming.map(event => {
        const start = parseEventDate(event.start);
        return `
            <button type="button" class="calendar-agenda-item" data-event-id="${event.id}">
                <div class="calendar-agenda-date">
                    <span>${escapeHtml(dayFormatter.format(start))}</span>
                    <strong>${escapeHtml(eventTimeLabel(event))}</strong>
                </div>
                <div class="calendar-agenda-copy">
                    <h3>${escapeHtml(event.title)}</h3>
                    ${event.location ? `<p>${escapeHtml(event.location)}</p>` : ''}
                    ${event.description ? `<p>${escapeHtml(event.description)}</p>` : ''}
                </div>
            </button>
        `;
    }).join('');
}

function openEventDetails(event) {
    if (!eventModal || !eventTitleEl || !eventDateEl || !eventTimeEl || !eventLocationEl || !eventDescriptionEl) {
        return;
    }

    const start = parseEventDate(event.start);
    eventTitleEl.textContent = event.title || 'Compromisso sem título';
    eventDateEl.textContent = dayFormatter.format(start);
    eventTimeEl.textContent = eventTimeLabel(event);
    eventLocationEl.textContent = event.location || 'Não informado';
    eventDescriptionEl.textContent = event.description || 'Sem descrição.';

    eventModal.classList.remove('hidden');
    eventModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeEventDetails() {
    if (!eventModal) return;
    eventModal.classList.add('hidden');
    eventModal.setAttribute('aria-hidden', 'true');
    if (!dayModal || dayModal.classList.contains('hidden')) {
        document.body.style.overflow = '';
    }
}

function openDayDetails(key) {
    if (!dayModal || !dayTitleEl || !dayLabelEl || !dayEventsEl) return;

    const dayEvents = sortedEventsForDay(key);
    if (!dayEvents.length) return;

    const [year, month, day] = key.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    dayLabelEl.textContent = dayFormatter.format(date);
    dayTitleEl.textContent = eventCountLabel(dayEvents.length);
    dayEventsEl.innerHTML = dayEvents.map(event => `
        <button type="button" class="calendar-day-list-item" data-event-id="${event.id}">
            <span>${escapeHtml(eventTimeLabel(event))}</span>
            <strong>${escapeHtml(event.title || 'Compromisso sem título')}</strong>
            ${event.location ? `<small>${escapeHtml(event.location)}</small>` : ''}
        </button>
    `).join('');

    dayModal.classList.remove('hidden');
    dayModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeDayDetails() {
    if (!dayModal) return;
    dayModal.classList.add('hidden');
    dayModal.setAttribute('aria-hidden', 'true');
    if (!eventModal || eventModal.classList.contains('hidden')) {
        document.body.style.overflow = '';
    }
}

function handleEventClick(event) {
    const button = event.target.closest('[data-event-id]');
    if (!button) return;

    const selected = events.find(item => item.id === button.getAttribute('data-event-id'));
    if (!selected) return;

    const start = parseEventDate(selected.start);
    setFeedback(`${dayFormatter.format(start)} • ${eventTimeLabel(selected)} • ${selected.title}`, 'selected');
    closeDayDetails();
    openEventDetails(selected);
}

function handleDayClick(event) {
    if (event.target.closest('[data-event-id]')) return;

    const trigger = event.target.closest('[data-day-key]');
    const cell = event.target.closest('.calendar-day[data-day-key]');
    const key = trigger?.getAttribute('data-day-key') || cell?.getAttribute('data-day-key');
    if (!key) return;

    openDayDetails(key);
}

function escapeHtml(value) {
    return String(value || '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');
}

async function loadCalendar() {
    setFeedback('Carregando compromissos...');

    try {
        const response = await fetch(apiUrl('api/calendar.php'), { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok || data.success === false) {
            throw new Error(data.error || 'Falha ao carregar calendário.');
        }

        events = Array.isArray(data.events) ? data.events : [];
        renderCalendar();
        renderUpcoming();

        if (data.warning) {
            setFeedback(data.warning, 'warning');
            return;
        }

        const updatedAt = data.generated_at
            ? timeFormatter.format(new Date(data.generated_at))
            : '';
        setFeedback(updatedAt ? `Atualizado às ${updatedAt}. Cache renovado a cada 30 minutos.` : 'Calendário atualizado.', 'success');
    } catch (error) {
        setFeedback(error?.message || 'Não foi possível carregar o calendário.', 'error');
        events = [];
        renderCalendar();
        renderUpcoming();
    }
}

prevBtn?.addEventListener('click', () => {
    visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() - 1, 1);
    renderCalendar();
});

nextBtn?.addEventListener('click', () => {
    visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 1);
    renderCalendar();
});

todayBtn?.addEventListener('click', () => {
    visibleDate = startOfMonth(new Date());
    renderCalendar();
});

gridEl?.addEventListener('click', handleEventClick);
gridEl?.addEventListener('click', handleDayClick);
upcomingEl?.addEventListener('click', handleEventClick);
dayEventsEl?.addEventListener('click', handleEventClick);
eventOverlay?.addEventListener('click', closeEventDetails);
eventCloseBtn?.addEventListener('click', closeEventDetails);
dayOverlay?.addEventListener('click', closeDayDetails);
dayCloseBtn?.addEventListener('click', closeDayDetails);

document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
        closeEventDetails();
        closeDayDetails();
    }
});

renderCalendar();
renderUpcoming();
void loadCalendar();
