import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useMemo, useState } from 'react';

import { ask } from './ai';
import { normExercise, PlanExercise } from './workout';

/* Exercise library from free-exercise-db (public domain, ~870 exercises, no API key).
   Downloaded once, trimmed, and kept on the phone so search works offline. */
const SRC = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const KEY = 'kaizen.exlib.v2';

export type LibExercise = {
  id: string; name: string; category: string; equipment: string; level: string;
  muscles: string[]; secondary: string[]; steps: string[];
  /** Start and end position photos, played as a loop for the how-to demo. */
  img: string | null; img2: string | null;
};

export const MUSCLE_GROUPS: [string, string[]][] = [
  ['Chest', ['chest']], ['Back', ['lats', 'middle back', 'lower back', 'traps']], ['Shoulders', ['shoulders']],
  ['Arms', ['biceps', 'triceps', 'forearms']], ['Legs', ['quadriceps', 'hamstrings', 'glutes', 'calves', 'adductors', 'abductors']],
  ['Core', ['abdominals']], ['Cardio', []],
];

let mem: LibExercise[] | null = null;
let inflight: Promise<LibExercise[]> | null = null;

const trim = (x: any): LibExercise => ({
  id: String(x.id), name: String(x.name), category: x.category || 'strength', equipment: x.equipment || 'other', level: x.level || '',
  muscles: x.primaryMuscles || [], secondary: x.secondaryMuscles || [], steps: x.instructions || [], img: x.images?.[0] ? IMG + x.images[0] : null, img2: x.images?.[1] ? IMG + x.images[1] : null,
});

export function loadLibrary(): Promise<LibExercise[]> {
  if (mem) return Promise.resolve(mem);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const cached = await AsyncStorage.getItem(KEY);
      if (cached) return (mem = JSON.parse(cached) as LibExercise[]);
    } catch {}
    let res: Response;
    try { res = await fetch(SRC); } catch { throw new Error('No internet connection. The exercise library downloads once, then works offline.'); }
    if (!res.ok) throw new Error(`Couldn't load the exercise library (${res.status})`);
    const list = ((await res.json()) as any[]).map(trim).sort((a, b) => a.name.localeCompare(b.name));
    AsyncStorage.setItem(KEY, JSON.stringify(list)).catch(() => {});
    return (mem = list);
  })().finally(() => { inflight = null; });
  return inflight;
}

export function useLibrary() {
  const [list, setList] = useState<LibExercise[]>(mem ?? []);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    loadLibrary().then((l) => { if (alive) setList(l); }).catch((e) => { if (alive) setError((e as Error).message); });
    return () => { alive = false; };
  }, [tick]);
  return { list, loading: !list.length && !error, error, retry: () => { setError(''); setTick((t) => t + 1); } };
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ');

/** Word-based search: every word must match; names that start with the query rank first. */
export function searchLibrary(list: LibExercise[], q: string, group?: string, limit = 40) {
  const words = norm(q).split(/\s+/).filter(Boolean);
  const g = MUSCLE_GROUPS.find(([n]) => n === group);
  const out: { e: LibExercise; score: number }[] = [];
  for (const e of list) {
    if (g) {
      if (g[0] === 'Cardio' ? e.category !== 'cardio' : !e.muscles.some((m) => g[1].includes(m))) continue;
    }
    const hay = norm(`${e.name} ${e.equipment} ${e.muscles.join(' ')}`), name = norm(e.name);
    if (!words.every((w) => hay.includes(w))) continue;
    const score = (name.startsWith(words[0] ?? '') ? 0 : 1) + (words.every((w) => name.includes(w)) ? 0 : 2) + (e.category === 'stretching' ? 1 : 0);
    out.push({ e, score });
  }
  return out.sort((a, b) => a.score - b.score || a.e.name.length - b.e.name.length).slice(0, limit).map((x) => x.e);
}

export const findInLibrary = (list: LibExercise[], name: string) => {
  const n = norm(name).trim();
  return list.find((e) => norm(e.name).trim() === n) ?? null;
};

export const cap = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());
export const libMeta = (e: LibExercise) => [cap(e.muscles.join(', ') || e.category), cap(e.equipment)].filter(Boolean).join(' · ');

/** Plan entry with sensible defaults for a library exercise. */
export function libToPlan(e: LibExercise): PlanExercise {
  const cardio = e.category === 'cardio', stretch = e.category === 'stretching';
  return normExercise({
    name: e.name, kind: cardio ? 'cardio' : 'strength', sets: stretch ? 2 : 3, reps: stretch ? '30s' : '8-12', weight: 0, rest: stretch ? 30 : 90,
    minutes: 20, intensity: 'moderate', tip: '',
  });
}

/* ---------- simple how-to steps ---------- */
const FILLER: [RegExp, string][] = [
  [/this will be your starting position\.?/gi, 'This is the start.'],
  [/repeat for the recommended amount of repetitions\.?/gi, 'Repeat.'],
  [/\b(slowly|gently|carefully)\s+/gi, ''],
  [/\bwhile (inhaling|exhaling|breathing in|breathing out)\b,?/gi, ''],
  [/\bas you (inhale|exhale|breathe in|breathe out)\b,?/gi, ''],
  [/\b(inhale|exhale|breathe in|breathe out) (as|while) you\b/gi, ''],
  [/\bmake sure (that )?/gi, ''],
  [/\bin order to\b/gi, 'to'],
  [/\butilize\b/gi, 'use'],
  [/\bensure (that )?/gi, ''],
  [/\bexecute\b/gi, 'do'],
];
/** One short point per sentence, filler removed, at most 7 points. */
export function simpleSteps(steps: string[]): string[] {
  const out: string[] = [];
  for (const para of steps) {
    for (let sen of para.split(/(?<=[.!?])\s+/)) {
      FILLER.forEach(([re, to]) => { sen = sen.replace(re, to); });
      sen = sen.replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').replace(/^[,\s]+/, '').trim();
      if (sen.length < 4) continue;
      sen = sen.charAt(0).toUpperCase() + sen.slice(1);
      if (!/[.!?]$/.test(sen)) sen += '.';
      if (!out.includes(sen)) out.push(sen);
    }
  }
  return out.slice(0, 7);
}

const SIMPLE_KEY = (id: string) => `kaizen.exsteps.${id}`;
/** Plain-words steps for an exercise: instant local version, replaced by a cached AI rewrite when available. */
export function useSimpleSteps(e: LibExercise | null) {
  const local = useMemo(() => (e ? simpleSteps(e.steps) : []), [e]);
  const [better, setBetter] = useState<{ id: string; steps: string[] } | null>(null);
  useEffect(() => {
    if (!e) return;
    let alive = true;
    (async () => {
      const cached = await AsyncStorage.getItem(SIMPLE_KEY(e.id)).catch(() => null);
      if (cached) { if (alive) setBetter({ id: e.id, steps: JSON.parse(cached) }); return; }
      try {
        const res = await ask([
          { role: 'system', content: 'You rewrite exercise instructions for beginners. Reply with ONLY JSON.' },
          { role: 'user', content: `Exercise: ${e.name}\nInstructions: ${e.steps.join(' ')}\n\nRewrite as 3-6 steps in very simple words, each step at most 12 words. Return {"steps":["..."]}` },
        ], 0.2);
        const list = Array.isArray(res?.steps) ? res.steps.map(String).filter(Boolean).slice(0, 6) : [];
        if (list.length) { AsyncStorage.setItem(SIMPLE_KEY(e.id), JSON.stringify(list)).catch(() => {}); if (alive) setBetter({ id: e.id, steps: list }); }
      } catch {}
    })();
    return () => { alive = false; };
  }, [e]);
  return better && better.id === e?.id ? better.steps : local;
}
