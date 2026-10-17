import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
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

  // 支持 Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const isEditing = editing !== null;

  const patch = (next: Partial<CourseDraft>) => {
    setDraft((prev) => ({ ...prev, ...next }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const result = validateCourse(draft, isEditing ? courseCount - 1 : courseCount, sectionCount);
    setErrors(result.errors);
    if (!result.valid) return;

    onSubmit(draft);
  };

  return (
    <div className="modal" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal__sheet" role="dialog" aria-modal="true" aria-label={isEditing ? '编辑课程' : '添加课程'}>
        <div className="modal__head">
          <h3 className="modal__title">{isEditing ? '编辑课程' : '添加课程'}</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">
            <CloseIcon size={17} />
          </button>
        </div>

        <div className="modal__body">
          <form className="form" id="course-form" onSubmit={handleSubmit}>
            {/* 课程名 */}
            <div className="field">
              <label className="field__label" htmlFor="f-name">
                课程名<span className="field__required">*</span>
              </label>
              <input
                id="f-name"
                className={`field__input${errors.name ? ' field__input--error' : ''}`}
                type="text"
                value={draft.name}
                maxLength={LIMITS.NAME_MAX}
                placeholder="如：高等数学"
                onChange={(event) => patch({ name: event.target.value })}
              />
              {errors.name && <span className="field__error">{errors.name}</span>}
            </div>

            {/* 教师 + 地点 */}
            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="f-teacher">
                  教师<span className="field__required">*</span>
                </label>
                <input
                  id="f-teacher"
                  className={`field__input${errors.teacher ? ' field__input--error' : ''}`}
                  type="text"
                  value={draft.teacher}
                  maxLength={LIMITS.TEACHER_MAX}
                  placeholder="如：张老师"
                  onChange={(event) => patch({ teacher: event.target.value })}
                />
                {errors.teacher && <span className="field__error">{errors.teacher}</span>}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="f-location">
                  地点<span className="field__required">*</span>
                </label>
                <input
                  id="f-location"
                  className={`field__input${errors.location ? ' field__input--error' : ''}`}
                  type="text"
                  value={draft.location}
                  maxLength={LIMITS.LOCATION_MAX}
                  placeholder="如：教 301"
                  onChange={(event) => patch({ location: event.target.value })}
                />
                {errors.location && <span className="field__error">{errors.location}</span>}
              </div>
            </div>

            {/* 星期 + 单双周 */}
            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="f-day">
                  星期<span className="field__required">*</span>
                </label>
                <select
                  id="f-day"
                  className="field__select"
                  value={draft.dayOfWeek}
                  onChange={(event) =>
                    patch({ dayOfWeek: Number(event.target.value) as Weekday })
                  }
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="f-parity">
                  单双周
                </label>
                <select
                  id="f-parity"
                  className="field__select"
                  value={draft.weekParity}
                  onChange={(event) =>
                    patch({ weekParity: event.target.value as CourseDraft['weekParity'] })
                  }
                >
                  {WEEK_PARITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 节次 */}
            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="f-start-section">
                  起始节次<span className="field__required">*</span>
                </label>
                <select
                  id="f-start-section"
                  className={`field__select${errors.section ? ' field__select--error' : ''}`}
                  value={draft.startSection}
                  onChange={(event) => {
                    const next = clamp(Number(event.target.value), 1, sectionCount);
                    // 起始节次后移超过结束节次时，自动把结束节次一起带上
                    patch(next > draft.endSection ? { startSection: next, endSection: next } : { startSection: next });
                  }}
                >
                  {sections.map((section) => (
                    <option key={section.index} value={section.index}>
                      第{section.index}节 {section.start}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field__label" htmlFor="f-end-section">
                  结束节次<span className="field__required">*</span>
                </label>
                <select
                  id="f-end-section"
                  className={`field__select${errors.section ? ' field__select--error' : ''}`}
                  value={draft.endSection}
                  onChange={(event) => {
                    const next = clamp(Number(event.target.value), 1, sectionCount);
                    patch(next < draft.startSection ? { endSection: next, startSection: next } : { endSection: next });
                  }}
                >
                  {sections.map((section) => (
                    <option key={section.index} value={section.index}>
                      第{section.index}节 {section.start}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {errors.section && <span className="field__error">{errors.section}</span>}

            {/* 周次 */}
            <div className="form__row">
              <div className="field">
                <label className="field__label" htmlFor="f-start-week">
                  起始周<span className="field__required">*</span>
                </label>
                <input
                  id="f-start-week"
                  className={`field__input${errors.week ? ' field__input--error' : ''}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={LIMITS.MAX_WEEKS}
                  value={draft.startWeek}
                  onChange={(event) => {
                    const next = clamp(Number(event.target.value), 1, LIMITS.MAX_WEEKS);
                    patch(next > draft.endWeek ? { startWeek: next, endWeek: next } : { startWeek: next });
                  }}
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="f-end-week">
                  结束周<span className="field__required">*</span>
                </label>
                <input
                  id="f-end-week"
                  className={`field__input${errors.week ? ' field__input--error' : ''}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={LIMITS.MAX_WEEKS}
                  value={draft.endWeek}
                  onChange={(event) => {
                    const next = clamp(Number(event.target.value), 1, LIMITS.MAX_WEEKS);
                    patch(next < draft.startWeek ? { endWeek: next, startWeek: next } : { endWeek: next });
                  }}
                />
              </div>
            </div>

            {errors.week && <span className="field__error">{errors.week}</span>}

            {/* 颜色 */}
            <div className="field">
              <span className="field__label">课程颜色</span>
              <div className="swatches">
                {COURSE_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`swatch${draft.color === color.value ? ' swatch--active' : ''}`}
                    style={{ background: color.value }}
                    onClick={() => patch({ color: color.value })}
                    aria-label={`选择${color.label}`}
                    aria-pressed={draft.color === color.value}
                  />
                ))}
              </div>
            </div>

            {/* 备注 */}
            <div className="field">
              <label className="field__label" htmlFor="f-note">
                备注
              </label>
              <input
                id="f-note"
                className="field__input"
                type="text"
                value={draft.note ?? ''}
                maxLength={LIMITS.NOTE_MAX}
                placeholder="如：带上实验报告 / 第 3 周停课"
                onChange={(event) => patch({ note: event.target.value })}
              />
            </div>

            {errors.limit && <span className="field__error">{errors.limit}</span>}
          </form>
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            取消
          </button>
          <button type="submit" form="course-form" className="btn btn--primary">
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
