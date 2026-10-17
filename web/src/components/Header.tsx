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
    <header className="header">
      <div className="header__bar">
        <div>
          <h1 className="header__title">课程表</h1>
          <p className="header__subtitle">{semesterName}</p>
        </div>

        <div className="header__actions">
          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? '切换到浅色主题' : '切换到深色主题'}
          >
            {theme === 'dark' ? <SunIcon size={18} /> : <MoonIcon size={18} />}
          </button>
          <button
            type="button"
            className="icon-btn"
            onClick={onOpenSettings}
            aria-label="打开设置"
          >
            <SettingsIcon size={18} />
          </button>
        </div>
      </div>

      <div className="week-switch">
        <button
          type="button"
          className="week-switch__btn"
          onClick={onPrev}
          disabled={week <= 1}
          aria-label="上一周"
        >
          <ChevronLeftIcon size={18} />
        </button>

        <div className="week-switch__center">
          <div className="week-switch__label">
            第 {week} 周
            {isCurrentWeek ? (
              <span className="week-switch__today">本周</span>
            ) : (
              <button type="button" className="week-switch__today" onClick={onToday}>
                回到本周
              </button>
            )}
          </div>
          <div className="week-switch__range">
            {rangeLabel} · 共 {totalWeeks} 周
          </div>
        </div>

        <button
          type="button"
          className="week-switch__btn"
          onClick={onNext}
          disabled={week >= totalWeeks}
          aria-label="下一周"
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>
    </header>
  );
}
