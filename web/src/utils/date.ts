import type { Weekday } from '../types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;

/**
 * 把 'YYYY-MM-DD' 解析为「本地时区」的当日 0 点。
 * 不用 `new Date('2026-09-07')`：那种写法会按 UTC 解析，
 * 在东八区会得到 09-07 08:00，做天数差时会偶发偏差一天。
 */
export function parseDateOnly(iso: string): Date {
  const parts = iso.split('-').map(Number);
  const year = parts[0] ?? 1970;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(year, month - 1, day);
}

/** 把 Date 规范到当日 0 点 */
export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** 把 Date 格式化为 'YYYY-MM-DD' */
export function formatISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 把 Date 格式化为 'M月D日' */
export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

/** 把 Date 换算成星期序号（1 = 周一 … 7 = 周日） */
export function weekdayOf(date: Date): Weekday {
  // JS 的 getDay()：0 = 周日，这里平移成 1 = 周一
  return (((date.getDay() + 6) % 7) + 1) as Weekday;
}

/** 今天星期几 */
export function todayWeekday(now: Date = new Date()): Weekday {
  return weekdayOf(now);
}

/** 数值区间钳制 */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/**
 * 依据学期开始日期推算「今天属于第几周」。
 * 第 1 周 = 开始日期当天所在的那一周（开始日期约定为周一）。
 * 开学前返回 1，学期结束后返回总周数。
 */
export function calcCurrentWeek(
  startDate: string,
  totalWeeks: number,
  now: Date = new Date(),
): number {
  const start = startOfDay(parseDateOnly(startDate));
  const today = startOfDay(now);
  const diffDays = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY);
  const week = Math.floor(diffDays / DAYS_PER_WEEK) + 1;
  return clamp(week, 1, totalWeeks);
}

/** 第 `week` 周对应的日期区间（周一 ~ 周日） */
export function weekDateRange(startDate: string, week: number): { start: Date; end: Date } {
  const start = startOfDay(parseDateOnly(startDate));
  start.setDate(start.getDate() + (week - 1) * DAYS_PER_WEEK);
  const end = new Date(start);
  end.setDate(end.getDate() + (DAYS_PER_WEEK - 1));
  return { start, end };
}

/** 第 `week` 周的日期区间文案，如 '9/7 - 9/13' */
export function weekDateRangeLabel(startDate: string, week: number): string {
  const { start, end } = weekDateRange(startDate, week);
  return `${start.getMonth() + 1}/${start.getDate()} - ${end.getMonth() + 1}/${end.getDate()}`;
}

/** 第 `week` 周中「星期 day」对应的具体日期 */
export function dateOfWeekday(startDate: string, week: number, day: Weekday): Date {
  const { start } = weekDateRange(startDate, week);
  const target = new Date(start);
  target.setDate(target.getDate() + (day - 1));
  return target;
}
