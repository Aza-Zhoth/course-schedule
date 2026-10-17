import { COURSE_COLORS } from '../constants';
import type { CourseDraft, WeekParity, Weekday } from '../types';
import { clamp } from './date';

/**
 * 智能导入文字解析器（需求文档 §3.4 F12）。
 *
 * 设计目标：教务系统复制的文字、截图 OCR 出来的杂乱文本、微信里转发的时间安排，
 * 只要每「条」信息里能认出 星期 + 节次（或课程名），就尽量抽出来，
 * 抽不出的字段填默认值并在 issues 里说明 —— 导入前有预览确认兜底，
 * 解析器追求「宁可多猜、让人核对」，而不是「猜不准就整条丢弃」。
 *
 * 这是纯函数模块：不碰 DOM、不碰存储，方便单独测试与将来复用到小程序端。
 */

/** 一条解析出来的候选课程 */
export interface ParsedCourse {
  /** 可直接进入批量导入的草稿（颜色已按序分配） */
  draft: CourseDraft;
  /** 解析时做的假设，如「未识别到节次，已默认第 1-2 节」 */
  issues: string[];
  /** 解析这段内容用到的原始行，预览时展示给用户核对 */
  source: string;
}

export interface ParseOptions {
  /** 当前作息表的节次数 */
  maxSections: number;
  /** 学期总周数 */
  totalWeeks: number;
}

export interface ParseResult {
  courses: ParsedCourse[];
  /** 完全认不出来的行，原样还给用户 */
  unmatched: string[];
}

/* ------------------------------------------------------------------ *
 * 文本规范化
 * ------------------------------------------------------------------ */

/** 全角标点 / 特殊空白 → 半角，方便后面统一用一套正则处理 */
function normalizeLine(line: string): string {
  return line
    .replace(/[\t\u3000]+/g, ' ')
    .replace(/，|、|；|。|．/g, ' ')
    .replace(/：/g, ':')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const WEEKDAY_MAP: Record<string, Weekday> = {
  一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7,
};

/** 星期字样：周X / 星期X / 礼拜X。注意不能误吞「第3周」「单周」这类周次写法 */
const WEEKDAY_RE = /(?:星期|礼拜|周)([一二三四五六日天])/;

/** 是否含有星期字样（不去除，只探测，用于分块） */
function hasWeekday(line: string): boolean {
  return WEEKDAY_RE.test(line);
}

/* ------------------------------------------------------------------ *
 * 字段抽取
 *
 * 每个抽取器都遵循同一个约定：命中后把命中的片段替换成空格（“消费”），
 * 这样后续抽取器不会重复读到同一段文字，最后剩下的就是课程名候选。
 * ------------------------------------------------------------------ */

interface RawRecord {
  day: Weekday | null;
  startSection: number | null;
  endSection: number | null;
  startWeek: number | null;
  endWeek: number | null;
  parity: WeekParity;
  teacher: string;
  location: string;
  name: string;
}

/** 抽星期。返回消费后的剩余文本 */
function takeWeekday(text: string, record: RawRecord): string {
  const match = WEEKDAY_RE.exec(text);
  if (match) {
    record.day = WEEKDAY_MAP[match[1]] ?? null;
    return text.replace(match[0], ' ');
  }
  return text;
}

/**
 * 抽数次。支持的写法：
 * 第1-2节 / 1-2节 / 第1,2节 / 第1、2节 / 第3节 / 3节 / 第1-2大节
 */
function takeSections(text: string, record: RawRecord): string {
  const match = /第?\s*([\d]+(?:\s*[-–—~至到,，、和]\s*[\d]+)*)\s*(?:大)?节/.exec(text);
  if (!match) return text;

  const numbers = match[1].split(/[-–—~至到,，、和]/).map((part) => Number(part.trim()));
  const valid = numbers.filter((n) => Number.isInteger(n) && n > 0);
  if (valid.length > 0) {
    record.startSection = Math.min(...valid);
    // 只写一个数（如「第3节」）时，start 与 end 相同，由调用方决定默认连堂数
    record.endSection = valid.length > 1 ? Math.max(...valid) : record.startSection;
  }
  return text.replace(match[0], ' ');
}

/** 抽周次。支持 1-16周 / 第1-16周 / 1~16周 / 第3周，以及单周 / 双周修饰 */
function takeWeeks(text: string, record: RawRecord): string {
  const match = /第?\s*([\d]+)\s*[-–—~至到]?\s*([\d]*)\s*周/.exec(text);
  if (match) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (Number.isInteger(start) && start > 0 && end >= start) {
      record.startWeek = start;
      record.endWeek = end;
      text = text.replace(match[0], ' ');
    }
  }

  /* 单双周的写法比想象中杂：单周 / 周单 / (单) / 1-15周单。
     最后那种最坑 —— 上一行把「1-15周」连「周」一起消费掉了，
     留给这里的只有孤零零一个「单」字，所以必须认「独立成词的单个单/双」。
     用空白边界限定，避免误伤「单页应用」「双碳政策」这类课程名。 */
  const isOdd = /单周|周单|\(单\)|（单）|(?:^|\s)单(?=\s|$)/;
  const isEven = /双周|周双|\(双\)|（双）|(?:^|\s)双(?=\s|$)/;

  if (/单双周/.test(text)) {
    // 「单双周」表示两种都上 = 每周
    text = text.replace(/单双周/g, ' ');
  } else if (isOdd.test(text)) {
    record.parity = 'odd';
    text = text.replace(/单周|周单|\(单\)|（单）|(?:^|\s)单(?=\s|$)/g, ' ');
  } else if (isEven.test(text)) {
    record.parity = 'even';
    text = text.replace(/双周|周双|\(双\)|（双）|(?:^|\s)双(?=\s|$)/g, ' ');
  }
  return text;
}

/** 抽教师：XX老师 / X老师 / XX教授；也兼容「教师:张三」的键值写法（必须带冒号，避免误吞后文） */
function takeTeacher(text: string, record: RawRecord): string {
  const keyValue = /(?:教师|讲师)\s*[:：]\s*([\u4e00-\u9fa5]{2,4})/.exec(text);
  if (keyValue) {
    record.teacher = keyValue[1];
    return text.replace(keyValue[0], ' ');
  }
  const match = /([\u4e00-\u9fa5]{1,4})(?:老师|教授|讲师)/.exec(text);
  if (match) {
    record.teacher = match[1];
    return text.replace(match[0], ' ');
  }
  return text;
}

/**
 * 抽地点。启发式，按优先级依次尝试：
 *   ① 含「楼/馆/室/场/堂/座」的连续片段
 *   ② 「X学院/校区 + 门牌」，如 人计学院B406 —— 字母在数字前，⑤ 覆盖不到
 *   ③ 「X教 + 门牌」，如 1教1A211多 / 2教C301（教务系统最常见的教室编号）
 *   ④ 「教 + 门牌」，如 教301
 *   ⑤ 纯字母数字门牌，如 1B421 / 1A211
 * 顺序很重要：②③ 必须排在 ⑤ 前面，否则「人计学院B406」会被 ⑤ 只抠出半个，
 * 剩下的「人计学院B」反而比课程名长，会被 takeName 当成课程名（真实踩过的坑）。
 */
function takeLocation(text: string, record: RawRecord): string {
  const patterns = [
    /[\u4e00-\u9fa5A-Za-z0-9]{0,8}(?:楼|馆|室|场|堂|座)[\u4e00-\u9fa5A-Za-z0-9-]{0,8}/,
    /[\u4e00-\u9fa5]{2,6}(?:学院|校区|书院)[A-Za-z]?\d{2,4}[A-Za-z]?/,
    /\d?\s?教\s?[A-Za-z0-9-]{2,8}(?:多|楼)?/,
    /教\s?\d{2,4}[A-Za-z]?/,
    /[A-Za-z]?\d{1,2}[A-Z]\d{3}/,
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[0].length >= 2) {
      const candidate = match[0].trim();
      // 防止把「第3周 教…」之类的数字段误认；地点至少要有一个非纯数字字符
      if (!/^\d+$/.test(candidate)) {
        record.location = candidate;
        return text.replace(match[0], ' ');
      }
    }
  }
  return text;
}

/**
 * 抽教师（位置规则，兜底）。
 *
 * 教务系统导出的文本里，教师名往往既没有「老师/教授」后缀，也没有「教师:」前缀，
 * 就是两三个光秃秃的字排在行尾 —— 光看内容认不出来，只能靠位置：
 * 前面几轮把星期、周次、节次、地点都消费掉之后，行尾如果还剩一个 2~6 字的纯中文词，
 * 就认定它是教师名。
 *
 * 两道保险，避免把课程名劈成教师：
 *   ① 候选人必须「独立成词」—— 用空白边界取最后一个 token，而不是从字符流里猜边界
 *      （「密码学与信息安全基础」这种长名用字符流切会被切成「信息安全基础」）；
 *   ② 没识别到地点时更保守，要求前面剩下的中文严格多于候选人，
 *      否则「物联网与智能控制」这样的单个课程名会被从中间劈开。
 */
function takeTrailingTeacher(text: string, record: RawRecord): string {
  // 前面几轮已经用「XX老师 / 教师:XX」这种显式写法认出教师了，就别再靠位置猜
  if (record.teacher) return text;

  const trimmed = text.trim();
  const match = /(\S+)$/.exec(trimmed);
  if (!match) return text;

  const candidate = match[1];
  // 纯中文、2~6 字 —— 超出这个范围基本不是姓名（也顺手排除掉含数字/字母的残留）
  if (!/^[\u4e00-\u9fa5]{2,6}$/.test(candidate)) return text;

  const head = trimmed.slice(0, match.index).trim();
  const headChinese = (head.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  // 前面什么都不剩，说明整行原本只有一个词 —— 那是课程名，不是「课程名 + 姓名」。
  // 例：「体育 周一 第3-4节 1-16周 体育馆」抽掉地点后只剩「体育」，不能当成教师。
  if (headChinese === 0) return text;
  // 一个地点都没抠出来时，这行未必是「有结构的完整记录」，保守一点：
  // 要求前面的中文严格多于候选人，避免把「物联网与智能控制」这类长课程名从中间劈开
  if (!record.location && headChinese <= candidate.length) return text;

  record.teacher = candidate;
  return head;
}

/** 从剩余文本里挑课程名：取含中文名的最长连续片段 */
function takeName(text: string): string {
  const chunks = text
    .split(/[\s|/|(|)|:：,，。.;；\d]+/)
    .map((chunk) => chunk.trim())
    .filter((chunk) => /[\u4e00-\u9fa5]/.test(chunk));
  if (chunks.length === 0) return '';
  return chunks.reduce((best, chunk) => (chunk.length > best.length ? chunk : best), '');
}

/** 对“已经合并成一条”的文本做字段抽取 */
function extractFields(text: string): RawRecord {
  const record: RawRecord = {
    day: null,
    startSection: null,
    endSection: null,
    startWeek: null,
    endWeek: null,
    parity: 'all',
    teacher: '',
    location: '',
    name: '',
  };

  let rest = normalizeLine(text);
  rest = takeWeekday(rest, record);
  rest = takeWeeks(rest, record);
  rest = takeSections(rest, record);
  rest = takeTeacher(rest, record); // 显式写法：「XX老师」「教师:XX」
  rest = takeLocation(rest, record); // 必须排在尾部姓名规则之前 —— 它决定了后者敢不敢下判断
  rest = takeTrailingTeacher(rest, record); // 位置写法：行尾裸姓名
  record.name = takeName(rest);

  return record;
}

/* ------------------------------------------------------------------ *
 * 分块策略
 *
 * 1. 单独一行就能解析出「星期 + 课程名」的，直接成一条记录；
 * 2. 解析不出的行进入缓冲区，缓冲区里一旦已经出现星期、当前行又带来新的星期，
 *    说明上一块结束、下一块开始，先冲刷缓冲区（应对多行块连排）；
 * 3. 其余情况持续累积，遇到下一条独立记录或文本结束时冲刷。
 *
 * 这样既支持「一行一门课」的紧凑格式，也支持
 * 「课程名一行、时间一行、地点一行」的多行块格式。
 * ------------------------------------------------------------------ */

function parseBlock(block: string[], options: ParseOptions): ParsedCourse | null {
  const joined = block.join(' ');
  const record = extractFields(joined);

  // 星期是硬门槛：认不出星期的一条信息没法落到周课表上
  if (record.day === null) return null;

  // 只有「星期 + 节次」却既没有课程名、也没有教师或地点的，
  // 更像多行块中间的续行（如「周二 第3-4节」），交给分块缓冲去合并，不当独立记录
  const hasName = record.name.length > 0;
  const hasContext = record.startSection !== null && (!!record.teacher || !!record.location);
  if (!hasName && !hasContext) return null;

  const issues: string[] = [];
  const defaultEndWeek = Math.min(16, options.totalWeeks);

  const name = record.name || '未命名课程';
  if (!record.name) issues.push('未识别到课程名');

  const startSection = record.startSection ?? 1;
  let endSection = record.endSection ?? startSection;
  if (record.startSection === null) {
    issues.push('未识别到节次，已默认第 1-2 节');
    endSection = Math.min(2, options.maxSections);
  }
  if (endSection > options.maxSections) {
    issues.push(`节次超出当前作息（共 ${options.maxSections} 节），已按上限截断`);
    endSection = options.maxSections;
  }
  const clampedStart = clamp(startSection, 1, options.maxSections);
  const clampedEnd = clamp(endSection, clampedStart, options.maxSections);

  const startWeek = record.startWeek ?? 1;
  const endWeek = record.endWeek ?? defaultEndWeek;
  if (record.startWeek === null) {
    issues.push(`未识别到周次，已默认第 1-${defaultEndWeek} 周`);
  }

  if (!record.teacher) issues.push('未识别到教师');
  if (!record.location) issues.push('未识别到地点');

  return {
    draft: {
      name: name.slice(0, 30),
      teacher: record.teacher.slice(0, 20),
      location: record.location.slice(0, 30),
      dayOfWeek: record.day,
      startSection: clampedStart,
      endSection: clampedEnd,
      startWeek: clamp(startWeek, 1, options.totalWeeks),
      endWeek: clamp(endWeek, clamp(startWeek, 1, options.totalWeeks), options.totalWeeks),
      weekParity: record.parity,
      color: COURSE_COLORS[0].value, // 颜色在批量导入时按序分配，这里只是占位
      note: '',
    },
    issues,
    source: block.map((line) => line.trim()).filter(Boolean).join(' / '),
  };
}

/** 解析任意格式的课表文本 */
export function parseScheduleText(input: string, options: ParseOptions): ParseResult {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const courses: ParsedCourse[] = [];
  const unmatched: string[] = [];
  const buffer: string[] = [];

  const flush = () => {
    if (buffer.length === 0) return;
    const parsed = parseBlock(buffer, options);
    if (parsed) courses.push(parsed);
    else unmatched.push(...buffer);
    buffer.length = 0;
  };

  for (const line of lines) {
    const normalized = normalizeLine(line);
    const single = parseBlock([normalized], options);

    if (single) {
      flush();
      courses.push(single);
      continue;
    }

    // 缓冲区里已有星期、这行又带来新星期 → 上一块该收尾了
    if (buffer.length > 0 && hasWeekday(buffer.join(' ')) && hasWeekday(normalized)) {
      flush();
    }
    buffer.push(normalized);
  }
  flush();

  // 同名同天同节的重复条目只保留第一条（OCR 常见重复行）
  const seen = new Set<string>();
  const deduped: ParsedCourse[] = [];
  for (const item of courses) {
    const key = `${item.draft.name}|${item.draft.dayOfWeek}|${item.draft.startSection}|${item.draft.startWeek}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  return { courses: deduped, unmatched };
}

/** 这段文本像不像应用导出的 JSON（交给 normalizeData 走结构化导入） */
export function looksLikeJson(text: string): boolean {
  const trimmed = text.trim();
  return (trimmed.startsWith('{') || trimmed.startsWith('[')) && /"courses"/.test(trimmed);
}
