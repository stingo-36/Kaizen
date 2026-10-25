import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackHeader, Btn, Card, Chip, Row, Screen, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { activePlan, fmtKg, nextDayIdx } from '@/lib/workout';

export default function Progression() {
  const router = useRouter();
  const { workout } = useStore();
  const plan = activePlan(workout);
  const [selection, setSelection] = useState<number | null>(null);
  const day = plan ? Math.min(selection ?? nextDayIdx(workout, plan), plan.days.length - 1) : 0;
  const last = [...workout.logs].reverse().find((log) => log.planId === plan?.id && log.day === day);
  return <Screen>
    <BackHeader title="Next session targets" onBack={() => router.back()} />
    {!plan ? <><T color={C.muted}>Create a plan to see your starting weights and rep targets.</T><Btn title="Create a plan" onPress={() => router.push('/workout/new')} /></> : <>
      <T size={25} w="s">Progress at your pace.</T>
      <T color={C.muted}>After each workout, Kaizen suggests weight, rep or cardio changes from your completed sets and how it felt. Review and apply them when saving.</T>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>{plan.days.map((d, i) => <Chip key={i} label={d.title} on={day === i} onPress={() => setSelection(i)} />)}</Row>
      {last ? <T size={13} color={C.muted}>Last trained {last.date} · Felt {last.feel}</T> : <T size={13} color={C.muted}>No session logged for this day yet. These are your plan’s starting targets.</T>}
      {plan.days[day].exercises.map((exercise) => {
        const previous = last?.exercises.find((e) => e.name === exercise.name && e.kind === exercise.kind);
        const sets = previous?.sets.filter((set) => set.done) ?? [];
        return <Card key={exercise.id} style={{ gap: 8 }}>
          <T size={18} w="s">{exercise.name}</T>
          <View style={{ padding: 12, backgroundColor: C.accentTint, borderRadius: 12 }}><T w="s" color={C.accent}>{exercise.kind === 'cardio' ? `${exercise.minutes} min · ${exercise.intensity}` : `${exercise.sets} sets × ${exercise.reps} · ${fmtKg(exercise.weight)}`}</T><T size={12} color={C.muted}>Next session target</T></View>
          <T size={13} color={C.muted}>{exercise.kind === 'cardio' ? previous?.cardio?.done ? `Last time: ${previous.cardio.minutes} min` : 'No completed cardio recorded last time.' : sets.length ? `Last time: ${sets.map((s) => `${s.w}kg × ${s.r}`).join(', ')}` : 'No completed sets recorded last time.'}</T>
        </Card>;
      })}
      <Card style={{ gap: 8, backgroundColor: C.lavender }}><T w="s">How progression works</T><T size={13} color={C.muted}>Reach the top of every rep range to earn a small increase. Miss two or more sets and Kaizen suggests a reduction. Easy cardio sessions can add five minutes. You choose whether to apply changes.</T></Card>
      <Btn title="Check recovery before training" onPress={() => router.push('/recovery')} />
    </>}
  </Screen>;
}
