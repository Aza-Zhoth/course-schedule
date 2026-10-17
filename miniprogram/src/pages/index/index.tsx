import { Text, View } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useCallback } from 'react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { CourseFormModal } from '../../components/CourseFormModal';
import { Header } from '../../components/Header';
import { CalendarIcon, PlusIcon, SparkleIcon } from '../../components/Icons';
import { LibraryView } from '../../components/LibraryView';
import { SectionsModal } from '../../components/SectionsModal';
import { SettingsView } from '../../components/SettingsView';
import { SmartImportModal } from '../../components/SmartImportModal';
import { TabBar } from '../../components/TabBar';
import { Toast } from '../../components/Toast';
import { TodayView } from '../../components/TodayView';
import { WeekGrid } from '../../components/WeekGrid';
import { NOTIFY_TEMPLATE_ID } from '../../constants';
import { useSchedule } from '../../hooks/useSchedule';
import { weekDateRangeLabel } from '../../utils/date';
import { exportDataToClipboard, importDataFromClipboard } from '../../utils/storage';

export default function Index() {
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

  /**
   * 迁移说明：H5 版是 Blob + <a download> 触发文件下载，小程序里没有这两个对象。
   * 现在改为把 JSON 写进系统剪贴板（见 utils/storage.ts 的说明）。
   */
  const handleExport = useCallback(async () => {
    try {
      await exportDataToClipboard(data);
      showToast('备份已复制到剪贴板，可粘贴到备忘录保存', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '导出失败', 'error');
    }
  }, [data, showToast]);

  /**
   * 迁移说明：H5 版是隐藏的 <input type="file">，小程序改用读剪贴板。
   */
  const handleImport = useCallback(async () => {
    try {
      const next = await importDataFromClipboard();
      askConfirm({
        title: '导入数据',
        message: `将用备份中的 ${next.courses.length} 门课程覆盖当前数据，是否继续？`,
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
  }, [askConfirm, replaceAll, showToast]);

  /**
   * 迁移说明：H5 版用浏览器的 Notification API 申请权限，小程序对应的是
   * 订阅消息 wx.requestSubscribeMessage —— 它必须在用户点击后调用，而且
   * 要提前在小程序后台申请模板、把模板 ID 填到 constants.ts 的 NOTIFY_TEMPLATE_ID。
   *
   * 没填模板 ID 时不做「假的成功」：只记住开关状态，并明确告诉用户还没接通推送。
   */
  const handleToggleNotify = useCallback(async () => {
    if (settings.notifyEnabled) {
      updateSettings({ notifyEnabled: false });
      showToast('已关闭上课提醒');
      return;
    }

    if (!notifySupported) {
      showToast('当前环境不支持订阅消息', 'error');
      return;
    }

    if (!NOTIFY_TEMPLATE_ID) {
      updateSettings({ notifyEnabled: true });
      showToast('已开启。注意：还需在小程序后台配置订阅消息模板才会真正推送', 'info');
      return;
    }

    try {
      /* Taro 4.3 这里有两个类型坑，都不影响运行，只影响编译：
         ① Option 是「tmplIds | entityIds 二选一」的联合，但 BaseOption 把
            支付宝端的 entityIds 声明成了必填，于是两个分支都永远无法满足；
         ② 返回值是 成功|失败 的联合，失败分支没有索引签名，不能直接下标取。
         所以参数走一次 Parameters<> 断言，返回值断言成字典 —— 都比 as any 收得紧。 */
      const option = { tmplIds: [NOTIFY_TEMPLATE_ID] } as Parameters<
        typeof Taro.requestSubscribeMessage
      >[0];
      const result = await Taro.requestSubscribeMessage(option);

      /* 返回对象的「动态键」就是模板 ID，值为 'accept' 表示用户同意订阅 */
      const feedback = (result as unknown as Record<string, string>)[NOTIFY_TEMPLATE_ID];

      if (feedback === 'accept') {
        updateSettings({ notifyEnabled: true });
        showToast('已开启上课提醒', 'success');
      } else {
        showToast('未授权订阅消息，提醒没有开启', 'error');
      }
    } catch {
      showToast('开启提醒失败，请稍后重试', 'error');
    }
  }, [settings.notifyEnabled, notifySupported, updateSettings, showToast]);

  /* ---------------- 渲染 ---------------- */

  const now = new Date();
  const hasAnyCourse = courses.length > 0;

  return (
    /* 迁移说明：H5 版靠 document.documentElement 上的 data-theme 属性切主题，
       小程序没有 document，改为在根节点挂 theme-dark 类，由 global.css 里的
       CSS 变量覆盖来实现深色模式。 */
    <View className={`app${settings.theme === 'dark' ? ' theme-dark' : ''}`}>
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

      <View className={`app__main${activeTab === 'settings' ? ' app__main--top' : ''}`}>
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
            <View className="empty">
              <View className="empty__icon">
                <CalendarIcon size={26} />
              </View>
              <Text className="empty__title">还没有课程</Text>
              <Text className="empty__text">
                点右下角的加号把第一门课加进来；也可以粘贴一段课表文字，我来识别导入。
              </Text>
              <View className="empty__actions">
                <View className="btn btn--primary btn--sm" onClick={() => openCreate()}>
                  <Text>添加课程</Text>
                </View>
                <View className="btn btn--secondary btn--sm" onClick={openImport}>
                  <SparkleIcon size={13} />
                  <Text>智能导入</Text>
                </View>
                <View className="btn btn--secondary btn--sm" onClick={loadSample}>
                  <Text>载入示例</Text>
                </View>
              </View>
            </View>
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
      </View>

      {/* 课程库自己有「添加课程」按钮、设置页是纯配置界面，都不需要浮动按钮；
          更重要的是悬浮按钮会盖住列表最后一行的操作按钮 */}
      {(activeTab === 'week' || activeTab === 'today') && (
        <View className="app__fab" onClick={() => openCreate()} aria-label="添加课程">
          <PlusIcon size={22} strokeWidth={2.4} />
        </View>
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
    </View>
  );
}
