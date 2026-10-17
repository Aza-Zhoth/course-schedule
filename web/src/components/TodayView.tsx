import { WEEKDAYS } from '../constants';
import type { Course, SectionTime, Weekday } from '../types';
import { sectionRangeLabel, weekRangeLabel } from '../utils/course';
import { formatMonthDay } from '../utils/date';
import { CalendarIcon, ClockIcon, MapPinIcon, UserIcon } from './Icons';

interface TodayViewProps {
  courses: Course[];
  /** 全校作息表 —— 展示时间轴时用 */
  sections: SectionTime[];
  semesterName: string;
  currentWeek: number;
  today: Weekday;
  now: Date;
  onSelectCourse: (course: Course) => void;
}

export function TodayView({
  courses,
  sections,
  semesterName,
  currentWeek,
  today,
  now,
  onSelectCourse,
}: TodayViewProps) {
  const weekdayLabel = WEEKDAYS[today - 1].label;

  return (
    <div className="page">
      <div className="today-hero">
        <div className="today-hero__date">{String(now.getDate()).padStart(2, '0')}</div>
        <div className="today-hero__meta">
          <div className="today-hero__weekday">
            {weekdayLabel} · {formatMonthDay(now)}
          </div>
          <div className="today-hero__week">
            第 {currentWeek} 周 · {semesterName}
          </div>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="empty">
          <span className="empty__icon">
            <ClockIcon size={26} />
          </span>
          <p className="empty__title">今天没有课</p>
          <p className="empty__text">好好休息，或者提前预习一下明天要上的内容。</p>
        </div>
      ) : (
        <ol className="timeline">
          {courses.map((course) => {
            const start = sections[course.startSection - 1];
            const end = sections[course.endSection - 1];

            return (
              <li key={course.id} className="timeline__item">
                <span className="timeline__time">
                  {start.start}
                  <br />
                  {end.end}
                </span>

                <span className="timeline__rail" aria-hidden="true">
                  <span className="timeline__dot" style={{ background: course.color }} />
                </span>

                <button
                  type="button"
                  className="timeline__card"
                  onClick={() => onSelectCourse(course)}
                >
                  <span className="timeline__card-body">
                    <span className="timeline__card-title">
                      <span className="timeline__card-name">{course.name}</span>
                      {course.weekParity !== 'all' && (
                        <span className="timeline__badge">
                          {course.weekParity === 'odd' ? '单周' : '双周'}
                        </span>
                      )}
                    </span>

                    <span className="timeline__card-meta">
                      <span className="timeline__meta-item">
                        <UserIcon size={12} />
                        {course.teacher || '未填写'}
                      </span>
                      <span className="timeline__meta-item">
                        <MapPinIcon size={12} />
                        {course.location || '未填写'}
                      </span>
                      <span className="timeline__meta-item">
                        <CalendarIcon size={12} />
                        {weekRangeLabel(course.startWeek, course.endWeek, 'all')}
                      </span>
                    </span>
                  </span>

                  <span className="timeline__section">
                    {sectionRangeLabel(course.startSection, course.endSection)}
                    <span>
                      {start.start} - {end.end}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
