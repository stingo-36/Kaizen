import { mondayOf, today, uid, ymd } from './dates';
import { ask } from './ai';
import type { Profile } from './profile';

/* ============================== types ============================== */
export type Kind = 'strength' | 'cardio';
export type Intensity = 'easy' | 'moderate' | 'hard';
export type PlanExercise = {
  id: string; kind: Kind; name: string; tip: string;
  // strength
  sets: number; reps: string; weight: number; rest: number;
  // cardio
  minutes: number; intensity: Intensity; met: number;
  /** Main muscles worked, in the exercise library's words (see MUSCLES). Empty for cardio and older plans. */
  muscles: string[];
};
export type PlanDay = { title: string; focus: string; exercises: PlanExercise[] };
export type Plan = {
  id: string; name: string; summary: string; progression: string; changes: string[];
  days: PlanDay[]; createdAt: string; updatedAt: string; version: number; sessionsAtUpdate: number;
};
export type SetLog = { w: number; r: number; done: boolean };
export type CardioLog = { minutes: number; km: number; done: boolean };
export type ExerciseLog = {
  name: string; kind: Kind; tSets: number; tReps: string; tW: number; rest: number;
  sets: SetLog[]; cardio?: CardioLog; intensity?: Intensity; met?: number;
};
export type Feel = 'easy' | 'just right' | 'hard';
export type SessionLog = {
  id: string; date: string; planId: string; day: number; title: string; feel: Feel; duration: number;
  exercises: ExerciseLog[]; prs: string[]; kcal: number;
};
export type LiveSet = { w: string; r: string; done: boolean };
export type LiveExercise = {
  name: string; kind: Kind; tSets: number; tReps: string; tW: number; rest: number; intensity: Intensity; met: number;
  sets: LiveSet[]; cardio: { minutes: string; km: string; done: boolean };
};
export type Session = { planId: string; day: number; start: number; restEnd: number; restId?: string | null; ex: LiveExercise[] };
export type WorkoutData = {
  plans: Plan[]; activePlanId: string | null; logs: SessionLog[]; session: Session | null; pending: SessionLog | null;
  lastChanges: { date: string; items: string[] } | null; selDay: number;
};

export const emptyWorkout = (): WorkoutData => ({ plans: [], activePlanId: null, logs: [], session: null, pending: null, lastChanges: null, selDay: 0 });
export const activePlan = (W: WorkoutData) => W.plans.find((p) => p.id === W.activePlanId) ?? W.plans[0] ?? null;

/** Bring data saved by older versions (single plan, no cardio) up to date. */
export function migrateWorkout(raw: any): WorkoutData {
  const w = { ...emptyWorkout(), ...(raw || {}) } as WorkoutData & { plan?: any; prefs?: any; settings?: any };
  if (!Array.isArray(w.plans)) w.plans = [];
  if (w.plan && !w.plans.length) { const p = normPlan(w.plan); w.plans = [p]; w.activePlanId = p.id; }
  delete w.plan; delete w.prefs; delete w.settings;
  w.plans = w.plans.map((p) => normPlan(p, p.id));
  w.logs = (w.logs || []).map((l: any) => ({ planId: '', kcal: 0, ...l, exercises: (l.exercises || []).map((x: any) => ({ kind: 'strength', rest: 90, ...x })) }));
  if (w.session && !(w.session as any).planId) w.session = null;
  return w;
}

/* ============================== muscle coverage ============================== */
/** Same names as the free-exercise-db library, so plan and library exercises line up. */
export const MUSCLES = ['chest', 'lats', 'middle back', 'lower back', 'traps', 'shoulders', 'biceps', 'triceps', 'forearms',
  'quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors', 'abdominals'];
const MUSCLE_ALIAS: Record<string, string> = {
  quads: 'quadriceps', quad: 'quadriceps', abs: 'abdominals', core: 'abdominals', obliques: 'abdominals', abdominal: 'abdominals',
  delts: 'shoulders', deltoids: 'shoulders', shoulder: 'shoulders', 'rear delts': 'shoulders', 'front delts': 'shoulders', 'side delts': 'shoulders',
  back: 'lats', 'upper back': 'middle back', rhomboids: 'middle back', lat: 'lats', latissimus: 'lats', trapezius: 'traps',
  pecs: 'chest', pectorals: 'chest', 'upper chest': 'chest', bicep: 'biceps', tricep: 'triceps', glute: 'glutes', gluteus: 'glutes',
  hamstring: 'hamstrings', calf: 'calves', forearm: 'forearms', 'hip flexors': 'quadriceps', 'inner thighs': 'adductors', 'outer thighs': 'abductors',
};
const muscleOf = (v: any) => { const m = String(v ?? '').toLowerCase().trim(); return MUSCLES.includes(m) ? m : MUSCLE_ALIAS[m] ?? null; };
const musclesOf = (v: any) => [...new Set((Array.isArray(v) ? v : []).map(muscleOf).filter(Boolean) as string[])];

const LEGS = ['quadriceps', 'hamstrings', 'glutes', 'calves'];
const FOCUS_MUSCLES: [RegExp, string[]][] = [
  [/\b(full|total)[\s-]*body\b/, ['chest', 'lats', 'shoulders', 'quadriceps', 'hamstrings', 'glutes', 'abdominals']],
  [/\bupper\b/, ['chest', 'lats', 'middle back', 'shoulders', 'biceps', 'triceps']],
  [/\blower\b|\blegs?\b/, LEGS],
  [/\bpush\b/, ['chest', 'shoulders', 'triceps']],
  [/\bpull\b/, ['lats', 'middle back', 'biceps']],
  [/\bchest\b|\bpecs?\b/, ['chest']],
  [/\bback\b/, ['lats', 'middle back']],
  [/\bposture\b/, ['middle back', 'traps', 'lower back']],
  [/\bshoulders?\b|\bdelts?\b/, ['shoulders']],
  [/\barms?\b/, ['biceps', 'triceps']],
  [/\bbiceps?\b/, ['biceps']], [/\btriceps?\b/, ['triceps']],
  [/\bquads?\b|\bquadriceps\b/, ['quadriceps']], [/\bhamstrings?\b/, ['hamstrings']],
  [/\bglutes?\b|\bbutt\b/, ['glutes']], [/\bcal(f|ves)\b/, ['calves']],
  [/\bcore\b|\babs\b|\babdominals?\b|\bobliques\b/, ['abdominals']],
  [/\btraps\b/, ['traps']], [/\bforearms?\b|\bgrip\b/, ['forearms']],
];
/** Muscles a day has to hit, read from its title and focus ("Push" → chest, shoulders, triceps). Cardio or mobility days need none. */
export function dayTargets(day: Pick<PlanDay, 'title' | 'focus'>): string[] {
  let text = `${day.title} ${day.focus}`.toLowerCase();
  const out = new Set<string>();
  // "Lower back" is its own muscle, not a legs or lats day.
  if (/\blower[\s-]*back\b/.test(text)) { out.add('lower back'); text = text.replace(/\blower[\s-]*back\b/g, ' '); }
  FOCUS_MUSCLES.forEach(([re, ms]) => { if (re.test(text)) ms.forEach((m) => out.add(m)); });
  return MUSCLES.filter((m) => out.has(m));
}
/** Target muscles no exercise in the day works. Only meaningful once exercises carry muscles (older plans don't). */
export function coverageGaps(day: PlanDay): string[] {
  if (!day.exercises.some((e) => e.muscles.length)) return [];
  const hit = new Set(day.exercises.flatMap((e) => e.muscles));
  return dayTargets(day).filter((m) => !hit.has(m));
}
export const dayMuscles = (day: PlanDay) => MUSCLES.filter((m) => day.exercises.some((e) => e.muscles.includes(m)));

/* ============================== session time ============================== */
// The session length covers everything: warm-up, cardio and strength. Strength gets whatever time is left.
export const warmupMinutes = (session: number) => (session <= 45 ? 5 : 10);
export const isWarmup = (e: PlanExercise) => e.kind === 'cardio' && /warm[\s-]*up/i.test(e.name);
/** Rough minutes an entry takes: cardio by its time; strength as sets × (work + rest) plus a minute to set up. */
export function exerciseMinutes(e: PlanExercise) {
  if (e.kind === 'cardio') return e.minutes;
  const work = timedSeconds(e.reps) || Math.max(20, repRange(e.reps)[1] * 3);
  return e.sets * (work + e.rest) / 60 + 1;
}
/** Estimated length of a day. Days without a warm-up entry (older plans) still reserve warm-up time. */
export function dayMinutes(day: PlanDay, session: number) {
  const total = day.exercises.reduce((a, e) => a + exerciseMinutes(e), 0);
  return Math.round(total + (day.exercises.some(isWarmup) ? 0 : warmupMinutes(session)));
}

/* ============================== normalising AI output ============================== */
const intensityOf = (v: any): Intensity => (['easy', 'moderate', 'hard'].includes(v) ? v : 'moderate');
export function normExercise(e: any): PlanExercise {
  const kind: Kind = e?.kind === 'cardio' || e?.type === 'cardio' ? 'cardio' : 'strength';
  return {
    id: e?.id || uid(), kind, name: String(e?.name || 'Exercise').slice(0, 60), tip: String(e?.tip || ''),
    sets: kind === 'cardio' ? 1 : Math.max(1, Math.min(8, parseInt(e?.sets) || 3)),
    reps: kind === 'cardio' ? '' : String(e?.reps || '8-12'),
    weight: kind === 'cardio' ? 0 : Math.max(0, Number(e?.weight) || 0),
    rest: kind === 'cardio' ? 0 : Math.max(15, parseInt(e?.rest) || 90),
    minutes: kind === 'cardio' ? Math.max(1, Math.min(180, Number(e?.minutes) || 20)) : 0,
    intensity: intensityOf(e?.intensity),
    met: kind === 'cardio' && Number.isFinite(Number(e?.met)) && Number(e.met) > 0 ? Math.max(2, Math.min(16, Number(e.met))) : 0,
    muscles: musclesOf(e?.muscles),
  };
}
export function normPlan(p: any, keepId?: string): Plan {
  if (!p || !Array.isArray(p.days) || !p.days.length) throw new Error('The plan came back incomplete. Try again.');
  const days: PlanDay[] = p.days.map((d: any, i: number) => ({
    title: String(d?.title || `Day ${i + 1}`), focus: String(d?.focus || ''),
    exercises: (d?.exercises || []).map(normExercise),
  })).filter((d: PlanDay) => d.exercises.length);
  if (!days.length) throw new Error('The plan came back without exercises. Try again.');
  return {
    id: keepId || p.id || uid(), name: String(p.name || 'My plan').slice(0, 50), summary: String(p.summary || ''),
    progression: String(p.progression || ''), changes: Array.isArray(p.changes) ? p.changes.map(String).filter(Boolean) : [],
    days, createdAt: p.createdAt || today(), updatedAt: today(), version: p.version || 1, sessionsAtUpdate: p.sessionsAtUpdate || 0,
  };
}

/* ============================== AI ============================== */
const EX_SCHEMA = '{"kind":"strength","name":"Barbell bench press","muscles":["chest","triceps","shoulders"],"sets":3,"reps":"8-10","weight":40,"rest":90,"tip":"form cue, max 10 words"} or {"kind":"cardio","name":"Incline treadmill walk","muscles":[],"minutes":20,"intensity":"moderate","met":6,"tip":"short cue"}';
const PLAN_SCHEMA = `{"name":"short plan name","summary":"1-2 sentences","progression":"one short sentence","changes":["key point, max 12 words"],"days":[{"title":"Push","focus":"Chest, shoulders, triceps","exercises":[${EX_SCHEMA}]}]}`;
const COACH = 'You are an expert strength and conditioning coach. You design safe, progressive programs that include cardio. Reply with ONLY valid JSON, no markdown.';
export const profileText = (p: Profile) => [
  `Age: ${p.age || 'unknown'}`, `Sex: ${p.sex || 'unknown'}`, `Height: ${p.heightCm || '?'} cm`, `Body weight: ${p.weightKg || '?'} kg`,
  `Goal: ${p.goal}`, `Experience: ${p.level}`, `Training days per week: ${p.days}`, `Session length: ${p.minutes} minutes`,
  `Equipment: ${p.equipment}`, `Injuries or limits: ${p.injuries || 'none'}`,
].join('\n');
const logsText = (logs: SessionLog[]) => logs.slice(-10).map((l) => `${l.date} · ${l.title} · felt ${l.feel} · ${l.kcal} kcal\n` + l.exercises.map((x) =>
  x.kind === 'cardio' ? `  ${x.name}: ${x.cardio?.done ? `${x.cardio.minutes} min${x.cardio.km ? `, ${x.cardio.km} km` : ''}` : 'skipped'}`
    : `  ${x.name} (target ${x.tSets}x${x.tReps} @ ${x.tW}kg): ${x.sets.filter((s) => s.done).map((s) => `${s.w}kg x${s.r}`).join(', ') || 'skipped'}`).join('\n')).join('\n');

/** Volume and coverage rules shared by every prompt that writes whole days. */
const coverageRules = (p: Profile) => {
  const warm = warmupMinutes(p.minutes), left = p.minutes - warm;
  return `- Each day's TOTAL time is about ${p.minutes} minutes, and that total INCLUDES the warm-up and all cardio.
- Start every strength day with a warm-up entry: "kind":"cardio", "intensity":"easy", "minutes":${warm}, "met":3.5, name starting "Warm-up" (e.g. "Warm-up: easy bike + dynamic stretches").
- Time per entry: cardio takes its "minutes"; a strength exercise takes about sets × (work + rest) + 1 minute to set up (3 sets with 90s rest ≈ 7 min, 3 sets with 60s rest ≈ 5 min).
- After the warm-up and any cardio, fill ALL the remaining time with strength exercises: don't leave time unused and don't run over. E.g. ${p.minutes} min − ${warm} min warm-up = ${left} min; with no other cardio that is about ${Math.max(2, Math.round(left / 6.5))} strength exercises, and every 10 minutes of cardio replaces 1-2 of them.
- Put compound lifts first with longer rest, then accessories with 2-3 sets and 45-75s rest.
- Every exercise lists the main muscles it works in "muscles", using only: ${MUSCLES.join(', ')}. Cardio uses [].
- Each day's "focus" names the muscles it trains, and every one of them is in "muscles" of at least one exercise; big muscles (chest, lats, shoulders, quadriceps, hamstrings, glutes) get at least 2 exercises when they are a focus. A "Legs" day covers quadriceps, hamstrings, glutes and calves; "Push" covers chest, shoulders and triceps; "Pull" covers lats, middle back and biceps; "Full body" covers chest, back, shoulders, legs and core.
- Don't repeat the same exercise within a day; vary angles (e.g. incline and flat press, vertical and horizontal pull).`;
};

export async function aiCreatePlan(p: Profile, request: string): Promise<Plan> {
  let plan = await askPlan(p, request);
  // Free models sometimes ignore the day count; ask once more, then trim any extra days.
  if (plan.days.length !== p.days) plan = await askPlan(p, `${request}\nIMPORTANT: the plan MUST have exactly ${p.days} days in "days".`.trim());
  if (plan.days.length > p.days) plan = { ...plan, days: plan.days.slice(0, p.days) };
  if (plan.days.length !== p.days) throw new Error(`The coach built ${plan.days.length} days instead of ${p.days}. Try again.`);
  return fillGaps(plan, p);
}

/** Days with uncovered target muscles or unused session time, with what each is missing. */
function thinDays(plan: Plan, p: Profile) {
  return plan.days.map((day, index) => {
    const targets = dayTargets(day), hit = new Set(day.exercises.flatMap((e) => e.muscles));
    const missing = targets.filter((m) => !hit.has(m)), cardioDay = !targets.length && day.exercises.every((e) => e.kind === 'cardio');
    const used = dayMinutes(day, p.minutes), free = cardioDay ? 0 : p.minutes - used;
    // More than one exercise's worth of time left over counts as too short.
    return { index, day, missing, used, free: free >= 8 ? free : 0 };
  }).filter((x) => x.missing.length || x.free);
}

/** One follow-up call that adds strength exercises to any day missing a target muscle or leaving session time unused.
 *  Keeps the plan as it is if the call fails; the plan screen still shows what's missing. */
async function fillGaps(plan: Plan, p: Profile): Promise<Plan> {
  const thin = thinDays(plan, p);
  if (!thin.length) return plan;
  try {
    const res = await ask([
      { role: 'system', content: COACH },
      { role: 'user', content: `About me:\n${profileText(p)}\n\nEach session is ${p.minutes} minutes in total, including warm-up and cardio. A strength exercise takes about sets × (work + rest) + 1 minute. Some days don't cover all their muscles or leave time unused:\n${thin.map((t) =>
        `Day index ${t.index}: "${t.day.title}" (${t.day.focus}) has ${t.day.exercises.map((e) => e.name).join(', ')} (about ${t.used} min).${t.missing.length ? ` Not yet trained: ${t.missing.join(', ')}.` : ''}${t.free ? ` About ${t.free} min unused.` : ''}`).join('\n')}
Add strength exercises to those days so every listed muscle is trained and the unused time is filled without going over. Don't repeat exercises already in the day. Only use my equipment and avoid my injuries. Give a realistic "weight" in kg for me. "muscles" uses only: ${MUSCLES.join(', ')}.
Return JSON exactly like: {"days":[{"index":0,"add":[${EX_SCHEMA}]}]}` },
    ]);
    const days = plan.days.map((d) => ({ ...d, exercises: [...d.exercises] }));
    (Array.isArray(res?.days) ? res.days : []).forEach((x: any) => {
      const day = days[parseInt(x?.index)];
      if (!day || !Array.isArray(x?.add)) return;
      const names = new Set(day.exercises.map((e) => e.name.toLowerCase()));
      x.add.map(normExercise).forEach((e: PlanExercise) => {
        if (names.has(e.name.toLowerCase())) return;
        // Stay within the session, unless the exercise covers a muscle the day still misses.
        const covers = e.muscles.some((m) => coverageGaps(day).includes(m));
        if (!covers && dayMinutes(day, p.minutes) + exerciseMinutes(e) > p.minutes + 5) return;
        names.add(e.name.toLowerCase()); day.exercises.push(e);
      });
    });
    return { ...plan, days };
  } catch {
    return plan;
  }
}

async function askPlan(p: Profile, request: string): Promise<Plan> {
  const res = await ask([
    { role: 'system', content: COACH },
    { role: 'user', content: `Create a weekly training plan for me.\n\n${profileText(p)}\n${request ? `\nWhat I want: ${request}\n` : ''}
Rules:
- "days" must contain exactly ${p.days} entries (one per training day each week), each fitting in about ${p.minutes} minutes including warm-up.
- Include cardio where it fits my goal (as its own exercise entries with "kind":"cardio", minutes, intensity and a MET value).
- Only use my equipment. Avoid anything that aggravates my injuries.
- Strength "weight" is a realistic starting load in kg for my level and body weight (0 for bodyweight; per dumbbell for dumbbells).
- "reps" is a range like "8-10", or seconds like "30s" for holds. "rest" is in seconds.
${coverageRules(p)}
- Put 2-3 key points in "changes", each at most 12 words. "progression" is one sentence of at most 20 words. Keep every "tip" under 10 words.

Return JSON exactly like:
${PLAN_SCHEMA}` },
  ]);
  return normPlan(res);
}

export async function aiRetune(plan: Plan, p: Profile, logs: SessionLog[]): Promise<Plan> {
  const { name, summary, progression, days } = plan;
  const res = await ask([
    { role: 'system', content: COACH },
    { role: 'user', content: `My current plan:\n${JSON.stringify({ name, summary, progression, days })}\n\nAbout me:\n${profileText(p)}\n\nMy recent workouts:\n${logsText(logs.filter((l) => l.planId === plan.id || !l.planId))}\n
Update the plan from my real progress: raise load, reps or cardio time where I hit targets easily; ease off or swap exercises I struggled with or skipped. Keep the same number of days. Fill "changes" with 2-3 key points (max 12 words each) on what changed.
Also follow these rules:\n${coverageRules(p)}\nReturn the FULL plan as JSON exactly like:\n${PLAN_SCHEMA}` },
  ]);
  const next = await fillGaps(normPlan(res, plan.id), p);
  return { ...next, name: plan.name, createdAt: plan.createdAt, version: plan.version + 1, sessionsAtUpdate: logs.length, changes: next.changes.length ? next.changes : ['Plan re-tuned from your recent sessions'] };
}

/** Alternatives for an exercise (swap) or new exercises for a day (add). */
export async function aiSuggestExercises(p: Profile, day: PlanDay, mode: 'swap' | 'add', target: PlanExercise | null, hint: string): Promise<(PlanExercise & { why: string })[]> {
  const gaps = coverageGaps(day);
  const res = await ask([
    { role: 'system', content: COACH },
    { role: 'user', content: `About me:\n${profileText(p)}\n\nThis training day is "${day.title}" (${day.focus}) with: ${day.exercises.map((e) => e.name).join(', ')}.\n\n${
      mode === 'swap' ? `Suggest 4 alternatives to replace "${target?.name}" that train the same thing${target?.kind === 'cardio' ? ' (cardio)' : target?.muscles.length ? ` (${target.muscles.join(', ')})` : ''}.`
        : `Suggest 4 exercises I could add to this day${hint ? `, matching: "${hint}"` : gaps.length ? `, training muscles this day misses: ${gaps.join(', ')}` : ' (mix strength and cardio if useful)'}.`}
Don't suggest exercises already in the day. "muscles" uses only: ${MUSCLES.join(', ')}.
Only use my equipment and avoid my injuries. For strength, always give a realistic "weight" in kg for me (per dumbbell; 0 only for true bodyweight moves). Give each a short "why". Return JSON exactly like:
{"exercises":[{...exercise fields..., "why":"one short sentence"}]} where each exercise is like ${EX_SCHEMA}` },
  ]);
  const list: any[] = Array.isArray(res?.exercises) ? res.exercises : [];
  if (!list.length) throw new Error('No suggestions came back. Try again.');
  return list.slice(0, 5).map((e) => ({ ...normExercise(e), why: String(e.why || '') }));
}

/** Fills in sensible targets for an exercise the user typed by name. */
export async function aiDescribeExercise(p: Profile, name: string, kind: Kind): Promise<PlanExercise> {
  const res = await ask([
    { role: 'system', content: COACH },
    { role: 'user', content: `About me:\n${profileText(p)}\n\nI want to add "${name}" (${kind}) to my plan. Give suitable targets for me. Return JSON exactly like ${EX_SCHEMA}` },
  ]);
  return { ...normExercise({ ...res, kind }), name };
}

/* ============================== session ============================== */
export function repRange(r: string): [number, number] {
  if (timedSeconds(r)) return [0, 0];
  const m = r.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (m) return [+m[1], +m[2]];
  const n = r.match(/\d+/);
  return n ? [+n[0], +n[0]] : [0, 0];
}
/** Seconds for holds: "30s", "30-60 sec", "45 seconds". 0 for rep ranges. */
export function timedSeconds(r: string) { const m = r.match(/(\d+)\s*(?:[-–]\s*(\d+))?\s*(?:s|sec|secs|seconds?)\b/i); return m ? +(m[2] || m[1]) : 0; }

export function newSession(plan: Plan, dayIdx: number): Session {
  if (!plan.days.length) throw new Error('Add a workout day before starting a session');
  dayIdx = Number.isFinite(dayIdx) ? Math.max(0, Math.min(Math.trunc(dayIdx), plan.days.length - 1)) : 0;
  return {
    planId: plan.id, day: dayIdx, start: Date.now(), restEnd: 0,
    ex: plan.days[dayIdx].exercises.map((e) => ({
      name: e.name, kind: e.kind, tSets: e.sets, tReps: e.reps, tW: e.weight, rest: e.rest, intensity: e.intensity, met: e.met,
      sets: e.kind === 'cardio' ? [] : Array.from({ length: e.sets }, () => ({ w: String(e.weight), r: String(repRange(e.reps)[1] || timedSeconds(e.reps) || ''), done: false })),
      cardio: { minutes: e.kind === 'cardio' ? String(e.minutes) : '', km: '', done: false },
    })),
  };
}
export function sessionToExerciseLogs(s: Session): ExerciseLog[] {
  return s.ex.map((x) => ({
    name: x.name, kind: x.kind, tSets: x.tSets, tReps: x.tReps, tW: x.tW, rest: x.rest, intensity: x.intensity, met: x.met,
    sets: x.sets.map((t) => ({ w: +t.w || 0, r: +t.r || 0, done: !!t.done })),
    cardio: x.kind === 'cardio' ? { minutes: +x.cardio.minutes || 0, km: +x.cardio.km || 0, done: x.cardio.done } : undefined,
  }));
}

/* ============================== stats + progression ============================== */
export const e1rm = (w: number, r: number) => (w > 0 ? w * (1 + r / 30) : r);
export const logVolume = (l: SessionLog) => l.exercises.reduce((a, x) => a + x.sets.filter((s) => s.done).reduce((b, s) => b + s.w * s.r, 0), 0);
export const nextDayIdx = (W: WorkoutData, plan: Plan | null) => {
  if (!plan) return 0;
  const last = [...W.logs].reverse().find((l) => l.planId === plan.id);
  return last ? (last.day + 1) % plan.days.length : 0;
};
export function bestFor(W: WorkoutData, name: string, beforeIdx = W.logs.length) {
  let best: SetLog | null = null;
  W.logs.slice(0, beforeIdx).forEach((l) => l.exercises.forEach((x) => {
    if (x.name !== name) return;
    x.sets.forEach((s) => { if (s.done && (!best || e1rm(s.w, s.r) > e1rm(best.w, best.r))) best = s; });
  }));
  return best as SetLog | null;
}
export function lastFor(W: WorkoutData, name: string) {
  for (let i = W.logs.length - 1; i >= 0; i--) {
    const x = W.logs[i].exercises.find((e) => e.name === name);
    if (!x) continue;
    if (x.kind === 'cardio' && x.cardio?.done) return { cardio: x.cardio };
    const d = x.sets.filter((s) => s.done);
    if (d.length) return { set: d[0] };
  }
  return null;
}
export const prCount = (W: WorkoutData) => W.logs.reduce((a, l) => a + (l.prs || []).length, 0);
export const weekLogs = (W: WorkoutData) => { const mon = ymd(mondayOf()); return W.logs.filter((l) => l.date >= mon); };
/** At most three short key points from the plan's notes (older plans have long paragraphs). */
export function keyPoints(plan: Pick<Plan, 'changes' | 'progression'>, max = 3) {
  const short = (t: string) => {
    let x = (t.trim().match(/^.*?[.!?](?=\s|$)/)?.[0] ?? t.trim()).replace(/\s*\([^)]*\)/g, '').replace(/[.!]$/, '');
    // Lead with the point, not the reason: "Because X, the plan avoids Y" → "The plan avoids Y".
    x = x.replace(/^(because|since|as|given|while|with)\b[^,]{0,90},\s*/i, '');
    x = x.charAt(0).toUpperCase() + x.slice(1);
    if (x.length > 80) x = `${x.slice(0, 78).replace(/[\s,;:]+\S*$/, '')}…`;
    return x;
  };
  return [...plan.changes, plan.progression].filter(Boolean).map(short).filter(Boolean).slice(0, max);
}
export const fmtKg = (w: number) => (w ? `${+w.toFixed(1)} kg` : 'bodyweight');
export function findPRs(W: WorkoutData, exercises: ExerciseLog[]) {
  const prs: string[] = [];
  exercises.forEach((x) => {
    const prev = bestFor(W, x.name), d = x.sets.filter((t) => t.done);
    if (!d.length || !prev) return;
    const top = d.reduce((a, t) => (e1rm(t.w, t.r) > e1rm(a.w, a.r) ? t : a));
    if (e1rm(top.w, top.r) > e1rm(prev.w, prev.r)) prs.push(`${x.name}: ${top.w ? `${top.w} kg × ${top.r}` : `${top.r} reps`}`);
  });
  return prs;
}

export type Change = { dir: 'up' | 'down'; text: string };
/** Per-session adjustment toward the plan's targets. When apply is true the plan is updated in place. */
export function progressionFor(plan: Plan, log: SessionLog, feel: Feel, apply: boolean): Change[] {
  const day = plan.days[log.day], out: Change[] = [];
  if (!day) return out;
  log.exercises.forEach((x) => {
    const pe = day.exercises.find((e) => e.name === x.name);
    if (!pe) return;
    if (pe.kind === 'cardio') {
      if (x.cardio?.done && x.cardio.minutes >= pe.minutes && feel === 'easy') {
        const nm = Math.min(180, pe.minutes + 5);
        if (nm === pe.minutes) return;
        out.push({ dir: 'up', text: `${pe.name} → ${nm} min (+${nm - pe.minutes})` });
        if (apply) pe.minutes = nm;
      }
      return;
    }
    const [mn, mx] = repRange(pe.reps);
    if (!mx) return;
    const done = x.sets.filter((s) => s.done);
    if (!done.length) return; // skipped entirely: leave it
    const hitAll = done.length >= pe.sets && done.length === x.sets.length && done.every((s) => s.r >= mx && s.w >= pe.weight && Number.isFinite(s.w));
    const missed = x.sets.filter((s) => !s.done || s.r < mn).length;
    if (hitAll && feel !== 'hard') {
      if (pe.weight > 0) {
        const inc = pe.weight >= 20 ? 2.5 : 1, nw = +(pe.weight + inc).toFixed(1);
        out.push({ dir: 'up', text: `${pe.name} → ${nw} kg (+${inc})` });
        if (apply) pe.weight = nw;
      } else {
        const nr = `${mn + 2}-${mx + 2}`;
        out.push({ dir: 'up', text: `${pe.name} → ${nr} reps` });
        if (apply) pe.reps = nr;
      }
    } else if (missed >= 2 && pe.weight > 0) {
      const step = pe.weight >= 20 ? 2.5 : 0.5, nw = Math.max(0, Math.min(pe.weight - step, Math.floor((pe.weight * 0.95) / step) * step));
      out.push({ dir: 'down', text: `${pe.name} → ${nw} kg (missed ${missed} sets)` });
      if (apply) pe.weight = nw;
    }
  });
  return out;
}
