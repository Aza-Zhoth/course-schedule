import { Text, View } from '@tarojs/components';
import { Fragment, memo, useMemo } from 'react';
import { colorTextOf, WEEKDAYS } from '../constants';
import type { CellInfo, Course, SectionTime, Weekday } from '../types';
import { cellKey, sectionRangeLabel } from '../utils/course';
import { dateOfWeekday } from '../utils/date';

interface WeekGridProps {
  cellMap: Map<string, CellInfo>;
  /** 全校作息表 —— 各校节次数与时间不同，由「我的 → 节次作息」配置 */
  sections: SectionTime[];
  startDate: string;
  viewWeek: number;
  /** 仅当正在查看的周就是当前周时才高亮今天，否则传 null */
  todayWeekday: Weekday | null;
  onSelectCourse: (course: Course) => void;
  onCreateAt: (day: Weekday, section: number) => void;
}

/**
 * 渲染计划里的一格：
 * - `undefined` —— 已被上方跨节次课程盖住，**不渲染**（占位交给那个跨行元素）
 * - `null` —— 空格子，点击可新增课程
 * - `CellInfo` —— 有课，交给 Slot 渲染（可能跨多个节次行）
 */
type Cell = CellInfo | null | undefined;

export function WeekGrid({
  cellMap,
  sections,
  startDate,
  viewWeek,
  todayWeekday,
  onSelectCourse,
  onCreateAt,
}: WeekGridProps) {
  // 每个星期对应的日期号，如周一 → 7
  const dayNumbers = useMemo(
    () =>
      WEEKDAYS.map((day) => dateOfWeekday(startDate, viewWeek, day.value).getDate()),
    [startDate, viewWeek],
  );

  /**
   * 预先算好每一行要渲染什么。
   *
   * 为什么要预先算：一门跨节次的课（比如第 1-2 节）不再拆成两个格子各渲染一个小方块，
   * 而是**只渲染起始节次那一个元素**，用 `grid-row: span N` 让它纵跨 N 个节次行。
   * 网格的 row-gap 会被算进这个元素的高度里，于是整门课是一块连续色块，
   * 中间不会再有网格缝隙 —— 这就是「同一节课的方块不隔开」。
   *
   * 代价是被它盖住的那几格必须跳过（返回 undefined），
   * 否则那些占位元素会被排到后面去，整行错位。
   */
  const rows = useMemo(() => {
    const covered = new Set<string>();
    return sections.map((section) =>
      WEEKDAYS.map<Cell>((day) => {
        const key = cellKey(day.value, section.index);
        if (covered.has(key)) return undefined;

        const info = cellMap.get(key);
        if (!info) return null;

        for (let s = section.index + 1; s <= info.course.endSection; s += 1) {
          covered.add(cellKey(day.value, s));
        }
        return info;
      }),
    );
  }, [sections, cellMap]);

  return (
    <View className="schedule">
      <View className="schedule__grid">
        {/* 左上角占位，让 7 个星期表头对齐到正确的列 */}
        <View aria-hidden="true" />

        {WEEKDAYS.map((day, index) => {
          const isToday = todayWeekday === day.value;
          return (
            <View
              key={day.value}
              className={`schedule__day${isToday ? ' schedule__day--today' : ''}`}
            >
              <Text className="schedule__day-short">{day.short}</Text>
              <Text className="schedule__day-num">{dayNumbers[index]}</Text>
            </View>
          );
        })}

        {sections.map((section, rowIndex) => {
          const row = rows[rowIndex] ?? [];
          return (
            <Fragment key={section.index}>
              {/* 迁移说明：原来带 title 属性做悬浮提示，小程序不支持 title，去掉了 */}
              <View className="schedule__section">
                <Text className="schedule__section-num">{section.index}</Text>
                <Text className="schedule__section-time">{section.start.slice(0, 5)}</Text>
              </View>

              {WEEKDAYS.map((day, colIndex) => {
                const cell = row[colIndex];
                // 被上方跨节次课程盖住 —— 不渲染，网格会自动跳过被占的格
                if (cell === undefined) return null;

                const key = `${day.value}-${section.index}`;

                if (cell === null) {
                  return (
                    <View
                      key={key}
                      className="slot slot--empty"
                      onClick={() => onCreateAt(day.value, section.index)}
                      aria-label={`在${day.label}第 ${section.index} 节添加课程`}
                    />
                  );
                }

                return (
                  <Slot key={key} info={cell} dayLabel={day.label} onSelect={onSelectCourse} />
                );
              })}
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

/* -------------------------------------------------------------------------- */

interface SlotProps {
  info: CellInfo;
  dayLabel: string;
  onSelect: (course: Course) => void;
}

/**
 * 单个课程方块。
 *
 * 跨节次的课程用 `grid-row: span N` 让这一个元素纵跨 N 个节次行 ——
 * 网格的 row-gap 被算在元素高度内，整门课因此是一块**连续色块**。
 * 副作用是块变高了，所以合并块里能把教师也带上；单节次格子只有 42px 高，放不下。
 */
const Slot = memo(function Slot({ info, dayLabel, onSelect }: SlotProps) {
  const { course, span } = info;
  const isBlock = span > 1;
  const hasParity = course.weekParity !== 'all';

  const label = `${course.name}，${dayLabel}${sectionRangeLabel(
    course.startSection,
    course.endSection,
  )}，地点 ${course.location}，教师 ${course.teacher}`;

  return (
    /* 行内 style 里的 `span N` 不含 px，不会被 Taro 的 pxTransform 改写 */
    <View className="slot" style={isBlock ? { gridRow: `span ${span}` } : undefined}>
      <View
        className={`slot__chip${isBlock ? ' slot__chip--block' : ''}${
          hasParity ? ' slot__chip--parity' : ''
        }`}
        style={{ background: course.color, color: colorTextOf(course.color) }}
        onClick={() => onSelect(course)}
        aria-label={label}
      >
        <Text className="slot__name">{course.name}</Text>
        <Text className="slot__meta">{course.location}</Text>
        {isBlock && <Text className="slot__teacher">{course.teacher}</Text>}
        {hasParity && (
          <Text className="slot__parity">{course.weekParity === 'odd' ? '单' : '双'}</Text>
        )}
      </View>
    </View>
  );
});
