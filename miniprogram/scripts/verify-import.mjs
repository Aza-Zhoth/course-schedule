/**
 * 智能导入端到端验证：模拟用户真实操作路径
 * 课程库 → 智能导入 → 粘贴这份教务系统文本 → 开始解析 → 检查预览
 */
// headless-browser-verify is a local dev dependency, not bundled with this repo.
// Set CDP_MODULE to the file URL of its cdp.mjs before running this script.
const CDP_MODULE = process.env.CDP_MODULE;
if (!CDP_MODULE) {
  console.error('Missing CDP_MODULE env: point it to headless-browser-verify cdp.mjs');
  process.exit(1);
}
const { launch } = await import(CDP_MODULE);

const TEXT = `物联网与智能控制 周一 第1-2节 1-16周 1教1A211多 沈亦帆
大数据分析 周一 第3-4节 1-8周 1教1A210多 沈亦帆
大数据分析 周一 第3-4节 9-16周 信息学院B406 沈亦帆
最优化方法 周一 第5-6节 1-16周 1教1A211多 陆行知
模式识别与机器学习 周一 第7-8节 1-15周 1教1A304多 苏禾
软件工程 周一 第9-10节 1-16周 1教1C203多 何清让
模式识别与机器学习 周二 第1-2节 16周 信息学院B302 苏禾
计算机图形学 周二 第1-2节 8-15周 信息学院B302 谢知远
计算机视觉 周二 第3-4节 1-16周 1教1B408多 江屿顾清让
密码学与信息安全基础 周二 第5-6节 1-12周 1教1C307多 傅时安
密码学与信息安全基础 周二 第5-6节 13-16周 信息学院B408 傅时安
操作系统 周二 第7-8节 1-12周 1教1A504多 陈牧
操作系统 周二 第7-8节 13-16周 信息学院B306 陈牧
模式识别与机器学习 周三 第1-2节 2周 1教1B408多 苏禾
多媒体技术 周三 第3-4节 1-16周 1教1B408多 温砚舟
最优化方法 周三 第5-6节 1-15周单 信息学院B301 陆行知
模式识别与机器学习 周三 第5-6节 4-16周双 信息学院B406 苏禾
习近平新时代中国特色社会主义思想概论 周三 第7-8节 1-16周 1教1A301多 林岚
软件工程 周三 第9-10节 2-16周双 信息学院B306 何清让
操作系统 周四 第1-2节 1-12周 1教1A504多 陈牧
操作系统 周四 第1-2节 13-16周 信息学院B308 陈牧
物联网与智能控制 周四 第3-4节 2-16周双 信息学院B406 沈亦帆
数字图像处理 周四 第5-6节 1-12周 1教1C307多 秦昭
数字图像处理 周四 第5-6节 13-16周 信息学院B302 秦昭
汇编语言 周四 第7-8节 1-12周 1教1A304多 柳承安
汇编语言 周四 第7-8节 13-16周 信息学院B306 柳承安
计算机视觉 周四 第9-10节 1-15周单 信息学院B406 江屿顾清让
物联网技术导论 周五 第3-4节 1-16周 1教1B408多 虞见川骆知微
多媒体技术 周五 第5-6节 2-16周双 信息学院B401 温砚舟
计算机图形学 周五 第7-8节 1-16周 1教1A304多 谢知远`;

const OUT = process.env.OUT_DIR ?? './.verify-out/';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0;
let fail = 0;
const check = (label, ok, extra = '') => {
  ok ? pass++ : fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${extra ? '  → ' + extra : ''}`);
};

const browser = await launch({ width: 390, height: 844 });
try {
  await browser.navigate('http://127.0.0.1:4321/');
  await browser.waitFor('.app', 60);
  await wait(700);

  /* 1. 切到课程库 */
  await browser.evaluate(`(() => {
    const items = Array.from(document.querySelectorAll('.tabbar__item'));
    const s = items.find((el) => el.textContent.includes('课程库'));
    if (s) s.click();
  })()`);
  await wait(700);

  /* 2. 点「智能导入」 */
  const opened = await browser.evaluate(`(() => {
    const nodes = Array.from(document.querySelectorAll('*')).filter(
      (el) => el.textContent.trim() === '智能导入' && el.children.length === 0,
    );
    const target = nodes[0];
    if (!target) return 'NOT_FOUND';
    let el = target;
    for (let i = 0; i < 4 && el; i += 1) {
      if (el.className && String(el.className).includes('btn')) break;
      el = el.parentElement;
    }
    (el || target).click();
    return 'CLICKED';
  })()`);
  check('找到并点击「智能导入」', opened === 'CLICKED', opened);
  await wait(800);

  /* 3. 粘贴文本 */
  const filled = await browser.evaluate(`(() => {
    const ta = document.querySelector('textarea');
    if (!ta) return 'NO_TEXTAREA';
    ta.focus();
    ta.value = ${JSON.stringify(TEXT)};
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return String(ta.value.length);
  })()`);
  check('文本已填入输入框', Number(filled) > 500, `填了 ${filled} 字`);
  await wait(400);
  await browser.shoot(`${OUT}imp-01-input.png`);

  /* 4. 开始解析 */
  await browser.evaluate(`(() => {
    const btn = Array.from(document.querySelectorAll('*')).find(
      (el) => el.textContent.trim() === '开始解析' && el.children.length === 0,
    );
    if (btn) {
      let el = btn;
      for (let i = 0; i < 4 && el; i += 1) {
        if (el.className && String(el.className).includes('btn')) break;
        el = el.parentElement;
      }
      (el || btn).click();
    }
  })()`);
  await wait(1200);
  await browser.shoot(`${OUT}imp-02-preview.png`);

  /* 5. 检查预览结果 */
  const info = await browser.evaluate(`(() => {
    const rows = Array.from(document.querySelectorAll('[class*="preview-row"]'));
    const uniq = new Set(rows.map((el) => el.className));
    const inputs = Array.from(document.querySelectorAll('.preview-row__grid .field__input'));
    const values = inputs.map((el) => el.value || '');
    const teachers = values.filter((v) => /^[\\u4e00-\\u9fa5]{2,6}$/.test(v));
    const modalText = (document.querySelector('.modal__sheet') || {}).textContent || '';
    return JSON.stringify({
      rowClasses: Array.from(uniq).slice(0, 4),
      inputCount: inputs.length,
      sampleValues: values.slice(0, 8),
      looksLikeName: teachers.slice(0, 6),
      stillHasIssueText: /未识别到教师/.test(modalText),
      hasParseError: /解析失败/.test(modalText),
    });
  })()`);
  console.log('预览统计：', info);
  const stat = JSON.parse(info);
  check('预览区有输入框（教师/地点可编辑）', stat.inputCount > 40, `实测 ${stat.inputCount} 个`);
  check('没有「未识别到教师」的提示', stat.stillHasIssueText === false);
  check('教师字段已填入中文姓名', stat.looksLikeName.length >= 6, stat.looksLikeName.join(' '));

  console.log(`\n===== ${pass + fail} 项，通过 ${pass}，失败 ${fail} =====`);
} finally {
  await browser.close();
}
