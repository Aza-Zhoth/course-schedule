/**
 * 智能导入解析器「旧格式」回归用例
 *
 * 上一步为了支持教务系统的裸姓名格式（课程名 周X 第A-B节 C-D周 地点 教师）
 * 改了地点与教师的抽取规则，这里把原先支持的写法逐条钉住，防止改坏：
 *   - 「XX老师 / X教授」后缀写法
 *   - 「教师:XX」键值写法
 *   - 「教301」「1B421」「实验楼402」等地名
 *   - 多行块（课程名一行、时间一行、地点一行）
 *   - 认不出来的行必须原样进 unmatched，不能瞎猜
 *   - 行尾没有姓名时不能把课程名误当教师
 */
import { parseScheduleText } from './.importParser.bundle.mjs';

const OPTS = { maxSections: 12, totalWeeks: 20 };

let pass = 0;
let fail = 0;
function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) pass += 1;
  else fail += 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (!ok) console.log(`        期望 ${JSON.stringify(expected)}\n        实际 ${JSON.stringify(actual)}`);
}

function parseOne(text) {
  const r = parseScheduleText(text, OPTS);
  const c = r.courses[0];
  if (!c) return { none: true, unmatched: r.unmatched };
  const d = c.draft;
  return {
    name: d.name,
    teacher: d.teacher,
    location: d.location,
    day: d.dayOfWeek,
    sections: `${d.startSection}-${d.endSection}`,
    weeks: `${d.startWeek}-${d.endWeek}`,
    parity: d.weekParity,
  };
}

console.log('--- 后缀写法「XX老师」 ---');
/* 注意期望值：「张老师」存成「张」—— 后缀是称谓，不是姓名的组成部分。
   「张三老师」则会正确得到「张三」。这是迁移前就有的设计，此处只做回归锁定。 */
check(
  '高等数学 周一 第1-2节 1-16周 教301 张老师',
  parseOne('高等数学 周一 第1-2节 1-16周 教301 张老师'),
  { name: '高等数学', teacher: '张', location: '教301', day: 1, sections: '1-2', weeks: '1-16', parity: 'all' },
);
check(
  '大学英语 周二 第3-4节 1-16周 1B421 李教授',
  parseOne('大学英语 周二 第3-4节 1-16周 1B421 李教授'),
  { name: '大学英语', teacher: '李', location: '1B421', day: 2, sections: '3-4', weeks: '1-16', parity: 'all' },
);

console.log('\n--- 键值写法「教师:XX」 ---');
check(
  '教师:赵六 线性代数 周五 第1-2节 1-16周 教101',
  parseOne('教师:赵六 线性代数 周五 第1-2节 1-16周 教101'),
  { name: '线性代数', teacher: '赵六', location: '教101', day: 5, sections: '1-2', weeks: '1-16', parity: 'all' },
);

console.log('\n--- 不能误判：行尾没有姓名 ---');
check(
  '数据结构 周三 第5-6节 1-8周 实验楼402（无教师）',
  parseOne('数据结构 周三 第5-6节 1-8周 实验楼402'),
  {
    name: '数据结构',
    teacher: '',
    location: '实验楼402',
    day: 3,
    sections: '5-6',
    weeks: '1-8',
    parity: 'all',
  },
);
check(
  '体育 周一 第3-4节 1-16周 体育馆（不能把课程名当教师）',
  parseOne('体育 周一 第3-4节 1-16周 体育馆'),
  { name: '体育', teacher: '', location: '体育馆', day: 1, sections: '3-4', weeks: '1-16', parity: 'all' },
);
check(
  '课程名 + 无地点的裸姓名（靠长度差判断）',
  parseOne('概率论与数理统计 周四 第1-2节 1-16周 郑九'),
  {
    name: '概率论与数理统计',
    teacher: '郑九',
    location: '',
    day: 4,
    sections: '1-2',
    weeks: '1-16',
    parity: 'all',
  },
);

console.log('\n--- 单双周 ---');
check(
  '1-16周双（周次在前）',
  parseOne('大学物理 周二 第1-2节 1-16周双 教201 孙七').parity,
  'even',
);
check(
  '双周（独立词）',
  parseOne('大学物理 周二 第1-2节 双周 教201 孙七').parity,
  'even',
);
check(
  '3-15周单（周次在前）',
  parseOne('马克思主义基本原理 周三 第9-10节 3-15周单 3教301 周八').parity,
  'odd',
);
check(
  '单双周 = 每周',
  parseOne('形势与政策 周五 第9-10节 1-16周单双周 教401 吴十').parity,
  'all',
);

console.log('\n--- 多行块格式 ---');
check(
  '课程名 / 时间 / 周次 / 地点 / 教师 各占一行',
  parseOne('数字图像处理\n周四 第5-6节\n1-16周\n1教1C307多\n秦昭'),
  {
    name: '数字图像处理',
    teacher: '秦昭',
    location: '1教1C307多',
    day: 4,
    sections: '5-6',
    weeks: '1-16',
    parity: 'all',
  },
);

console.log('\n--- 认不出来的行 ---');
check('单行只有课程名（无星期）→ unmatched', parseScheduleText('线性代数', OPTS).unmatched, ['线性代数']);
check('纯空白 → 无结果', parseScheduleText('   \n\n  ', OPTS).courses.length, 0);

console.log(`\n===== 回归 ${pass + fail} 项，通过 ${pass}，失败 ${fail} =====`);
process.exit(fail === 0 ? 0 : 1);
