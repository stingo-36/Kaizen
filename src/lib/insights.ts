import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

import { ask } from './ai';
import { snapshot } from './coach';
import { addDays, today, ymd } from './dates';
import { FoodData, sumMacros, targets } from './food';
import type { HealthSummary } from './health-types';
import type { Habit } from './habits';
import type { Profile } from './profile';
import { activePlan, nextDayIdx, type WorkoutData } from './workout';

/** Weekly review plus a tip for tomorrow, made by the AI once a day (and again when new tracker data arrives). */
export type Insight = { summary: string; wins: string[]; improve: string[]; tomorrow: string; fromTracker: boolean };

function facts(habits: Habit[], W: WorkoutData, p: Profile, food: FoodData, h: HealthSummary) {
  const goal = targets(p);
  const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(new Date(), -i - 1)));
  const logged = days.map((d) => sumMacros(food.days[d] ?? [])).filter((m) => m.kcal > 0);
  const avg = (k: 'kcal' | 'p') => (logged.length ? Math.round(logged.reduce((a, m) => a + m[k], 0) / logged.length) : 0);
  const week = W.logs.filter((l) => l.date >= days[6]);
  const plan = activePlan(W), next = plan?.days[nextDayIdx(W, plan)];
  const tracker = [
    h.steps != null && `steps today ${h.steps}`, h.sleepMin ? `sleep last night ${Math.round(h.sleepMin / 6) / 10} h` : null,
    h.restingHr != null && `resting heart rate ${h.restingHr}`, h.hr && `heart rate today avg ${h.hr.avg}, max ${h.hr.max}`,
    h.kcal != null && `total calories burned today ${h.kcal}`, h.exercise && `${h.exercise.count} tracked sessions today (${h.exercise.minutes} min)`,
    h.weightKg != null && `weight ${h.weightKg} kg`,
  ].filter(Boolean);
  return {
    text: [
      snapshot(habits, W, p),
      `Workouts in the last 7 days: ${week.length} of ${p.days} planned (${week.map((l) => `${l.title}, felt ${l.feel}`).join('; ') || 'none'}).`,
      `Food: ${logged.length}/7 days logged, average ${avg('kcal')} kcal (target ${goal.kcal}) and ${avg('p')} g protein (target ${goal.p}).`,
      next ? `Next planned workout: ${next.title} (${next.exercises.map((e) => e.name).join(', ')}).` : 'No workout plan.',
      tracker.length ? `Google Fit / Health Connect today: ${tracker.join(', ')}.` : 'No fitness tracker data.',
    ].join('\n'),
    fromTracker: tracker.length > 0,
  };
}

export function useInsight(uid: string | null, habits: Habit[], W: WorkoutData, p: Profile, food: FoodData, h: HealthSummary) {
  const [data, setData] = useState<Insight | null>(null);
  const [loading, setLoading] = useState(false);
  const ready = habits.length > 0 || W.logs.length > 0 || Object.keys(food.days).length > 0 || h.at > 0;
  // A new day, or tracker data arriving for the first time today, makes a fresh review.
  const key = uid ? `kaizen.insight.${uid}.${today()}.${h.at ? 'fit' : 'nofit'}` : null;

  useEffect(() => {
    if (!key || !ready) return;
    let alive = true;
    (async () => {
      const cached = await AsyncStorage.getItem(key).catch(() => null);
      if (cached) { try { if (alive) setData(JSON.parse(cached)); return; } catch {} }
      if (alive) setLoading(true);
      const f = facts(habits, W, p, food, h);
      try {
        const res = await ask([
          { role: 'system', content: 'You are a friendly, practical fitness coach. Reply with ONLY valid JSON. Plain words, no emoji, every item at most 14 words.' },
          { role: 'user', content: `My data:\n${f.text}\n\nReview my last week and tell me what to do tomorrow. ${f.fromTracker ? 'Use my tracker data: e.g. little sleep or high resting heart rate means go lighter; low steps means add a walk; good recovery means push a bit more.' : ''}
Return JSON exactly like {"summary":"one sentence on how the week went","wins":["up to 2"],"improve":["up to 2"],"tomorrow":"one concrete suggestion for tomorrow's workout or day"}` },
        ], 0.4);
        const out: Insight = {
          summary: String(res?.summary || ''), wins: (res?.wins ?? []).map(String).slice(0, 2), improve: (res?.improve ?? []).map(String).slice(0, 2),
          tomorrow: String(res?.tomorrow || ''), fromTracker: f.fromTracker,
        };
        if (out.summary || out.tomorrow) { AsyncStorage.setItem(key, JSON.stringify(out)).catch(() => {}); if (alive) setData(out); }
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [key, ready]); // eslint-disable-line react-hooks/exhaustive-deps

  return { insight: data, loading };
}
