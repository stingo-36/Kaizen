import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { BackHeader, Bar, Btn, Card, Row, Screen, T, Tap, useToast } from '@/components/ui';
import { today } from '@/lib/dates';
import { useFood } from '@/lib/food-store';
import { dayItems, recoveryAdvice, type DayItem } from '@/lib/planning';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import { activePlan, nextDayIdx } from '@/lib/workout';
import { useWorkNest } from '@/lib/worknest-store';

export default function DayPlan() {
  const router = useRouter(), toast = useToast();
  const { habits, workout, profile, setHabits, setProfile } = useStore();
  const { food } = useFood(), nest = useWorkNest();
  const [busy, setBusy] = useState<string | null>(null);
  useNow(60000);
  const date = today(), plan = activePlan(workout), day = nextDayIdx(workout, plan);
  const rest = (profile.restDays ?? []).includes(date);
  const recovery = profile.recovery?.find((r) => r.date === date);
  const items = dayItems(date, habits, workout.logs, food, plan?.days[day]?.title ?? null, rest, nest.entries);
  const done = items.filter((i) => i.done).length;
  const open = async (item: DayItem) => {
    if (busy) return;
    if (item.kind === 'habit') {
      setHabits((list) => list.map((h) => h.id === item.sourceId ? { ...h, log: { ...h.log, [date]: item.done ? 0 : Math.min(h.goal, (h.log[date] || 0) + 1) } } : h));
    } else if (item.kind === 'meal') router.push({ pathname: '/food/add', params: { meal: item.meal! } });
    else if (item.kind === 'workout') {
      if (rest || item.done) router.navigate('/workouts');
      else router.push('/recovery');
    } else if (item.sourceId) {
      setBusy(item.id);
      try { await nest.setDone(item.sourceId, !item.done); }
      catch (error) { toast(error instanceof Error ? error.message : 'Could not update task'); }
      finally { setBusy(null); }
    }
  };
  return <Screen>
    <BackHeader title="Plan my day" onBack={() => router.back()} />
    <Card style={{ backgroundColor: C.hero, gap: 10 }}>
      <T size={12} color={C.heroMuted}>{new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}</T>
      <T size={26} w="s" color={C.white}>{done} of {items.length} complete</T>
      <Bar value={items.length ? done / items.length : 0} color={C.heroMuted} track="rgba(255,255,255,0.2)" />
      <T size={13} color={C.heroMuted}>Small steps across your whole day.</T>
    </Card>
    {recovery && <Card style={{ backgroundColor: C.lavender, gap: 6 }}><T w="s">{recoveryAdvice(recovery).level}</T><T size={13} color={C.muted}>{recoveryAdvice(recovery).text}</T></Card>}
    {(['habit', 'workout', 'meal', 'task'] as const).map((kind) => <View key={kind} style={{ gap: 10 }}>
      <T size={16} w="s">{{ habit: 'Habits', workout: 'Training', meal: 'Meals', task: 'WorkNest tasks' }[kind]}</T>
      {items.filter((i) => i.kind === kind).map((item) => <Tap key={item.id} accessibilityLabel={`${item.title}, ${item.done ? 'complete' : 'incomplete'}. ${kind === 'habit' || kind === 'task' ? 'Toggle progress' : 'Open'}`} onPress={() => open(item)} style={{ padding: 16, backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line }}>
        <Row gap={12}>
          <T size={20} color={item.done ? C.accent : C.faint}>{item.done ? '✓' : '○'}</T>
          <View style={{ flex: 1, gap: 3 }}><T w="m">{item.title}</T><T size={12} color={C.muted}>{busy === item.id ? 'Saving…' : item.detail}</T></View>
        </Row>
      </Tap>)}
      {kind === 'habit' && !items.some((i) => i.kind === kind) && <Btn title="Add a habit" kind="ghost" onPress={() => router.push('/habit/edit')} />}
      {kind === 'workout' && <Row gap={8}><Btn title={rest ? 'Plan a workout' : 'Make today a rest day'} small kind="ghost" onPress={() => setProfile((p) => ({ ...p, restDays: rest ? (p.restDays ?? []).filter((d) => d !== date) : [...(p.restDays ?? []).filter((d) => d !== date).slice(-89), date] }))} /><Btn title="Check recovery" small kind="ghost" onPress={() => router.push('/recovery')} /></Row>}
      {kind === 'workout' && !plan && <Btn title="Create a workout plan" kind="ghost" onPress={() => router.push('/workout/new')} />}
      {kind === 'task' && !items.some((i) => i.kind === kind) && <T size={13} color={C.muted}>{nest.status === 'on' ? 'No tasks due today. Undated tasks stay in Tracker.' : 'Connect WorkNest in Tracker to include your due tasks.'}</T>}
    </View>)}
    <Btn title="Meal templates" kind="ghost" onPress={() => router.push('/food/templates')} />
  </Screen>;
}
