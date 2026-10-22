import type { Profile } from './profile';
import { repRange, timedSeconds, type ExerciseLog, type Intensity, type LiveExercise } from './workout';

/* Calories use the "corrected MET" approach: 1 MET is *your* resting burn, from the Mifflin-St Jeor
   equation (weight, height, age, sex), so the same workout burns more for a heavier or younger person.
     kcal = MET × (resting kcal per day ÷ 1440) × minutes
   Strength sets: lifting time is ~3.5 s per rep (or the hold time); the MET rises with load relative to
   body weight (5 → 8). Rest between sets counts at 1.8 MET. Cardio uses the exercise's MET from the plan,
   or a default for its intensity. */

const DEFAULT_CARDIO_MET: Record<Intensity, number> = { easy: 4, moderate: 7, hard: 10 };

export function restingKcalPerMin(p: Profile) {
  const w = p.weightKg || 70, h = p.heightCm || 170, a = p.age || 30;
  const bmr = 10 * w + 6.25 * h - 5 * a + (p.sex === 'female' ? -161 : 5);
  return Math.max(900, bmr) / 1440;
}

function strengthSetKcal(p: Profile, reps: number, weight: number, tReps: string, restSec: number, isLast: boolean) {
  const bw = p.weightKg || 70;
  const load = weight > 0 ? weight : bw * 0.6;                       // bodyweight moves ≈ 60% of body weight
  const met = 5 + 3 * Math.min(1, load / (0.8 * bw));
  const secs = timedSeconds(tReps) || reps * 3.5;
  const activeMin = secs / 60, restMin = isLast ? 0 : restSec / 60;
  return (met * activeMin + 1.8 * restMin) * restingKcalPerMin(p);
}

const cardioKcal = (p: Profile, minutes: number, met: number, intensity: Intensity) =>
  (met || DEFAULT_CARDIO_MET[intensity]) * minutes * restingKcalPerMin(p);

/** Calories for a finished (or in-progress) list of exercises. Only completed sets and cardio count. */
export function kcalForLogs(p: Profile, exercises: ExerciseLog[]) {
  let total = 0;
  exercises.forEach((x) => {
    if (x.kind === 'cardio') { if (x.cardio?.done) total += cardioKcal(p, x.cardio.minutes, x.met || 0, x.intensity || 'moderate'); return; }
    const done = x.sets.filter((s) => s.done);
    done.forEach((s, i) => { total += strengthSetKcal(p, s.r || repRange(x.tReps)[1], s.w, x.tReps, x.rest || 90, i === done.length - 1); });
  });
  return Math.round(total);
}
export function kcalForLive(p: Profile, ex: LiveExercise[]) {
  return kcalForLogs(p, ex.map((x) => ({
    name: x.name, kind: x.kind, tSets: x.tSets, tReps: x.tReps, tW: x.tW, rest: x.rest, met: x.met, intensity: x.intensity,
    sets: x.sets.map((t) => ({ w: +t.w || 0, r: +t.r || 0, done: t.done })),
    cardio: { minutes: +x.cardio.minutes || 0, km: +x.cardio.km || 0, done: x.cardio.done },
  })));
}
/** Rough estimate for a planned day, shown before starting. */
export function kcalForPlanDay(p: Profile, exercises: { kind: string; sets: number; reps: string; weight: number; rest: number; minutes: number; met: number; intensity: Intensity }[]) {
  return kcalForLogs(p, exercises.map((e) => ({
    name: '', kind: e.kind as any, tSets: e.sets, tReps: e.reps, tW: e.weight, rest: e.rest, met: e.met, intensity: e.intensity,
    sets: Array.from({ length: e.kind === 'cardio' ? 0 : e.sets }, () => ({ w: e.weight, r: repRange(e.reps)[1] || 10, done: true })),
    cardio: { minutes: e.minutes, km: 0, done: e.kind === 'cardio' },
  })));
}
/** Saved calories for a session, or worked out now for sessions logged before calories were tracked. */
export const logKcal = (p: Profile, l: { kcal?: number; exercises: ExerciseLog[] }) => l.kcal || kcalForLogs(p, l.exercises);
