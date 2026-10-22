import { useCallback } from 'react';

import { haptic, useToast } from '@/components/ui';
import { today } from './dates';
import { allDoneOn, count, Habit, isDone, streak } from './habits';
import { useStore } from './store';

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Check-in actions shared by Home, Habits and habit detail. Each shows a toast with Undo. */
export function useHabitActions() {
  const { habits, setHabits } = useStore();
  const toast = useToast();

  const restore = useCallback((copy: Habit) => setHabits((hs) => hs.map((x) => (x.id === copy.id ? copy : x))), [setHabits]);
  const update = useCallback((id: string, fn: (h: Habit) => void) => {
    let before: Habit | null = null, after: Habit | null = null;
    const k = today();
    setHabits((hs) => hs.map((x) => {
      if (x.id !== id) return x;
      before = clone(x); const n = clone(x); fn(n); after = n; return n;
    }));
    return { before: before as unknown as Habit, after: after as unknown as Habit, k };
  }, [setHabits]);

  const celebrateIfAll = useCallback((list: Habit[], k: string, wasAll: boolean) => {
    if (!wasAll && allDoneOn(list, k)) { haptic('success'); toast(k === today() ? 'All habits done today 🎉' : 'All habits done that day'); return true; }
    return false;
  }, [toast]);

  const toggle = useCallback((h: Habit, k = today()) => {
    const wasAll = allDoneOn(habits, k), before = clone(h), n = clone(h);
    if (isDone(n, k)) delete n.log[k]; else { n.log[k] = n.goal; delete n.skips[k]; haptic('light'); }
    const next = habits.map((x) => (x.id === h.id ? n : x));
    setHabits(() => next);
    if (celebrateIfAll(next, k, wasAll)) return;
    if (isDone(n, k)) { const s = streak(n); toast(s > 1 && k === today() ? `${n.name} · ${s} day streak` : `${n.name} done`, () => restore(before)); }
  }, [habits, setHabits, toast, restore, celebrateIfAll]);

  const inc = useCallback((h: Habit, k = today()) => {
    const wasAll = allDoneOn(habits, k), before = clone(h), n = clone(h);
    if (isDone(n, k)) { delete n.log[k]; setHabits((hs) => hs.map((x) => (x.id === h.id ? n : x))); toast(`${n.name} reset`, () => restore(before)); return; }
    n.log[k] = Math.min(n.goal, count(n, k) + 1); delete n.skips[k];
    haptic('light');
    const next = habits.map((x) => (x.id === h.id ? n : x));
    setHabits(() => next);
    if (celebrateIfAll(next, k, wasAll)) return;
    toast(isDone(n, k) ? `${n.name} · goal reached` : `${count(n, k)} of ${n.goal}`, () => restore(before));
  }, [habits, setHabits, toast, restore, celebrateIfAll]);

  /** Tile/checkbox tap: counted habits add one; others toggle. */
  const tap = useCallback((h: Habit, k = today()) => (h.goal > 1 ? inc(h, k) : toggle(h, k)), [inc, toggle]);

  const skip = useCallback((h: Habit) => {
    const k = today();
    update(h.id, (n) => { if (n.skips[k]) delete n.skips[k]; else { n.skips[k] = true; delete n.log[k]; } });
    toast(h.skips[k] ? 'Skip removed' : 'Skipped today. Your streak is safe.');
  }, [update, toast]);

  return { toggle, inc, tap, skip, restore };
}
