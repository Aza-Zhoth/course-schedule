import { Input, Picker, Text, View } from '@tarojs/components';
import { useEffect, useState } from 'react';
import { COURSE_COLORS, LIMITS, WEEKDAYS, WEEK_PARITY_OPTIONS } from '../constants';
import type { Course, CourseDraft, SectionTime, ValidationResult, Weekday } from '../types';
import { validateCourse } from '../utils/course';
import { clamp } from '../utils/date';
import { CloseIcon } from './Icons';

interface CourseFormModalProps {
  open: boolean;
  /** 非空 = 编辑模式 */
  editing: Course | null;
  defaults: { dayOfWeek: Weekday; startSection: number } | null;
  totalWeeks: number;
  /** 全校作息表 —— 节次选项与校验上限都由它决定 */
  sections: SectionTime[];
  courseCount: number;
  onSubmit: (draft: CourseDraft) => void;
  onClose: () => void;
}

/** 依据「编辑对象」或「空白格的预填值」生成初始草稿 */
function makeDraft(
  editing: Course | null,
  defaults: CourseFormModalProps['defaults'],
  totalWeeks: number,
  sectionCount: number,
  courseCount: number,
): CourseDraft {
  if (editing) {
    return {
      name: editing.name,
      teacher: editing.teacher,
      location: editing.location,
      dayOfWeek: editing.dayOfWeek,
      startSection: editing.startSection,
      endSection: editing.endSection,
      startWeek: editing.startWeek,
      endWeek: editing.endWeek,
      weekParity: editing.weekParity,
      color: editing.color,
      note: editing.note ?? '',
    };
  }

  const section = defaults?.startSection ?? 1;
  return {
    name: '',
    teacher: '',
    location: '',
    dayOfWeek: defaults?.dayOfWeek ?? 1,
    startSection: section,
    endSection: Math.min(section + 1, sectionCount),
    startWeek: 1,
    endWeek: Math.min(16, totalWeeks),
    weekParity: 'all',
    // 新建课程默认色按已有课程数轮转，避免每门新建的课都撞同一色
    color: COURSE_COLORS[courseCount % COURSE_COLORS.length].value,
    note: '',
  };
}

export function CourseFormModal({
  open,
  editing,
  defaults,
  totalWeeks,
  sections,
  courseCount,
  onSubmit,
  onClose,
}: CourseFormModalProps) {
  const sectionCount = sections.length;
  const [draft, setDraft] = useState<CourseDraft>(() =>
    makeDraft(editing, defaults, totalWeeks, sectionCount, courseCount),
  );
  const [errors, setErrors] = useState<ValidationResult['errors']>({});

  // 每次打开都重置为最新的初始草稿，避免上一轮编辑的残留数据串进来
  useEffect(() => {
    if (!open) return;
    setDraft(makeDraft(editing, defaults, totalWeeks, sectionCount, courseCount));
    setErrors({});
  }, [open, editing, defaults, totalWeeks, sectionCount, courseCount]);

  // 迁移说明：H5 版用 window.addEventListener('keydown') 监听 Esc 关窗，
  // 小程序没有物理键盘也没有 window，这段整块删掉了。

  if (!open) return null;

  const isEditing = editing !== null;

  const patch = (next: Partial<CourseDraft>) => {
    setDraft((prev) => ({ ...prev, ...next }));
  };

  /**
   * 迁移说明：H5 版是 <View onSubmit> 触发的，靠 event.preventDefault() 阻止默认提交。
   * 小程序没有 form 的提交语义，改成由「保存」按钮直接调这个方法。
   */
  const handleSubmit = () => {
    const result = validateCourse(draft, isEditing ? courseCount - 1 : courseCount, sectionCount);
    setErrors(result.errors);
    if (!result.valid) return;

    onSubmit(draft);
  };

  // 节次下拉的候选项与当前选中项
  const sectionLabels = sections.map((section) => `第${section.index}节 ${section.start}`);
  const weekdayLabels = WEEKDAYS.map((day) => day.label);
  const parityLabels = WEEK_PARITY_OPTIONS.map((option) => option.label);

  const weekdayIndex = Math.max(
    0,
    WEEKDAYS.findIndex((day) => day.value === draft.dayOfWeek),
  );
  const parityIndex = Math.max(
    0,
    WEEK_PARITY_OPTIONS.findIndex((option) => option.value === draft.weekParity),
  );

  return (
    <View className="modal">
      {/* 遮罩独立成一层：小程序的事件对象没有可比对的 DOM 节点，
          原来那种 event.target === event.currentTarget 判断在这里是失效的 */}
      <View className="modal__mask" onClick={onClose} />

      <View className="modal__sheet" aria-label={isEditing ? '编辑课程' : '添加课程'}>
        <View className="modal__head">
          <Text className="modal__title">{isEditing ? '编辑课程' : '添加课程'}</Text>
          <View className="modal__close" onClick={onClose} aria-label="关闭">
            <CloseIcon size={17} />
          </View>
        </View>

        <View className="modal__body">
          <View className="form">
            {/* 课程名 */}
            <View className="field">
              <Text className="field__label">
                课程名<Text className="field__required">*</Text>
              </Text>
              <Input
                className={`field__input${errors.name ? ' field__input--error' : ''}`}
                type="text"
                value={draft.name}
                maxlength={LIMITS.NAME_MAX}
                placeholderClass="input-placeholder"
                placeholder="如：高等数学"
                onInput={(event) => patch({ name: event.detail.value })}
              />
              {errors.name && <Text className="field__error">{errors.name}</Text>}
            </View>

            {/* 教师 + 地点 */}
            <View className="form__row">
              <View className="field">
                <Text className="field__label">
                  教师<Text className="field__required">*</Text>
                </Text>
                <Input
                  className={`field__input${errors.teacher ? ' field__input--error' : ''}`}
                  type="text"
                  value={draft.teacher}
                  maxlength={LIMITS.TEACHER_MAX}
                  placeholderClass="input-placeholder"
                  placeholder="如：张老师"
                  onInput={(event) => patch({ teacher: event.detail.value })}
                />
                {errors.teacher && <Text className="field__error">{errors.teacher}</Text>}
              </View>

              <View className="field">
                <Text className="field__label">
                  地点<Text className="field__required">*</Text>
                </Text>
                <Input
                  className={`field__input${errors.location ? ' field__input--error' : ''}`}
                  type="text"
                  value={draft.location}
                  maxlength={LIMITS.LOCATION_MAX}
                  placeholderClass="input-placeholder"
                  placeholder="如：教 301"
                  onInput={(event) => patch({ location: event.detail.value })}
                />
                {errors.location && <Text className="field__error">{errors.location}</Text>}
              </View>
            </View>

            {/* 星期 + 单双周 */}
            <View className="form__row">
              <View className="field">
                <Text className="field__label">
                  星期<Text className="field__required">*</Text>
                </Text>
                {/* 迁移说明：原先是原生 <select>，小程序里没有这个元素，
                    统一换成 Picker。注意 Picker 的 value 是「第几项」而不是「选项的值」，
                    所以这里要做一次下标换算，否则选出来的星期会整体错位。 */}
                <Picker
                  mode="selector"
                  range={weekdayLabels}
                  value={weekdayIndex}
                  onChange={(event) => {
                    const day = WEEKDAYS[Number(event.detail.value)];
                    if (day) patch({ dayOfWeek: day.value });
                  }}
                >
                  <View className="field__select"><Text>{weekdayLabels[weekdayIndex]}</Text></View>
                </Picker>
              </View>

              <View className="field">
                <Text className="field__label">单双周</Text>
                <Picker
                  mode="selector"
                  range={parityLabels}
                  value={parityIndex}
                  onChange={(event) => {
                    const option = WEEK_PARITY_OPTIONS[Number(event.detail.value)];
                    if (option) patch({ weekParity: option.value });
                  }}
                >
                  <View className="field__select"><Text>{parityLabels[parityIndex]}</Text></View>
                </Picker>
              </View>
            </View>

            {/* 节次 */}
            <View className="form__row">
              <View className="field">
                <Text className="field__label">
                  起始节次<Text className="field__required">*</Text>
                </Text>
                <Picker
                  mode="selector"
                  range={sectionLabels}
                  value={Math.max(0, draft.startSection - 1)}
                  onChange={(event) => {
                    const next = clamp(Number(event.detail.value) + 1, 1, sectionCount);
                    // 起始节次后移超过结束节次时，自动把结束节次一起带上
                    patch(next > draft.endSection ? { startSection: next, endSection: next } : { startSection: next });
                  }}
                >
                  <View className={`field__select${errors.section ? ' field__select--error' : ''}`}>
                    <Text>{sectionLabels[draft.startSection - 1] ?? '请选择'}</Text></View>
                </Picker>
              </View>

              <View className="field">
                <Text className="field__label">
                  结束节次<Text className="field__required">*</Text>
                </Text>
                <Picker
                  mode="selector"
                  range={sectionLabels}
                  value={Math.max(0, draft.endSection - 1)}
                  onChange={(event) => {
                    const next = clamp(Number(event.detail.value) + 1, 1, sectionCount);
                    patch(next < draft.startSection ? { endSection: next, startSection: next } : { endSection: next });
                  }}
                >
                  <View className={`field__select${errors.section ? ' field__select--error' : ''}`}>
                    <Text>{sectionLabels[draft.endSection - 1] ?? '请选择'}</Text></View>
                </Picker>
              </View>
            </View>

            {errors.section && <Text className="field__error">{errors.section}</Text>}

            {/* 周次 */}
            <View className="form__row">
              <View className="field">
                <Text className="field__label">
                  起始周<Text className="field__required">*</Text>
                </Text>
                <Input
                  className={`field__input${errors.week ? ' field__input--error' : ''}`}
                  type="number"
                  value={String(draft.startWeek)}
                  onInput={(event) => {
                    const next = clamp(Number(event.detail.value), 1, LIMITS.MAX_WEEKS);
                    patch(next > draft.endWeek ? { startWeek: next, endWeek: next } : { startWeek: next });
                  }}
                />
              </View>

              <View className="field">
                <Text className="field__label">
                  结束周<Text className="field__required">*</Text>
                </Text>
                <Input
                  className={`field__input${errors.week ? ' field__input--error' : ''}`}
                  type="number"
                  value={String(draft.endWeek)}
                  onInput={(event) => {
                    const next = clamp(Number(event.detail.value), 1, LIMITS.MAX_WEEKS);
                    patch(next < draft.startWeek ? { endWeek: next, startWeek: next } : { endWeek: next });
                  }}
                />
              </View>
            </View>

            {errors.week && <Text className="field__error">{errors.week}</Text>}

            {/* 颜色 */}
            <View className="field">
              <Text className="field__label">课程颜色</Text>
              <View className="swatches">
                {COURSE_COLORS.map((color) => (
                  <View
                    key={color.value}
                    className={`swatch${draft.color === color.value ? ' swatch--active' : ''}`}
                    style={{ background: color.value }}
                    onClick={() => patch({ color: color.value })}
                    aria-label={`选择${color.label}`}
                  />
                ))}
              </View>
            </View>

            {/* 备注 */}
            <View className="field">
              <Text className="field__label">备注</Text>
              <Input
                className="field__input"
                type="text"
                value={draft.note ?? ''}
                maxlength={LIMITS.NOTE_MAX}
                placeholderClass="input-placeholder"
                placeholder="如：带上实验报告 / 第 3 周停课"
                onInput={(event) => patch({ note: event.detail.value })}
              />
            </View>

            {errors.limit && <Text className="field__error">{errors.limit}</Text>}
          </View>
        </View>

        <View className="modal__foot">
          <View className="btn btn--secondary" onClick={onClose}><Text>取消</Text></View>
          <View className="btn btn--primary" onClick={handleSubmit}><Text>保存</Text></View>
        </View>
      </View>
    </View>
  );
}
