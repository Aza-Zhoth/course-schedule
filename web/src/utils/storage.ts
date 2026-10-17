import { COURSE_COLORS, DATA_VERSION, DEFAULT_SECTIONS, LIMITS, STORAGE_KEY, createDefaultData } from '../constants';
import type { AppData, Course, SectionTime, ThemeMode, WeekParity, Weekday } from '../types';
import { assignColorsByCourseName } from './course';
import { clamp, formatISODate } from './date';

/* ------------------------------------------------------------------ *
 * 类型守卫与取值助手
 * 本文件的职责之一是「不信任任何从磁盘读回来的东西」，
 * 因此所有字段都要过一遍类型检查后再落进内存。
 * ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asNumber(value: unknown, fallback: number, min: number, max: number): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return clamp(Math.round(num), min, max);
}

function asWeekday(value: unknown): Weekday {
  return asNumber(value, 1, 1, 7) as Weekday;
}

function asParity(value: unknown): WeekParity {
  return value === 'odd' || value === 'even' ? value : 'all';
}

function asTheme(value: unknown): ThemeMode {
  return value === 'dark' ? 'dark' : 'light';
}

/** 把任意来源的单条课程数据收拾成合法 Course；缺少课程名的一律丢弃 */
function normalizeCourse(raw: unknown, index: number, maxSections: number): Course | null {
  if (!isRecord(raw)) return null;

  const name = asString(raw.name).trim().slice(0, LIMITS.NAME_MAX);
  if (!name) return null;

  const startSection = asNumber(raw.startSection, 1, 1, maxSections);
  const endSection = asNumber(raw.endSection, startSection, startSection, maxSections);
  const startWeek = asNumber(raw.startWeek, 1, 1, LIMITS.MAX_WEEKS);
  const endWeek = asNumber(raw.endWeek, startWeek, startWeek, LIMITS.MAX_WEEKS);
  const note = asString(raw.note).trim().slice(0, LIMITS.NOTE_MAX);
  const now = new Date().toISOString();

  return {
    id: asString(raw.id) || `c_restored_${index}_${Date.now().toString(36)}`,
    name,
    teacher: asString(raw.teacher).trim().slice(0, LIMITS.TEACHER_MAX),
    location: asString(raw.location).trim().slice(0, LIMITS.LOCATION_MAX),
    dayOfWeek: asWeekday(raw.dayOfWeek),
    startSection,
    endSection,
    startWeek,
    endWeek,
    weekParity: asParity(raw.weekParity),
    color: asString(raw.color) || COURSE_COLORS[0].value,
    note: note || undefined,
    createdAt: asString(raw.createdAt) || now,
    updatedAt: asString(raw.updatedAt) || now,
  };
}

/** HH:mm 格式校验（24 小时制） */
function isValidTime(value: unknown): value is string {
  return typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * 把任意来源的作息表收拾成合法 SectionTime[]。
 * 结构对不上 / 数量越界时整体回退默认作息 —— 作息是全局的，
 * 局部修补（比如只保留前几节）很容易造成「课程引用了不存在的节次」，不值得冒险。
 */
function normalizeSections(raw: unknown): SectionTime[] {
  if (!Array.isArray(raw)) return DEFAULT_SECTIONS.map((section) => ({ ...section }));

  const list: SectionTime[] = [];
  for (const item of raw) {
    if (!isRecord(item)) break;
    if (!isValidTime(item.start) || !isValidTime(item.end)) break;
    if (item.start >= item.end) break;
    list.push({ index: list.length + 1, start: item.start, end: item.end });
    if (list.length >= LIMITS.MAX_SECTIONS) break;
  }

  if (list.length < LIMITS.MIN_SECTIONS) return DEFAULT_SECTIONS.map((section) => ({ ...section }));

  // 相邻节次必须递增（允许课间空档，但不允许时间倒流）
  for (let i = 1; i < list.length; i += 1) {
    if (list[i].start < list[i - 1].end) return DEFAULT_SECTIONS.map((section) => ({ ...section }));
  }

  return list;
}

/**
 * 把任意来源的数据规范化为合法 AppData。
 * 返回 null 表示「结构完全对不上」，调用方应回退到默认数据。
 */
export function normalizeData(raw: unknown): AppData | null {
  if (!isRecord(raw)) return null;
  if (!isRecord(raw.semester) || !Array.isArray(raw.courses)) return null;

  const defaults = createDefaultData();
  const semester = raw.semester;
  const settings = isRecord(raw.settings) ? raw.settings : {};

  const rawStartDate = asString(semester.startDate);
  const startDate = /^\d{4}-\d{2}-\d{2}$/.test(rawStartDate)
    ? rawStartDate
    : defaults.semester.startDate;

  // 作息表先规范化：后面 normalizeCourse 的节次钳制要以它为准
  const sections = normalizeSections(raw.sections);

  const normalizedCourses = raw.courses
    .map((item, index) => normalizeCourse(item, index, sections.length))
    .filter((item): item is Course => item !== null)
    .slice(0, LIMITS.MAX_COURSES);

  // 老版本色板是高饱和纯色，新版换成了柔和渐变 ——
  // 已存数据里出现「不在当前色板里的颜色」时，按课程名重新分配一次，
  // 免得老用户打开还是旧的满屏深红，又得手动一门门改。
  const paletteValues = COURSE_COLORS.map((c) => c.value);
  const migratedCourses = normalizedCourses.some((c) => !paletteValues.includes(c.color))
    ? assignColorsByCourseName(normalizedCourses)
    : normalizedCourses;

  return {
    version: DATA_VERSION,
    semester: {
      id: asString(semester.id) || defaults.semester.id,
      name: asString(semester.name).trim().slice(0, 40) || defaults.semester.name,
      startDate,
      totalWeeks: asNumber(semester.totalWeeks, defaults.semester.totalWeeks, 1, LIMITS.MAX_WEEKS),
    },
    sections,
    courses: migratedCourses,
    settings: {
      theme: asTheme(settings.theme),
      notifyEnabled: settings.notifyEnabled === true,
      notifyLeadMinutes: asNumber(settings.notifyLeadMinutes, 10, 1, 60),
    },
  };
}

/* ------------------------------------------------------------------ *
 * 读写
 * ------------------------------------------------------------------ */

/** 本地存储是否可用（iOS 无痕模式下会被禁用） */
export function isStorageAvailable(): boolean {
  try {
    const probe = '__cs_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

/** 从本地存储读取数据；任何异常都降级为默认数据，绝不抛错 */
export function loadData(): AppData {
  const fallback = createDefaultData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    return normalizeData(JSON.parse(raw)) ?? fallback;
  } catch (error) {
    console.warn('[课程表] 本地数据读取失败，已回退到默认数据：', error);
    return fallback;
  }
}

/** 写入本地存储；返回 false 表示写入失败（如隐私模式、配额超限） */
export function saveData(data: AppData): boolean {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('[课程表] 本地数据写入失败：', error);
    return false;
  }
}

/** 导出为 JSON 文件并触发下载 */
export function exportDataFile(data: AppData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `course-schedule-${formatISODate(new Date())}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}

/** 读取用户选择的 JSON 文件并解析为 AppData；格式不对则 reject */
export function importDataFromFile(file: File): Promise<AppData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('文件读取失败，请重试'));

    reader.onload = () => {
      try {
        const parsed: unknown = JSON.parse(String(reader.result));
        const data = normalizeData(parsed);
        if (!data) {
          reject(new Error('文件格式不正确，请选择由本应用导出的文件'));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error('文件不是合法的 JSON，无法导入'));
      }
    };

    reader.readAsText(file);
  });
}
