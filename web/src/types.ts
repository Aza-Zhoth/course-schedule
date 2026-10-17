/**
 * 全局类型定义 —— 对应需求文档 §3.2 数据模型。
 */

/** 星期序号：1 = 周一 … 7 = 周日 */
export type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 单双周：每周 / 单周 / 双周 */
export type WeekParity = 'all' | 'odd' | 'even';

/** 主题模式 */
export type ThemeMode = 'light' | 'dark';

/** 一节课的作息时间，如第 1 节 08:00 - 08:45 */
export interface SectionTime {
  index: number;
  /** 开始时间，格式 HH:mm */
  start: string;
  /** 结束时间，格式 HH:mm */
  end: string;
}

/** 底部导航的四个一级页面 */
export type TabKey = 'week' | 'today' | 'library' | 'settings';

/**
 * 课程 —— 一条排课记录，语义是「每周这天这几节，在这些周次里上课」。
 * 注意：不存储每一节具体的课，具体课次由 Course + 当前周次在运行时派生。
 */
export interface Course {
  id: string;
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
  note?: string;
  createdAt: string;
  updatedAt: string;
}

/** 表单产出的数据：还没有 id 与时间戳 */
export type CourseDraft = Omit<Course, 'id' | 'createdAt' | 'updatedAt'>;

/** 学期 —— 全局唯一，用于推算当前周与周次范围 */
export interface Semester {
  id: string;
  name: string;
  /** 学期第一周的周一，格式 YYYY-MM-DD */
  startDate: string;
  totalWeeks: number;
}

/** 全校作息时间表 —— 不同学校节次数与上下课时间不同，因此做成数据而非常量 */
export type Sections = SectionTime[];

/** 用户偏好 */
export interface AppSettings {
  theme: ThemeMode;
  notifyEnabled: boolean;
  notifyLeadMinutes: number;
}

/** 应用数据根节点 —— 同时也是导出 / 导入的 JSON 结构 */
export interface AppData {
  version: number;
  semester: Semester;
  /** 作息时间表。v3 起从常量迁入数据，各校可自行调整 */
  sections: SectionTime[];
  courses: Course[];
  settings: AppSettings;
}

/** 字段级校验错误 */
export type FieldError =
  | 'name'
  | 'teacher'
  | 'location'
  | 'section'
  | 'week'
  | 'limit';

/** 表单校验结果 */
export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<FieldError, string>>;
}

/** 课表格子的信息：这个格子里是哪门课，以及它是这门课的第几节 */
export interface CellInfo {
  course: Course;
  /** 是否为该课程的起始节次（只有起始格显示课程名） */
  isStart: boolean;
  /** 是否为该课程的结束节次 */
  isEnd: boolean;
  /** 该课程共占几节 */
  span: number;
}
