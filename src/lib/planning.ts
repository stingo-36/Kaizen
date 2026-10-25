import { addDays, parse, ymd } from './dates';
import type { FoodData, FoodEntry, Meal } from './food';
import { dueOn, isDone, type Habit } from './habits';
import type { SessionLog } from './workout';

export const HOME_CARDS = [
  ['overview', 'Daily overview'], ['snapshot', 'Habits and steps'], ['workout', 'Next workout'],
  ['integrations', 'Spending and health'], ['tracker', 'WorkNest tasks'], ['resources', 'Saved resources'], ['insight', 'Coach insight'],
] as const;
export type HomeCardId = typeof HOME_CARDS[number][0];
export type HomeLayout = { order: HomeCardId[]; hidden: HomeCardId[] };
export function homeLayout(raw?: Partial<HomeLayout>): HomeLayout {
  const ids = HOME_CARDS.map(([id]) => id);
  const valid = (id: HomeCardId) => ids.includes(id);
  return { order: [...new Set([...(raw?.order ?? []).filter(valid), ...ids])], hidden: [...new Set((raw?.hidden ?? []).filter(valid))] };
}
export function moveHomeCard(layout: HomeLayout, id: HomeCardId, direction: -1 | 1): HomeLayout {
  const order = [...layout.order], from = order.indexOf(id), to = from + direction;
  if (from < 0 || to < 0 || to >= order.length) return layout;
  [order[from], order[to]] = [order[to], order[from]];
  return { ...layout, order };
}

export type Recovery = { date: string; energy: number; soreness: number; sleepHours: number };
export function recoveryAdvice(r: Recovery) {
  if (r.energy <= 2 || r.soreness >= 4 || r.sleepHours < 5) return { level: 'Take it easy', text: 'Consider a rest day or an easy walk. You can choose today’s plan after checking how you feel.' };
  if (r.energy === 3 || r.soreness === 3 || r.sleepHours < 7) return { level: 'Keep it comfortable', text: 'Consider a lighter session and leave a few reps in reserve. Adjust or stop if you feel uncomfortable.' };
  return { level: 'Ready for your usual plan', text: 'Start with your normal warm-up and reassess how you feel before working sets.' };
}

export type MealTemplate = { id: string; name: string; meal: Meal; entries: Omit<FoodEntry, 'id' | 'at' | 'meal'>[] };
export function entriesFromTemplate(template: MealTemplate, meal: Meal, makeId: () => string, at = Date.now()): FoodEntry[] {
  return template.entries.map((entry) => ({ ...entry, item: { ...entry.item, per100: { ...entry.item.per100 } }, id: makeId(), at, meal }));
}

export type DayItem = { id: string; title: string; detail: string; done: boolean; kind: 'habit' | 'workout' | 'meal' | 'task'; sourceId?: string; meal?: Meal };
export function dayItems(date: string, habits: Habit[], logs: SessionLog[], food: FoodData, workoutTitle: string | null, rest: boolean,
  tasks: { id: string; subject: string; status: string; dueDate: string | null; completedAt: string | null }[]): DayItem[] {
  const meals: [Meal, string][] = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner']];
  return [
    ...dueOn(habits, date).filter((h) => !h.skips[date]).map((h): DayItem => ({ id: `habit:${h.id}`, sourceId: h.id, kind: 'habit', title: h.name, detail: `${h.log[date] || 0} / ${h.goal}${h.reminder ? ` · ${h.reminder}` : ''}`, done: isDone(h, date) })),
    ...(workoutTitle || rest || logs.some((l) => l.date === date) ? [{ id: 'workout', kind: 'workout' as const, title: rest ? 'Recovery day' : workoutTitle || 'Workout', detail: rest ? 'Rest or gentle movement' : 'Open your workout', done: rest || logs.some((l) => l.date === date) }] : []),
    ...meals.map(([meal, title]): DayItem => ({ id: `meal:${meal}`, meal, kind: 'meal', title, detail: 'Log your meal', done: (food.days[date] ?? []).some((e) => e.meal === meal) })),
    ...tasks.filter((t) => t.status === 'Done' ? !!t.completedAt && ymd(new Date(t.completedAt)) === date : !!t.dueDate && t.dueDate <= date).map((t): DayItem => ({ id: `task:${t.id}`, sourceId: t.id, kind: 'task', title: t.subject, detail: t.dueDate && t.dueDate < date ? 'Overdue · WorkNest' : 'WorkNest', done: t.status === 'Done' })),
  ];
}

type WeekStats = { habitDone: number; habitDue: number; habitRate: number | null; workouts: number; mealDays: number };
export function weeklyReview(date: string, habits: Habit[], logs: SessionLog[], food: FoodData, trainingGoal: number) {
  const end = addDays(parse(date), -1), start = addDays(end, -6);
  const stats = (from: Date): WeekStats => {
    let habitDone = 0, habitDue = 0, workouts = 0, mealDays = 0;
    for (let i = 0; i < 7; i++) {
      const key = ymd(addDays(from, i));
      const due = dueOn(habits, key).filter((h) => !h.skips[key]);
      habitDue += due.length; habitDone += due.filter((h) => isDone(h, key)).length;
      workouts += logs.filter((l) => l.date === key).length;
      if ((food.days[key] ?? []).length) mealDays++;
    }
    return { habitDone, habitDue, habitRate: habitDue ? Math.round(habitDone / habitDue * 100) : null, workouts, mealDays };
  };
  const current = stats(start), previous = stats(addDays(start, -7));
  const wins: string[] = [], slips: string[] = [];
  if (current.habitRate !== null && previous.habitRate !== null) {
    const delta = current.habitRate - previous.habitRate;
    if (delta > 0) wins.push(`Habit completion improved by ${delta} percentage points.`);
    else if (delta < 0) slips.push(`Habit completion fell by ${-delta} percentage points.`);
  }
  if (current.workouts > previous.workouts) wins.push(`${current.workouts - previous.workouts} more workout sessions logged.`);
  else if (current.workouts < previous.workouts) slips.push(`${previous.workouts - current.workouts} fewer workout sessions logged.`);
  if (current.mealDays > previous.mealDays) wins.push(`Meals logged on ${current.mealDays - previous.mealDays} more days.`);
  else if (current.mealDays < previous.mealDays) slips.push(`Meals logged on ${previous.mealDays - current.mealDays} fewer days.`);
  const goal = Math.max(1, Math.min(7, trainingGoal));
  const goals = [
    current.habitDue ? `Complete ${Math.min(100, Math.max(60, (current.habitRate ?? 0) + 10))}% of scheduled habits.` : 'Create one small daily habit and complete it three times.',
    `Plan ${goal} training days with room for recovery.`,
    `Log your meals on ${Math.min(7, Math.max(3, current.mealDays + 1))} days.`,
  ];
  return { start: ymd(start), end: ymd(end), current, previous, wins, slips, goals };
}

/** One-off reminders allow today's completed/skipped habit to stay quiet. */
export function reminderOccurrences(habits: Habit[], now: Date, limit = 60) {
  const out: { habit: Habit; date: Date }[] = [];
  for (let offset = 0; offset < 14; offset++) {
    const day = addDays(now, offset), key = ymd(day);
    for (const habit of dueOn(habits, key)) {
      if (!habit.reminder || habit.skips[key] || isDone(habit, key)) continue;
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(habit.reminder)) continue;
      const [hour, minute] = habit.reminder.split(':').map(Number);
      const at = new Date(day); at.setHours(hour, minute, 0, 0);
      if (at > now) out.push({ habit, date: at });
    }
  }
  return out.sort((a, b) => +a.date - +b.date).slice(0, limit);
}
