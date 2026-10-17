# 课程表应用 · 软件需求规格说明书

**Course Schedule App — Software Requirements Specification**

| 项目 | 内容 |
|------|------|
| 项目名称 | 课程表（Course Schedule） |
| 文档版本 | v2.0 |
| 编制日期 | 2026-09-16 |
| 文档状态 | 已评审 · 作为开发与验收基线 |
| 适用课程 | 软件工程 · 个人作业 |
| 目标平台 | 移动端浏览器（H5）为主，预留微信小程序迁移路径 |

### 修订记录

| 版本 | 日期 | 修订内容 | 作者 |
|------|------|----------|------|
| v1.0 | 2026-09-16 | 初稿：核心功能 + 数据模型 + 组件树 | 晓悟 |
| v2.0 | 2026-09-16 | 重构为六维度结构；补充技术路线决策、风险表、手机调试方案、文档规范 | 晓悟 |
| v2.1 | 2026-10-02 | 新增 F18 智能导入（文字解析 + 预览确认）、F19 节次作息可配置；数据模型 v3（作息表迁入 AppData） | 晓悟 |

### 术语表

| 术语 | 含义 |
|------|------|
| 节次（Section） | 一天内课程的时间槽，本系统约定 1~12 节 |
| 周次（Week） | 学期内的教学周序号，本系统约定 1~30 周 |
| 单双周 | 课程仅在奇数周或偶数周上课的排课方式 |
| 冲突 | 同一星期、节次区间重叠、且周次区间也重叠的两门课程 |
| 当前周 | 依据学期开始日期自动推算出的、今天所属的教学周 |

---

## 1. 项目概述

### 1.1 背景与问题

大学生每周面对 8~15 门课程，排课信息分散在教务系统网页、班级群截图、纸质课表之间。教务系统通常只提供「整学期大表」，存在三个痛点：

1. **看不快**：打开教务系统要登录、点多层菜单，只为确认「下一节在哪上课」。
2. **看不懂**：教务系统的表格只有课程名，不区分单双周与起止周，容易跑空教室。
3. **带不走**：截图无法搜索、无法修改、临时调课就失效。

### 1.2 项目目标

做一款**零安装、零登录、零后端**的个人课表工具，让用户在 3 秒内回答三个问题：

- 今天还有几节课？几点上？在哪上？
- 现在是第几周？这门课这周上不上？
- 下周的整体节奏是什么样？

**成功标准**：用户从打开到看清「下一节课信息」的操作步数 ≤ 1 步（0 次点击，首屏即见）。

### 1.3 目标用户与典型场景

| 维度 | 说明 |
|------|------|
| 主要用户 | 在校大学生（本科 / 专科 / 研究生） |
| 用户特征 | 非技术背景；手机为主要设备；对加载速度和界面密度敏感 |
| 用户规模 | 单机单用户，数据仅存本机，不上云 |
| 使用频次 | 日均 3~5 次（课间、睡前、起床后） |

**典型场景**

| 编号 | 场景 | 用户诉求 |
|------|------|----------|
| S1 | 学期初录课表 | 把教务系统里的 12 门课快速录入，支持一节课占多个节次 |
| S2 | 课间查下一节 | 打开就看今日课程，一眼看到地点和节次 |
| S3 | 临时调课 | 改教室 / 改时间，30 秒内改完并立即生效 |
| S4 | 查整周节奏 | 翻到下周看看哪天满课，方便安排自习与兼职 |
| S5 | 换手机 | 导出 JSON，在新手机上导入，课表无损迁移 |

### 1.4 范围边界

| 范围内（本期做） | 范围外（本期不做，理由） |
|------------------|--------------------------|
| 本地课表增删改查、周次切换、冲突检测 | 教务系统对接 / 自动导入（无公开接口，涉及鉴权） |
| 数据导入导出（JSON） | 云端同步与账号体系（需要后端与合规成本） |
| 浅色 / 深色主题 | 社交分享、同学间课表互看（涉及隐私） |
| 上课提醒（本地通知） | 成绩管理、考勤打卡（偏离课表核心） |
| 移动端浏览器适配 | iOS / Android 原生 App（无安装收益） |

### 1.5 技术路线决策

原需求为「React + TypeScript 开发微信小程序」。经权衡，本期采用 **H5 主线 + 小程序预留** 的双轨策略：

| 方案 | 技术栈 | 优点 | 代价 | 结论 |
|------|--------|------|------|------|
| A. 纯 H5 | React 18 + TS + Vite | 零门槛运行、手机浏览器直接调试、微信内可直接打开、无需 AppID 与审核 | 无法调用微信原生能力（如订阅消息） | **本期采用** |
| B. Taro | Taro 4 + React + TS | 一套代码编译到微信小程序 + H5，后期迁移成本低 | 需微信开发者工具与 AppID，真机调试链路长，组件库受限 | 预留，见 §1.5.1 |

**理由**：本项目 100% 的功能（网格渲染、表单、localStorage）都是纯前端能力，H5 已完全覆盖。选 A 可以让「开发 → 手机验证」的反馈周期从「分钟级」压到「秒级」，符合敏捷迭代要求。

#### 1.5.1 小程序迁移预留

代码层面为迁移做好三件事，后续切换 Taro 时改动可控：

1. **视图层与逻辑层分离**：所有业务逻辑（校验、冲突检测、周次计算）放在 `src/utils/` 与 `src/hooks/`，与 React 组件解耦。
2. **不用浏览器专有 API 直连**：存储读写统一走 `src/utils/storage.ts`，后续替换为 `Taro.setStorageSync` 只需改一个文件。
3. **不依赖 CSS 高级特性做布局**：网格用 `display: grid`（小程序支持），避免 `position: sticky` 等小程序弱支持特性承载关键信息。

---

## 2. 功能需求

### 2.1 核心功能（P0 — 必须有）

| 编号 | 功能 | 用户故事 | 验收标准 |
|------|------|----------|----------|
| **F01** | 课程登记 | 作为学生，我希望添加一门课程（名称 / 教师 / 地点 / 星期 / 起止节次 / 起止周次 / 颜色），以便把课表录进系统 | ① 必填项为空时提交被拦截并给出字段级提示；② 保存成功后课程立即出现在对应格子；③ 刷新页面数据不丢失 |
| **F02** | 周课表展示 | 作为学生，我希望以「星期 × 节次」网格看到整周课程，以便一眼看清本周安排 | ① 正确渲染 7 列 × 12 行网格；② 单元格显示课程名与地点；③ 每门课按自身颜色区分；④ 跨节次的课程纵向连通显示 |
| **F03** | 课程编辑 | 作为学生，我希望点击某节课就能改信息，以便应对调课、换教室 | ① 点击格子打开表单且字段已预填；② 修改保存后视图即时更新；③ `updatedAt` 被刷新 |
| **F04** | 课程删除 | 作为学生，我希望删除不再上的课，以便课表保持整洁 | ① 删除前弹出确认框并显示课程名；② 确认后从视图与存储中彻底移除；③ 取消则无任何副作用 |
| **F05** | 周次导航 | 作为学生，我希望看到「现在是第 X 周」并能前后翻周，以便对照查看非本周的课 | ① 依据学期开始日期自动推算当前周；② 可手动前后切换，边界为 1 ~ 总周数；③ 切换后课表按该周筛选课程 |
| **F06** | 数据持久化 | 作为学生，我希望关掉页面再打开，课表还在 | ① 每次增删改后立即写入本地存储；② 冷启动自动恢复；③ 存储内容损坏时优雅降级为初始数据并提示 |

### 2.2 辅助功能（P1 / P2 — 锦上添花）

| 编号 | 功能 | 说明 | 优先级 |
|------|------|------|--------|
| **F07** | 今日课程 | 独立的「今日」页，按节次顺序列出当天课程 | P1 |
| **F08** | 空状态引导 | 无课程时展示引导文案与添加入口，而非空白网格 | P1 |
| **F09** | 冲突检测 | 保存时检测同星期 + 节次重叠 + 周次重叠的课程，提示并允许用户确认继续 | P1 |
| **F10** | 课程颜色标记 | 6 色预设色板，按课程颜色区分格子 | P1 |
| **F11** | 课程库视图 | 以列表形式浏览全部课程，支持编辑与删除 | P1 |
| **F12** | 一键清空 | 设置页提供清空全部数据入口（二次确认） | P2 |
| **F13** | 主题切换 | 浅色 / 深色主题，偏好写入本地存储 | P2 |
| **F14** | 数据导入导出 | 导出 JSON 备份、导入 JSON 恢复 | P2 |
| **F15** | 上课提醒 | 上课前 10 分钟提醒（依赖浏览器通知权限，权限被拒时静默降级） | P2 |
| **F16** | 学期参数设置 | 可修改学期名称、开始日期、总周数 | P2 |
| **F17** | Toast 轻提示 | 保存 / 删除 / 导入等操作给出非阻塞反馈 | P2 |
| **F18** | 智能导入（v2.1） | 粘贴课表文字（教务系统复制 / 截图提取文字），自动解析出星期、节次、周次、地点、教师；解析结果先进入可编辑预览，用户核对勾选后才批量写入。图片不做端内 OCR，走「微信提取文字 → 粘贴」路径 | P1 |
| **F19** | 节次作息可配置（v2.1） | 每节上下课时间可改、节次数可增删（4~16）、可恢复默认；改动实时反映到周课表与今日页；删除被课程引用的节次时拦截提示 | P1 |

### 2.3 优先级矩阵

```
重要性高 ↑
   │  F01 F02 F05 F06        F03 F04
   │  （地基）                （地基的延伸）
   │
   │  F07 F09 F11            F08 F10
   │  （体验关键）            （体验优化）
   │
   │  F13 F14                F12 F15 F16 F17
   └──────────────────────────────────────→ 实现成本高
```

**迭代建议**：第一期只做 F01~F06 + F07 + F08，即可交付一个「能用」的课表；第二期补 F09~F11；第三期做 F12~F17。

### 2.4 非功能需求

| 维度 | 指标 | 验证方式 |
|------|------|----------|
| 性能 | 首屏渲染 < 1s（4G）；任意操作响应 < 100ms | Chrome DevTools Performance |
| 容量 | 100 门课程下网格滚动不掉帧（≥ 55fps） | 手动压测 |
| 兼容 | iOS Safari 15+ / Android Chrome 100+ / 微信内置浏览器 | 真机验证 |
| 适配 | 320px ~ 768px 宽度无横向滚动条（课表网格除外） | 响应式断点测试 |
| 可访问性 | 表单控件有关联 label；可键盘操作；对比度 ≥ 4.5:1 | Lighthouse a11y |
| 健壮性 | 本地存储数据非法时自动回退默认值，不白屏 | 手工篡改 localStorage 测试 |
| 安全 | 所有用户输入渲染前转义，防 XSS；不采集任何个人信息 | 代码审查 |
| 可维护性 | TypeScript strict 模式零错误；零 `any` | `tsc --noEmit` |

---

## 3. 数据模型建议

### 3.1 实体关系

```
┌──────────────────┐          ┌──────────────────┐
│    Semester      │          │     Course       │
│  （学期，单例）   │          │   （课程，多例）  │
├──────────────────┤          ├──────────────────┤
│ id               │          │ id               │
│ name             │          │ name             │
│ startDate        │◄────────┐│ teacher          │
│ totalWeeks       │  用于计算 ││ location         │
└──────────────────┘  当前周   ││ dayOfWeek  1~7   │
                              ││ startSection     │
                     ┌────────┤│ endSection       │
                     │        ││ startWeek        │
              ┌──────┴─────┐  ││ endWeek          │
              │  Lesson    │  ││ color            │
              │（展开的课次）│  ││ note?            │
              ├────────────┤  ││ createdAt        │
              │ date       │  ││ updatedAt        │
              │ section    │◄─┘└──────────────────┘
              │ courseRef  │
              └────────────┘
```

**设计取舍**：只持久化 `Semester` 与 `Course` 两个实体。`Lesson`（某个具体日期的某节课）不落库，而是由 `Course` + 当前周次在运行时**按需派生**。这样数据量恒定、无重复存储，改一节课的时间也不会产生脏数据。

### 3.2 TypeScript 接口定义

```typescript
/** 星期序号：1=周一 … 7=周日 */
type Weekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 课程 —— 一条排课记录，代表「每周这天这几节，这些周次上」 */
interface Course {
  id: string;             // 唯一标识，格式：c_<timestamp>_<random>
  name: string;           // 课程名，≤ 30 字符，必填
  teacher: string;        // 任课教师，≤ 20 字符，必填
  location: string;       // 上课地点，≤ 30 字符，必填
  dayOfWeek: Weekday;     // 星期，1~7
  startSection: number;   // 起始节次，1~12
  endSection: number;     // 结束节次，1~12，且 ≥ startSection
  startWeek: number;      // 起始周次，1~30
  endWeek: number;        // 结束周次，1~30，且 ≥ startWeek
  weekParity: WeekParity; // 单双周，'all' | 'odd' | 'even'
  color: string;          // 十六进制色值，取自预设色板
  note?: string;          // 备注，≤ 30 字符，可选
  createdAt: string;      // 创建时间，ISO 8601
  updatedAt: string;      // 更新时间，ISO 8601
}

/** 单双周类型 */
type WeekParity = 'all' | 'odd' | 'even';

/** 学期 —— 全局唯一，用于推算当前周与周次范围 */
interface Semester {
  id: string;
  name: string;           // 如「2026-2027 学年 秋季学期」
  startDate: string;      // 学期第一周的周一，格式 YYYY-MM-DD
  totalWeeks: number;     // 总教学周数，默认 20，范围 1~30
}

/** 一节课的作息时间（v3 新增） */
interface SectionTime {
  index: number;   // 节次序号，从 1 开始连续编号
  start: string;   // 'HH:mm' 24 小时制
  end: string;
}

/** 应用数据根节点 —— 也是导出 / 导入的文件结构 */
interface AppData {
  version: number;        // 数据结构版本号，v3 起作息表迁入数据
  semester: Semester;
  sections: SectionTime[]; // 全校作息表（v3 新增），长度 4~16
  courses: Course[];
  settings: AppSettings;
}

/** 用户偏好 */
interface AppSettings {
  theme: 'light' | 'dark';
  notifyEnabled: boolean;
  notifyLeadMinutes: number;   // 提前提醒分钟数，默认 10
}
```

### 3.3 枚举与常量

```typescript
/** 星期选项 */
export const WEEKDAYS = [
  { value: 1, label: '周一', short: '一' },
  { value: 2, label: '周二', short: '二' },
  { value: 3, label: '周三', short: '三' },
  { value: 4, label: '周四', short: '四' },
  { value: 5, label: '周五', short: '五' },
  { value: 6, label: '周六', short: '六' },
  { value: 7, label: '周日', short: '日' },
] as const;

/** 节次时间表 —— v3 起为「首次启动 / 恢复默认」的模板，
    真实作息存在 AppData.sections，用户可在「我的 → 节次作息」中修改 */
export const DEFAULT_SECTIONS = [
  { index: 1,  start: '08:00', end: '08:45' },
  { index: 2,  start: '08:55', end: '09:40' },
  { index: 3,  start: '10:00', end: '10:45' },
  { index: 4,  start: '10:55', end: '11:40' },
  { index: 5,  start: '14:00', end: '14:45' },
  { index: 6,  start: '14:55', end: '15:40' },
  { index: 7,  start: '16:00', end: '16:45' },
  { index: 8,  start: '16:55', end: '17:40' },
  { index: 9,  start: '19:00', end: '19:45' },
  { index: 10, start: '19:55', end: '20:40' },
  { index: 11, start: '20:50', end: '21:35' },
  { index: 12, start: '21:45', end: '22:30' },
] as const;

/** 课程色板 —— 6 色，饱和度均 < 80%，保证白字可读（对比度 ≥ 4.5:1） */
export const COURSE_COLORS = [
  { value: '#D9534F', label: '砖红' },
  { value: '#D98324', label: '琥珀' },
  { value: '#B8912A', label: '麦黄' },
  { value: '#5C8A4A', label: '苔绿' },
  { value: '#3D7E9A', label: '青蓝' },
  { value: '#7E5C86', label: '藕紫' },
] as const;

/** 约束上限 */
export const LIMITS = {
  MAX_SECTIONS: 12,
  MAX_WEEKS: 30,
  MAX_COURSES: 200,
  NAME_MAX: 30,
  TEACHER_MAX: 20,
  LOCATION_MAX: 30,
} as const;

/** 本地存储键名 */
export const STORAGE_KEY = 'course-schedule:v2';
```

### 3.4 存储方案

| 维度 | 方案 |
|------|------|
| 介质 | `window.localStorage` |
| 键名 | `course-schedule:v2`（带版本号，便于结构升级） |
| 值 | `AppData` 的 JSON 字符串 |
| 写入时机 | 任一增 / 删 / 改操作后同步写入（数据量小，无需防抖） |
| 读取时机 | 应用挂载时读取一次，存入 React state |
| 容量 | 100 门课约 40KB，远低于 5MB 上限 |
| 降级 | 解析失败或结构校验不通过 → 使用默认数据 + Toast 提示，不抛异常 |
| 迁移 | 读取时比对 `AppData.version`，低于当前版本则执行迁移函数链 |

### 3.5 数据校验规则

| 字段 | 规则 | 错误提示文案 |
|------|------|--------------|
| name | 去空格后非空，长度 ≤ 30 | 请输入课程名称 |
| teacher | 去空格后非空，长度 ≤ 20 | 请输入教师姓名 |
| location | 去空格后非空，长度 ≤ 30 | 请输入上课地点 |
| dayOfWeek | 整数，1 ≤ v ≤ 7 | 请选择星期 |
| startSection / endSection | 整数，1 ≤ start ≤ end ≤ 12 | 节次范围不合法，结束节次不能早于起始节次 |
| startWeek / endWeek | 整数，1 ≤ start ≤ end ≤ 30 | 周次范围不合法，结束周不能早于起始周 |
| course 总数 | ≤ 200 | 课程数量已达上限 |

### 3.6 冲突检测算法

**判定条件**（三条同时成立即为冲突）：

```
冲突(a, b) ⇔ a.id ≠ b.id
          ∧ a.dayOfWeek = b.dayOfWeek
          ∧ 节次区间相交：a.startSection ≤ b.endSection ∧ b.startSection ≤ a.endSection
          ∧ 周次区间相交：a.startWeek   ≤ b.endWeek      ∧ b.startWeek   ≤ a.endWeek
          ∧ 单双周相交：parityOverlap(a.weekParity, b.weekParity)
```

「区间相交」用 `A.start ≤ B.end && B.start ≤ A.end` 判断，比逐一枚举星期更高效，且天然覆盖「完全包含」的情形。单双周相交规则：

| a \ b | all | odd | even |
|-------|-----|-----|------|
| **all** | 冲突 | 冲突 | 冲突 |
| **odd** | 冲突 | 冲突 | 不冲突 |
| **even** | 冲突 | 不冲突 | 冲突 |

**处理方式**：检出冲突时不阻断保存，而是提示「该时段已有《高等数学》，仍要保存吗？」，由用户决定。理由：现实中确实存在合班课、短学期课等合理重叠，硬阻断会误伤。

---

## 4. 页面与组件拆分建议

### 4.1 信息架构

```
课程表 App
├── 周课表（默认首页）
├── 今日
├── 课程库
└── 我的（设置）
```

四个一级页面用底部 Tab 切换。**为什么不做侧边抽屉 / 路由跳转**：移动端拇指热区在屏幕底部三分之一，Tab Bar 是单手可达性最好的导航形态；且四个页面均为「高频直达」，无层级关系，不适合做多级路由。

### 4.2 页面清单

| 页面 | 路由标识 | 核心内容 | 主要交互 |
|------|----------|----------|----------|
| 周课表页 | `week` | 顶部周次切换条 + 7×12 网格 | 点空白格新增、点课程格编辑、左右翻周 |
| 今日页 | `today` | 当天日期卡 + 课程时间轴列表 | 点课程卡编辑 |
| 课程库页 | `library` | 全部课程的列表 + 添加按钮 | 编辑、删除、搜索 |
| 我的页 | `settings` | 学期配置、主题、提醒、导入导出、清空 | 开关、输入、确认弹窗 |
| 课程表单（浮层） | — | 录入 / 编辑课程的全部字段 | 校验、色板选择、保存 / 取消 |
| 确认弹窗（浮层） | — | 危险操作二次确认 | 确定 / 取消 |

### 4.3 页面线框

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ 课程表        第 3 周  ‹ ›  ⚙ │   │ 9月16日 星期三               │
├──┬───┬───┬───┬───┬───┬───┬───┤   ├──────────────────────────────┤
│  │一 │二 │三 │四 │五 │六 │日 │   │ 09:00 ┃ 高等数学             │
├──┼───┼───┼───┼───┼───┼───┼───┤   │       ┃ 张老师 · 教301       │
│1 │   │高 │   │   │   │   │   │   │       ┃ 第1-2节               │
│2 │   │高 │   │   │   │   │   │   ├──────────────────────────────┤
│3 │   │   │   │英 │   │   │   │   │ 14:00 ┃ 数据结构             │
│4 │   │   │   │英 │   │   │   │   │       ┃ 王老师 · 实验楼402    │
│  │   │   │   │   │   │   │   │   │       ┃ 第5-6节               │
├──┴───┴───┴───┴───┴───┴───┴───┤   └──────────────────────────────┘
│  周课表 │ 今日 │ 课程库 │ 我的 │
└──────────────────────────────┘
```

### 4.4 组件树

```
<App>                                   ← 状态容器：数据 + 当前 Tab + 当前周
 ├─ <Header>                            ← 周次切换、主题快捷键、设置入口
 │    props: week, weekRange, totalWeeks, onPrev, onNext, onToggleTheme
 │
 ├─ <WeekGrid>                          ← 7 × 12 课表格
 │    props: courses, week, todayWeekday, onSelectCourse, onCreateAt
 │    │
 │    ├─ <GridHeaderCell>               ← 星期表头（今天高亮）
 │    ├─ <SectionLabel>                 ← 左侧节次轴（序号 + 起始时间）
 │    └─ <CourseChip>                   ← 单个课程块（含跨节次续格）
 │
 ├─ <TodayView>                         ← 今日课程时间轴
 │    props: courses, todayWeekday, week, onSelectCourse
 │    └─ <CourseCard>
 │
 ├─ <LibraryView>                       ← 课程库列表
 │    props: courses, onAdd, onEdit, onDelete
 │    └─ <CourseRow>
 │
 ├─ <SettingsView>                      ← 设置
 │    props: semester, settings, onChangeSemester, onChangeSettings, onClear, onExport, onImport
 │    └─ <SettingRow>
 │
 ├─ <CourseFormModal>                   ← 课程表单浮层
 │    props: open, initial, onSave, onClose
 │    └─ <ColorSwatchPicker>
 │
 ├─ <ConfirmDialog>                     ← 通用确认弹窗
 │    props: open, title, message, confirmText, danger, onConfirm, onCancel
 │
 ├─ <Toast>                             ← 全局轻提示
 │    props: message, type
 │
 └─ <TabBar>                            ← 底部导航
      props: active, onChange
```

### 4.5 关键 Props 契约

```typescript
interface WeekGridProps {
  courses: Course[];
  week: number;
  todayWeekday: Weekday | null;   // 不是当前周时为 null，避免误导性高亮
  onSelectCourse: (course: Course) => void;
  onCreateAt: (day: Weekday, section: number) => void;
}

interface CourseFormModalProps {
  open: boolean;
  initial?: Course | null;         // 有值 = 编辑模式
  defaults?: { dayOfWeek: Weekday; startSection: number } | null;
  existingCourses: Course[];       // 用于冲突检测
  onSave: (draft: CourseDraft) => void;
  onClose: () => void;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
```

### 4.6 推荐目录结构

```
course-schedule-app/
├── docs/
│   └── requirements.md          # 本文档
├── prototype/
│   └── index.html               # 单文件网页原型（可直接手机打开）
├── public/
│   └── favicon.svg
├── src/
│   ├── components/              # 视图组件，每个一个 .tsx
│   │   ├── Header.tsx
│   │   ├── TabBar.tsx
│   │   ├── WeekGrid.tsx
│   │   ├── TodayView.tsx
│   │   ├── LibraryView.tsx
│   │   ├── SettingsView.tsx
│   │   ├── CourseFormModal.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── Toast.tsx
│   │   └── Icons.tsx            # 内联 SVG 图标集
│   ├── hooks/
│   │   └── useSchedule.ts       # 数据 + 操作 + 持久化的统一出口
│   ├── styles/
│   │   └── global.css           # 设计令牌 + 全部组件样式
│   ├── utils/
│   │   ├── id.ts                # 主键生成
│   │   ├── date.ts              # 周次推算、日期格式化
│   │   ├── course.ts            # 生效判断、冲突检测、校验
│   │   └── storage.ts           # 本地存储读写与降级
│   ├── constants.ts
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

### 4.7 状态管理策略

不引入 Redux / Zustand。理由：全局状态只有「课表数据 + 用户偏好 + UI 瞬时状态」三块，用一个自定义 Hook `useSchedule()` 集中管理即可，避免为小应用引入不必要的抽象。

```typescript
function useSchedule() {
  // 持久化状态
  const [data, setData] = useState<AppData>(loadData);
  // UI 状态
  const [activeTab, setActiveTab] = useState<TabKey>('week');
  const [viewWeek, setViewWeek] = useState<number>(() => calcCurrentWeek(data.semester));
  const [editing, setEditing] = useState<Course | null>(null);
  const [formOpen, setFormOpen] = useState(false);

  // 派生值（useMemo，避免重复计算）
  const courseMap = useMemo(() => buildCourseMap(data.courses, viewWeek), [data.courses, viewWeek]);
  const todayCourses = useMemo(() => getCoursesOfDay(data.courses, todayWeekday, viewWeek), [...]);

  // 操作（每次操作后统一写盘）
  const addCourse = (draft: CourseDraft) => { ... };
  const updateCourse = (id: string, draft: CourseDraft) => { ... };
  const removeCourse = (id: string) => { ... };
  const updateSemester = (patch: Partial<Semester>) => { ... };
  const updateSettings = (patch: Partial<AppSettings>) => { ... };
  const replaceAll = (next: AppData) => { ... };

  return { data, courseMap, todayCourses, activeTab, viewWeek, editing, formOpen, ... };
}
```

---

## 5. 交互流程

### 5.1 UC-01 新增课程

| 步骤 | 参与者 | 系统响应 |
|------|--------|----------|
| 1 | 点击「＋」或空白格子 | 打开表单浮层；若来自空白格，自动预填星期与起始节次 |
| 2 | 填写字段、选颜色 | 实时清理输入首尾空格 |
| 3 | 点击「保存」 | 执行校验 |
| 4a | — | 校验失败：首个错误字段标红并聚焦，Toast 提示具体原因，**不关闭浮层** |
| 4b | — | 校验通过：执行冲突检测 |
| 5a | — | 有冲突：弹出确认「该时段已有《X》，仍要保存吗？」 |
| 5b | 确认 | 生成 id 与时间戳 → 写入 state → 写盘 → 关闭浮层 → Toast「已添加」 |
| 5c | 取消 | 仅返回表单，保留已填内容 |

### 5.2 UC-02 编辑课程

点击课程格 / 课程行 → 表单预填全部字段 → 改动 → 保存 → 校验（排除自身 id）→ 更新 `updatedAt` → 写盘 → 视图刷新。

### 5.3 UC-03 删除课程

课程库行内点删除 → 确认弹窗显示课程名 → 确定则从 state 与存储移除，视图即时消失；取消则无操作。

### 5.4 UC-04 周次导航

点击 `‹` / `›` → `viewWeek` ±1 → 边界钳制在 `[1, totalWeeks]` → 挂载 `week === viewWeek` 的课程重新计算 → 网格与今日页同步刷新。

### 5.5 UC-05 导入导出

- **导出**：生成 `AppData` JSON → Blob → 触发下载，文件名 `course-schedule-YYYY-MM-DD.json`。
- **导入**：选文件 → 解析 JSON → 结构校验（必须含 `semester` 与 `courses` 数组）→ 二次确认覆盖 → 替换 state → 写盘。
- **异常**：解析失败 / 结构非法 → Toast「导入失败：文件格式不正确」，当前数据不变。

---

## 6. 技术约束与注意事项

### 6.1 技术栈与版本

| 层 | 选型 | 版本 | 说明 |
|----|------|------|------|
| 框架 | React | ^18.3 | 函数式组件 + Hooks，不使用 class 组件 |
| 语言 | TypeScript | ^5.6 | `strict: true`，禁用 `any` |
| 构建 | Vite | ^5.4 | 冷启动 < 1s，HMR 秒级反馈 |
| 样式 | 原生 CSS + 设计令牌 | — | 单文件 `global.css`，用 CSS 变量做主题切换 |
| 状态 | React 内置 state + 自定义 Hook | — | 不引入状态管理库 |
| 存储 | localStorage | — | 无后端 |

**不引入的依赖及理由**

| 依赖 | 不引入的理由 |
|------|--------------|
| 状态管理库（Redux/Zustand） | 全局状态仅 3 块，Hook 足够 |
| UI 组件库（Ant Design 等） | 移动端课表是强定制界面，组件库反而是负担，且体积大 |
| 日期库（dayjs/moment） | 只用到「两个日期差几天」，`Date` 原生足够，省 20KB |
| CSS 框架（Tailwind） | 需要构建期配置，对单页小应用收益低于成本 |

### 6.2 编码规范

1. **类型**：开启 `strict`；禁止 `any`，确需动态类型时用 `unknown` + 类型守卫。
2. **命名**：变量 / 函数 `camelCase`；组件 / 类型 `PascalCase`；常量 `UPPER_SNAKE_CASE`。
3. **文件**：组件 `.tsx`，逻辑 `.ts`。
4. **组件**：一律函数式 + Hooks；每个组件的 Props 必须显式声明 `interface`。
5. **样式**：类名用 BEM 风格（`course-chip__name--active`）；颜色 / 间距一律引用 CSS 变量，禁止散落魔法值。
6. **注释**：导出的函数必须有 JSDoc；非显然的边界条件必须写行内注释说明「为什么」。
7. **数据操作**：优先 `map / filter / reduce`，避免手写 `for` 循环。
8. **变量**：`const` 优先，`let` 次之，禁止 `var`。
9. **引号**：代码内字符串用单引号，JSX 属性用双引号。
10. **错误处理**：读写存储、解析 JSON、请求通知权限均须 `try / catch`，并给出用户可读文案。

### 6.3 移动端适配要点

| 事项 | 做法 |
|------|------|
| viewport | `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` |
| 安全区 | 底部 Tab Bar 用 `padding-bottom: env(safe-area-inset-bottom)`，避免被 iPhone 横条遮挡 |
| 主题色 | `<meta name="theme-color">` 随主题动态更新，让状态栏与应用同色 |
| 触摸反馈 | 可点元素统一 `:active { transform: scale(0.97) }`，并加 `-webkit-tap-highlight-color: transparent` |
| 输入框缩放 | 字号 ≥ 16px，避免 iOS 聚焦时自动放大页面 |
| 滚动行为 | 课表横向区域 `overscroll-behavior: contain`，防止滚动穿透到页面 |
| 单位 | 间距用 `rem` / `px`，字体用 `px`；避免 `vw` 导致小屏文字过小 |
| 字体 | `-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`，不引入外部字体（避免中文子集化与 FOUT） |

### 6.4 性能注意事项

1. **网格渲染**：12 节次 × 7 天 = 84 个格子，直接渲染即可，无需虚拟滚动。但应先把课程按 `dayOfWeek` 分桶成 `Map`，避免每个格子都做一次 `Array.find`（O(84 × N) → O(84)）。
2. **计算缓存**：`courseMap`、`todayCourses` 用 `useMemo`，依赖只写 `courses` 与 `viewWeek`。
3. **避免无用重渲染**：列表项用 `React.memo` 包裹，只有真正变化的行才重绘。
4. **写盘时机**：数据量小，操作后同步写盘即可，无需防抖；但要避免在渲染函数内写盘（会造成重复写入）。
5. **动画只用 GPU 属性**：只动 `transform` / `opacity`，不动 `width` / `height` / `top`，否则会在低端安卓机上掉帧。

### 6.5 已知风险与规避

| 编号 | 风险 | 影响 | 规避措施 |
|------|------|------|----------|
| R1 | 微信内置浏览器 X5 内核兼容性差异 | 部分 CSS 失效 | 关键布局不用 `position: sticky` 承载信息；真机在微信内实测 |
| R2 | iOS Safari 隐私模式下 localStorage 被限 | 数据存不进 | 捕获写入异常并 Toast 提示用户「请关闭无痕模式」 |
| R3 | 用户手动篡改 localStorage 导致结构非法 | 白屏 | 读取后做结构校验，不通过则回退默认值 |
| R4 | 单双周与起止周组合导致课程「某周不上但用户以为上」 | 认知偏差 | 课程块上以角标显示单双周标识；未生效周次时格子置灰 |
| R5 | 课表在 320px 窄屏上列过窄 | 课程名截断 | ≤ 360px 时按「横滑宽表」呈现，列宽固定 72px |
| R6 | 提醒功能依赖浏览器通知权限，权限可能被拒 | 功能不可用 | 静默降级，仅在设置页显示「当前浏览器不支持」而不到处报错 |
| R7 | 局域网 IP 变化导致手机无法访问 | 调试中断 | README 说明如何重新查询本机 IP；也可用 `--host` 配合热点 |

### 6.6 手机调试方案（本地）

本期目标是「本地能跑、手机能用」，推荐下面两条路径，按便捷度排序：

**路径一：局域网直连（推荐，无需安装任何东西）**

1. 电脑与手机连**同一个 Wi-Fi**。
2. 电脑执行 `npm run dev -- --host`，终端会打印形如 `http://192.168.x.x:5173/` 的地址。
3. 手机浏览器输入该地址即可打开；微信里直接把链接发给自己再点开，可验证微信内置浏览器表现。
4. 改代码后 Vite HMR 会推送到手机，秒级刷新。

**注意事项**：

- Windows 防火墙首次会弹窗，必须选**允许专用网络访问**，否则手机连不上。
- 若电脑用的是「公用网络」配置，需在防火墙里手动放行该端口。
- 无法访问时依次排查：① 两端是否同一网段；② 防火墙；③ 电脑上 `ping` 手机 IP 是否通；④ 部分校园网 / 公司网开启了 AP 隔离，此时改用手机热点给电脑连接。

**路径二：构建静态产物 + 本地静态服务器**

```bash
npm run build
npm run preview -- --host
```

产物是纯静态文件，也可以直接拷贝到手机本地用浏览器打开（部分浏览器对本地文件的 localStorage 有限制，不推荐作为主路径）。

**路径三：真机远程调试（排查手机上的疑难问题时用）**

- **Android**：电脑 Chrome 打开 `chrome://inspect`，手机开启 USB 调试并连上电脑，即可直接调试手机页面。
- **iOS**：Mac 上用 Safari「开发」菜单；Windows 环境下可借用 `vConsole`（临时注入）查看手机端日志与控制台。

---

## 7. 文档规范

> 本章为「文档格式参照 Re_ref」维度的落地约定。工作区中未找到 Re_ref 原件，故在此按通用软件工程文档规范定义一套可复用的格式约定，供后续同类文档沿用。

### 7.1 总体格式约定

| 项 | 约定 |
|----|------|
| 文件格式 | Markdown（`.md`），UTF-8 编码，LF 换行 |
| 文档头 | 必须包含：项目名、文档版本、编制日期、文档状态、修订记录表 |
| 标题层级 | 最多三级（`#` / `##` / `###`）；四级以下改用加粗或列表，避免层级过深 |
| 章节编号 | 用阿拉伯数字层级编号（`1.` `1.1` `1.1.1`），与需求编号体系解耦 |
| 表格 | 需求清单、校验规则、风险表统一用表格，不使用纯文本堆叠 |
| 代码 | 数据模型、接口、常量统一用 TypeScript 代码块，标注语言 |
| 图形 | 简单结构用 ASCII 框图（不依赖图片渲染），保证任何 Markdown 阅读器都能正确显示 |
| 语言 | 中文正文使用全角标点；代码、路径、命令内保持半角 |

### 7.2 编号规则

| 类型 | 前缀 | 示例 | 说明 |
|------|------|------|------|
| 功能需求 | `F` | F01, F02 | 两位数字，按优先级排序，编号一经分配不再复用 |
| 业务规则 | `BR` | BR-01 | 跨功能的判定规则 |
| 用例 | `UC` | UC-01 | 交互流程 |
| 风险 | `R` | R1 | 风险登记册 |
| 场景 | `S` | S1 | 用户场景 |

### 7.3 需求条目写法

每条功能需求必须包含三要素，缺一不可：

```
| 编号 | 功能名 | 用户故事（作为…我希望…以便…） | 验收标准（可验证的、带编号的断言） |
```

**判定标准**：验收标准必须是**可被机器或人工明确判定真伪**的陈述。反面例子：「界面美观」「操作流畅」；正面例子：「字段为空时提交被拦截，并在该字段下方显示红色错误文案」。

### 7.4 图表与线框约定

- 线框图用等宽字符绘制，控制在 40 列宽以内，保证手机端也能正常显示。
- 数据模型用 ASCII 关系图表达「一对多 / 引用」关系，并在图下用一段文字解释设计取舍（为什么这样建表）。
- 流程用「步骤/响应」表或编号列表表达，避免只有一张流程图而没有文字说明。

---

## 8. 验收清单

### 8.1 功能验收

- [ ] F01 新增课程：必填校验生效，保存后立即出现在网格中
- [ ] F01 新增课程：从空白格进入时星期与节次已预填
- [ ] F02 周课表：7 列 × 12 行网格渲染正确，跨节次课程纵向连通
- [ ] F02 周课表：每门课颜色正确，今天所在的列高亮
- [ ] F03 编辑课程：字段预填完整，保存后视图即时更新
- [ ] F04 删除课程：弹确认框并显示课程名，取消无副作用
- [ ] F05 周次导航：当前周自动推算正确，边界处按钮禁用
- [ ] F06 持久化：刷新、关标签页重开，数据均不丢失
- [ ] F07 今日课程：按节次升序排列，顺序正确
- [ ] F08 空状态：无课程时显示引导而非空白
- [ ] F09 冲突检测：同星期同节次且周次重叠时给出提示
- [ ] F13 主题切换：切换后刷新页面，主题保持
- [ ] F14 导入导出：导出文件可被重新导入且数据一致
- [ ] F18 智能导入：四种格式（行内完整 / 教务括号 / 多行块 / 混合）各解析出正确字段
- [ ] F18 智能导入：缺字段的行给出默认值假设角标；放弃导入不产生脏数据
- [ ] F19 节次作息：改时间后网格与今日页同步；删被引用节次被拦截；旧版数据自动迁移

### 8.2 质量验收

- [ ] `npx tsc --noEmit` 零错误
- [ ] 浏览器控制台无 error / warning
- [ ] 375px 宽度下无横向滚动条（课表网格内部滚动除外）
- [ ] 320px 宽度下课程名不溢出、不重叠
- [ ] 浅色与深色主题下文字对比度均达标
- [ ] 手动向 localStorage 写入非法 JSON，页面不白屏
- [ ] 输入 `<img src=x onerror=alert(1)>` 作为课程名，页面不执行脚本

---

## 9. 里程碑

| 阶段 | 交付物 | 状态 |
|------|--------|------|
| M1 需求分析 | 本需求文档 | 已完成 |
| M2 原型设计 | `prototype/index.html` 可交互原型 | 已完成 |
| M3 工程搭建 | Vite + React + TS 工程骨架，可本地运行 | 已完成 |
| M4 功能开发 | F01~F11 全部实现 | 已完成 |
| M5 本地验证 | 手机同局域网访问可用；验收清单通过 | 已完成（§8 清单除真机 iOS 外全部通过） |
| M4.5 二期功能（v2.1） | F18 智能导入 + F19 节次作息可配置 | 已完成 |
| M6 拓展（可选） | 迁移 Taro 编译为微信小程序；补 F15 上课提醒的真实调度 | 待定 |

### 9.1 M5 验证记录

| 验证项 | 方式 | 结果 |
|--------|------|------|
| 类型安全 | `tsc --noEmit`（strict） | 零错误 |
| 生产构建 | `vite build` | 成功，JS 183KB / gzip 58KB，CSS 17.6KB |
| 核心流程 | 无头 Chromium 驱动真实点击，21 项断言 | 21/21 通过 |
| 数据持久化 | 增删改后回读 localStorage 校验 | 通过 |
| 健壮性 | 向 localStorage 写入非法 JSON 后刷新 | 不白屏，回退默认值 |
| 安全性 | 把 XSS 载荷写成课程名 | 未执行、未渲染成 HTML |
| 控制台 | 收集 console.error 与未捕获异常 | 均为 0 |
| 响应式 | 390×844 手机视口截图核验浅色/深色 | 布局正常 |

### 9.2 M4.5（v2.1）验证记录

| 验证项 | 方式 | 结果 |
|--------|------|------|
| 类型安全 | `tsc --noEmit`（strict） | 零错误 |
| 生产构建 | `vite build` | 成功，JS 200KB / gzip 64KB，CSS 20.5KB |
| v2 数据迁移 | 用无 sections 字段的 v2 结构写入 localStorage 后冷启动 | 自动补默认 12 节作息 |
| F18 解析正确性 | 无头浏览器实测四种格式混合文本（行内 / 教务括号 / 多行块 / 混合） | 4/4 门课字段全部正确 |
| F18 预览兜底 | 缺字段文本解析 | 角标明示 3 条默认值假设；放弃导入无脏数据 |
| F18 颜色分配 | 导入 4 门后回读 localStorage | 4 门颜色互不重复 |
| F19 时间同步 | 修改第 1 节为 08:30 保存后回课表页 | 网格左列即时显示 08:30 |
| F19 引用保护 | 删除被《操作系统》(9-11节) 占用的第 11 节 | 拦截并提示引用课程名 |
| 控制台 | 17 项断言运行期间收集 | console.error 与未捕获异常均为 0 |

> 图片识别的决策说明：评估过端内离线 OCR（Tesseract.js，需下载约 20MB 中文语言包且对表格型截图识别质量差）与云端 OCR（需申请 Key）两条路线，最终选择「微信提取文字 → 粘贴」—— 零依赖、识别质量最好，代价只是多一步长按复制。解析器是纯函数模块（`utils/importParser.ts`），将来若接云端 OCR，识别文本仍走同一条解析管线，UI 无需改动。


---

## 10. 附录

### 10.1 默认节次时间说明

附录中的节次时间为**示例配置**，不同高校作息差异较大（有的学校第 5 节在 13:30，有的在 14:00）。v2.0 时它硬编码在 `src/constants.ts`；**v2.1 起已迁入 `AppData.sections`**，在「我的 → 节次作息」中可改时间、增删节次、恢复默认 —— `constants.ts` 里的 `DEFAULT_SECTIONS` 只作为首次启动与「恢复默认」的模板，渲染层（周课表 / 今日页 / 表单）全部从数据读取，不再依赖常量。

### 10.2 为什么不做后端

| 好处 | 说明 |
|------|------|
| 零成本 | 无需服务器、域名、备案 |
| 零隐私风险 | 课表数据不出本机，不涉及《个人信息保护法》合规问题 |
| 零网络依赖 | 断网可用，教室信号差时依然能查课表 |
| 零运维 | 没有数据库备份、扩容、监控的负担 |

代价是「换设备需手动导入导出」，对个人工具而言这是可接受的取舍。

### 10.3 微信小程序版（补充）

同一套业务逻辑另有一个 **Taro 4.3.0 微信小程序实现**，位于 `E:\workbuddy\course-schedule-miniapp\`。
`utils/` 下的 course / date / id / importParser 四个纯函数模块与本文档描述的实现**逐字相同**，
视图层按小程序的渲染约束重写（`View` 内文本必须包 `Text`、无 `<svg>` 改 CSS mask、
`select`/`input type=date` 改 `Picker` 等）。存储用 `Taro.setStorageSync`，导出导入改走系统剪贴板。

差异清单、运行方式（微信开发者工具导入 `dist/` → 真机预览，无需备案）与设计取舍
详见该工程的 `README.md`。真机预览走开发版，不需要小程序备案；备案仅是「提审发布」的前置条件。

---

*课程表应用 — 软件需求规格说明书 v2.0 · 2026-09-16*
