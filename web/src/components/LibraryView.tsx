import { WEEKDAYS } from '../constants';
import type { Course } from '../types';
import { sectionRangeLabel, weekRangeLabel } from '../utils/course';
import { BookIcon, EditIcon, PlusIcon, SparkleIcon, TrashIcon } from './Icons';

interface LibraryViewProps {
  courses: Course[];
  onAdd: () => void;
  onSmartImport: () => void;
  onEdit: (course: Course) => void;
  onDelete: (course: Course) => void;
  onLoadSample: () => void;
}

export function LibraryView({
  courses,
  onAdd,
  onSmartImport,
  onEdit,
  onDelete,
  onLoadSample,
}: LibraryViewProps) {
  return (
    <div className="page">
      <div className="page__head">
        <h2 className="page__title">
          课程库 <span className="page__count">{courses.length} 门</span>
        </h2>
        <div className="page__head-actions">
          <button type="button" className="btn btn--secondary btn--sm" onClick={onSmartImport}>
            <SparkleIcon size={13} />
            智能导入
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={onAdd}>
            <PlusIcon size={13} strokeWidth={2.6} />
            添加课程
          </button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="empty">
          <span className="empty__icon">
            <BookIcon size={26} />
          </span>
          <p className="empty__title">课程库还是空的</p>
          <p className="empty__text">先把这学期的课录进来，之后就能随时查了。</p>
          <div className="empty__action">
            <button type="button" className="btn btn--secondary btn--sm" onClick={onSmartImport}>
              <SparkleIcon size={13} />
              粘贴文字，智能导入
            </button>
            <button type="button" className="btn btn--secondary btn--sm" onClick={onLoadSample}>
              <SparkleIcon size={13} />
              先载入示例课表看看
            </button>
          </div>
        </div>
      ) : (
        <ul className="lib-list">
          {courses.map((course) => (
            <li key={course.id} className="lib-item">
              <span className="lib-item__bar" style={{ background: course.color }} />

              <div className="lib-item__body">
                <div className="lib-item__name">
                  <span className="lib-item__name-text">{course.name}</span>
                </div>
                <div className="lib-item__meta">
                  {WEEKDAYS[course.dayOfWeek - 1].label} ·{' '}
                  {sectionRangeLabel(course.startSection, course.endSection)} ·{' '}
                  {weekRangeLabel(course.startWeek, course.endWeek, course.weekParity)}
                  <br />
                  {course.teacher}
                  {course.teacher && course.location ? ' · ' : ''}
                  {course.location}
                  {course.note ? ` · ${course.note}` : ''}
                </div>
              </div>

              <div className="lib-item__actions">
                <button
                  type="button"
                  className="icon-btn icon-btn--soft"
                  onClick={() => onEdit(course)}
                  aria-label={`编辑 ${course.name}`}
                >
                  <EditIcon size={15} />
                </button>
                <button
                  type="button"
                  className="icon-btn icon-btn--soft icon-btn--danger"
                  onClick={() => onDelete(course)}
                  aria-label={`删除 ${course.name}`}
                >
                  <TrashIcon size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
