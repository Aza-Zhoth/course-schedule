/**
 * 智能导入解析器回归用例
 *
 * 数据来源：某高校教务系统的导出格式（字段顺序与用词按真实导出格式还原）：
 *   课程名 周X 第A-B节 C-D周 地点 教师
 * 特征是「教师和地点都是光秃秃的词，没有『老师』后缀、没有『教师:』前缀」，
 * 全靠字段位置区分 —— 这正是老解析器认不出来的原因。
 *
 * 跑法：先 esbuild 打包 TS，再 node 本文件（见 package.json 的 parse:test）
 */
import { parseScheduleText } from './.importParser.bundle.mjs';

const LINES = [
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
];

/** 从原文里能人工读出来的期望值，逐条硬编码 —— 断言才有意义 */
const EXPECT = [
  ['物联网与智能控制', '1', '1-2', '1-16'],
  ['大数据分析', '1', '3-4', '1-8'],
  ['大数据分析', '1', '3-4', '9-16'],
  ['最优化方法', '1', '5-6', '1-16'],
  ['模式识别与机器学习', '1', '7-8', '1-15'],
  ['软件工程', '1', '9-10', '1-16'],
  ['模式识别与机器学习', '2', '1-2', '16-16'],
  ['计算机图形学', '2', '1-2', '8-15'],
  ['计算机视觉', '2', '3-4', '1-16'],
  ['密码学与信息安全基础', '2', '5-6', '1-12'],
  ['密码学与信息安全基础', '2', '5-6', '13-16'],
  ['操作系统', '2', '7-8', '1-12'],
  ['操作系统', '2', '7-8', '13-16'],
  ['模式识别与机器学习', '3', '1-2', '2-2'],
  ['多媒体技术', '3', '3-4', '1-16'],
  ['最优化方法', '3', '5-6', '1-15'],
  ['模式识别与机器学习', '3', '5-6', '4-16'],
  ['习近平新时代中国特色社会主义思想概论', '3', '7-8', '1-16'],
  ['软件工程', '3', '9-10', '2-16'],
  ['操作系统', '4', '1-2', '1-12'],
  ['操作系统', '4', '1-2', '13-16'],
  ['物联网与智能控制', '4', '3-4', '2-16'],
  ['数字图像处理', '4', '5-6', '1-12'],
  ['数字图像处理', '4', '5-6', '13-16'],
  ['汇编语言', '4', '7-8', '1-12'],
  ['汇编语言', '4', '7-8', '13-16'],
  ['计算机视觉', '4', '9-10', '1-15'],
  ['物联网技术导论', '5', '3-4', '1-16'],
  ['多媒体技术', '5', '5-6', '2-16'],
  ['计算机图形学', '5', '7-8', '1-16'],
];

/** 单双周期望：只有第 16、17、19、27、29 行是单/双周 */
const EXPECT_PARITY = {
  15: 'odd',
  16: 'even',
  18: 'even',
  21: 'even',
  26: 'odd',
  28: 'even',
};

const result = parseScheduleText(LINES.join('\n'), { maxSections: 12, totalWeeks: 20 });

const fails = [];
console.log(`解析出 ${result.courses.length} 条，未识别 ${result.unmatched.length} 行\n`);

result.courses.forEach((item, i) => {
  const d = item.draft;
  const want = EXPECT[i];
  const problems = [];
  if (!want) problems.push('多出预期外的条目');
  else {
    if (d.name !== want[0]) problems.push(`课程名「${d.name}」≠「${want[0]}」`);
    if (String(d.dayOfWeek) !== want[1]) problems.push(`星期 ${d.dayOfWeek} ≠ ${want[1]}`);
    if (`${d.startSection}-${d.endSection}` !== want[2]) {
      problems.push(`节次 ${d.startSection}-${d.endSection} ≠ ${want[2]}`);
    }
    if (`${d.startWeek}-${d.endWeek}` !== want[3]) {
      problems.push(`周次 ${d.startWeek}-${d.endWeek} ≠ ${want[3]}`);
    }
  }
  if (!d.teacher) problems.push('教师为空');
  if (!d.location) problems.push('地点为空');
  const wantParity = EXPECT_PARITY[i];
  if (wantParity && d.weekParity !== wantParity) {
    problems.push(`单双周 ${d.weekParity} ≠ ${wantParity}`);
  }
  if (problems.length) fails.push({ i, line: LINES[i], problems, got: d });

  const flag = problems.length ? 'FAIL' : 'PASS';
  console.log(
    `${flag} ${String(i + 1).padStart(2)}. ${d.name} | 周${d.dayOfWeek} ${d.startSection}-${d.endSection}节 ${d.startWeek}-${d.endWeek}周${d.weekParity === 'all' ? '' : d.weekParity === 'odd' ? '单' : '双'} | ${d.location || '(空)'} | ${d.teacher || '(空)'}`,
  );
  if (problems.length) console.log(`       ↳ ${problems.join('；')}`);
});

if (result.unmatched.length) {
  console.log('\n未识别行：');
  result.unmatched.forEach((l) => console.log('  ' + l));
}

const withTeacher = result.courses.filter((c) => c.draft.teacher).length;
const withLocation = result.courses.filter((c) => c.draft.location).length;
console.log(
  `\n===== ${LINES.length} 行输入 / 解析出 ${result.courses.length} 条 / ` +
    `教师识别 ${withTeacher} 条 / 地点识别 ${withLocation} 条 / 失败 ${fails.length} 条 =====`,
);
process.exit(fails.length === 0 && result.courses.length === LINES.length ? 0 : 1);
