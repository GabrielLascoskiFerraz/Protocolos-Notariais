import { apiUrl } from './base.js';

const modal = document.getElementById('dashboard-calendar-modal');
const overlay = document.getElementById('dashboard-calendar-overlay');
const closeBtn = document.getElementById('dashboard-calendar-close');
const okBtn = document.getElementById('dashboard-calendar-ok');
const titleEl = document.getElementById('dashboard-calendar-title');
const summaryEl = document.getElementById('dashboard-calendar-summary');
const eventsEl = document.getElementById('dashboard-calendar-events');

const seenStorageKey = 'protocolos.calendar.today.seen.v1';
const checkIntervalMs = 5 * 60 * 1000;

const timeFormatter = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });
let sessionSeenEvents = {};

function todayKey() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
}

function readSeenEvents() {
    try {
        const parsed = JSON.parse(localStorage.getItem(seenStorageKey) || '{}');
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? { ...parsed, ...sessionSeenEvents }
            : { ...sessionSeenEvents };
    } catch {
        return { ...sessionSeenEvents };
    }
}

function writeSeenEvents(seen) {
    const entries = Object.entries(seen)
        .sort((left, right) => Number(right[1]) - Number(left[1]))
        .slice(0, 300);
    sessionSeenEvents = Object.fromEntries(entries);

    try {
        localStorage.setItem(seenStorageKey, JSON.stringify(sessionSeenEvents));
    } catch {
        // Se o navegador bloquear storage, a memória da aba ainda evita repetição na sessão atual.
    }
}

function markEventsAsSeen(events) {
    const seen = readSeenEvents();
    const now = Date.now();
    events.forEach(event => {
        if (event.id) {
            seen[event.id] = now;
        }
    });
    writeSeenEvents(seen);
}

function parseEventDate(value) {
    return new Date(value);
}

function eventTimeLabel(event) {
    if (event.all_day) return 'Dia inteiro';

    const start = parseEventDate(event.start);
    const end = parseEventDate(event.end);
    return `${timeFormatter.format(start)} - ${timeFormatter.format(end)}`;
}

function clearElement(element) {
    while (element?.firstChild) {
        element.removeChild(element.firstChild);
    }
}

function appendEventItem(event) {
    const item = document.createElement('article');
    item.className = 'dashboard-calendar-event';

    const time = document.createElement('span');
    time.textContent = eventTimeLabel(event);

    const title = document.createElement('strong');
    title.textContent = event.title || 'Compromisso sem título';

    item.append(time, title);

    if (event.location) {
        const location = document.createElement('small');
        location.textContent = event.location;
        item.appendChild(location);
    }

    if (event.description) {
        const description = document.createElement('p');
        description.textContent = event.description;
        item.appendChild(description);
    }

    eventsEl.appendChild(item);
}

function openModal(newEvents) {
    if (!modal || !titleEl || !summaryEl || !eventsEl) return;

    const count = newEvents.length;
    titleEl.textContent = count === 1 ? 'Novo compromisso hoje' : 'Novos compromissos hoje';
    summaryEl.textContent = count === 1
        ? 'Há um compromisso novo na agenda de hoje.'
        : `Há ${count} compromissos novos na agenda de hoje.`;

    clearElement(eventsEl);
    newEvents
        .sort((left, right) => parseEventDate(left.start) - parseEventDate(right.start))
        .forEach(appendEventItem);

    markEventsAsSeen(newEvents);
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('dashboard-calendar-open');
}

function closeModal() {
    if (!modal) return;

    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('dashboard-calendar-open');
}

async function checkTodayEvents() {
    if (!modal) return;

    try {
        const response = await fetch(apiUrl('api/calendar.php'), { cache: 'no-store' });
        const data = await response.json();

        if (!response.ok || data.success === false || !Array.isArray(data.events)) {
            return;
        }

        const seen = readSeenEvents();
        const today = todayKey();
        const newEvents = data.events.filter(event => event.date === today && event.id && !seen[event.id]);

        if (newEvents.length) {
            openModal(newEvents);
        }
    } catch {
        // A dashboard não deve exibir erro se a agenda estiver momentaneamente indisponível.
    }
}

overlay?.addEventListener('click', closeModal);
closeBtn?.addEventListener('click', closeModal);
okBtn?.addEventListener('click', closeModal);

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
        closeModal();
    }
});

void checkTodayEvents();
setInterval(checkTodayEvents, checkIntervalMs);
