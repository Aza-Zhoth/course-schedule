import { useCallback } from 'react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CourseFormModal } from './components/CourseFormModal';
import { Header } from './components/Header';
import { CalendarIcon, PlusIcon, SparkleIcon } from './components/Icons';
import { LibraryView } from './components/LibraryView';
import { SectionsModal } from './components/SectionsModal';
import { SettingsView } from './components/SettingsView';
import { SmartImportModal } from './components/SmartImportModal';
import { TabBar } from './components/TabBar';
import { Toast } from './components/Toast';
import { TodayView } from './components/TodayView';
import { WeekGrid } from './components/WeekGrid';
import { useSchedule } from './hooks/useSchedule';
import { weekDateRangeLabel } from './utils/date';
import { exportDataFile, importDataFromFile } from './utils/storage';

export function App() {
  const store = useSchedule();
  const {
    data,
    courses,
    sortedCourses,
    semester,
    sections,
    maxSections,
    settings,
    viewWeek,
    currentWeek,
    isCurrentWeek,
    today,
    cellMap,
    todayCourses,
    notifySupported,
    activeTab,
    setActiveTab,
    prevWeek,
    nextWeek,
    goToday,
    form,
    openCreate,
    openEdit,
    closeForm,
    saveCourse,
    removeCourse,
    updateSemester,
    updateSettings,
    updateSections,
    toggleTheme,
    importOpen,
    openImport,
    closeImport,
    importCourses,
    sectionsEditOpen,
    openSectionsEdit,
    closeSectionsEdit,
    replaceAll,
    clearAll,
    loadSample,
    toast,
    showToast,
    confirm,
    askConfirm,
    resolveConfirm,
  } = store;

  /* ---------------- 数据操作 ---------------- */

  const handleExport = useCallback(() => {
    exportDataFile(data);
    showToast('已导出备份文件', 'success');
  }, [data, showToast]);

  const handleImport = useCallback(
    async (file: File) => {
      try {
        const next = await importDataFromFile(file);
        askConfirm({
          title: '导入数据',
          message: `将用文件中的 ${next.courses.length} 门课程覆盖当前数据，是否继续？`,
          confirmText: '覆盖导入',
          danger: true,
          onConfirm: () => {
            replaceAll(next);
            showToast('导入成功', 'success');
          },
        });
      } catch (error) {
        showToast(error instanceof Error ? error.message : '导入失败', 'error');
      }
    },
    [askConfirm, replaceAll, showToast],
  );

  const handleToggleNotify = useCallback(async () => {
    if (settings.notifyEnabled) {
      updateSettings({ notifyEnabled: false });
      showToast('已关闭上课提醒');
      return;
    }

    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('当前浏览器不支持通知', 'error');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        updateSettings({ notifyEnabled: true });
        showToast('已开启上课提醒', 'success');
      } else {
        showToast('通知权限被拒绝，请在浏览器设置中开启', 'error');
      }
    } catch {
      showToast('开启提醒失败，请稍后重试', 'error');
    }
  }, [settings.notifyEnabled, updateSettings, showToast]);

  /* ---------------- 渲染 ---------------- */

  const now = new Date();
  const hasAnyCourse = courses.length > 0;

  return (
    <div className="app">
      {activeTab !== 'settings' && (
        <Header
          week={viewWeek}
          totalWeeks={semester.totalWeeks}
          rangeLabel={weekDateRangeLabel(semester.startDate, viewWeek)}
          semesterName={semester.name}
          isCurrentWeek={isCurrentWeek}
          theme={settings.theme}
          onPrev={prevWeek}
          onNext={nextWeek}
          onToday={goToday}
          onToggleTheme={toggleTheme}
          onOpenSettings={() => setActiveTab('settings')}
        />
      )}

      <main className={`app__main${activeTab === 'settings' ? ' app__main--top' : ''}`}>
        {activeTab === 'week' &&
          (hasAnyCourse ? (
            <WeekGrid
              cellMap={cellMap}
              sections={sections}
              startDate={semester.startDate}
              viewWeek={viewWeek}
              todayWeekday={isCurrentWeek ? today : null}
              onSelectCourse={openEdit}
              onCreateAt={(dayOfWeek, startSection) => openCreate({ dayOfWeek, startSection })}
            />
          ) : (
            <div className="empty">
              <span className="empty__icon">
                <CalendarIcon size={26} />
              </span>
              <p className="empty__title">还没有课程</p>
              <p className="empty__text">
                点右下角的加号把第一门课加进来；也可以粘贴一段课表文字，我来识别导入。
              </p>
              <div className="empty__actions">
                <button
                  type="button"
                  className="btn btn--primary btn--sm"
                  onClick={() => openCreate()}
                >
                  添加课程
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={openImport}>
                  <SparkleIcon size={13} />
                  智能导入
                </button>
                <button type="button" className="btn btn--secondary btn--sm" onClick={loadSample}>
                  载入示例
                </button>
              </div>
            </div>
          ))}

        {activeTab === 'today' && (
          <TodayView
            courses={todayCourses}
            sections={sections}
            semesterName={semester.name}
            currentWeek={currentWeek}
            today={today}
            now={now}
            onSelectCourse={openEdit}
          />
        )}

        {activeTab === 'library' && (
          <LibraryView
            courses={sortedCourses}
            onAdd={() => openCreate()}
            onSmartImport={openImport}
            onEdit={openEdit}
            onDelete={removeCourse}
            onLoadSample={loadSample}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            semester={semester}
            sections={sections}
            settings={settings}
            notifySupported={notifySupported}
            courseCount={courses.length}
            onUpdateSemester={updateSemester}
            onUpdateSettings={updateSettings}
            onToggleTheme={toggleTheme}
            onToggleNotify={handleToggleNotify}
            onOpenSections={openSectionsEdit}
            onExport={handleExport}
            onImport={handleImport}
            onClearAll={clearAll}
          />
        )}
      </main>

      {/* 课程库自己有「添加课程」按钮、设置页是纯配置界面，都不需要浮动按钮；
          更重要的是悬浮按钮会盖住列表最后一行的操作按钮 */}
      {(activeTab === 'week' || activeTab === 'today') && (
        <button
          type="button"
          className="app__fab"
          onClick={() => openCreate()}
          aria-label="添加课程"
        >
          <PlusIcon size={22} strokeWidth={2.4} />
        </button>
      )}

      <TabBar active={activeTab} onChange={setActiveTab} />

      <CourseFormModal
        open={form.open}
        editing={form.editing}
        defaults={form.defaults}
        totalWeeks={semester.totalWeeks}
        sections={sections}
        courseCount={courses.length}
        onSubmit={saveCourse}
        onClose={closeForm}
      />

      <SectionsModal
        open={sectionsEditOpen}
        sections={sections}
        courses={courses}
        onSave={updateSections}
        onClose={closeSectionsEdit}
      />

      <SmartImportModal
        open={importOpen}
        totalWeeks={semester.totalWeeks}
        maxSections={maxSections}
        sections={sections}
        existingCourses={courses}
        onImport={importCourses}
        onClose={closeImport}
      />

      <ConfirmDialog
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmText={confirm?.confirmText ?? '确定'}
        danger={confirm?.danger ?? false}
        onConfirm={() => resolveConfirm(true)}
        onCancel={() => resolveConfirm(false)}
      />

      <Toast toast={toast} />
    </div>
  );
}
