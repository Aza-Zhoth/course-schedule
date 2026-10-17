import { Text, View } from '@tarojs/components';
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
    <View className="page">
      <View className="today-hero">
        <View className="today-hero__date"><Text>{String(now.getDate()).padStart(2, '0')}</Text></View>
        <View className="today-hero__meta">
          <View className="today-hero__weekday">
            <Text>{weekdayLabel} · {formatMonthDay(now)}</Text></View>
          <View className="today-hero__week"><Text>第 {currentWeek} 周 · {semesterName}</Text></View>
        </View>
      </View>

      {courses.length === 0 ? (
        <View className="empty">
          <View className="empty__icon">
            <ClockIcon size={26} />
          </View>
          <Text className="empty__title">今天没有课</Text>
          <Text className="empty__text">好好休息，或者提前预习一下明天要上的内容。</Text>
        </View>
      ) : (
        <View className="timeline">
          {courses.map((course) => {
            const start = sections[course.startSection - 1];
            const end = sections[course.endSection - 1];

            return (
              <View key={course.id} className="timeline__item">
                <View className="timeline__time">
                  <Text>{start.start}</Text>
                  <Text>{end.end}</Text>
                </View>

                {/* 迁移说明：原来的圆点是 span，现在纯视觉元素统一用 View */}
                <View className="timeline__rail">
                  <View className="timeline__dot" style={{ background: course.color }} />
                </View>

                <View
                  className="timeline__card"
                  onClick={() => onSelectCourse(course)}
                >
                  <View className="timeline__card-body">
                    <View className="timeline__card-title">
                      <Text className="timeline__card-name">{course.name}</Text>
                      {course.weekParity !== 'all' && (
                        <Text className="timeline__badge">
                          {course.weekParity === 'odd' ? '单周' : '双周'}
                        </Text>
                      )}
                    </View>

                    {/* 迁移说明：这里原来是 span 套 span，但每个 meta-item 里都嵌了图标。
                        小程序里 Text 不能包含 View，所以整组改成 View 容器 + Text 包文字。 */}
                    <View className="timeline__card-meta">
                      <View className="timeline__meta-item">
                        <UserIcon size={12} />
                        <Text>{course.teacher || '未填写'}</Text>
                      </View>
                      <View className="timeline__meta-item">
                        <MapPinIcon size={12} />
                        <Text>{course.location || '未填写'}</Text>
                      </View>
                      <View className="timeline__meta-item">
                        <CalendarIcon size={12} />
                        <Text>{weekRangeLabel(course.startWeek, course.endWeek, 'all')}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="timeline__section">
                    <Text>{sectionRangeLabel(course.startSection, course.endSection)}</Text>
                    <Text>
                      {start.start} - {end.end}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}
