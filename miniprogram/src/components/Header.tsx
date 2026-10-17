import { Text, View } from '@tarojs/components';
import type { ThemeMode } from '../types';
import { ChevronLeftIcon, ChevronRightIcon, MoonIcon, SettingsIcon, SunIcon } from './Icons';

interface HeaderProps {
  week: number;
  totalWeeks: number;
  rangeLabel: string;
  semesterName: string;
  isCurrentWeek: boolean;
  theme: ThemeMode;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function Header({
  week,
  totalWeeks,
  rangeLabel,
  semesterName,
  isCurrentWeek,
  theme,
  onPrev,
  onNext,
  onToday,
  onToggleTheme,
  onOpenSettings,
}: HeaderProps) {
  return (
    <View className="header">
      <View className="header__bar">
        <View>
          <Text className="header__title">课程表</Text>
          <Text className="header__subtitle">{semesterName}</Text>
        </View>

        <View className="header__actions">
          <View
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          >
            {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </View>
          <View
            className="icon-btn"
            onClick={onOpenSettings}
            aria-label="打开设置"
          >
            <SettingsIcon size={18} />
          </View>
        </View>
      </View>

      <View className="week-switch">
        {/* 迁移说明：小程序没有 disabled 属性，禁用态改成加类名，
            真正的边界拦截在 useSchedule 的 prevWeek / nextWeek 里已经做过了 */}
        <View
          className={`week-switch__btn${week <= 1 ? ' week-switch__btn--disabled' : ''}`}
          onClick={onPrev}
          aria-label="上一周"
        >
          <ChevronLeftIcon size={18} />
        </View>

        <View className="week-switch__center">
          <View className="week-switch__label"><Text>第 {week} 周</Text>{isCurrentWeek ? (
              <Text className="week-switch__today">本周</Text>
            ) : (
              <View className="week-switch__today" onClick={onToday}><Text>回到本周</Text></View>
            )}
          </View>
          <View className="week-switch__range">
            <Text>{rangeLabel} · 共 {totalWeeks} 周</Text></View>
        </View>

        <View
          className={`week-switch__btn${week >= totalWeeks ? ' week-switch__btn--disabled' : ''}`}
          onClick={onNext}
          aria-label="下一周"
        >
          <ChevronRightIcon size={18} />
        </View>
      </View>
    </View>
  );
}
