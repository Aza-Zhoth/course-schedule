import type { AppData, SectionTime, WeekParity, Weekday } from './types';

/** 本地存储键名，带版本号便于未来做结构迁移 */
export const STORAGE_KEY = 'course-schedule:v2';

/** 当前数据结构版本（v3：作息时间表从常量迁入数据） */
export const DATA_VERSION = 3;

/** 星期选项 */
export const WEEKDAYS: ReadonlyArray<{ value: Weekday; label: string; short: string }> = [
  { value: 1, label: '周一', short: '一' },
  { value: 2, label: '周二', short: '二' },
  { value: 3, label: '周三', short: '三' },
  { value: 4, label: '周四', short: '四' },
  { value: 5, label: '周五', short: '五' },
  { value: 6, label: '周六', short: '六' },
  { value: 7, label: '周日', short: '日' },
];

/**
 * 默认作息时间表。
 * 说明：不同高校作息差异较大，这里给的是常见默认值；
 * v3 起真正的作息存在 AppData.sections 里，用户可在「我的 → 节次作息」中修改，
 * 这里只作为「首次启动 / 恢复默认」的模板。
 */
export const DEFAULT_SECTIONS: ReadonlyArray<SectionTime> = [
  { index: 1, start: '08:00', end: '08:45' },
  { index: 2, start: '08:55', end: '09:40' },
  { index: 3, start: '10:00', end: '10:45' },
  { index: 4, start: '10:55', end: '11:40' },
  { index: 5, start: '14:00', end: '14:45' },
  { index: 6, start: '14:55', end: '15:40' },
  { index: 7, start: '16:00', end: '16:45' },
  { index: 8, start: '16:55', end: '17:40' },
  { index: 9, start: '19:00', end: '19:45' },
  { index: 10, start: '19:55', end: '20:40' },
  { index: 11, start: '20:50', end: '21:35' },
  { index: 12, start: '21:45', end: '22:30' },
];

/** 默认节次数 */
export const SECTION_COUNT = DEFAULT_SECTIONS.length;

/**
 * 课程色板 —— 8 组柔和渐变。
 *
 * 为什么是「浅渐变 + 深色文字」而不是高饱和纯色 + 白字：
 * 手机屏上 7 列课表都是大色块，高饱和纯色看久了刺眼；
 * 低饱和的柔和渐变更耐看，但浅底压不住白字，
 * 所以每组色带自己的深色文字（text），渲染时用行内样式覆盖 chip 的默认色。
 * 渐变方向 135deg（左上→右下），和格子的阅读方向一致。
 */
export const COURSE_COLORS: ReadonlyArray<{ value: string; text: string; label: string }> = [
  { value: 'linear-gradient(135deg, #FFD3C2, #FFB5A7)', text: '#7C3B2E', label: '蜜桃粉' },
  { value: 'linear-gradient(135deg, #D9C7F2, #BFA4EC)', text: '#56407E', label: '薰衣草' },
  { value: 'linear-gradient(135deg, #BFE8DA, #93D6C2)', text: '#2E6653', label: '薄荷青' },
  { value: 'linear-gradient(135deg, #FCEAC0, #F7D696)', text: '#775718', label: '奶油黄' },
  { value: 'linear-gradient(135deg, #C4DEF5, #9AC7EE)', text: '#2E567A', label: '天空蓝' },
  { value: 'linear-gradient(135deg, #F8CDDC, #F1A6C2)', text: '#7C3A55', label: '玫瑰粉' },
  { value: 'linear-gradient(135deg, #FFE1BE, #FFC193)', text: '#82501F', label: '杏橙' },
  { value: 'linear-gradient(135deg, #CBD5F5, #A9BCF0)', text: '#39497E', label: '雾紫蓝' },
];

/**
 * 已存数据的颜色 → 文字色。
 * 老版本存的是高饱和纯色（白字可读），新色板是浅渐变（深字可读），
 * 反查不到说明是老数据或外部导入的颜色 —— 返回白色兜底，深底上依然清晰。
 */
export function colorTextOf(value: string): string {
  return COURSE_COLORS.find((c) => c.value === value)?.text ?? '#FFFFFF';
}

/** 单双周选项 */
export const WEEK_PARITY_OPTIONS: ReadonlyArray<{ value: WeekParity; label: string }> = [
  { value: 'all', label: '每周' },
  { value: 'odd', label: '单周' },
  { value: 'even', label: '双周' },
];

/** 各类数量上限 */
export const LIMITS = {
  /** 作息时间表允许的最大节次（硬上限，实际校验用当前 sections.length） */
  MAX_SECTIONS: 16,
  /** 作息时间表允许的最小节次 */
  MIN_SECTIONS: 4,
  MAX_WEEKS: 30,
  MAX_COURSES: 200,
  NAME_MAX: 30,
  TEACHER_MAX: 20,
  LOCATION_MAX: 30,
  NOTE_MAX: 30,
} as const;

/** 首次启动时的空白数据 */
export function createDefaultData(): AppData {
  return {
    version: DATA_VERSION,
    semester: {
      id: 'sem-default',
      name: '2026-2027 学年 秋季学期',
      startDate: '2026-09-07',
      totalWeeks: 20,
    },
    sections: DEFAULT_SECTIONS.map((section) => ({ ...section })),
    courses: [],
    settings: {
      theme: 'light',
      notifyEnabled: false,
      notifyLeadMinutes: 10,
    },
  };
}

/**
 * 示例课表 —— 供空状态下的「载入示例」使用。
 * 返回的是 CourseDraft 数组，写库时再补 id 与时间戳。
 */
export function createSampleCourses(): Array<{
  name: string;
  teacher: string;
  location: string;
  dayOfWeek: Weekday;
  startSection: number;
  endSection: number;
  startWeek: number;
  endWeek: number;
  weekParity: WeekParity;
  color: string;
}> {
  return [
    { name: '高等数学', teacher: '张老师', location: '教 301', dayOfWeek: 1, startSection: 1, endSection: 2, startWeek: 1, endWeek: 16, weekParity: 'all', color: COURSE_COLORS[0].value },
    { name: '大学英语', teacher: '李老师', location: '教 205', dayOfWeek: 2, startSection: 3, endSection: 4, startWeek: 1, endWeek: 16, weekParity: 'all', color: COURSE_COLORS[4].value },
    { name: '数据结构', teacher: '王老师', location: '实验楼 402', dayOfWeek: 3, startSection: 5, endSection: 6, startWeek: 1, endWeek: 16, weekParity: 'all', color: COURSE_COLORS[3].value },
    { name: '软件工程', teacher: '陈老师', location: '教 401', dayOfWeek: 4, startSection: 1, endSection: 2, startWeek: 1, endWeek: 16, weekParity: 'all', color: COURSE_COLORS[1].value },
    { name: '计算机网络', teacher: '刘老师', location: '教 302', dayOfWeek: 5, startSection: 7, endSection: 8, startWeek: 1, endWeek: 16, weekParity: 'all', color: COURSE_COLORS[5].value },
    { name: '体育', teacher: '赵老师', location: '体育馆', dayOfWeek: 2, startSection: 9, endSection: 10, startWeek: 1, endWeek: 16, weekParity: 'all', color: COURSE_COLORS[2].value },
  ];
}
