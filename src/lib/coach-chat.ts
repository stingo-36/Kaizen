import AsyncStorage from '@react-native-async-storage/async-storage';

import { askText } from './ai';
import { snapshot } from './coach';
import { today } from './dates';
import { FoodData, sumMacros, targets } from './food';
import type { HealthSummary } from './health-types';
import type { Habit } from './habits';
import type { Profile } from './profile';
import { activePlan, type WorkoutData } from './workout';

export type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string; at: number };

const key = (u: string) => `pulse.chat.${u}`;
export const loadChat = async (u: string): Promise<ChatMsg[]> => {
  try { return JSON.parse((await AsyncStorage.getItem(key(u))) || '[]'); } catch { return []; }
};
export const saveChat = (u: string, msgs: ChatMsg[]) => AsyncStorage.setItem(key(u), JSON.stringify(msgs.slice(-40))).catch(() => {});

/** Everything the coach should know, kept short so replies stay fast. */
function context(habits: Habit[], W: WorkoutData, p: Profile, food: FoodData, h: HealthSummary) {
  const plan = activePlan(W), eaten = sumMacros(food.days[today()] ?? []), goal = targets(p);
  const lines = [
    snapshot(habits, W, p),
    `About me: ${p.age || '?'} y, ${p.sex || 'sex unknown'}, ${p.heightCm || '?'} cm, ${p.weightKg || '?'} kg. Equipment: ${p.equipment}. Injuries: ${p.injuries || 'none'}.`,
    plan ? `Plan "${plan.name}": ${plan.days.map((d) => `${d.title} (${d.exercises.map((e) => e.name).join(', ')})`).join('; ')}.` : 'No workout plan yet.',
    `Food today: ${eaten.kcal}/${goal.kcal} kcal, protein ${eaten.p}/${goal.p} g, carbs ${eaten.c} g, fat ${eaten.f} g.`,
  ];
  const hp = [h.steps != null && `${h.steps} steps`, h.sleepMin && `${Math.round(h.sleepMin / 6) / 10} h sleep`, h.restingHr && `resting HR ${h.restingHr}`, h.kcal && `${h.kcal} kcal burned`].filter(Boolean);
  if (hp.length) lines.push(`Health today: ${hp.join(', ')}.`);
  return lines.join('\n');
}

/** Light clean-up for display: no bold or headings. Safe to run on a half-written reply. */
export const tidyReply = (t: string) => t.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();

export async function askCoach(history: ChatMsg[], data: { habits: Habit[]; W: WorkoutData; p: Profile; food: FoodData; health: HealthSummary }, onText?: (soFar: string) => void) {
  const reply = await askText([
    {
      role: 'system',
      content: `You are Pulse Coach, a friendly, practical fitness, food and habit coach. Use the user's data below.
Answer in plain words, at most 120 words. Use short "- " bullet points for steps or lists. No markdown headings, no bold, no emoji.
If something could be a medical issue, suggest seeing a doctor.

${context(data.habits, data.W, data.p, data.food, data.health)}`,
    },
    ...history.slice(-12).map((m) => ({ role: m.role, content: m.text })),
  ], 0.6, onText && ((t) => onText(tidyReply(t))));
  return tidyReply(reply);
}
