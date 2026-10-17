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
  { value: "linear-gradient(135deg, #FFD3C2, #FFB5A7)", text: "#7C3B2E", label: "\u871C\u6843\u7C89" },
  { value: "linear-gradient(135deg, #D9C7F2, #BFA4EC)", text: "#56407E", label: "\u85B0\u8863\u8349" },
  { value: "linear-gradient(135deg, #BFE8DA, #93D6C2)", text: "#2E6653", label: "\u8584\u8377\u9752" },
  { value: "linear-gradient(135deg, #FCEAC0, #F7D696)", text: "#775718", label: "\u5976\u6CB9\u9EC4" },
  { value: "linear-gradient(135deg, #C4DEF5, #9AC7EE)", text: "#2E567A", label: "\u5929\u7A7A\u84DD" },
  { value: "linear-gradient(135deg, #F8CDDC, #F1A6C2)", text: "#7C3A55", label: "\u73AB\u7470\u7C89" },
  { value: "linear-gradient(135deg, #FFE1BE, #FFC193)", text: "#82501F", label: "\u674F\u6A59" },
  { value: "linear-gradient(135deg, #CBD5F5, #A9BCF0)", text: "#39497E", label: "\u96FE\u7D2B\u84DD" }
];
var LIMITS = {
  /** 作息时间表允许的最大节次（硬上限，实际校验用当前 sections.length） */
  MAX_SECTIONS: 16,
  /** 作息时间表允许的最小节次 */
  MIN_SECTIONS: 4,
  MAX_WEEKS: 30,
  MAX_COURSES: 200,
  NAME_MAX: 30,
  TEACHER_MAX: 20,
  LOCATION_MAX: 30,
  NOTE_MAX: 30
};

// src/utils/course.ts
function assignColorsByCourseName(drafts) {
  const seen = /* @__PURE__ */ new Map();
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
function isParityMatch(parity, week) {
  if (parity === "all") return true;
  if (parity === "odd") return week % 2 === 1;
  return week % 2 === 0;
}
function isCourseActiveInWeek(course, week) {
  if (week < course.startWeek || week > course.endWeek) return false;
  return isParityMatch(course.weekParity, week);
}
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart <= bEnd && bStart <= aEnd;
}
function parityOverlap(a, b) {
  if (a === "all" || b === "all") return true;
  return a === b;
}
function hasConflict(a, b) {
  if (a.dayOfWeek !== b.dayOfWeek) return false;
  if (!rangesOverlap(a.startSection, a.endSection, b.startSection, b.endSection)) return false;
  if (!rangesOverlap(a.startWeek, a.endWeek, b.startWeek, b.endWeek)) return false;
  return parityOverlap(a.weekParity, b.weekParity);
}
function findConflicts(draft, courses, excludeId) {
  return courses.filter((c) => c.id !== excludeId && hasConflict(draft, c));
}
function buildCellMap(courses, week) {
  const map = /* @__PURE__ */ new Map();
  for (const course of courses) {
    if (!isCourseActiveInWeek(course, week)) continue;
    const span = course.endSection - course.startSection + 1;
    for (let s = course.startSection; s <= course.endSection; s += 1) {
      const key = cellKey(course.dayOfWeek, s);
      if (map.has(key)) continue;
      map.set(key, {
        course,
        isStart: s === course.startSection,
        isEnd: s === course.endSection,
        span
      });
    }
  }
  return map;
}
function cellKey(day, section) {
  return `${day}:${section}`;
}
function getCoursesOfDay(courses, day, week) {
  return courses.filter((c) => c.dayOfWeek === day && isCourseActiveInWeek(c, week)).sort(compareBySection);
}
function compareCourses(a, b) {
  if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
  return compareBySection(a, b);
}
function compareBySection(a, b) {
  if (a.startSection !== b.startSection) return a.startSection - b.startSection;
  return a.name.localeCompare(b.name, "zh-Hans-CN");
}
function sectionRangeLabel(startSection, endSection) {
  if (startSection === endSection) return `\u7B2C${startSection}\u8282`;
  return `\u7B2C${startSection}-${endSection}\u8282`;
}
function weekRangeLabel(startWeek, endWeek, parity) {
  const base = `\u7B2C${startWeek}-${endWeek}\u5468`;
  if (parity === "odd") return `${base}\uFF08\u5355\u5468\uFF09`;
  if (parity === "even") return `${base}\uFF08\u53CC\u5468\uFF09`;
  return base;
}
function validateCourse(draft, courseCount, maxSections) {
  const errors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "\u8BF7\u8F93\u5165\u8BFE\u7A0B\u540D\u79F0";
  else if (name.length > LIMITS.NAME_MAX) errors.name = `\u8BFE\u7A0B\u540D\u79F0\u4E0D\u8D85\u8FC7 ${LIMITS.NAME_MAX} \u4E2A\u5B57`;
  const teacher = draft.teacher.trim();
  if (!teacher) errors.teacher = "\u8BF7\u8F93\u5165\u6559\u5E08\u59D3\u540D";
  else if (teacher.length > LIMITS.TEACHER_MAX) errors.teacher = `\u6559\u5E08\u59D3\u540D\u4E0D\u8D85\u8FC7 ${LIMITS.TEACHER_MAX} \u4E2A\u5B57`;
  const location = draft.location.trim();
  if (!location) errors.location = "\u8BF7\u8F93\u5165\u4E0A\u8BFE\u5730\u70B9";
  else if (location.length > LIMITS.LOCATION_MAX) errors.location = `\u4E0A\u8BFE\u5730\u70B9\u4E0D\u8D85\u8FC7 ${LIMITS.LOCATION_MAX} \u4E2A\u5B57`;
  if (!Number.isInteger(draft.startSection) || !Number.isInteger(draft.endSection) || draft.startSection < 1 || draft.endSection > maxSections || draft.startSection > draft.endSection) {
    errors.section = "\u8282\u6B21\u8303\u56F4\u4E0D\u5408\u6CD5\uFF0C\u7ED3\u675F\u8282\u6B21\u4E0D\u80FD\u65E9\u4E8E\u8D77\u59CB\u8282\u6B21";
  }
  if (!Number.isInteger(draft.startWeek) || !Number.isInteger(draft.endWeek) || draft.startWeek < 1 || draft.endWeek > LIMITS.MAX_WEEKS || draft.startWeek > draft.endWeek) {
    errors.week = "\u5468\u6B21\u8303\u56F4\u4E0D\u5408\u6CD5\uFF0C\u7ED3\u675F\u5468\u4E0D\u80FD\u65E9\u4E8E\u8D77\u59CB\u5468";
  }
  if (courseCount >= LIMITS.MAX_COURSES) {
    errors.limit = `\u8BFE\u7A0B\u6570\u91CF\u5DF2\u8FBE\u4E0A\u9650\uFF08${LIMITS.MAX_COURSES} \u95E8\uFF09`;
  }
  return { valid: Object.keys(errors).length === 0, errors };
}
export {
  assignColorsByCourseName,
  buildCellMap,
  cellKey,
  compareCourses,
  findConflicts,
  getCoursesOfDay,
  hasConflict,
  isCourseActiveInWeek,
  isParityMatch,
  sectionRangeLabel,
  validateCourse,
  weekRangeLabel
};
