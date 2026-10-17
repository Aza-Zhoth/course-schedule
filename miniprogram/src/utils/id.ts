/**
 * 主键生成。
 * 不引入 uuid 依赖：时间戳（36 进制）+ 随机串在本应用的并发量下已足够唯一。
 */
export function generateId(prefix = 'c'): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${time}_${rand}`;
}
