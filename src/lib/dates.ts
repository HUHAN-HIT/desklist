const WEEK = ['日', '一', '二', '三', '四', '五', '六'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** 本地日期 → YYYY-MM-DD */
export function fmtLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr(): string {
  return fmtLocal(new Date());
}

/** 解析 YYYY-MM-DD 为本地正午 Date（避免时区边界） */
export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDaysStr(base: string, n: number): string {
  const d = parseDate(base);
  d.setDate(d.getDate() + n);
  return fmtLocal(d);
}

function diffDays(from: string, to: string): number {
  return Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86400000);
}

/** 排入今天后经过的天数：0=今天刚排，1=昨天排的。 */
export function pinAge(pinDate: string): number {
  return diffDays(pinDate, todayStr());
}

export function dueInfo(
  due: string | null,
): { label: string | null; tone: 'overdue' | 'today' | 'soon' | 'later' | 'none' } {
  if (!due) return { label: null, tone: 'none' };
  const t = todayStr();
  if (due < t) {
    const d = diffDays(due, t);
    return { label: d === 1 ? '昨天' : `过期${d}天`, tone: 'overdue' };
  }
  if (due === t) return { label: '今天', tone: 'today' };
  const d = diffDays(t, due);
  if (d === 1) return { label: '明天', tone: 'soon' };
  if (d <= 6) return { label: `周${WEEK[parseDate(due).getDay()]}`, tone: 'soon' };
  const dt = parseDate(due);
  return { label: `${dt.getMonth() + 1}月${dt.getDate()}日`, tone: 'later' };
}

/** "9月30日 周三" */
export function zhToday(): string {
  const d = new Date();
  return `${d.getMonth() + 1}月${d.getDate()}日 周${WEEK[d.getDay()]}`;
}
