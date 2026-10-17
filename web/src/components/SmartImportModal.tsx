import { useEffect, useMemo, useState } from 'react';
import { LIMITS, WEEKDAYS, WEEK_PARITY_OPTIONS } from '../constants';
import type { Course, CourseDraft, SectionTime, Weekday } from '../types';
import { clamp } from '../utils/date';
import { assignColorsByCourseName } from '../utils/course';
import { looksLikeJson, parseScheduleText, type ParsedCourse } from '../utils/importParser';
import { CloseIcon, SparkleIcon, TrashIcon } from './Icons';

interface SmartImportModalProps {
  open: boolean;
  totalWeeks: number;
  maxSections: number;
  sections: SectionTime[];
  existingCourses: Course[];
  onImport: (drafts: CourseDraft[]) => number;
  onClose: () => void;
}

interface PreviewRow {
  key: number;
  selected: boolean;
  draft: CourseDraft;
  issues: string[];
  source: string;
  duplicate: boolean;
}

/**
 * 智能导入弹窗（需求文档 §3.4 F12）。
 *
 * 两步流程：粘贴文字 → 解析 → 预览核对 → 批量导入。
 * 关键设计：解析器的输出永远先过一遍「人」，预览里每一行都可以改、可以不勾，
 * 「识别不准」不会造成脏数据 —— 这是不引入云端 OCR / LLM 的前提下，
 * 保证导入可靠性的唯一正确姿势。
 */
export function SmartImportModal({
  open,
  totalWeeks,
  maxSections,
  sections,
  existingCourses,
  onImport,
  onClose,
}: SmartImportModalProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);

  // 每次打开都回到输入步、清空上一次的残留
  useEffect(() => {
    if (!open) return;
    setStep('input');
    setText('');
    setRows([]);
    setUnmatched([]);
  }, [open]);

  // 支持 Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const isDuplicate = (draft: CourseDraft) =>
    existingCourses.some(
      (course) =>
        course.name === draft.name &&
        course.dayOfWeek === draft.dayOfWeek &&
        course.startSection === draft.startSection &&
        course.endSection === draft.endSection &&
        course.startWeek === draft.startWeek,
    );

  const handleParse = () => {
    if (!text.trim()) return;

    if (looksLikeJson(text)) {
      setStep('input');
      return;
    }

    const result = parseScheduleText(text, { maxSections, totalWeeks });
    if (result.courses.length === 0) {
      setUnmatched(result.unmatched);
      setRows([]);
      setStep('preview');
      return;
    }

    setRows(
      result.courses.map((item: ParsedCourse, index) => ({
        key: index,
        selected: true,
        draft: { ...item.draft },
        issues: item.issues,
        source: item.source,
        duplicate: isDuplicate(item.draft),
      })),
    );
    setUnmatched(result.unmatched);
    setStep('preview');
  };

  const patchRow = (key: number, patch: Partial<CourseDraft>) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const draft = { ...row.draft, ...patch };
        return { ...row, draft, duplicate: isDuplicate(draft) };
      }),
    );
  };

  const toggleRow = (key: number) => {
    setRows((prev) => prev.map((row) => (row.key === key ? { ...row, selected: !row.selected } : row)));
  };

  const removeRow = (key: number) => {
    setRows((prev) => prev.filter((row) => row.key !== key));
  };

  const selectedRows = useMemo(() => rows.filter((row) => row.selected), [rows]);
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;

  const handleImport = () => {
    // 颜色按课程名分配：同一门课的多条记录（不同周次段/单双周）共享一色
    const drafts = assignColorsByCourseName(
      selectedRows.map((row) => ({
        ...row.draft,
        name: row.draft.name.trim(),
        teacher: row.draft.teacher.trim(),
        location: row.draft.location.trim(),
        note: row.draft.note?.trim() || undefined,
      })),
    );
    if (drafts.length === 0) return;
    onImport(drafts);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal__sheet modal__sheet--wide" role="dialog" aria-modal="true" aria-label="智能导入">
        <div className="modal__head">
          <h3 className="modal__title">
            <SparkleIcon size={16} /> 智能导入
          </h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">
            <CloseIcon size={17} />
          </button>
        </div>

        <div className="modal__body">
          {step === 'input' ? (
            <>
              <p className="modal__hint">
                粘贴课表文字（教务系统复制的、或从截图提取的），我来抽取星期、节次、周次、地点和教师。
                识别结果会先给你核对，确认后才会写入课程库。
              </p>

              <textarea
                className="import-textarea"
                value={text}
                rows={8}
                placeholder={'示例（每行一门课，或多行一段都行）：\n高等数学 周一 第1-2节 1-16周 教301 张老师\n数据结构(1-16周) 星期三 第5,6节 实验楼402 王老师'}
                onChange={(event) => setText(event.target.value)}
              />

              {looksLikeJson(text) && (
                <span className="field__error">检测到这是应用导出的 JSON 备份，请到「我的 → 导入数据」使用，不要走文字解析。</span>
              )}

              <div className="import-tip">
                <div className="import-tip__title">有一张课表图片？三步变文字：</div>
                <ol className="import-tip__steps">
                  <li>微信（或手机相册）打开图片，长按 →「提取文字」</li>
                  <li>全选复制</li>
                  <li>回来粘贴，点「开始解析」</li>
                </ol>
                <div className="import-tip__note">
                  微信自带的文字提取对中文截图的识别质量，普遍好于浏览器端离线 OCR，所以图片入口走「先提取、再粘贴」，不装额外引擎。
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="modal__hint">
                识别出 <strong>{rows.length}</strong> 条课程信息
                {unmatched.length > 0 && (
                  <>，另有 <strong>{unmatched.length}</strong> 行没认出来（见底部）</>
                )}
                。请核对每一行：字段可改，不想要的取消勾选。
              </p>

              <label className="import-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setRows((prev) => prev.map((row) => ({ ...row, selected: !allSelected })))}
                />
                全选 / 全不选
              </label>

              <div className="preview-list">
                {rows.map((row) => (
                  <div key={row.key} className={`preview-row${row.selected ? '' : ' preview-row--off'}`}>
                    <div className="preview-row__head">
                      <label className="preview-row__check">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => toggleRow(row.key)}
                        />
                        <span className="preview-row__source" title={row.source}>
                          {row.source.slice(0, 44)}{row.source.length > 44 ? '…' : ''}
                        </span>
                      </label>
                      <button
                        type="button"
                        className="icon-btn icon-btn--soft icon-btn--danger"
                        onClick={() => removeRow(row.key)}
                        aria-label="移除这一条"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>

                    <div className="preview-row__grid">
                      <input
                        className="field__input preview-row__name"
                        type="text"
                        value={row.draft.name}
                        maxLength={LIMITS.NAME_MAX}
                        aria-label="课程名"
                        onChange={(event) => patchRow(row.key, { name: event.target.value })}
                      />
                      <input
                        className="field__input"
                        type="text"
                        value={row.draft.teacher}
                        maxLength={LIMITS.TEACHER_MAX}
                        placeholder="教师"
                        aria-label="教师"
                        onChange={(event) => patchRow(row.key, { teacher: event.target.value })}
                      />
                      <input
                        className="field__input"
                        type="text"
                        value={row.draft.location}
                        maxLength={LIMITS.LOCATION_MAX}
                        placeholder="地点"
                        aria-label="地点"
                        onChange={(event) => patchRow(row.key, { location: event.target.value })}
                      />
                      <select
                        className="field__select"
                        value={row.draft.dayOfWeek}
                        aria-label="星期"
                        onChange={(event) =>
                          patchRow(row.key, { dayOfWeek: Number(event.target.value) as Weekday })
                        }
                      >
                        {WEEKDAYS.map((day) => (
                          <option key={day.value} value={day.value}>
                            {day.label}
                          </option>
                        ))}
                      </select>
                      <select
                        className="field__select"
                        value={row.draft.startSection}
                        aria-label="起始节次"
                        onChange={(event) => {
                          const next = clamp(Number(event.target.value), 1, maxSections);
                          patchRow(row.key, next > row.draft.endSection
                            ? { startSection: next, endSection: next }
                            : { startSection: next });
                        }}
                      >
                        {sections.map((section) => (
                          <option key={section.index} value={section.index}>
                            第{section.index}节
                          </option>
                        ))}
                      </select>
                      <select
                        className="field__select"
                        value={row.draft.endSection}
                        aria-label="结束节次"
                        onChange={(event) => {
                          const next = clamp(Number(event.target.value), 1, maxSections);
                          patchRow(row.key, next < row.draft.startSection
                            ? { endSection: next, startSection: next }
                            : { endSection: next });
                        }}
                      >
                        {sections.map((section) => (
                          <option key={section.index} value={section.index}>
                            到第{section.index}节
                          </option>
                        ))}
                      </select>
                      <input
                        className="field__input"
                        type="number"
                        min={1}
                        max={totalWeeks}
                        value={row.draft.startWeek}
                        aria-label="起始周"
                        onChange={(event) => {
                          const next = clamp(Number(event.target.value), 1, totalWeeks);
                          patchRow(row.key, next > row.draft.endWeek
                            ? { startWeek: next, endWeek: next }
                            : { startWeek: next });
                        }}
                      />
                      <input
                        className="field__input"
                        type="number"
                        min={1}
                        max={totalWeeks}
                        value={row.draft.endWeek}
                        aria-label="结束周"
                        onChange={(event) => {
                          const next = clamp(Number(event.target.value), 1, totalWeeks);
                          patchRow(row.key, next < row.draft.startWeek
                            ? { endWeek: next, startWeek: next }
                            : { endWeek: next });
                        }}
                      />
                      <select
                        className="field__select"
                        value={row.draft.weekParity}
                        aria-label="单双周"
                        onChange={(event) =>
                          patchRow(row.key, { weekParity: event.target.value as CourseDraft['weekParity'] })
                        }
                      >
                        {WEEK_PARITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {(row.issues.length > 0 || row.duplicate) && (
                      <div className="preview-row__issues">
                        {row.duplicate && <span className="badge badge--dup">与现有课程重复</span>}
                        {row.issues.map((issue) => (
                          <span key={issue} className="badge badge--warn">{issue}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {rows.length === 0 && (
                  <div className="preview-row preview-row--empty">没有识别出任何课程，换个粘贴格式试试，或回上一页检查文字。</div>
                )}
              </div>

              {unmatched.length > 0 && (
                <details className="import-unmatched">
                  <summary>未识别的 {unmatched.length} 行（点开查看）</summary>
                  <pre>{unmatched.join('\n')}</pre>
                </details>
              )}
            </>
          )}
        </div>

        <div className="modal__foot">
          {step === 'preview' ? (
            <>
              <button type="button" className="btn btn--secondary" onClick={() => setStep('input')}>
                返回修改
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={selectedRows.length === 0}
                onClick={handleImport}
              >
                导入 {selectedRows.length} 门
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn--secondary" onClick={onClose}>
                取消
              </button>
              <button type="button" className="btn btn--primary" onClick={handleParse} disabled={!text.trim()}>
                开始解析
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
