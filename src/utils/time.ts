/**
 * Date and time helpers for the scheduling engine.
 *
 * Everything here works on strings — "YYYY-MM-DD" for calendar dates and
 * "HH:mm" for wall-clock times — in clinic-local (Asia/Manila) terms. Where a
 * real `Date` is needed for calendar arithmetic we build it in UTC so that the
 * server's own timezone can never shift a date by a day. See the note in
 * `src/types.ts` for why the whole app avoids timezone conversion.
 */

import type { DayOfWeek } from '../types';
import { DAY_NAMES } from '../types';

export const CLINIC_TIMEZONE = 'Asia/Manila';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isValidDateString(value: string): boolean {
  if (!DATE_PATTERN.test(value)) return false;
  const parsed = parseDate(value);
  return formatDate(parsed) === value;
}

export function isValidTimeString(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** "HH:mm" -> minutes since midnight. Throws on malformed input. */
export function toMinutes(time: string): number {
  const match = TIME_PATTERN.exec(time);
  if (!match) throw new Error(`Invalid time "${time}", expected HH:mm`);
  return Number(match[1]) * 60 + Number(match[2]);
}

/** Minutes since midnight -> "HH:mm". */
export function toTimeString(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" -> a UTC-midnight Date. */
export function parseDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1));
}

/** UTC Date -> "YYYY-MM-DD". */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const parsed = parseDate(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatDate(parsed);
}

export function dayOfWeek(date: string): DayOfWeek {
  return parseDate(date).getUTCDay() as DayOfWeek;
}

export function dayName(day: DayOfWeek): string {
  return DAY_NAMES[day];
}

/** Today's calendar date at the clinics, regardless of where the server runs. */
export function todayInClinicTimezone(): string {
  // en-CA formats as YYYY-MM-DD, which is exactly the shape we want.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CLINIC_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

/** Current wall-clock time at the clinics, as "HH:mm". */
export function nowInClinicTimezone(): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: CLINIC_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

/** "YYYY-MM" for the month containing `date`. */
export function monthKey(date: string): string {
  return date.slice(0, 7);
}

export function isValidMonthKey(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;
  const month = Number(value.slice(5, 7));
  return month >= 1 && month <= 12;
}

/** Every calendar date in a "YYYY-MM" month, in order. */
export function eachDayOfMonth(month: string): string[] {
  const year = Number(month.slice(0, 4));
  const monthNumber = Number(month.slice(5, 7));
  // Day 0 of the following month is the last day of this one.
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const days: string[] = [];
  for (let day = 1; day <= dayCount; day += 1) {
    days.push(`${month}-${String(day).padStart(2, '0')}`);
  }
  return days;
}

/** Half-open overlap test: [aStart, aEnd) against [bStart, bEnd), in minutes. */
export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** True when [start, end) sits entirely inside [windowStart, windowEnd). */
export function rangeContains(
  windowStart: number,
  windowEnd: number,
  start: number,
  end: number,
): boolean {
  return start >= windowStart && end <= windowEnd;
}

/** Renders "09:00" as "9:00 AM" for human-facing strings. */
export function formatTime12h(time: string): string {
  const minutes = toMinutes(time);
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${period}`;
}
