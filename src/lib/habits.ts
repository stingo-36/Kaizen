import { addDays, DAY, DAY_NAMES, fmtTime, mondayOf, monIndex, parse, today, uid, ymd } from './dates';
import { PASTEL } from './theme';

export type Habit = {
  id: string;
  type: 'build' | 'quit';
  name: string;
  icon: number;
  /** JS weekdays (0 = Sunday) the habit is scheduled on. */
  days: number[];
  goal: number;
  reminder: string | null;
  createdAt: string;
  log: Record<string, number>;
  skips: Record<string, boolean>;
  quitStart: string | null;
  bestClean: number;
};

/** Lucide icon keys; resolved to components in components/icons. */
export const ICONS = [
  'footprints', 'person-standing', 'droplet', 'book-open', 'moon', 'heart',
  'dumbbell', 'salad', 'brain', 'bike', 'pill', 'pen-line',
  'cigarette-off', 'phone-off', 'wine-off', 'candy-off', 'bed', 'sun',
] as const;
export const isQuitIcon = (i: number) => /-off$/.test(ICONS[i] ?? '');

/** Pastel card tones (background, ink); they live in theme so dark mode can swap them. */
export { PASTEL };
export const pastel = (h: Pick<Habit, 'icon'>) => PASTEL[(h.icon ?? 0) % 4];

export function newHabit(o: Partial<Habit> = {}): Habit {
  return {
    id: uid(), type: 'build', name: '', icon: 0, days: [0, 1, 2, 3, 4, 5, 6], goal: 1, reminder: null,
    createdAt: today(), log: {}, skips: {}, quitStart: null, bestClean: 0, ...o,
  };
}

export const isScheduled = (h: Habit, k: string) => h.days.includes(parse(k).getDay());
export const count = (h: Habit, k: string) => h.log[k] || 0;
export const isDone = (h: Habit, k: string) => count(h, k) >= h.goal;

/** Scheduled days in a row that were done; skipped/unscheduled days and today don't break it. */
export function streak(h: Habit) {
  let n = 0;
  for (let d = new Date(), i = 0; i < 2000; i++, d = addDays(d, -1)) {
    const k = ymd(d);
    if (k < h.createdAt) break;
    if (!isScheduled(h, k)) continue;
    if (isDone(h, k)) n++;
    else if (h.skips[k] || k === today()) continue;
    else break;
  }
  return n;
}
export function bestStreak(h: Habit) {
  let best = 0, run = 0;
  for (let d = parse(h.createdAt), end = today(); ymd(d) <= end; d = addDays(d, 1)) {
    const k = ymd(d);
    if (!isScheduled(h, k)) continue;
    if (isDone(h, k)) { run++; best = Math.max(best, run); }
    else if (h.skips[k] || k === end) continue;
    else run = 0;
  }
  return best;
}
/** Share of scheduled days done between two dates (skips excluded; today counts once done). */
export function rate(h: Habit, from: string, to: string) {
  let due = 0, done = 0;
  const start = from < h.createdAt ? h.createdAt : from;
  for (let d = parse(start); ymd(d) <= to; d = addDays(d, 1)) {
    const k = ymd(d);
    if (!isScheduled(h, k) || h.skips[k]) continue;
    if (k === today() && !isDone(h, k)) continue;
    due++;
    if (isDone(h, k)) done++;
  }
  return due ? done / due : null;
}
export const totalDone = (h: Habit) => Object.keys(h.log).filter((k) => isDone(h, k)).length;
export const cleanDays = (h: Habit) => Math.max(0, Math.floor((Date.now() - new Date(h.quitStart ?? Date.now()).getTime()) / DAY));
export function scheduleText(h: Habit) {
  if (h.type === 'quit') return `Quitting since ${new Date(h.quitStart ?? Date.now()).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}`;
  const d = [...h.days].sort();
  let s = d.length === 7 ? 'Every day' : d.join() === '1,2,3,4,5' ? 'Weekdays' : d.join() === '0,6' ? 'Weekends' : d.map((x) => DAY_NAMES[x].slice(0, 3)).join(', ');
  if (h.goal > 1) s += ` · ${h.goal}× a day`;
  if (h.reminder) s += ` · ${fmtTime(h.reminder)}`;
  return s;
}
export const dueOn = (habits: Habit[], k: string) => habits.filter((h) => h.type === 'build' && isScheduled(h, k) && k >= h.createdAt);
export const allDoneOn = (habits: Habit[], k: string) => { const d = dueOn(habits, k); return d.length > 0 && d.every((h) => isDone(h, k)); };

/** Days in a row with at least one habit done. */
export function dayStreak(habits: Habit[]) {
  const k = today();
  let n = 0;
  for (let i = habits.some((h) => isDone(h, k)) ? 0 : 1; i < 400; i++) {
    const dk = ymd(addDays(new Date(), -i));
    if (habits.some((h) => isDone(h, dk))) n++; else break;
  }
  return n;
}

/** Completion for a 7-day window ending today (offset in weeks), plus the window before. */
export function weekData(habits: Habit[], offset = 0) {
  const build = habits.filter((h) => h.type === 'build'), k = today();
  const start = addDays(new Date(), -6 + offset * 7);
  const counts = (dk: string) => {
    const dueH = build.filter((h) => dk >= h.createdAt && isScheduled(h, dk) && !h.skips[dk]);
    return { due: dueH.length, done: dueH.filter((h) => isDone(h, dk)).length };
  };
  const windowRate = (s: Date) => {
    let due = 0, done = 0;
    for (let i = 0; i < 7; i++) {
      const dk = ymd(addDays(s, i));
      if (dk > k) break;
      const c = counts(dk);
      due += dk === k ? c.done : c.due;
      done += c.done;
    }
    return due ? done / due : null;
  };
  const days = Array.from({ length: 7 }, (_, i) => {
    const dk = ymd(addDays(start, i)), c = counts(dk);
    return { dk, future: dk > k, r: c.due ? c.done / c.due : 0 };
  });
  return { start, days, counts, cur: windowRate(start), prev: windowRate(addDays(start, -7)) };
}

export const MILESTONES = [1, 3, 7, 14, 30, 60, 90, 180, 365];
export const nextMilestone = (days: number) => MILESTONES.find((m) => m > days) || days + 1;
export { mondayOf, monIndex };
