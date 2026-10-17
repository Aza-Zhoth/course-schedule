import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COURSE_COLORS, LIMITS, createDefaultData, createSampleCourses } from '../constants';
import type {
  AppData,
  AppSettings,
  Course,
  CourseDraft,
  Semester,
  SectionTime,
  TabKey,
  Weekday,
} from '../types';
import {
  buildCellMap,
  compareCourses,
  findConflicts,
  getCoursesOfDay,
  validateCourse,
} from '../utils/course';
import { calcCurrentWeek, clamp, todayWeekday } from '../utils/date';
import { generateId } from '../utils/id';
import { loadData, saveData } from '../utils/storage';

export type ToastType = 'info' | 'success' | 'error';

export interface ToastState {
  id: number;
  message: string;
  type: ToastType;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
}

export interface ConfirmState {
  title: string;
  message: string;
  confirmText: string;
  danger: boolean;
  onConfirm: () => void;
}

export interface CourseFormState {
  open: boolean;
  /** 非空 = 编辑模式 */
  editing: Course | null;
  /** 从空白格进入时预填的星期与节次 */
  defaults: { dayOfWeek: Weekday; startSection: number } | null;
}

/**
 * 应用唯一的全局状态出口。
 *
 * 设计说明（对应需求文档 §4.7）：全局状态只有「课表数据 + 用户偏好 + 界面瞬时状态」
 * 三块，用一个自定义 Hook 集中管理即可，无需引入 Redux / Zustand 之类的状态库。
 */
export function useSchedule() {
  /* ---------------- 持久化状态 ---------------- */

  const [data, setData] = useState<AppData>(loadData);

  /* ---------------- 界面状态 ---------------- */

  const [activeTab, setActiveTab] = useState<TabKey>('week');

  /** manualWeek 为 null 表示「跟随今天」，一旦用户手动翻周便固定住 */
  const [manualWeek, setManualWeek] = useState<number | null>(null);

  const [toast, setToast] = useState<ToastState | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState | null>(null);
  const [form, setForm] = useState<CourseFormState>({
    open: false,
    editing: null,
    defaults: null,
  });

  /** 智能导入弹窗与作息编辑弹窗的开关 */
  const [importOpen, setImportOpen] = useState(false);
  const [sectionsEditOpen, setSectionsEditOpen] = useState(false);

  /* ---------------- 派生值 ---------------- */

  const currentWeek = useMemo(
    () => calcCurrentWeek(data.semester.startDate, data.semester.totalWeeks),
    [data.semester.startDate, data.semester.totalWeeks],
  );

  const viewWeek = clamp(manualWeek ?? currentWeek, 1, data.semester.totalWeeks);

  const isCurrentWeek = viewWeek === currentWeek;

  /** 当前作息表的节次数 —— 节次相关的校验上限都跟着它走 */
  const maxSections = data.sections.length;

  const today = useMemo(() => todayWeekday(), []);

  const cellMap = useMemo(
    () => buildCellMap(data.courses, viewWeek),
    [data.courses, viewWeek],
  );

  // 「今日」页永远展示真实今天的课程，不受用户翻周影响
  const todayCourses = useMemo(
    () => getCoursesOfDay(data.courses, today, currentWeek),
    [data.courses, today, currentWeek],
  );

  const sortedCourses = useMemo(() => [...data.courses].sort(compareCourses), [data.courses]);

  const notifySupported = useMemo(
    () => typeof window !== 'undefined' && 'Notification' in window,
    [],
  );

  /* ---------------- Toast ---------------- */

  const toastSeq = useRef(0);
  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    toastSeq.current += 1;
    setToast({ id: toastSeq.current, message, type });
  }, []);

  // 自动消失。用 toast.id 做依赖，连续两次相同文案也能各显示一次
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  /* ---------------- 副作用 ---------------- */

  // 统一在这里落盘，避免在 setState 的 updater 里做副作用
  const storageWarned = useRef(false);
  useEffect(() => {
    const ok = saveData(data);
    if (!ok && !storageWarned.current) {
      storageWarned.current = true;
      showToast('本地存储不可用，数据可能无法保留', 'error');
    }
  }, [data, showToast]);

  // 主题写入 DOM，并同步浏览器地址栏 / 状态栏颜色
  useEffect(() => {
    document.documentElement.dataset.theme = data.settings.theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', data.settings.theme === 'dark' ? '#101617' : '#0D9488');
    }
  }, [data.settings.theme]);

  /* ---------------- 确认弹窗 ---------------- */

  const askConfirm = useCallback((options: ConfirmOptions) => {
    setConfirm({
      title: options.title,
      message: options.message,
      confirmText: options.confirmText ?? '确定',
      danger: options.danger ?? false,
      onConfirm: options.onConfirm,
    });
  }, []);

  const resolveConfirm = useCallback(
    (accepted: boolean) => {
      const pending = confirm;
      setConfirm(null);
      if (accepted && pending) pending.onConfirm();
    },
    [confirm],
  );

  /* ---------------- 周次导航 ---------------- */

  const setViewWeek = useCallback(
    (week: number) => {
      setManualWeek(clamp(Math.round(week), 1, data.semester.totalWeeks));
    },
    [data.semester.totalWeeks],
  );

  const prevWeek = useCallback(() => setViewWeek(viewWeek - 1), [setViewWeek, viewWeek]);
  const nextWeek = useCallback(() => setViewWeek(viewWeek + 1), [setViewWeek, viewWeek]);
  const goToday = useCallback(() => setManualWeek(null), []);

  /* ---------------- 表单开关 ---------------- */

  const openCreate = useCallback(
    (defaults?: { dayOfWeek: Weekday; startSection: number }) => {
      setForm({ open: true, editing: null, defaults: defaults ?? null });
    },
    [],
  );

  const openEdit = useCallback((course: Course) => {
    setForm({ open: true, editing: course, defaults: null });
  }, []);

  const closeForm = useCallback(() => {
    setForm({ open: false, editing: null, defaults: null });
  }, []);

  /* ---------------- 课程增删改 ---------------- */

  const saveCourse = useCallback(
    (draft: CourseDraft) => {
      const editingId = form.editing?.id ?? null;
      const cleaned: CourseDraft = {
        ...draft,
        name: draft.name.trim(),
        teacher: draft.teacher.trim(),
        location: draft.location.trim(),
        note: draft.note?.trim() ? draft.note.trim() : undefined,
      };

      const courseCount = editingId ? data.courses.length - 1 : data.courses.length;
      const check = validateCourse(cleaned, courseCount, maxSections);
      if (!check.valid) {
        const firstError = Object.values(check.errors)[0];
        showToast(firstError ?? '请检查表单内容', 'error');
        return;
      }

      const apply = () => {
        const now = new Date().toISOString();
        setData((prev) => {
          if (editingId) {
            return {
              ...prev,
              courses: prev.courses.map((item) =>
                item.id === editingId ? { ...item, ...cleaned, updatedAt: now } : item,
              ),
            };
          }
          const course: Course = {
            ...cleaned,
            id: generateId(),
            createdAt: now,
            updatedAt: now,
          };
          return { ...prev, courses: [...prev.courses, course] };
        });
        setForm({ open: false, editing: null, defaults: null });
        showToast(editingId ? '已更新课程' : '已添加课程', 'success');
      };

      const conflicts = findConflicts(cleaned, data.courses, editingId);
      if (conflicts.length > 0) {
        // 冲突不阻断保存：现实中确实存在合班课、短学期课等合理重叠，
        // 硬拦会误伤用户，因此交给用户自己决定（需求文档 §3.6）。
        askConfirm({
          title: '时间冲突',
          message: `该时段已有《${conflicts[0].name}》，仍要保存吗？`,
          confirmText: '仍然保存',
          danger: true,
          onConfirm: apply,
        });
        return;
      }

      apply();
    },
    [askConfirm, data.courses, form.editing, showToast],
  );

  const removeCourse = useCallback(
    (course: Course) => {
      askConfirm({
        title: '删除课程',
        message: `确定要删除《${course.name}》吗？此操作无法撤销。`,
        confirmText: '删除',
        danger: true,
        onConfirm: () => {
          setData((prev) => ({
            ...prev,
            courses: prev.courses.filter((item) => item.id !== course.id),
          }));
          setForm((prev) =>
            prev.editing?.id === course.id ? { open: false, editing: null, defaults: null } : prev,
          );
          showToast('已删除课程', 'success');
        },
      });
    },
    [askConfirm, showToast],
  );

  /* ---------------- 学期与偏好 ---------------- */

  const updateSemester = useCallback((patch: Partial<Semester>) => {
    setData((prev) => ({ ...prev, semester: { ...prev.semester, ...patch } }));
    // 学期起始日或总周数变了，「当前周」的含义就变了，回到跟随今天
    if (patch.startDate !== undefined || patch.totalWeeks !== undefined) {
      setManualWeek(null);
    }
  }, []);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setData((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const toggleTheme = useCallback(() => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, theme: prev.settings.theme === 'dark' ? 'light' : 'dark' },
    }));
  }, []);

  /* ---------------- 作息时间表 ---------------- */

  /**
   * 更新作息表。节次数变少时，把引用了被删节次的课程钳到新范围
   * （编辑弹窗已经拦截「正在被引用的节次」，这里是最后一道防线）。
   */
  const updateSections = useCallback((next: SectionTime[]) => {
    setData((prev) => {
      const max = next.length;
      return {
        ...prev,
        sections: next,
        courses: prev.courses.map((course) => {
          const start = Math.min(course.startSection, max);
          const end = Math.min(course.endSection, max);
          if (start === course.startSection && end === course.endSection) return course;
          return { ...course, startSection: start, endSection: Math.max(end, start), updatedAt: new Date().toISOString() };
        }),
      };
    });
  }, []);

  const openSectionsEdit = useCallback(() => setSectionsEditOpen(true), []);
  const closeSectionsEdit = useCallback(() => setSectionsEditOpen(false), []);

  /* ---------------- 智能导入 ---------------- */

  const openImport = useCallback(() => setImportOpen(true), []);
  const closeImport = useCallback(() => setImportOpen(false), []);

  /**
   * 批量导入课程草稿（来自智能解析或手动粘贴）。
   * 逐条校验，不合法的跳过；冲突不拦截（与单条保存的策略一致，交给用户自己判断）。
   * 注意：校验与计数都在 setData 之前同步完成 ——
   * React 18 的 updater 是异步执行的，把计数放在 updater 里会永远拿到 0。
   */
  const importCourses = useCallback(
    (drafts: CourseDraft[]): number => {
      if (drafts.length === 0) return 0;
      const now = new Date().toISOString();
      const colorCount = COURSE_COLORS.length;
      let conflicts = 0;

      const toAdd: Course[] = [];
      for (const draft of drafts) {
        const cleaned: CourseDraft = {
          ...draft,
          name: draft.name.trim(),
          teacher: draft.teacher.trim(),
          location: draft.location.trim(),
        };
        if (data.courses.length + toAdd.length >= LIMITS.MAX_COURSES) break;
        if (!validateCourse(cleaned, data.courses.length + toAdd.length, maxSections).valid) continue;
        if (findConflicts(cleaned, [...data.courses, ...toAdd], null).length > 0) conflicts += 1;
        toAdd.push({
          ...cleaned,
          id: generateId(),
          color: cleaned.color || COURSE_COLORS[toAdd.length % colorCount].value,
          createdAt: now,
          updatedAt: now,
        });
      }

      if (toAdd.length > 0) {
        setData((prev) => ({ ...prev, courses: [...prev.courses, ...toAdd] }));
      }

      showToast(
        toAdd.length > 0
          ? `已导入 ${toAdd.length} 门课程${conflicts > 0 ? `，其中 ${conflicts} 门与现有课程时间重叠` : ''}`
          : '没有可导入的课程，请检查识别结果',
        toAdd.length > 0 ? 'success' : 'error',
      );
      return toAdd.length;
    },
    [data.courses, maxSections, showToast],
  );

  /* ---------------- 批量操作 ---------------- */

  const replaceAll = useCallback((next: AppData) => {
    setData(next);
    setManualWeek(null);
  }, []);

  const clearAll = useCallback(() => {
    askConfirm({
      title: '清空所有数据',
      message: '将删除全部课程并重置学期设置，此操作无法撤销。建议先导出备份。',
      confirmText: '清空',
      danger: true,
      onConfirm: () => {
        setData(createDefaultData());
        setManualWeek(null);
        showToast('已清空全部数据', 'success');
      },
    });
  }, [askConfirm, showToast]);

  const loadSample = useCallback(() => {
    const now = new Date().toISOString();
    const courses: Course[] = createSampleCourses().map((draft) => ({
      ...draft,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }));
    setData((prev) => ({ ...prev, courses }));
    showToast('已载入示例课表', 'success');
  }, [showToast]);

  /* ---------------- 对外接口 ---------------- */

  return {
    // 数据
    data,
    courses: data.courses,
    sortedCourses,
    semester: data.semester,
    sections: data.sections,
    maxSections,
    settings: data.settings,
    // 派生
    currentWeek,
    viewWeek,
    isCurrentWeek,
    today,
    cellMap,
    todayCourses,
    notifySupported,
    // 导航
    activeTab,
    setActiveTab,
    prevWeek,
    nextWeek,
    goToday,
    setViewWeek,
    // 表单
    form,
    openCreate,
    openEdit,
    closeForm,
    saveCourse,
    removeCourse,
    // 设置
    updateSemester,
    updateSettings,
    updateSections,
    toggleTheme,
    // 智能导入 / 作息编辑
    importOpen,
    openImport,
    closeImport,
    importCourses,
    sectionsEditOpen,
    openSectionsEdit,
    closeSectionsEdit,
    // 批量
    replaceAll,
    clearAll,
    loadSample,
    // 反馈
    toast,
    showToast,
    confirm,
    askConfirm,
    resolveConfirm,
  };
}

/** Hook 的返回类型，供子组件按需取用 */
export type ScheduleStore = ReturnType<typeof useSchedule>;
