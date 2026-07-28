import crypto from "node:crypto";

function unescapeText(value = "") { return value.replace(/\\[nN]/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\").trim(); }
function parseLine(line) {
  const index = line.indexOf(":"); if (index < 0) return null;
  const [name, ...parameterParts] = line.slice(0, index).split(";");
  const params = Object.fromEntries(parameterParts.map((part) => { const [key, value = ""] = part.split("="); return [key.toUpperCase(), value.replace(/^"|"$/g, "")]; }));
  return { name: name.toUpperCase(), params, value: line.slice(index + 1) };
}
function parseDate(value, params = {}) {
  const allDay = params.VALUE === "DATE" || /^\d{8}$/.test(value);
  if (allDay) return { date: new Date(`${value.slice(0,4)}-${value.slice(4,6)}-${value.slice(6,8)}T00:00:00-03:00`), allDay: true };
  const utc = value.endsWith("Z"); const clean = value.replace(/Z$/, "");
  const iso = `${clean.slice(0,4)}-${clean.slice(4,6)}-${clean.slice(6,8)}T${clean.slice(9,11)}:${clean.slice(11,13)}:${clean.slice(13,15)}${utc ? "Z" : "-03:00"}`;
  return { date: new Date(iso), allDay: false };
}
function atom(date) { return date.toISOString(); }
function dateKey(date) { 
  const saoPauloDate = new Date(date.getTime() - 10800000);
  return saoPauloDate.toISOString().slice(0, 10);
}

export function parseCalendar(ics) {
  const lines = ics.replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n");
  const rawEvents = []; let current = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "BEGIN:VEVENT") { current = { exdates: [] }; continue; }
    if (line === "END:VEVENT") { if (current?.start) rawEvents.push(current); current = null; continue; }
    if (!current) continue; const property = parseLine(line); if (!property) continue;
    if (property.name === "DTSTART") current.start = parseDate(property.value, property.params);
    else if (property.name === "DTEND") current.end = parseDate(property.value, property.params);
    else if (property.name === "SUMMARY") current.title = unescapeText(property.value);
    else if (property.name === "DESCRIPTION") current.description = unescapeText(property.value);
    else if (property.name === "LOCATION") current.location = unescapeText(property.value);
    else if (property.name === "UID") current.uid = property.value.trim();
    else if (property.name === "RRULE") current.rrule = Object.fromEntries(property.value.split(";").map((part) => part.split("=")));
    else if (property.name === "EXDATE") current.exdates.push(...property.value.split(",").map((value) => dateKey(parseDate(value, property.params).date)));
  }
  const startWindow = new Date(); startWindow.setMonth(startWindow.getMonth() - 2); const endWindow = new Date(); endWindow.setMonth(endWindow.getMonth() + 12);
  const result = [];
  function add(event, start, end, sequence) {
    if (end < startWindow || start > endWindow || event.exdates.includes(dateKey(start))) return;
    result.push({ id: crypto.createHash("sha1").update(`${event.uid || ""}|${atom(start)}|${sequence}`).digest("hex"), title:event.title || "Compromisso sem título", description:event.description || "", location:event.location || "", start:atom(start), end:atom(end), date:dateKey(start), all_day:event.start.allDay });
  }
  function weekdayNumber(weekday) {
    return { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 }[weekday] || 0;
  }
  function getMonday(d) {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    date.setDate(diff);
    return date;
  }
  for (const event of rawEvents) {
    const originalStart = event.start.date; const originalEnd = event.end?.date || new Date(originalStart.getTime() + (event.start.allDay ? 86400000 : 3600000)); const duration = originalEnd - originalStart;
    if (!event.rrule?.FREQ) { add(event, originalStart, originalEnd, 0); continue; }
    
    let cursor = new Date(originalStart); 
    const interval = Math.max(1, Number(event.rrule.INTERVAL || 1)); 
    const count = event.rrule.COUNT ? Math.max(0, Number(event.rrule.COUNT)) : null; 
    let instances = 0;
    const until = event.rrule.UNTIL ? parseDate(event.rrule.UNTIL).date : null;
    const bydays = event.rrule.BYDAY ? event.rrule.BYDAY.split(",").map(d => d.trim()) : [];

    while (cursor <= endWindow) {
      if (until && cursor > until) break;
      if (count !== null && instances >= count) break;

      let candidateDates = [new Date(cursor)];
      
      if (event.rrule.FREQ === "WEEKLY" && bydays.length > 0) {
        candidateDates = [];
        const monday = getMonday(cursor);
        for (const dayStr of bydays) {
            const wd = weekdayNumber(dayStr.slice(-2));
            if (wd > 0) {
                const candidate = new Date(monday);
                candidate.setDate(monday.getDate() + (wd - 1));
                candidate.setHours(originalStart.getHours(), originalStart.getMinutes(), originalStart.getSeconds(), originalStart.getMilliseconds());
                candidateDates.push(candidate);
            }
        }
      }

      for (const candidateStart of candidateDates) {
          if (candidateStart < originalStart || candidateStart > endWindow) continue;
          if (until && candidateStart > until) continue;
          if (count !== null && instances >= count) break;
          
          instances++;
          const candidateEnd = new Date(candidateStart.getTime() + duration);
          add(event, candidateStart, candidateEnd, instances);
      }

      if (event.rrule.FREQ === "DAILY") cursor.setDate(cursor.getDate() + interval);
      else if (event.rrule.FREQ === "WEEKLY") cursor.setDate(cursor.getDate() + 7 * interval);
      else if (event.rrule.FREQ === "MONTHLY") cursor.setMonth(cursor.getMonth() + interval);
      else if (event.rrule.FREQ === "YEARLY") cursor.setFullYear(cursor.getFullYear() + interval);
      else break;

      if (instances > 1200) break;
    }
  }
  return result.sort((a,b) => a.start.localeCompare(b.start));
}

export function createCalendarService(getConfig) {
  let cache = null;
  return async function calendar(force = false) {
    const config = getConfig().calendar || {};
    const ttl = Math.max(60, Math.min(21600, Number(config.cacheSeconds || 1800))) * 1000;
    if (!force && cache && Date.now() - cache.cachedAt < ttl) return { ...cache.payload, cache_status: "fresh" };
    try {
      const response = await fetch(config.icsUrl, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "Protocolos-Notariais-Node/1.0" } });
      if (!response.ok) throw new Error(`Calendário respondeu ${response.status}`);
      const events = parseCalendar(await response.text()); const now = Date.now();
      const payload = { success:true, events, cached_at:Math.floor(now/1000), cached_until:Math.floor((now+ttl)/1000), generated_at:new Date().toISOString(), cache_status:"refreshed" };
      cache = { cachedAt:now, payload }; return payload;
    } catch (error) {
      if (cache) return { ...cache.payload, cache_status:"stale", warning:"Não foi possível atualizar o calendário agora. Exibindo o último cache disponível." };
      throw error;
    }
  };
}
