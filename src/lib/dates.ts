export const DAY = 864e5;

export const ymd = (d: Date = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parse = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const today = () => ymd();

/** Monday-first single letters for display. */
export const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
/** 0 = Monday … 6 = Sunday. */
export const monIndex = (d: Date) => (d.getDay() + 6) % 7;
export const mondayOf = (d: Date = new Date()) => addDays(d, -monIndex(d));

export const fmtTime = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
export const fmtShort = (d: Date) => d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
export const fmtClock = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
export const uid = () => Math.random().toString(36).slice(2, 10);

