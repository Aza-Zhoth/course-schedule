/**
 * 周课表渲染验证 —— 用一份样例课表数据检查两件事：
 *   ① 课程块里能看到「地点」（以及跨节次块里的教师）
 *   ② 同一节课（跨节次）是一个完整方块，没有被网格缝隙切开
 *
 * 跑法：先 build 出 dist，起静态服务，再 node 本文件
 */
// headless-browser-verify is a local dev dependency, not bundled with this repo.
// Set CDP_MODULE to the file URL of its cdp.mjs before running this script.
const CDP_MODULE = process.env.CDP_MODULE;
if (!CDP_MODULE) {
  console.error('Missing CDP_MODULE env: point it to headless-browser-verify cdp.mjs');
  process.exit(1);
}
const { launch } = await import(CDP_MODULE);
import { parseScheduleText } from './.importParser.bundle.mjs';
import { assignColorsByCourseName } from './.course.bundle.mjs';

const BASE = 'http://127.0.0.1:4330/';
const OUT = process.env.OUT_DIR ?? './.verify-out/';
const STORAGE_KEY = 'course-schedule:v2';

const TEXT = [
  '物联网与智能控制 周一 第1-2节 1-16周 1教1A211多 沈亦帆',
  '大数据分析 周一 第3-4节 1-8周 1教1A210多 沈亦帆',
  '大数据分析 周一 第3-4节 9-16周 信息学院B406 沈亦帆',
  '最优化方法 周一 第5-6节 1-16周 1教1A211多 陆行知',
  '模式识别与机器学习 周一 第7-8节 1-15周 1教1A304多 苏禾',
  '软件工程 周一 第9-10节 1-16周 1教1C203多 何清让',
  '模式识别与机器学习 周二 第1-2节 16周 信息学院B302 苏禾',
  '计算机图形学 周二 第1-2节 8-15周 信息学院B302 谢知远',
  '计算机视觉 周二 第3-4节 1-16周 1教1B408多 江屿顾清让',
  '密码学与信息安全基础 周二 第5-6节 1-12周 1教1C307多 傅时安',
  '密码学与信息安全基础 周二 第5-6节 13-16周 信息学院B408 傅时安',
  '操作系统 周二 第7-8节 1-12周 1教1A504多 陈牧',
  '操作系统 周二 第7-8节 13-16周 信息学院B306 陈牧',
  '模式识别与机器学习 周三 第1-2节 2周 1教1B408多 苏禾',
  '多媒体技术 周三 第3-4节 1-16周 1教1B408多 温砚舟',
  '最优化方法 周三 第5-6节 1-15周单 信息学院B301 陆行知',
  '模式识别与机器学习 周三 第5-6节 4-16周双 信息学院B406 苏禾',
  '习近平新时代中国特色社会主义思想概论 周三 第7-8节 1-16周 1教1A301多 林岚',
  '软件工程 周三 第9-10节 2-16周双 信息学院B306 何清让',
  '操作系统 周四 第1-2节 1-12周 1教1A504多 陈牧',
  '操作系统 周四 第1-2节 13-16周 信息学院B308 陈牧',
  '物联网与智能控制 周四 第3-4节 2-16周双 信息学院B406 沈亦帆',
  '数字图像处理 周四 第5-6节 1-12周 1教1C307多 秦昭',
  '数字图像处理 周四 第5-6节 13-16周 信息学院B302 秦昭',
  '汇编语言 周四 第7-8节 1-12周 1教1A304多 柳承安',
  '汇编语言 周四 第7-8节 13-16周 信息学院B306 柳承安',
  '计算机视觉 周四 第9-10节 1-15周单 信息学院B406 江屿顾清让',
  '物联网技术导论 周五 第3-4节 1-16周 1教1B408多 虞见川骆知微',
  '多媒体技术 周五 第5-6节 2-16周双 信息学院B401 温砚舟',
  '计算机图形学 周五 第7-8节 1-16周 1教1A304多 谢知远',
].join('\n');

/* ---------------------------------------------------------------- */

let pass = 0;
let fail = 0;
function check(name, ok, detail = '') {
  if (ok) {
    pass += 1;
    console.log(`  PASS  ${name}`);
  } else {
    fail += 1;
    console.log(`  FAIL  ${name}   ${detail}`);
  }
}

/** 用项目自己的解析器把文本转成课程，保证验证数据和用户导入的完全一致 */
function buildData() {
  const { courses, unmatched } = parseScheduleText(TEXT, { maxSections: 12, totalWeeks: 16 });
  if (unmatched.length) console.log('  未识别行：', unmatched);

  const stamp = '2026-09-07T00:00:00.000Z';
  // 和用户真实操作路径一致：智能导入提交前会按课程名分配颜色
  const colored = assignColorsByCourseName(
    courses.map((item) => ({ ...item.draft, id: `c${courses.indexOf(item) + 1}` })),
  );
  // 模拟老版本数据：全部是旧色板的深红（验证加载时的自动迁移）
  const legacyRed = '#D9534F';
  colored.forEach((d) => { d.color = legacyRed; });
  return {
    version: 3,
    // 2026-09-07 是周一，于是 2026-10-12（今天）正好落在第 6 周
    semester: { id: 's1', name: '2026 秋季', startDate: '2026-09-07', totalWeeks: 16 },
    courses: colored.map((d, i) => ({
      ...d,
      createdAt: stamp,
      updatedAt: stamp,
    })),
    // settings 留空，让应用自己补默认值
  };
}

const browser = await launch({ width: 390, height: 844 });
try {
  await browser.navigate(BASE);
  await browser.waitFor('.app', 30000);

  const data = buildData();
  console.log(`\n解析出 ${data.courses.length} 门课，写入本地存储后重新加载…`);

  await browser.evaluate(
    `localStorage.setItem(${JSON.stringify(STORAGE_KEY)}, ${JSON.stringify(JSON.stringify(data))})`,
  );
  // 注入 storage 后用 location.reload() 强制刷新 —— CDP 对相同 URL 的
  // Page.navigate 可能不触发重载，页面就会一直停留在「还没有课程」的空状态
  await browser.evaluate('location.reload()');
  await new Promise((r) => setTimeout(r, 1500));
  await browser.waitFor('.slot__chip', 30000);
  await new Promise((r) => setTimeout(r, 800));

  await browser.shoot(`${OUT}grid-01-week.png`);

  /* ---- ① 课程块里有地点 ---- */
  const texts = await browser.evaluate(
    `(() => { const el = document.querySelector('.slot__meta'); return el ? el.textContent : null; })()`,
  );
  check('课程块渲染出地点文本', !!texts && texts.trim().length > 0, String(texts));

  const allMeta = await browser.evaluate(
    `Array.from(document.querySelectorAll('.slot__meta')).map((el) => el.textContent).slice(0, 6)`,
  );
  console.log('  前几个地点：', JSON.stringify(allMeta));

  /* ---- ② 内容没有被裁掉（原来 height:100% + overflow:hidden 的病根） ---- */
  const clipped = await browser.evaluate(
    `(() => {
       const bad = [];
       document.querySelectorAll('.slot__chip').forEach((el) => {
         // 纵向溢出 = 底部有内容被 overflow:hidden 切掉
         if (el.scrollHeight - el.clientHeight > 1) bad.push(el.textContent.slice(0, 12));
       });
       return bad;
     })()`,
  );
  check('没有课程块内容被裁切', clipped.length === 0, JSON.stringify(clipped));

  /* ---- ③ 同一节课是一个方块 ----
     用户的课表全是「第A-B节」这类跨两节的课，所以：
       · 合并后每个课程只占 1 个 slot 元素；若按节拆开，每个课程会占 2 个
       · 网格总共 12 节 × 7 天 = 84 格，合并后被"跨行元素"吃掉的格子必须从 DOM 里消失，
         否则那些占位元素会被排到后面，整行错位
     第 6 周可见 19 门课 → 课程块 19 个、slot 元素 84 - 19 = 65 个 */
  const grid = await browser.evaluate(
    `(() => {
       const chips = Array.from(document.querySelectorAll('.slot__chip'));
       const slots = Array.from(document.querySelectorAll('.slot'));
       const blocks = Array.from(document.querySelectorAll('.slot__chip--block'));
       const spans = blocks.map((el) => getComputedStyle(el.closest('.slot')).gridRow);
       // 同一列的块不应重叠：前一个的底边不能超过后一个的顶边
       const byCol = {};
       chips.forEach((el) => {
         const r = el.closest('.slot').getBoundingClientRect();
         const col = Math.round(r.left);
         (byCol[col] ||= []).push({ top: Math.round(r.top), bottom: Math.round(r.bottom) });
       });
       let overlaps = 0;
       Object.values(byCol).forEach((list) => {
         list.sort((a, b) => a.top - b.top);
         for (let i = 1; i < list.length; i += 1) if (list[i].top < list[i - 1].bottom) overlaps += 1;
       });
       return {
         chipCount: chips.length,
         slotCount: slots.length,
         blockCount: blocks.length,
         spans,
         overlaps,
       };
     })()`,
  );
  console.log('  网格统计：', JSON.stringify({ ...grid, spans: grid.spans.slice(0, 3) }));
  check('每个跨节次课程只渲染 1 个方块（19 个而非 38 个）', grid.chipCount === 19, String(grid.chipCount));
  check('被覆盖的格子已从 DOM 移除（slot 共 65 个）', grid.slotCount === 65, String(grid.slotCount));
  check('跨节次方块声明了 grid-row: span 2', grid.spans.length === 19 && grid.spans.every((s) => s === 'span 2'), JSON.stringify(grid.spans.slice(0, 3)));
  check('同一列的方块互不重叠（网格未错位）', grid.overlaps === 0, String(grid.overlaps));

  /* ---- ④ 跨节次方块的高度 = 两行之和（说明 row-gap 被吃进元素内部，中间没有缝隙） ---- */
  const geometry = await browser.evaluate(
    `(() => {
       const block = document.querySelector('.slot__chip--block');
       if (!block) return null;
       const slot = block.closest('.slot');
       const r = slot.getBoundingClientRect();
       const gridEl = document.querySelector('.schedule__grid');
       const rowGap = parseFloat(getComputedStyle(gridEl).rowGap) || 0;
       // 单行高度取自同一列未被合并的格（这里用 schedule__section 的行高做参照不严谨，
       // 直接用 min-height 46 + gap 反推：两行 = 46*2 + gap）
       return {
         slotH: Math.round(r.height),
         rowGap,
         twoRows: 46 * 2 + rowGap,
         text: block.textContent,
       };
     })()`,
  );
  console.log('  合并块几何：', JSON.stringify(geometry));
  check(
    '跨节次方块高度等于两行之和（内部无缝）',
    !!geometry && Math.abs(geometry.slotH - geometry.twoRows) <= 4,
    JSON.stringify(geometry),
  );

  /* ---- ⑤ 合并块里带上了教师 ---- */
  const teachers = await browser.evaluate(
    `Array.from(document.querySelectorAll('.slot__teacher')).map((el) => el.textContent).slice(0, 5)`,
  );
  console.log('  合并块里的教师：', JSON.stringify(teachers));
  check('合并块显示教师', teachers.length > 0 && teachers.every((t) => t.trim().length > 0));

  /* ---- ⑥ 单双周角标没丢 ---- */
  const parity = await browser.evaluate(`document.querySelectorAll('.slot__parity').length`);
  console.log('  单双周角标数量：', parity);

  /* ---- ⑦ 课程名的行数限制实际生效值（截图发现长课名只显示 2 行，查为什么） ---- */
  const clampInfo = await browser.evaluate(
    `(() => {
       const name = document.querySelector('.slot__chip--block .slot__name');
       if (!name) return null;
       const cs = getComputedStyle(name);
       const chip = name.parentElement;
       return {
         clamp: cs.webkitLineClamp,
         nameH: Math.round(name.getBoundingClientRect().height),
         nameScrollH: name.scrollHeight,
         chipH: Math.round(chip.getBoundingClientRect().height),
         shrink: cs.flexShrink,
         basis: cs.flexBasis,
         minH: cs.minHeight,
         kids: Array.from(chip.children).map((c) => c.className + ':' + Math.round(c.getBoundingClientRect().height)),
       };
     })()`,
  );
  console.log('  clamp 诊断：', JSON.stringify(clampInfo));

  /* ---- ⑧ 旧数据自动迁移 + 配色多彩 ---- */
  const colors = await browser.evaluate(
    `(() => {
       const set = new Set();
       document.querySelectorAll('.slot__chip').forEach((el) => set.add(el.style.background || getComputedStyle(el).backgroundImage));
       return Array.from(set);
     })()`,
  );
  console.log(`  实际用到的背景色 ${colors.length} 种：`, colors.slice(0, 4).map((c) => c.slice(0, 40)));
  check('旧版深红数据已自动迁移为渐变色', colors.every((c) => c.includes('gradient')), colors.join(' | ').slice(0, 120));
  check('配色多彩（≥5 种背景）', colors.length >= 5, String(colors.length));

  /* ---- ⑨ 抓一个合并块放大看 ---- */
  await browser.evaluate(
    `(() => {
       const el = document.querySelector('.slot__chip--block');
       if (el) el.scrollIntoView({ block: 'center' });
     })()`,
  );
  await new Promise((r) => setTimeout(r, 400));
  await browser.shoot(`${OUT}grid-02-block.png`);

  console.log(`\n结果：${pass}/${pass + fail} 通过`);
} finally {
  await browser.close();
}

process.exit(fail === 0 ? 0 : 1);
