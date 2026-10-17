import { Text, View } from '@tarojs/components';
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
    <View className="page">
      <View className="page__head">
        <Text className="page__title">
          课程库 <Text className="page__count">{courses.length} 门</Text>
        </Text>
        <View className="page__head-actions">
          <View className="btn btn--secondary btn--sm" onClick={onSmartImport}>
            <SparkleIcon size={13} /><Text>智能导入</Text></View>
          <View className="btn btn--primary btn--sm" onClick={onAdd}>
            <PlusIcon size={13} strokeWidth={2.6} /><Text>添加课程</Text></View>
        </View>
      </View>

      {courses.length === 0 ? (
        <View className="empty">
          <View className="empty__icon">
            <BookIcon size={26} />
          </View>
          <Text className="empty__title">课程库还是空的</Text>
          <Text className="empty__text">先把这学期的课录进来，之后就能随时查了。</Text>
          <View className="empty__action">
            <View className="btn btn--secondary btn--sm" onClick={onSmartImport}>
              <SparkleIcon size={13} /><Text>粘贴文字，智能导入</Text></View>
            <View className="btn btn--secondary btn--sm" onClick={onLoadSample}>
              <SparkleIcon size={13} /><Text>先载入示例课表看看</Text></View>
          </View>
        </View>
      ) : (
        <View className="lib-list">
          {courses.map((course) => (
            <View key={course.id} className="lib-item">
              <Text className="lib-item__bar" style={{ background: course.color }} />

              <View className="lib-item__body">
                <View className="lib-item__name">
                  <Text className="lib-item__name-text">{course.name}</Text>
                </View>
                <View className="lib-item__meta">
                  <Text>{WEEKDAYS[course.dayOfWeek - 1].label} ·{' '}
{sectionRangeLabel(course.startSection, course.endSection)} ·{' '}
{weekRangeLabel(course.startWeek, course.endWeek, course.weekParity)}
{'\n'}
{course.teacher}
{course.teacher && course.location ? ' · ' : ''}
{course.location}
{course.note ? ` · ${course.note}` : ''}</Text></View>
              </View>

              <View className="lib-item__actions">
                <View
                  className="icon-btn icon-btn--soft"
                  onClick={() => onEdit(course)}
                  aria-label={`编辑 ${course.name}`}
                >
                  <EditIcon size={15} />
                </View>
                <View
                  className="icon-btn icon-btn--soft icon-btn--danger"
                  onClick={() => onDelete(course)}
                  aria-label={`删除 ${course.name}`}
                >
                  <TrashIcon size={15} />
                </View>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
