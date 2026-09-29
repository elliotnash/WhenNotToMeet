import { TZDate } from '@date-fns/tz';

export const SLOT_MINUTES = 15;
export const SLOT_MS = SLOT_MINUTES * 60_000;
export const DAY_MINUTES = 24 * 60;

export interface Interval {
  start: number;
  end: number;
}

export interface EventWindowConfig {
  timezone: string;
  startDate: string;
  endDate: string;
  dayStartMinute: number;
  dayEndMinute: number;
}

export function isValidTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function browserTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function parseDateKey(key: string) {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return { year: y, month: m, day: d };
}

export function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function addDays(key: string, days: number) {
  const { year, month, day } = parseDateKey(key);
  const date = new Date(Date.UTC(year, month - 1, day + days));
  return formatDateKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

export function daysBetween(from: string, to: string) {
  const a = parseDateKey(from);
  const b = parseDateKey(to);
  return Math.round(
    (Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / 86_400_000,
  );
}

export function weekday(key: string) {
  const { year, month, day } = parseDateKey(key);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function dateKeyRange(from: string, to: string) {
  const keys: string[] = [];
  for (let key = from; key <= to; key = addDays(key, 1)) keys.push(key);
  return keys;
}

export function toMs(key: string, minute: number, timeZone: string) {
  const { year, month, day } = parseDateKey(key);
  return new TZDate(year, month - 1, day, 0, minute, timeZone).getTime();
}

export function dateKeyOf(ms: number, timeZone: string) {
  const date = new TZDate(ms, timeZone);
  return formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Wall-clock minutes of `ms` measured from the start of `key` (may exceed a day). */
export function minuteOf(ms: number, key: string, timeZone: string) {
  const date = new TZDate(ms, timeZone);
  const offset = daysBetween(
    key,
    formatDateKey(date.getFullYear(), date.getMonth() + 1, date.getDate()),
  );
  return offset * DAY_MINUTES + date.getHours() * 60 + date.getMinutes();
}

export function todayKey(timeZone: string) {
  return dateKeyOf(Date.now(), timeZone);
}

export function eventWindows(event: EventWindowConfig): Interval[] {
  return dateKeyRange(event.startDate, event.endDate).map((key) => ({
    start: toMs(key, event.dayStartMinute, event.timezone),
    end: toMs(key, event.dayEndMinute, event.timezone),
  }));
}

export function mergeIntervals(intervals: Interval[]): Interval[] {
  const sorted = intervals.filter((i) => i.end > i.start).sort((a, b) => a.start - b.start);
  const merged: Interval[] = [];
  for (const interval of sorted) {
    const last = merged.at(-1);
    if (last && interval.start <= last.end) {
      last.end = Math.max(last.end, interval.end);
    } else {
      merged.push({ ...interval });
    }
  }
  return merged;
}

export function intersectIntervals(a: Interval[], b: Interval[]): Interval[] {
  const result: Interval[] = [];
  for (const x of mergeIntervals(a)) {
    for (const y of mergeIntervals(b)) {
      const start = Math.max(x.start, y.start);
      const end = Math.min(x.end, y.end);
      if (end > start) result.push({ start, end });
    }
  }
  return mergeIntervals(result);
}

export function subtractIntervals(from: Interval[], remove: Interval[]): Interval[] {
  let result = mergeIntervals(from);
  for (const r of mergeIntervals(remove)) {
    result = result.flatMap((i) => {
      if (r.end <= i.start || r.start >= i.end) return [i];
      const parts: Interval[] = [];
      if (r.start > i.start) parts.push({ start: i.start, end: r.start });
      if (r.end < i.end) parts.push({ start: r.end, end: i.end });
      return parts;
    });
  }
  return result;
}

/** Splits intervals at the time zone's local midnights. */
export function splitByDay(intervals: Interval[], timeZone: string): Interval[] {
  const result: Interval[] = [];
  for (const interval of intervals) {
    let start = interval.start;
    while (start < interval.end) {
      const nextMidnight = toMs(addDays(dateKeyOf(start, timeZone), 1), 0, timeZone);
      const end = Math.min(interval.end, nextMidnight);
      result.push({ start, end });
      start = end;
    }
  }
  return result;
}

export interface DaySegment {
  day: string;
  start: number;
  end: number;
}

/** Day-local minute segments for intervals already split at local midnight. */
export function toDaySegments(intervals: Interval[], timeZone: string): DaySegment[] {
  return splitByDay(intervals, timeZone).map((i) => {
    const day = dateKeyOf(i.start, timeZone);
    return { day, start: minuteOf(i.start, day, timeZone), end: minuteOf(i.end, day, timeZone) };
  });
}

export function formatMinute(minute: number, withPeriod = true) {
  const h = Math.floor(minute / 60) % 24;
  const m = minute % 60;
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  const period = h < 12 ? 'am' : 'pm';
  return `${hour12}${m ? `:${String(m).padStart(2, '0')}` : ''}${withPeriod ? period : ''}`;
}

export function formatMinuteRange(start: number, end: number) {
  const periodDiffers = Math.floor(start / 720) !== Math.floor(end / 720);
  return `${formatMinute(start, periodDiffers)} – ${formatMinute(end)}`;
}

export function formatDateKeyLabel(key: string, options: Intl.DateTimeFormatOptions) {
  const { year, month, day } = parseDateKey(key);
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: 'UTC' }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

export function formatDateRange(startDate: string, endDate: string) {
  if (startDate === endDate) {
    return formatDateKeyLabel(startDate, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
  const sameYear = startDate.slice(0, 4) === endDate.slice(0, 4);
  const start = formatDateKeyLabel(startDate, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const end = formatDateKeyLabel(endDate, { month: 'short', day: 'numeric', year: 'numeric' });
  return `${start} – ${end}`;
}

export function timeZoneLabel(timeZone: string, at = Date.now()) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'short' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  return name ? `${timeZone.replaceAll('_', ' ')} (${name})` : timeZone;
}
