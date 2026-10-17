import { Input, Picker, Text, View } from '@tarojs/components';
import { LIMITS } from '../constants';
import type { AppSettings, SectionTime, Semester } from '../types';
import { clamp } from '../utils/date';
import {
  BellIcon,
  CalendarIcon,
  ClockIcon,
  DownloadIcon,
  InfoIcon,
  MoonIcon,
  TrashIcon,
  UploadIcon,
} from './Icons';

interface SettingsViewProps {
  semester: Semester;
  sections: SectionTime[];
  settings: AppSettings;
  notifySupported: boolean;
  courseCount: number;
  onUpdateSemester: (patch: Partial<Semester>) => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onToggleTheme: () => void;
  onToggleNotify: () => void;
  onOpenSections: () => void;
  onExport: () => void;
  /** 迁移说明：H5 版这里是 (file: File) => void，小程序改读剪贴板，不再有文件参数 */
  onImport: () => void;
  onClearAll: () => void;
}

export function SettingsView({
  semester,
  sections,
  settings,
  notifySupported,
  courseCount,
  onUpdateSemester,
  onUpdateSettings,
  onToggleTheme,
  onToggleNotify,
  onOpenSections,
  onExport,
  onImport,
  onClearAll,
}: SettingsViewProps) {
  return (
    <View className="page">
      <View className="page__head">
        <Text className="page__title">我的</Text>
      </View>

      <View className="settings">
        {/* ---------------- 学期设置 ---------------- */}
        <View className="settings__group">
          <View className="settings__legend"><Text>学期设置</Text></View>

          <View className="settings__row">
            <View className="settings__icon">
              <CalendarIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>学期名称</Text></View>
              <View className="settings__hint"><Text>仅用于展示，不影响周次计算</Text></View>
            </View>
          </View>
          <View className="settings__row">
            <Input
              className="field__input"
              type="text"
              value={semester.name}
              maxlength={40}
              onInput={(event) => onUpdateSemester({ name: event.detail.value })}
              aria-label="学期名称"
            />
          </View>

          <View className="settings__row">
            <View className="settings__icon">
              <CalendarIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>开学第一周的周一</Text></View>
              <View className="settings__hint"><Text>当前周次由它推算</Text></View>
            </View>
          </View>
          <View className="settings__row">
            {/* 迁移说明：<input type="date"> 在小程序里没有，换成 Picker 的 date 模式，
                它的值格式同样是 'YYYY-MM-DD'，和 Semester.startDate 直接对应 */}
            <Picker
              mode="date"
              value={semester.startDate}
              onChange={(event) => onUpdateSemester({ startDate: String(event.detail.value) })}
            >
              <View className="field__input field__input--picker" aria-label="开学第一周的周一">
                {semester.startDate}
              </View>
            </Picker>
          </View>

          <View className="settings__row">
            <View className="settings__icon">
              <CalendarIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>总周数</Text></View>
              <View className="settings__hint"><Text>范围 1 ~ {LIMITS.MAX_WEEKS} 周</Text></View>
            </View>
            <Input
              className="field__input settings__value"
              type="number"
              value={String(semester.totalWeeks)}
              onInput={(event) =>
                onUpdateSemester({
                  totalWeeks: clamp(Number(event.detail.value), 1, LIMITS.MAX_WEEKS),
                })
              }
              aria-label="总周数"
            />
          </View>

          <View className="settings__row" onClick={onOpenSections}>
            <View className="settings__icon">
              <ClockIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>节次作息</Text></View>
              <View className="settings__hint">
                <Text>
                  共 {sections.length} 节 · 第 1 节 {sections[0]?.start ?? '--:--'} 开始 · 不同学校可改
                </Text>
              </View>
            </View>
            <Text className="settings__arrow">›</Text>
          </View>
        </View>

        {/* ---------------- 偏好 ---------------- */}
        <View className="settings__group">
          <View className="settings__legend"><Text>偏好</Text></View>

          <View className="settings__row">
            <View className="settings__icon">
              <MoonIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>深色模式</Text></View>
              <View className="settings__hint"><Text>夜间查看更护眼</Text></View>
            </View>
            <View
              aria-checked={settings.theme === 'dark'}
              aria-label="深色模式"
              className={`switch${settings.theme === 'dark' ? ' switch--on' : ''}`}
              onClick={onToggleTheme}
            />
          </View>

          <View className="settings__row">
            <View className="settings__icon">
              <BellIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>上课提醒</Text></View>
              <View className="settings__hint">
                <Text>
                  {notifySupported
                    ? `上课前 ${settings.notifyLeadMinutes} 分钟提醒（走小程序订阅消息）`
                    : '当前环境不支持订阅消息，功能不可用'}
                </Text>
              </View>
            </View>
            {/* 迁移说明：小程序 View 没有 disabled 属性，禁用逻辑在 onToggleNotify 里判断 */}
            <View
              aria-checked={settings.notifyEnabled}
              aria-label="上课提醒"
              className={`switch${settings.notifyEnabled ? ' switch--on' : ''}`}
              onClick={onToggleNotify}
            />
          </View>

          {notifySupported && settings.notifyEnabled && (
            <View className="settings__row">
              <View className="settings__icon">
                <BellIcon size={16} />
              </View>
              <View className="settings__text">
                <View className="settings__label"><Text>提前分钟数</Text></View>
              </View>
              <Input
                className="field__input settings__value"
                type="number"
                value={String(settings.notifyLeadMinutes)}
                onInput={(event) =>
                  onUpdateSettings({ notifyLeadMinutes: clamp(Number(event.detail.value), 1, 60) })
                }
                aria-label="提醒提前分钟数"
              />
            </View>
          )}
        </View>

        {/* ---------------- 数据 ---------------- */}
        <View className="settings__group">
          <View className="settings__legend"><Text>数据</Text></View>

          <View className="settings__row" onClick={onExport}>
            <View className="settings__icon">
              <DownloadIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>导出数据</Text></View>
              <View className="settings__hint"><Text>把 JSON 备份复制到剪贴板</Text></View>
            </View>
          </View>

          <View className="settings__row" onClick={onImport}>
            <View className="settings__icon">
              <UploadIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>导入数据</Text></View>
              <View className="settings__hint"><Text>读取剪贴板里的备份，将覆盖当前数据</Text></View>
            </View>
          </View>

          <View className="settings__row" onClick={onClearAll}>
            <View className="settings__icon settings__icon--danger">
              <TrashIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label settings__label--danger"><Text>清空所有数据</Text></View>
              <View className="settings__hint"><Text>删除全部课程与设置，无法撤销</Text></View>
            </View>
          </View>
        </View>

        {/* ---------------- 关于 ---------------- */}
        <View className="settings__group">
          <View className="settings__legend"><Text>关于</Text></View>
          <View className="settings__row">
            <View className="settings__icon">
              <InfoIcon size={16} />
            </View>
            <View className="settings__text">
              <View className="settings__label"><Text>课程表小程序 v1.0</Text></View>
              <View className="settings__hint">
                <Text>
                  React 18 + TypeScript + Taro · 数据保存在本机，不上传云端{'\n'}
                  当前共 {courseCount} 门课程
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Text className="settings__footer">
          软件工程个人作业 · 2026 秋季学期{'\n'}
          数据仅存于本机小程序缓存，清理缓存会导致课表丢失，建议定期导出备份
        </Text>
      </View>
    </View>
  );
}
