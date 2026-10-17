// src/constants.ts
var DEFAULT_SECTIONS = [
  { index: 1, start: "08:00", end: "08:45" },
  { index: 2, start: "08:55", end: "09:40" },
  { index: 3, start: "10:00", end: "10:45" },
  { index: 4, start: "10:55", end: "11:40" },
  { index: 5, start: "14:00", end: "14:45" },
  { index: 6, start: "14:55", end: "15:40" },
  { index: 7, start: "16:00", end: "16:45" },
  { index: 8, start: "16:55", end: "17:40" },
  { index: 9, start: "19:00", end: "19:45" },
  { index: 10, start: "19:55", end: "20:40" },
  { index: 11, start: "20:50", end: "21:35" },
  { index: 12, start: "21:45", end: "22:30" }
];
var SECTION_COUNT = DEFAULT_SECTIONS.length;
var COURSE_COLORS = [
  { value: "#D9534F", label: "\u7816\u7EA2" },
  { value: "#D98324", label: "\u7425\u73C0" },
  { value: "#B8912A", label: "\u9EA6\u9EC4" },
  { value: "#5C8A4A", label: "\u82D4\u7EFF" },
  { value: "#3D7E9A", label: "\u9752\u84DD" },
  { value: "#7E5C86", label: "\u85D5\u7D2B" }
];

// src/utils/date.ts
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
function clamp(value, min, max) {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

// src/utils/importParser.ts
function normalizeLine(line) {
  return line.replace(/[\t\u3000]+/g, " ").replace(/，|、|；|。|．/g, " ").replace(/：/g, ":").replace(/（/g, "(").replace(/）/g, ")").replace(/\s{2,}/g, " ").trim();
}
var WEEKDAY_MAP = {
  \u4E00: 1,
  \u4E8C: 2,
  \u4E09: 3,
  \u56DB: 4,
  \u4E94: 5,
  \u516D: 6,
  \u65E5: 7,
  \u5929: 7
};
var WEEKDAY_RE = /(?:星期|礼拜|周)([一二三四五六日天])/;
function hasWeekday(line) {
  return WEEKDAY_RE.test(line);
}
function takeWeekday(text, record) {
  const match = WEEKDAY_RE.exec(text);
  if (match) {
    record.day = WEEKDAY_MAP[match[1]] ?? null;
    return text.replace(match[0], " ");
  }
  return text;
}
function takeSections(text, record) {
  const match = /第?\s*([\d]+(?:\s*[-–—~至到,，、和]\s*[\d]+)*)\s*(?:大)?节/.exec(text);
  if (!match) return text;
  const numbers = match[1].split(/[-–—~至到,，、和]/).map((part) => Number(part.trim()));
  const valid = numbers.filter((n) => Number.isInteger(n) && n > 0);
  if (valid.length > 0) {
    record.startSection = Math.min(...valid);
    record.endSection = valid.length > 1 ? Math.max(...valid) : record.startSection;
  }
  return text.replace(match[0], " ");
}
function takeWeeks(text, record) {
  const match = /第?\s*([\d]+)\s*[-–—~至到]?\s*([\d]*)\s*周/.exec(text);
  if (match) {
    const start = Number(match[1]);
    const end = match[2] ? Number(match[2]) : start;
    if (Number.isInteger(start) && start > 0 && end >= start) {
      record.startWeek = start;
      record.endWeek = end;
      text = text.replace(match[0], " ");
    }
  }
  const isOdd = /单周|周单|\(单\)|（单）|(?:^|\s)单(?=\s|$)/;
  const isEven = /双周|周双|\(双\)|（双）|(?:^|\s)双(?=\s|$)/;
  if (/单双周/.test(text)) {
    text = text.replace(/单双周/g, " ");
  } else if (isOdd.test(text)) {
    record.parity = "odd";
    text = text.replace(/单周|周单|\(单\)|（单）|(?:^|\s)单(?=\s|$)/g, " ");
  } else if (isEven.test(text)) {
    record.parity = "even";
    text = text.replace(/双周|周双|\(双\)|（双）|(?:^|\s)双(?=\s|$)/g, " ");
  }
  return text;
}
function takeTeacher(text, record) {
  const keyValue = /(?:教师|讲师)\s*[:：]\s*([\u4e00-\u9fa5]{2,4})/.exec(text);
  if (keyValue) {
    record.teacher = keyValue[1];
    return text.replace(keyValue[0], " ");
  }
  const match = /([\u4e00-\u9fa5]{1,4})(?:老师|教授|讲师)/.exec(text);
  if (match) {
    record.teacher = match[1];
    return text.replace(match[0], " ");
  }
  return text;
}
function takeLocation(text, record) {
  const patterns = [
    /[\u4e00-\u9fa5A-Za-z0-9]{0,8}(?:楼|馆|室|场|堂|座)[\u4e00-\u9fa5A-Za-z0-9-]{0,8}/,
    /[\u4e00-\u9fa5]{2,6}(?:学院|校区|书院)[A-Za-z]?\d{2,4}[A-Za-z]?/,
    /\d?\s?教\s?[A-Za-z0-9-]{2,8}(?:多|楼)?/,
    /教\s?\d{2,4}[A-Za-z]?/,
    /[A-Za-z]?\d{1,2}[A-Z]\d{3}/
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(text);
    if (match && match[0].length >= 2) {
      const candidate = match[0].trim();
      if (!/^\d+$/.test(candidate)) {
        record.location = candidate;
        return text.replace(match[0], " ");
      }
    }
  }
  return text;
}
function takeTrailingTeacher(text, record) {
  if (record.teacher) return text;
  const trimmed = text.trim();
  const match = /(\S+)$/.exec(trimmed);
  if (!match) return text;
  const candidate = match[1];
  if (!/^[\u4e00-\u9fa5]{2,6}$/.test(candidate)) return text;
  const head = trimmed.slice(0, match.index).trim();
  const headChinese = (head.match(/[\u4e00-\u9fa5]/g) ?? []).length;
  if (headChinese === 0) return text;
  if (!record.location && headChinese <= candidate.length) return text;
  record.teacher = candidate;
  return head;
}
function takeName(text) {
  const chunks = text.split(/[\s|/|(|)|:：,，。.;；\d]+/).map((chunk) => chunk.trim()).filter((chunk) => /[\u4e00-\u9fa5]/.test(chunk));
  if (chunks.length === 0) return "";
  return chunks.reduce((best, chunk) => chunk.length > best.length ? chunk : best, "");
}
function extractFields(text) {
  const record = {
    day: null,
    startSection: null,
    endSection: null,
    startWeek: null,
    endWeek: null,
    parity: "all",
    teacher: "",
    location: "",
    name: ""
  };
  let rest = normalizeLine(text);
  rest = takeWeekday(rest, record);
  rest = takeWeeks(rest, record);
  rest = takeSections(rest, record);
  rest = takeTeacher(rest, record);
  rest = takeLocation(rest, record);
  rest = takeTrailingTeacher(rest, record);
  record.name = takeName(rest);
  return record;
}
function parseBlock(block, options) {
  const joined = block.join(" ");
  const record = extractFields(joined);
  if (record.day === null) return null;
  const hasName = record.name.length > 0;
  const hasContext = record.startSection !== null && (!!record.teacher || !!record.location);
  if (!hasName && !hasContext) return null;
  const issues = [];
  const defaultEndWeek = Math.min(16, options.totalWeeks);
  const name = record.name || "\u672A\u547D\u540D\u8BFE\u7A0B";
  if (!record.name) issues.push("\u672A\u8BC6\u522B\u5230\u8BFE\u7A0B\u540D");
  const startSection = record.startSection ?? 1;
  let endSection = record.endSection ?? startSection;
  if (record.startSection === null) {
    issues.push("\u672A\u8BC6\u522B\u5230\u8282\u6B21\uFF0C\u5DF2\u9ED8\u8BA4\u7B2C 1-2 \u8282");
    endSection = Math.min(2, options.maxSections);
  }
  if (endSection > options.maxSections) {
    issues.push(`\u8282\u6B21\u8D85\u51FA\u5F53\u524D\u4F5C\u606F\uFF08\u5171 ${options.maxSections} \u8282\uFF09\uFF0C\u5DF2\u6309\u4E0A\u9650\u622A\u65AD`);
    endSection = options.maxSections;
  }
  const clampedStart = clamp(startSection, 1, options.maxSections);
  const clampedEnd = clamp(endSection, clampedStart, options.maxSections);
  const startWeek = record.startWeek ?? 1;
  const endWeek = record.endWeek ?? defaultEndWeek;
  if (record.startWeek === null) {
    issues.push(`\u672A\u8BC6\u522B\u5230\u5468\u6B21\uFF0C\u5DF2\u9ED8\u8BA4\u7B2C 1-${defaultEndWeek} \u5468`);
  }
  if (!record.teacher) issues.push("\u672A\u8BC6\u522B\u5230\u6559\u5E08");
  if (!record.location) issues.push("\u672A\u8BC6\u522B\u5230\u5730\u70B9");
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
      color: COURSE_COLORS[0].value,
      // 颜色在批量导入时按序分配，这里只是占位
      note: ""
    },
    issues,
    source: block.map((line) => line.trim()).filter(Boolean).join(" / ")
  };
}
function parseScheduleText(input, options) {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  const courses = [];
  const unmatched = [];
  const buffer = [];
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
    if (buffer.length > 0 && hasWeekday(buffer.join(" ")) && hasWeekday(normalized)) {
      flush();
    }
    buffer.push(normalized);
  }
  flush();
  const seen = /* @__PURE__ */ new Set();
  const deduped = [];
  for (const item of courses) {
    const key = `${item.draft.name}|${item.draft.dayOfWeek}|${item.draft.startSection}|${item.draft.startWeek}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return { courses: deduped, unmatched };
}
function looksLikeJson(text) {
  const trimmed = text.trim();
  return (trimmed.startsWith("{") || trimmed.startsWith("[")) && /"courses"/.test(trimmed);
}
export {
  looksLikeJson,
  parseScheduleText
};
