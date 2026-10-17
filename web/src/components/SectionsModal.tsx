import { useEffect, useState } from 'react';
import { DEFAULT_SECTIONS, LIMITS } from '../constants';
import type { Course, SectionTime } from '../types';
import { CloseIcon } from './Icons';

interface SectionsModalProps {
  open: boolean;
  sections: SectionTime[];
  courses: Course[];
  onSave: (next: SectionTime[]) => void;
  onClose: () => void;
}

/**
 * 节次作息编辑弹窗（需求文档 §3.3 F13）。
 *
 * 编辑的是「全校作息表」：每节上下课时间、节次总数都可改。
 * 删除末尾节次时如果已有课程引用它，就地拦截 —— 与其事后悄悄改坏课表，
 * 不如让用户先处理引用它的课程。
 */
export function SectionsModal({ open, sections, courses, onSave, onClose }: SectionsModalProps) {
  const [draft, setDraft] = useState<SectionTime[]>(sections);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setDraft(sections.map((section) => ({ ...section })));
    setError('');
  }, [open, sections]);

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

  const patchTime = (index: number, key: 'start' | 'end', value: string) => {
    setDraft((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
    setError('');
  };

  const addSection = () => {
    if (draft.length >= LIMITS.MAX_SECTIONS) return;
    const last = draft[draft.length - 1];
    setDraft((prev) => [
      ...prev,
      // 新节次默认顺延 15 分钟，落在它后面，保证保存时校验能过
      { index: prev.length + 1, start: shiftTime(last.end, 15), end: shiftTime(last.end, 60) },
    ]);
  };

  const removeLastSection = () => {
    if (draft.length <= LIMITS.MIN_SECTIONS) return;
    const removedIndex = draft[draft.length - 1].index;
    const referenced = courses.filter(
      (course) => course.endSection >= removedIndex && course.startSection <= removedIndex,
    );
    if (referenced.length > 0) {
      setError(`第 ${removedIndex} 节正在被《${referenced[0].name}》等 ${referenced.length} 门课程引用，请先删除或修改这些课程`);
      return;
    }
    setDraft((prev) => prev.slice(0, -1));
    setError('');
  };

  const resetDefault = () => {
    setDraft(DEFAULT_SECTIONS.map((section) => ({ ...section })));
    setError('');
  };

  const handleSave = () => {
    const problems = validateSections(draft);
    if (problems) {
      setError(problems);
      return;
    }
    onSave(draft.map((section, index) => ({ ...section, index: index + 1 })));
  };

  return (
    <div className="modal" role="presentation" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal__sheet" role="dialog" aria-modal="true" aria-label="编辑节次作息">
        <div className="modal__head">
          <h3 className="modal__title">节次作息</h3>
          <button type="button" className="modal__close" onClick={onClose} aria-label="关闭">
            <CloseIcon size={17} />
          </button>
        </div>

        <div className="modal__body">
          <p className="modal__hint">不同学校节次数与上下课时间不同，可按本校作息调整；改动会即时反映到课表格子与今日页。</p>

          <div className="sections-rows">
            {draft.map((section, index) => (
              <div key={index} className="sections-row">
                <span className="sections-row__num">第{section.index}节</span>
                <input
                  className="field__input sections-row__time"
                  type="time"
                  value={section.start}
                  onChange={(event) => patchTime(index, 'start', event.target.value)}
                  aria-label={`第${section.index}节开始时间`}
                />
                <span className="sections-row__sep">—</span>
                <input
                  className="field__input sections-row__time"
                  type="time"
                  value={section.end}
                  onChange={(event) => patchTime(index, 'end', event.target.value)}
                  aria-label={`第${section.index}节结束时间`}
                />
              </div>
            ))}
          </div>

          <div className="sections-actions">
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={addSection}
              disabled={draft.length >= LIMITS.MAX_SECTIONS}
            >
              加一节
            </button>
            <button
              type="button"
              className="btn btn--secondary btn--sm"
              onClick={removeLastSection}
              disabled={draft.length <= LIMITS.MIN_SECTIONS}
            >
              删末节
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={resetDefault}>
              恢复默认
            </button>
          </div>

          {error && <span className="field__error">{error}</span>}
        </div>

        <div className="modal__foot">
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            取消
          </button>
          <button type="button" className="btn btn--primary" onClick={handleSave}>
            保存
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** 校验作息表：时间格式、起止顺序、节次之间不倒流。返回错误文案或 null */
function validateSections(sections: SectionTime[]): string | null {
  if (sections.length < LIMITS.MIN_SECTIONS || sections.length > LIMITS.MAX_SECTIONS) {
    return `节次数须在 ${LIMITS.MIN_SECTIONS} ~ ${LIMITS.MAX_SECTIONS} 之间`;
  }
  for (const section of sections) {
    if (!section.start || !section.end) return '存在未填写完整的节次时间';
    if (section.start >= section.end) {
      return `第 ${section.index} 节的结束时间不能早于开始时间`;
    }
  }
  for (let i = 1; i < sections.length; i += 1) {
    if (sections[i].start < sections[i - 1].end) {
      return `第 ${sections[i].index} 节的开始时间早于上一节的结束时间`;
    }
  }
  return null;
}

/** 把 'HH:mm' 顺延 minutes 分钟（仅在「新增节次」时生成默认值用） */
function shiftTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 45);
  const hh = String(Math.floor(total / 60)).padStart(2, '0');
  const mm = String(total % 60).padStart(2, '0');
  return `${hh}:${mm}`;
}
