import { formatDateRange, formatMinuteRange, timeZoneLabel } from './time';

interface EventLike {
  startDate: string;
  endDate: string;
  dayStartMinute: number;
  dayEndMinute: number;
  timezone: string;
}

export function describeDates(event: EventLike) {
  return formatDateRange(event.startDate, event.endDate);
}

export function describeWindow(event: EventLike) {
  return `${formatMinuteRange(event.dayStartMinute, event.dayEndMinute)} daily`;
}

export function describeTimeZone(event: EventLike) {
  return timeZoneLabel(event.timezone);
}
