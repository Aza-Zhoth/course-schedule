/**
 * 一次性核验脚手架（不进产物）
 *
 * 微信开发者工具没装，没法真机预览小程序。退而求其次：
 * 用 Taro 的 h5 目标把同一份组件代码编译成网页，在真实 Chromium 里跑一遍，
 * 至少能确认「迁移没有把 React 逻辑改坏」「CSS 改造没有把版式弄崩」。
 *
 * 注意：H5 走的是 Taro 的 web 实现（div/span），不能替代小程序的 wxss/wxml 校验，
 * 所以这里只断言版面和交互，不断言小程序特有行为。
 */
// headless-browser-verify is a local dev dependency, not bundled with this repo.
// Set CDP_MODULE to the file URL of its cdp.mjs before running this script.
const CDP_MODULE = process.env.CDP_MODULE;
if (!CDP_MODULE) {
  console.error('Missing CDP_MODULE env: point it to headless-browser-verify cdp.mjs');
  process.exit(1);
}
const { launch } = await import(CDP_MODULE);

const BASE = 'http://127.0.0.1:4321/';
const OUT = process.env.OUT_DIR ?? './.verify-out/';

const shot = (name) => `${OUT}${name}.png`;

const results = [];
function check(label, ok, extra = '') {
  results.push({ label, ok, extra });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  → ' + extra : ''}`);
}

const browser = await launch({ width: 390, height: 844 });
try {
  await browser.navigate(BASE);
  await browser.waitFor('.app', 60);

  /* 1. 空状态 */
  await new Promise((r) => setTimeout(r, 500));
  await browser.shoot(shot('01-empty-dark'));

  const tabCount = await browser.evaluate(`document.querySelectorAll('.tabbar__item').length`);
  check('底部导航 4 个 Tab', tabCount === 4, `实测 ${tabCount}`);

  const iconCount = await browser.evaluate(`document.querySelectorAll('.icon').length`);
  check('图标节点已渲染', iconCount > 0, `实测 ${iconCount} 个`);

  const iconBox = await browser.evaluate(
    `(() => { const el = document.querySelector('.app .icon'); if (!el) return null;
      const r = el.getBoundingClientRect(); return { tag: el.tagName, w: Math.round(r.width), h: Math.round(r.height) }; })()`,
  );
  // 注意：Taro H5 自带的导航栏里也有一个 class="icon" 的 svg（加载转圈），
  // 所以这里必须限定在 .app 内部找，否则会量到 Taro 自己的图标
  check('图标有实际尺寸（mask 未塌成 0）', !!iconBox && iconBox.w > 8, JSON.stringify(iconBox));

  /* 2. 载入示例课表 —— 走真实点击，不用注入数据 */
  await browser.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('.btn')).find((el) => el.textContent.includes('载入示例'));
    if (btn) btn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 700));
  await browser.shoot(shot('02-week-grid'));

  const courseCells = await browser.evaluate(`document.querySelectorAll('.slot').length`);
  check('课表网格已出格子', courseCells > 0, `实测 ${courseCells} 格`);

  /* 3. 主题切换 —— 默认浅色，点 Header 上的主题按钮切到深色再切回来。
        小程序里是根节点挂 theme-dark + 动态改导航栏，H5 走同一套 CSS 变量。 */
  const bgOf = `getComputedStyle(document.querySelector('.app')).backgroundColor`;
  const lightBg = await browser.evaluate(bgOf);
  check('浅色模式背景生效', lightBg.includes('244, 246, 245'), lightBg);

  await browser.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('[aria-label]')).find((el) => el.getAttribute('aria-label').includes('切换到'));
    if (btn) btn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 600));
  await browser.shoot(shot('02b-week-grid-dark'));

  const darkBg = await browser.evaluate(bgOf);
  check('深色模式背景生效', darkBg.includes('16, 22, 23'), darkBg);

  const headerBg = await browser.evaluate(
    `(() => { const el = document.querySelector('.header'); return el ? getComputedStyle(el).backgroundImage.slice(0, 60) : null; })()`,
  );
  check('Header 渐变背景生效', !!headerBg && headerBg.includes('linear-gradient'), headerBg);

  // 切回浅色，后续步骤的截图保持默认观感
  await browser.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('[aria-label]')).find((el) => el.getAttribute('aria-label').includes('切换到'));
    if (btn) btn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 400));

  /* 4. 打开课程表单弹窗 —— 校验遮罩层 + 面板的新结构 */
  await browser.click('.app__fab');
  await new Promise((r) => setTimeout(r, 500));
  await browser.shoot(shot('03-course-form'));

  const maskBox = await browser.evaluate(
    `(() => { const el = document.querySelector('.modal__mask'); if (!el) return null;
      const r = el.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; })()`,
  );
  check('弹窗遮罩层铺满屏幕', !!maskBox && maskBox.w >= 380 && maskBox.h >= 800, JSON.stringify(maskBox));

  const sheetZ = await browser.evaluate(
    `(() => { const el = document.querySelector('.modal__sheet'); return el ? getComputedStyle(el).zIndex : null; })()`,
  );
  check('弹窗面板压在遮罩之上', sheetZ === '1', `z-index=${sheetZ}`);

  const pickerCount = await browser.evaluate(`document.querySelectorAll('.field__select').length`);
  check('表单里的 Picker 展示容器存在', pickerCount >= 4, `实测 ${pickerCount} 个`);

  /* 5. 关掉弹窗，去设置页看 Picker 型输入框（设置页从顶部 Header 的齿轮进入，
        TabBar 里没有它 —— TabBar 是 周课表/今日/课程库/我的 四个） */
  await browser.evaluate(`(() => { const el = document.querySelector('.modal__mask'); if (el) el.click(); })()`);
  await new Promise((r) => setTimeout(r, 500));

  await browser.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('[aria-label]')).find((el) => el.getAttribute('aria-label') === '打开设置');
    if (btn) btn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 600));
  await browser.shoot(shot('04-settings'));

  const pickerInput = await browser.evaluate(
    `(() => { const el = document.querySelector('.field__input--picker'); if (!el) return null;
      const r = el.getBoundingClientRect(); return { h: Math.round(r.height), display: getComputedStyle(el).display }; })()`,
  );
  check('日期 Picker 容器高度对齐输入框', !!pickerInput && pickerInput.h >= 36, JSON.stringify(pickerInput));

  /* 6. 课程库 Tab */
  await browser.evaluate(`(() => {
    const items = Array.from(document.querySelectorAll('.tabbar__item'));
    const s = items.find((el) => el.textContent.includes('课程库'));
    if (s) s.click();
  })()`);
  await new Promise((r) => setTimeout(r, 600));
  await browser.shoot(shot('05-library'));

  /* 7. 今日 Tab */
  await browser.evaluate(`(() => {
    const items = Array.from(document.querySelectorAll('.tabbar__item'));
    const s = items.find((el) => el.textContent.includes('今日'));
    if (s) s.click();
  })()`);
  await new Promise((r) => setTimeout(r, 600));
  await browser.shoot(shot('06-today'));

  /* 8. 设置页的日期 Picker 有可见文本 */
  await browser.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('[aria-label]')).find((el) => el.getAttribute('aria-label') === '打开设置');
    if (btn) btn.click();
  })()`);
  await new Promise((r) => setTimeout(r, 600));

  const now = await browser.evaluate(
    `(() => { const el = document.querySelector('.field__input--picker'); return el ? el.textContent : null; })()`,
  );
  check('日期 Picker 有可见文本', !!now && now.trim().length > 0, now);

  console.log('\n--- 页面报错 ---');
  console.log('console.error:', browser.consoleErrors.length ? browser.consoleErrors : '（无）');
  console.log('pageErrors   :', browser.pageErrors.length ? browser.pageErrors : '（无）');
  check('无 JS 运行时报错', browser.consoleErrors.length === 0 && browser.pageErrors.length === 0);
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n===== 合计 ${results.length} 项，通过 ${results.length - failed.length}，失败 ${failed.length} =====`);
process.exit(failed.length === 0 ? 0 : 1);
