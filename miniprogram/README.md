# 课程表 · 微信小程序版（Taro）

同一份 React + TypeScript 代码的**第三个形态**：微信小程序。
与 `E:\workbuddy\course-schedule-app\`（网页版）共享同一套业务逻辑与视觉设计。

## 这是什么

| | 网页版 course-schedule-app | 小程序版 course-schedule-miniapp |
|---|---|---|
| 技术栈 | React 18 + Vite | **Taro 4.3.0** + React 18，编译目标 weapp |
| 运行环境 | 任意浏览器 | 微信开发者工具 / 微信客户端 |
| 存储 | localStorage | `Taro.setStorageSync`（纯本地，无云开发） |
| 图标 | 内联 `<svg>` | CSS mask + base64（见 `src/styles/icons.css` 头部注释） |

**定位**：软件工程个人作业的演示版。目标是在真机上预览，不走提审/发布流程。

## 怎么跑起来（三步）

### 1. 编译

```bash
cd E:\workbuddy\course-schedule-miniapp
set NODE_ENV=production
node node_modules\@tarojs\cli\bin\taro build --type weapp
```

产物在 `dist/`。

### 2. 装微信开发者工具（只需要装一次）

- 下载地址：<https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html>（选 **稳定版 Stable Build**，Windows 64 位）
- 安装后用微信扫码登录
- 首次进入选「小程序项目 → 导入项目」：
  - **目录**：选 `E:\workbuddy\course-schedule-miniapp\dist`（注意是 dist，不是工程根目录）
  - **AppID**：选「测试号」（游客模式），或者填你自己注册的小程序 AppID
  - 工程根目录下已备好 `project.config.json`，导入时会自动读到 `miniprogramRoot: ./dist`

### 3. 真机预览

开发者工具里点工具栏的「**预览**」→ 生成二维码 → 手机微信扫码。
首次会提示「开发版小程序」，同意即可。**不需要备案，不需要发版。**

## 想改成自己的账号

1. 到 <https://mp.weixin.qq.com> 注册一个小程序（个人主体免费）
2. 拿到 AppID，填进 `project.config.json` 的 `"appid"` 字段（现在是 `touristappid` 游客模式）
3. 重新导入项目

## 目录结构

```
src/
  app.config.ts        小程序全局配置（页面注册、导航栏）
  app.tsx              入口，挂两份全局样式
  pages/index/         唯一的页面（Tab 切换视图，不是多页面路由）
  components/          12 个组件，与网页版一一对应
  hooks/useSchedule.ts 全局状态（与网页版同一套设计）
  utils/               course/date/id/importParser/storage —— 前四个与网页版逐字相同
  styles/              global.css（样式）+ icons.css（脚本生成的图标 mask）
scripts/verify-h5.mjs  渲染验证脚手架（见下）
config/                Taro 编译配置
dist/                  编译产物（给开发者工具导入的就是这个目录）
```

## 已知与网页版的差异（都是刻意的）

| 功能 | 网页版做法 | 小程序版做法 | 原因 |
|---|---|---|---|
| 导出备份 | Blob + `<a download>` 下载 JSON 文件 | 写进**系统剪贴板** | 小程序没有下载文件的通用 API |
| 导入备份 | `<input type="file">` 选文件 | 从**剪贴板**读 JSON | 同上 |
| 上课提醒 | 浏览器 Notification API | 微信**订阅消息**（需后台配模板） | 平台机制不同 |
| Esc 关弹窗 | `window.addEventListener('keydown')` | 删除（无物理键盘） | — |
| 主题切换 | `documentElement.dataset.theme` | 根节点挂 `theme-dark` 类 + `setNavigationBarColor` | 小程序没有 document |

上课提醒要真正推送，需要三步：小程序后台「订阅消息 → 选购模板」→ 把模板 ID 填进
`src/constants.ts` 的 `NOTIFY_TEMPLATE_ID` → 重新编译。没填模板 ID 时开关仍能用，
但只会提示「尚未接通推送」，不会假装成功。

## 小程序平台的几个硬约束（代码注释里都有对应说明）

1. **`<View>` 里不能直接写文字** —— 文本必须包在 `<Text>` 里，否则整段不渲染。
2. **`<Text>` 里不能嵌 `<View>`** —— 图标（View）和文字（Text）必须并排放在同一层容器里。
3. **不支持 `<svg>` 标签** —— 图标全部转成 CSS mask（保留 `currentColor`，主题切换不用改调用点）。
4. **`designWidth: 375`**（`config/index.ts`）—— H5 样式按 390px 视口设计，单位全是 px；
   设 375 才能让 14px 原样还原成 28rpx，否则整个界面缩水一半。
5. **CSS 只保证支持类/元素/并集/`::before`/`::after`** —— 通配符 `*`、`inset`、`100dvh`、
   `color-mix`、`@supports`、`::placeholder`、`:focus` 都不保证可用，已逐一替换。

## 验证方式

本机没装微信开发者工具时，用 H5 目标做近似验证（同一份组件代码编译成网页）：

```bash
set NODE_ENV=production
node node_modules\@tarojs\cli\bin\taro build --type h5   # 产物也在 dist/，会覆盖小程序产物
node scripts/verify-h5.mjs                                # 需先起静态服务并改脚本里的端口
node node_modules\@tarojs\cli\bin\taro build --type weapp # 用完再编译回小程序
```

`scripts/verify-h5.mjs` 会跑 13 项断言（Tab 数、图标尺寸、课表格子数、深浅色、
弹窗遮罩结构、Picker 容器、JS 运行时报错），最近一次结果 **13/13 通过**。
截图在 `E:\workbuddy\output\miniapp-verify\`。

> H5 验证覆盖不了小程序特有的 WXML/WXSS 行为（比如 View 内裸文本不渲染），
> 那类问题靠的是迁移期的 AST 检查 + 人工核对，最终以开发者工具里的实际表现为准。

## 依赖说明

- `webpack` 固定 `5.91.0` —— `@tarojs/taro-loader@4.3.0` 的 peer 依赖要求精确版本，
  装成 `^5.95.0` 会导致 ERESOLVE 冲突。
- `@babel/preset-react`、`@tarojs/plugin-platform-h5`、`@tarojs/router`、`@tarojs/react`
  是补装的（前者是 `babel-preset-taro` 的隐式 peer，后三个只有 h5 验证用得到）。
