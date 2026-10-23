import { addDays, DAY_NAMES, today, ymd } from './dates';
import { Habit, isDone, isScheduled, rate, streak } from './habits';
import type { Profile } from './profile';
import { weekLogs, type WorkoutData } from './workout';

/** A short data summary the coach reads. Kept small so tips are fast and cheap. */
export function snapshot(habits: Habit[], W: WorkoutData, p: Profile) {
  const k = today(), build = habits.filter((h) => h.type === 'build');
  const byDay = Array.from({ length: 7 }, () => ({ due: 0, done: 0 }));
  for (let i = 1; i <= 28; i++) {
    const d = addDays(new Date(), -i), dk = ymd(d);
    build.forEach((h) => { if (dk < h.createdAt || !isScheduled(h, dk) || h.skips[dk]) return; byDay[d.getDay()].due++; if (isDone(h, dk)) byDay[d.getDay()].done++; });
  }
  const habitsLine = build.map((h) => `${h.name}: ${Math.round((rate(h, ymd(addDays(new Date(), -29)), k) ?? 0) * 100)}% last 30 days, streak ${streak(h)}`).join('; ');
  const days = byDay.map((x, i) => `${DAY_NAMES[i].slice(0, 3)} ${x.due ? Math.round((x.done / x.due) * 100) : '-'}%`).join(', ');
  const wk = weekLogs(W);
  return `Profile: goal ${p.goal}, ${p.level}, ${p.days} training days/week.\nHabits: ${habitsLine || 'none yet'}.\nCompletion by weekday (4 weeks): ${days}.\nWorkouts this week: ${wk.length}/${p.days}, ${wk.reduce((a, l) => a + l.kcal, 0)} kcal burned.`;
}
