import { today } from './dates';

export type Sex = 'male' | 'female';
export type Goal = 'Build muscle' | 'Lose fat' | 'Get stronger' | 'Stay fit';
export type Level = 'Beginner' | 'Intermediate' | 'Advanced';
export type Equipment = 'Full gym' | 'Dumbbells only' | 'Home, no equipment';

/** Everything the user tells us about themselves. Saved on the phone and in Neon (profiles.data). */
export type Profile = {
  name: string;
  age: number | null;
  sex: Sex | null;
  heightCm: number | null;
  weightKg: number | null;
  goal: Goal;
  level: Level;
  days: number;
  minutes: number;
  equipment: Equipment;
  injuries: string;
  weightLog: { date: string; kg: number }[];
  /** False only for a brand-new account that hasn't been through the setup form yet. */
  onboarded?: boolean;
};

export const GOALS: Goal[] = ['Build muscle', 'Lose fat', 'Get stronger', 'Stay fit'];
export const LEVELS: Level[] = ['Beginner', 'Intermediate', 'Advanced'];
export const EQUIPMENT: Equipment[] = ['Full gym', 'Dumbbells only', 'Home, no equipment'];

export const emptyProfile = (name = ''): Profile => ({
  name, age: null, sex: null, heightCm: null, weightKg: null, goal: 'Build muscle', level: 'Beginner',
  days: 4, minutes: 60, equipment: 'Full gym', injuries: '', weightLog: [],
});

/** Older builds kept training details on the workout record; fold them in once. */
export function migrateProfile(raw: any, name: string, legacyPrefs?: any): Profile {
  const p: Profile = { ...emptyProfile(name), ...(raw || {}) };
  if (legacyPrefs && !raw?.weightKg) {
    const goals: Record<string, Goal> = { muscle: 'Build muscle', lose: 'Lose fat', strength: 'Get stronger', fit: 'Stay fit' };
    const levels: Record<string, Level> = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced' };
    const equip: Record<string, Equipment> = { gym: 'Full gym', db: 'Dumbbells only', bw: 'Home, no equipment' };
    Object.assign(p, {
      weightKg: legacyPrefs.weight ?? p.weightKg, goal: goals[legacyPrefs.goal] ?? p.goal, level: levels[legacyPrefs.level] ?? p.level,
      days: legacyPrefs.days ?? p.days, minutes: legacyPrefs.minutes ?? p.minutes, equipment: equip[legacyPrefs.equipment] ?? p.equipment,
      injuries: legacyPrefs.injuries ?? p.injuries,
    });
  }
  if (!p.name) p.name = name;
  if (p.weightKg && !p.weightLog.length) p.weightLog = [{ date: today(), kg: p.weightKg }];
  return p;
}

/** Details still missing for accurate plans and calorie estimates. */
export const missingDetails = (p: Profile) =>
  [!p.age && 'age', !p.sex && 'sex', !p.heightCm && 'height', !p.weightKg && 'weight'].filter(Boolean) as string[];
