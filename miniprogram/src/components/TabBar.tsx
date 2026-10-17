import { Text, View } from '@tarojs/components';
import type { TabKey } from '../types';
import { BookIcon, CalendarIcon, ClockIcon, UserIcon } from './Icons';

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
}

const TABS: ReadonlyArray<{ key: TabKey; label: string; Icon: typeof CalendarIcon }> = [
  { key: 'week', label: '周课表', Icon: CalendarIcon },
  { key: 'today', label: '今日', Icon: ClockIcon },
  { key: 'library', label: '课程库', Icon: BookIcon },
  { key: 'settings', label: '我的', Icon: UserIcon },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <View className="tabbar" aria-label="主导航">
      {TABS.map(({ key, label, Icon }) => {
        const isActive = key === active;
        return (
          <View
            key={key}
            aria-selected={isActive}
            className={`tabbar__item${isActive ? ' tabbar__item--active' : ''}`}
            onClick={() => onChange(key)}
          >
            <Icon size={21} strokeWidth={isActive ? 2.1 : 1.7} />
            <Text className="tabbar__label">{label}</Text>
          </View>
        );
      })}
    </View>
  );
}
