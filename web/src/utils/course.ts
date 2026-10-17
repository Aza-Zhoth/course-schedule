import { COURSE_COLORS, LIMITS } from '../constants';

/**
 * 按「课程名」给一批草稿分配颜色：同名课程共享同一颜色，不同课程依次取色。
 *
 * 为什么不按下标循环：教务系统导出的课表里，同一门课往往有多条记录
 * （不同周次段 / 单双周），按下标分配会让同一门课在一周里出现两种颜色，
 * 看起来像两门课。按课程名分配后，颜色本身就是「这是哪门课」的视觉线索。
 */
export function assignColorsByCourseName<T extends { name: string; color: string }>(
  drafts: T[],
): T[] {
  const seen = new Map<string, string>();
  let next = 0;
  return drafts.map((draft) => {
    const name = draft.name.trim();
    let color = seen.get(name);
    if (!color) {
      color = COURSE_COLORS[next % COURSE_COLORS.length].value;
      next += 1;
      seen.set(name, color);
    }
    return { ...draft, color };
  });
}
import type { CellInfo, Course, CourseDraft, ValidationResult, WeekParity, Weekday } from '../types';

/** 判断某周次是否符合单双周要求 */
export function isParityMatch(parity: WeekParity, week: number): boolean {
  if (parity === 'all') return true;
  if (parity === 'odd') return week % 2 === 1;
  return week % 2 === 0;
}

/** 这门课在第 `week` 周是否要上 */
export function isCourseActiveInWeek(course: Course, week: number): boolean {
  if (week < course.startWeek || week > course.endWeek) return false;
  return isParityMatch(course.weekParity, week);
}

/**
 * 两个区间是否相交。
 * 用 `a.start <= b.end && b.start <= a.end` 判断，
 * 比逐一枚举周次更高效，且天然覆盖「一个区间完全包含另一个」的情况。
 */
function rangesOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** 两条单双周规则是否存在共同的上课周 */
function parityOverlap(a: WeekParity, b: WeekParity): boolean {
  if (a === 'all' || b === 'all') return true;
  return a === b;
}

/**
 * 冲突判定 —— 需求文档 §3.6。
 * 三条同时成立才算冲突：同一天 + 节次区间相交 + 周次区间相交 + 单双周相交。
 */
export function hasConflict(a: CourseDraft, b: Course): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  if (!rangesOverlap(a.startSection, a.endSection, b.startSection, b.endSection)) return false;
  if (!rangesOverlap(a.startWeek, a.endWeek, b.startWeek, b.endWeek)) return false;
  return parityOverlap(a.weekParity, b.weekParity);
}

/** 找出与草稿冲突的全部课程（编辑时排除自身） */
export function findConflicts(
  draft: CourseDraft,
  courses: Course[],
  excludeId?: string | null,
): Course[] {
  return courses.filter((c) => c.id !== excludeId && hasConflict(draft, c));
}

/**
 * 构建「星期:节次 → 格子信息」的索引。
 *
 * 为什么要预建索引：网格有 7 × 12 = 84 个格子，
 * 如果每个格子都去 `courses.find(...)` 一遍，复杂度是 O(84 × N)；
 * 预建后每格都是 O(1) 查表。
 */
export function buildCellMap(courses: Course[], week: number): Map<string, CellInfo> {
  const map = new Map<string, CellInfo>();

  for (const course of courses) {
    if (!isCourseActiveInWeek(course, week)) continue;
    const span = course.endSection - course.startSection + 1;

    for (let s = course.startSection; s <= course.endSection; s += 1) {
      const key = cellKey(course.dayOfWeek, s);
      // 已占用则保留先出现的课程（数据已冲突时的确定性行为）
      if (map.has(key)) continue;
      map.set(key, {
        course,
        isStart: s === course.startSection,
        isEnd: s === course.endSection,
        span,
      });
    }
  }

  return map;
}

/** 课表格子的索引键 */
export function cellKey(day: Weekday, section: number): string {
  return `${day}:${section}`;
}

/** 取某天在第 `week` 周要上的课，按起始节次升序 */
export function getCoursesOfDay(courses: Course[], day: Weekday, week: number): Course[] {
  return courses
    .filter((c) => c.dayOfWeek === day && isCourseActiveInWeek(c, week))
    .sort(compareBySection);
}

/** 按「星期 → 起始节次」排序 */
export function compareCourses(a: Course, b: Course): number {
  if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
  return compareBySection(a, b);
}

function compareBySection(a: Course, b: Course): number {
  if (a.startSection !== b.startSection) return a.startSection - b.startSection;
  return a.name.localeCompare(b.name, 'zh-Hans-CN');
}

/** 节次区间文案，如 '第1-2节' */
export function sectionRangeLabel(startSection: number, endSection: number): string {
  if (startSection === endSection) return `第${startSection}节`;
  return `第${startSection}-${endSection}节`;
}

/** 周次区间文案，如 '第1-16周' */
export function weekRangeLabel(startWeek: number, endWeek: number, parity: WeekParity): string {
  const base = `第${startWeek}-${endWeek}周`;
  if (parity === 'odd') return `${base}（单周）`;
  if (parity === 'even') return `${base}（双周）`;
  return base;
}

/**
 * 校验课程草稿 —— 需求文档 §3.5。
 * 返回全部错误而非首个错误，便于表单同时标红多个字段。
 * `maxSections` 是当前作息表的节次数（各校可改，因此由调用方传入而非写死）。
 */
export function validateCourse(
  draft: CourseDraft,
  courseCount: number,
  maxSections: number,
): ValidationResult {
  const errors: ValidationResult['errors'] = {};

  const name = draft.name.trim();
  if (!name) errors.name = '请输入课程名称';
  else if (name.length > LIMITS.NAME_MAX) errors.name = `课程名称不超过 ${LIMITS.NAME_MAX} 个字`;

  const teacher = draft.teacher.trim();
  if (!teacher) errors.teacher = '请输入教师姓名';
  else if (teacher.length > LIMITS.TEACHER_MAX) errors.teacher = `教师姓名不超过 ${LIMITS.TEACHER_MAX} 个字`;

  const location = draft.location.trim();
  if (!location) errors.location = '请输入上课地点';
  else if (location.length > LIMITS.LOCATION_MAX) errors.location = `上课地点不超过 ${LIMITS.LOCATION_MAX} 个字`;

  if (
    !Number.isInteger(draft.startSection) ||
    !Number.isInteger(draft.endSection) ||
    draft.startSection < 1 ||
    draft.endSection > maxSections ||
    draft.startSection > draft.endSection
  ) {
    errors.section = '节次范围不合法，结束节次不能早于起始节次';
  }

  if (
    !Number.isInteger(draft.startWeek) ||
    !Number.isInteger(draft.endWeek) ||
    draft.startWeek < 1 ||
    draft.endWeek > LIMITS.MAX_WEEKS ||
    draft.startWeek > draft.endWeek
  ) {
    errors.week = '周次范围不合法，结束周不能早于起始周';
  }

  if (courseCount >= LIMITS.MAX_COURSES) {
    errors.limit = `课程数量已达上限（${LIMITS.MAX_COURSES} 门）`;
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
