import { useRef } from 'react';
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
  onImport: (file: File) => void;
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
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="page">
      <div className="page__head">
        <h2 className="page__title">我的</h2>
      </div>

      <div className="settings">
        {/* ---------------- 学期设置 ---------------- */}
        <section className="settings__group">
          <div className="settings__legend">学期设置</div>

          <div className="settings__row">
            <span className="settings__icon">
              <CalendarIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">学期名称</div>
              <div className="settings__hint">仅用于展示，不影响周次计算</div>
            </div>
          </div>
          <div className="settings__row">
            <input
              className="field__input"
              type="text"
              value={semester.name}
              maxLength={40}
              onChange={(event) => onUpdateSemester({ name: event.target.value })}
              aria-label="学期名称"
            />
          </div>

          <div className="settings__row">
            <span className="settings__icon">
              <CalendarIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">开学第一周的周一</div>
              <div className="settings__hint">当前周次由它推算</div>
            </div>
          </div>
          <div className="settings__row">
            <input
              className="field__input"
              type="date"
              value={semester.startDate}
              onChange={(event) => onUpdateSemester({ startDate: event.target.value })}
              aria-label="开学第一周的周一"
            />
          </div>

          <div className="settings__row">
            <span className="settings__icon">
              <CalendarIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">总周数</div>
              <div className="settings__hint">范围 1 ~ {LIMITS.MAX_WEEKS} 周</div>
            </div>
            <input
              className="field__input settings__value"
              style={{ width: 72, textAlign: 'center' }}
              type="number"
              min={1}
              max={LIMITS.MAX_WEEKS}
              value={semester.totalWeeks}
              onChange={(event) =>
                onUpdateSemester({
                  totalWeeks: clamp(Number(event.target.value), 1, LIMITS.MAX_WEEKS),
                })
              }
              aria-label="总周数"
            />
          </div>

          <button type="button" className="settings__row" onClick={onOpenSections}>
            <span className="settings__icon">
              <ClockIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">节次作息</div>
              <div className="settings__hint">
                共 {sections.length} 节 · 第 1 节 {sections[0]?.start ?? '--:--'} 开始
                · 不同学校可改
              </div>
            </div>
            <span className="settings__arrow" aria-hidden="true">›</span>
          </button>
        </section>

        {/* ---------------- 偏好 ---------------- */}
        <section className="settings__group">
          <div className="settings__legend">偏好</div>

          <div className="settings__row">
            <span className="settings__icon">
              <MoonIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">深色模式</div>
              <div className="settings__hint">夜间查看更护眼</div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.theme === 'dark'}
              aria-label="深色模式"
              className={`switch${settings.theme === 'dark' ? ' switch--on' : ''}`}
              onClick={onToggleTheme}
            />
          </div>

          <div className="settings__row">
            <span className="settings__icon">
              <BellIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">上课提醒</div>
              <div className="settings__hint">
                {notifySupported
                  ? `上课前 ${settings.notifyLeadMinutes} 分钟提醒（需允许浏览器通知）`
                  : '当前浏览器不支持通知，功能不可用'}
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={settings.notifyEnabled}
              aria-label="上课提醒"
              disabled={!notifySupported}
              className={`switch${settings.notifyEnabled ? ' switch--on' : ''}`}
              onClick={onToggleNotify}
            />
          </div>

          {notifySupported && settings.notifyEnabled && (
            <div className="settings__row">
              <span className="settings__icon">
                <BellIcon size={16} />
              </span>
              <div className="settings__text">
                <div className="settings__label">提前分钟数</div>
              </div>
              <input
                className="field__input"
                style={{ width: 72, textAlign: 'center' }}
                type="number"
                min={1}
                max={60}
                value={settings.notifyLeadMinutes}
                onChange={(event) =>
                  onUpdateSettings({ notifyLeadMinutes: clamp(Number(event.target.value), 1, 60) })
                }
                aria-label="提醒提前分钟数"
              />
            </div>
          )}
        </section>

        {/* ---------------- 数据 ---------------- */}
        <section className="settings__group">
          <div className="settings__legend">数据</div>

          <button type="button" className="settings__row" onClick={onExport}>
            <span className="settings__icon">
              <DownloadIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">导出数据</div>
              <div className="settings__hint">下载 JSON 备份文件</div>
            </div>
          </button>

          <button type="button" className="settings__row" onClick={() => fileRef.current?.click()}>
            <span className="settings__icon">
              <UploadIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">导入数据</div>
              <div className="settings__hint">从备份文件恢复，将覆盖当前数据</div>
            </div>
          </button>

          <button type="button" className="settings__row" onClick={onClearAll}>
            <span className="settings__icon settings__icon--danger">
              <TrashIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label settings__label--danger">清空所有数据</div>
              <div className="settings__hint">删除全部课程与设置，无法撤销</div>
            </div>
          </button>
        </section>

        {/* ---------------- 关于 ---------------- */}
        <section className="settings__group">
          <div className="settings__legend">关于</div>
          <div className="settings__row">
            <span className="settings__icon">
              <InfoIcon size={16} />
            </span>
            <div className="settings__text">
              <div className="settings__label">课程表 v2.0</div>
              <div className="settings__hint">
                React 18 + TypeScript + Vite · 数据全部保存在本机，不上传云端
                <br />
                当前共 {courseCount} 门课程
              </div>
            </div>
          </div>
        </section>

        <p className="settings__footer">
          软件工程个人作业 · 2026 秋季学期
          <br />
          数据仅存于本机浏览器，清除浏览器数据会导致课表丢失，建议定期导出备份
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          // 重置 value，否则连续选择同一个文件不会再触发 change
          event.target.value = '';
        }}
      />
    </div>
  );
}
