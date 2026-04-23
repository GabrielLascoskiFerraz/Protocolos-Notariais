<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');

$calendarUrl = 'https://calendar.google.com/calendar/ical/2cartorio.irati%40gmail.com/private-d2973bdcdead518993031b26f88c612a/basic.ics';
$cacheDir = dirname(__DIR__) . '/cache';
$cacheFile = $cacheDir . '/calendar-cache.json';
$cacheTtl = 1800;
$timezone = new DateTimeZone('America/Sao_Paulo');

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function readCachedCalendar(string $cacheFile): ?array
{
    if (!is_file($cacheFile)) {
        return null;
    }

    $raw = file_get_contents($cacheFile);
    if ($raw === false || $raw === '') {
        return null;
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : null;
}

function fetchCalendarIcs(string $url): string
{
    $context = stream_context_create([
        'http' => [
            'timeout' => 12,
            'header' => "User-Agent: Protocolos-Notariais/1.0\r\n",
        ],
    ]);

    $ics = @file_get_contents($url, false, $context);
    if (is_string($ics) && trim($ics) !== '') {
        return $ics;
    }

    if (function_exists('curl_init')) {
        $curl = curl_init($url);
        curl_setopt_array($curl, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_USERAGENT => 'Protocolos-Notariais/1.0',
        ]);
        $response = curl_exec($curl);
        $error = curl_error($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);
        curl_close($curl);

        if (is_string($response) && trim($response) !== '' && $status >= 200 && $status < 300) {
            return $response;
        }

        throw new RuntimeException($error ?: 'Falha ao baixar calendário.');
    }

    throw new RuntimeException('Falha ao baixar calendário.');
}

function unfoldIcs(string $ics): array
{
    $normalized = str_replace(["\r\n", "\r"], "\n", $ics);
    $normalized = preg_replace("/\n[ \t]/", '', $normalized) ?? $normalized;
    return explode("\n", $normalized);
}

function parsePropertyLine(string $line): ?array
{
    $position = strpos($line, ':');
    if ($position === false) {
        return null;
    }

    $left = substr($line, 0, $position);
    $value = substr($line, $position + 1);
    $parts = explode(';', $left);
    $name = strtoupper(array_shift($parts) ?: '');
    $params = [];

    foreach ($parts as $part) {
        [$key, $paramValue] = array_pad(explode('=', $part, 2), 2, '');
        if ($key !== '') {
            $params[strtoupper($key)] = trim($paramValue, '"');
        }
    }

    return [
        'name' => $name,
        'params' => $params,
        'value' => $value,
    ];
}

function unescapeIcsText(?string $value): string
{
    $text = str_replace(['\\n', '\\N'], "\n", (string) $value);
    return trim(str_replace(['\\,', '\\;', '\\\\'], [',', ';', '\\'], $text));
}

function parseIcsDate(string $value, array $params, DateTimeZone $defaultTimezone): array
{
    $isDate = ($params['VALUE'] ?? '') === 'DATE' || preg_match('/^\d{8}$/', $value) === 1;
    if ($isDate) {
        $date = DateTimeImmutable::createFromFormat('!Ymd', substr($value, 0, 8), $defaultTimezone);
        if (!$date) {
            throw new RuntimeException('Data inválida no calendário.');
        }

        return [
            'date' => $date,
            'all_day' => true,
        ];
    }

    $tzid = $params['TZID'] ?? null;
    $timezone = $tzid ? new DateTimeZone($tzid) : $defaultTimezone;
    $clean = rtrim($value, 'Z');

    if (substr($value, -1) === 'Z') {
        $date = DateTimeImmutable::createFromFormat('!Ymd\THis', $clean, new DateTimeZone('UTC'));
    } else {
        $date = DateTimeImmutable::createFromFormat('!Ymd\THis', $clean, $timezone);
    }

    if (!$date) {
        throw new RuntimeException('Data inválida no calendário.');
    }

    return [
        'date' => $date->setTimezone($defaultTimezone),
        'all_day' => false,
    ];
}

function parseRrule(?string $value): array
{
    $rule = [];
    foreach (explode(';', (string) $value) as $part) {
        [$key, $itemValue] = array_pad(explode('=', $part, 2), 2, '');
        if ($key !== '') {
            $rule[strtoupper($key)] = $itemValue;
        }
    }
    return $rule;
}

function weekdayNumber(string $weekday): int
{
    return [
        'MO' => 1,
        'TU' => 2,
        'WE' => 3,
        'TH' => 4,
        'FR' => 5,
        'SA' => 6,
        'SU' => 7,
    ][$weekday] ?? 0;
}

function advanceRecurring(DateTimeImmutable $date, array $rule): DateTimeImmutable
{
    $interval = max(1, (int) ($rule['INTERVAL'] ?? 1));
    $freq = strtoupper($rule['FREQ'] ?? '');

    return match ($freq) {
        'DAILY' => $date->modify('+' . $interval . ' day'),
        'WEEKLY' => $date->modify('+' . $interval . ' week'),
        'MONTHLY' => $date->modify('+' . $interval . ' month'),
        'YEARLY' => $date->modify('+' . $interval . ' year'),
        default => $date->modify('+1 day'),
    };
}

function parseEvents(string $ics, DateTimeZone $timezone): array
{
    $lines = unfoldIcs($ics);
    $events = [];
    $current = null;

    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === 'BEGIN:VEVENT') {
            $current = [
                'exdates' => [],
            ];
            continue;
        }

        if ($line === 'END:VEVENT') {
            if (is_array($current) && isset($current['dtstart'])) {
                $events[] = $current;
            }
            $current = null;
            continue;
        }

        if ($current === null) {
            continue;
        }

        $property = parsePropertyLine($line);
        if (!$property) {
            continue;
        }

        $name = $property['name'];
        $value = $property['value'];

        try {
            if ($name === 'DTSTART') {
                $current['dtstart'] = parseIcsDate($value, $property['params'], $timezone);
            } elseif ($name === 'DTEND') {
                $current['dtend'] = parseIcsDate($value, $property['params'], $timezone);
            } elseif ($name === 'SUMMARY') {
                $current['summary'] = unescapeIcsText($value);
            } elseif ($name === 'DESCRIPTION') {
                $current['description'] = unescapeIcsText($value);
            } elseif ($name === 'LOCATION') {
                $current['location'] = unescapeIcsText($value);
            } elseif ($name === 'UID') {
                $current['uid'] = trim($value);
            } elseif ($name === 'RRULE') {
                $current['rrule'] = trim($value);
            } elseif ($name === 'EXDATE') {
                foreach (explode(',', $value) as $dateValue) {
                    $parsed = parseIcsDate($dateValue, $property['params'], $timezone);
                    $current['exdates'][] = $parsed['date']->format('Y-m-d');
                }
            }
        } catch (Throwable) {
            continue;
        }
    }

    return $events;
}

function materializeEvent(array $event, DateTimeImmutable $start, DateTimeImmutable $end, bool $allDay, int $sequence): array
{
    return [
        'id' => sha1(($event['uid'] ?? '') . '|' . $start->format(DateTimeInterface::ATOM) . '|' . $sequence),
        'title' => ($event['summary'] ?? '') !== '' ? $event['summary'] : 'Compromisso sem título',
        'description' => $event['description'] ?? '',
        'location' => $event['location'] ?? '',
        'start' => $start->format(DateTimeInterface::ATOM),
        'end' => $end->format(DateTimeInterface::ATOM),
        'date' => $start->format('Y-m-d'),
        'all_day' => $allDay,
    ];
}

function expandEvents(array $events, DateTimeZone $timezone): array
{
    $windowStart = (new DateTimeImmutable('first day of -2 months 00:00:00', $timezone));
    $windowEnd = (new DateTimeImmutable('last day of +12 months 23:59:59', $timezone));
    $expanded = [];

    foreach ($events as $event) {
        $start = $event['dtstart']['date'];
        $allDay = (bool) $event['dtstart']['all_day'];
        $end = $event['dtend']['date'] ?? ($allDay ? $start->modify('+1 day') : $start->modify('+1 hour'));
        $duration = $end->getTimestamp() - $start->getTimestamp();
        $rrule = parseRrule($event['rrule'] ?? '');
        $exdates = array_flip($event['exdates'] ?? []);

        if (!$rrule) {
            if ($end >= $windowStart && $start <= $windowEnd) {
                $expanded[] = materializeEvent($event, $start, $end, $allDay, 0);
            }
            continue;
        }

        $until = null;
        if (!empty($rrule['UNTIL'])) {
            try {
                $until = parseIcsDate($rrule['UNTIL'], [], $timezone)['date'];
            } catch (Throwable) {
                $until = null;
            }
        }

        $count = isset($rrule['COUNT']) ? max(0, (int) $rrule['COUNT']) : null;
        $bydays = array_values(array_filter(array_map('trim', explode(',', $rrule['BYDAY'] ?? ''))));
        $instances = 0;
        $cursor = $start;

        while ($cursor <= $windowEnd) {
            if ($until && $cursor > $until) {
                break;
            }
            if ($count !== null && $instances >= $count) {
                break;
            }

            $candidateDates = [$cursor];
            if (($rrule['FREQ'] ?? '') === 'WEEKLY' && $bydays) {
                $weekStart = $cursor->modify('monday this week');
                $candidateDates = [];
                foreach ($bydays as $day) {
                    $weekday = weekdayNumber(substr($day, -2));
                    if ($weekday > 0) {
                        $candidateDates[] = $weekStart->modify('+' . ($weekday - 1) . ' day')->setTime(
                            (int) $start->format('H'),
                            (int) $start->format('i'),
                            (int) $start->format('s')
                        );
                    }
                }
            }

            foreach ($candidateDates as $candidateStart) {
                if ($candidateStart < $start || $candidateStart > $windowEnd) {
                    continue;
                }
                if ($until && $candidateStart > $until) {
                    continue;
                }
                if ($count !== null && $instances >= $count) {
                    break;
                }

                $instances++;
                $candidateEnd = $candidateStart->modify(($duration >= 0 ? '+' : '') . $duration . ' seconds');
                if ($candidateEnd >= $windowStart && $candidateStart <= $windowEnd && !isset($exdates[$candidateStart->format('Y-m-d')])) {
                    $expanded[] = materializeEvent($event, $candidateStart, $candidateEnd, $allDay, $instances);
                }
            }

            $cursor = advanceRecurring($cursor, $rrule);
            if ($instances > 1200) {
                break;
            }
        }
    }

    usort($expanded, static fn (array $a, array $b): int => strcmp($a['start'], $b['start']));
    return $expanded;
}

try {
    $cached = readCachedCalendar($cacheFile);
    $fresh = $cached && isset($cached['cached_at']) && (time() - (int) $cached['cached_at'] < $cacheTtl);

    if ($fresh) {
        $cached['cache_status'] = 'fresh';
        jsonResponse($cached);
    }

    $ics = fetchCalendarIcs($calendarUrl);
    $events = expandEvents(parseEvents($ics, $timezone), $timezone);

    $payload = [
        'success' => true,
        'events' => $events,
        'cached_at' => time(),
        'cached_until' => time() + $cacheTtl,
        'generated_at' => (new DateTimeImmutable('now', $timezone))->format(DateTimeInterface::ATOM),
        'cache_status' => 'refreshed',
    ];

    if (!is_dir($cacheDir)) {
        mkdir($cacheDir, 0775, true);
    }
    file_put_contents($cacheFile, json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));

    jsonResponse($payload);
} catch (Throwable $error) {
    $cached = readCachedCalendar($cacheFile);
    if ($cached) {
        $cached['cache_status'] = 'stale';
        $cached['warning'] = 'Não foi possível atualizar o calendário agora. Exibindo último cache disponível.';
        jsonResponse($cached);
    }

    jsonResponse([
        'success' => false,
        'error' => 'Não foi possível carregar o calendário.',
        'detail' => $error->getMessage(),
        'events' => [],
    ], 500);
}
