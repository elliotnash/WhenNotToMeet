import { useMemo } from 'react';
import {
  type EventWindowConfig,
  type Interval,
  SLOT_MINUTES,
  addDays,
  eventWindows,
  mergeIntervals,
  toDaySegments,
  todayKey,
  weekday,
} from '~/lib/time';

export interface CalendarLayout {
  timeZone: string;
  windows: Interval[];
  windowsByDay: Map<string, Interval[]>;
  weeks: string[][];
  isSingleDay: boolean;
  minMinute: number;
  maxMinute: number;
  slotPx: number;
}

export function buildCalendarLayout(event: EventWindowConfig, timeZone: string): CalendarLayout {
  const windows = eventWindows(event);
  const byDay = new Map<string, Interval[]>();
  for (const segment of toDaySegments(windows, timeZone)) {
    const list = byDay.get(segment.day) ?? [];
    list.push({ start: segment.start, end: segment.end });
    byDay.set(segment.day, list);
  }
  const windowsByDay = new Map([...byDay].map(([day, list]) => [day, mergeIntervals(list)]));
  const days = [...windowsByDay.keys()].sort();
  const ranges = [...windowsByDay.values()].flat();
  const minMinute = Math.floor(Math.min(...ranges.map((r) => r.start)) / 60) * 60;
  const maxMinute = Math.ceil(Math.max(...ranges.map((r) => r.end)) / 60) * 60;

  const isSingleDay = days.length === 1;
  const weeks: string[][] = [];
  if (isSingleDay) {
    weeks.push(days);
  } else {
    const first = days[0] as string;
    const last = days.at(-1) as string;
    for (let start = addDays(first, -weekday(first)); start <= last; start = addDays(start, 7)) {
      weeks.push(Array.from({ length: 7 }, (_, i) => addDays(start, i)));
    }
  }

  const slots = (maxMinute - minMinute) / SLOT_MINUTES;
  const slotPx = Math.min(32, Math.max(12, Math.round(600 / slots)));

  return { timeZone, windows, windowsByDay, weeks, isSingleDay, minMinute, maxMinute, slotPx };
}

export function useCalendarLayout(event: EventWindowConfig, timeZone: string) {
  const { timezone, startDate, endDate, dayStartMinute, dayEndMinute } = event;
  return useMemo(
    () =>
      buildCalendarLayout({ timezone, startDate, endDate, dayStartMinute, dayEndMinute }, timeZone),
    [timezone, startDate, endDate, dayStartMinute, dayEndMinute, timeZone],
  );
}

export function initialWeekIndex(layout: CalendarLayout) {
  const today = todayKey(layout.timeZone);
  const index = layout.weeks.findIndex((week) => week.includes(today));
  return index === -1 ? 0 : index;
}

export function minuteToPx(layout: CalendarLayout, minute: number) {
  return ((minute - layout.minMinute) / SLOT_MINUTES) * layout.slotPx;
}

export function gridHeight(layout: CalendarLayout) {
  return minuteToPx(layout, layout.maxMinute);
}

export function windowContaining(layout: CalendarLayout, day: string, minute: number) {
  return layout.windowsByDay.get(day)?.find((w) => minute >= w.start && minute < w.end) ?? null;
}

export function nearestWindow(layout: CalendarLayout, day: string, minute: number) {
  const list = layout.windowsByDay.get(day);
  if (!list?.length) return null;
  let best = list[0] as Interval;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const w of list) {
    const distance = minute < w.start ? w.start - minute : minute >= w.end ? minute - w.end : 0;
    if (distance < bestDistance) {
      best = w;
      bestDistance = distance;
    }
  }
  return best;
}
