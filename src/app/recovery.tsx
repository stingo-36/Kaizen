import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackHeader, Btn, Card, Chip, Input, Row, Screen, T, useToast } from '@/components/ui';
import { today } from '@/lib/dates';
import { recoveryAdvice, type Recovery } from '@/lib/planning';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { activePlan, nextDayIdx } from '@/lib/workout';

export default function RecoveryScreen() {
  const router = useRouter(), toast = useToast();
  const { profile, setProfile, workout } = useStore();
  const date = today(), saved = profile.recovery?.find((r) => r.date === date);
  const [energy, setEnergy] = useState(saved?.energy ?? 3), [soreness, setSoreness] = useState(saved?.soreness ?? 1);
  const [sleep, setSleep] = useState(saved ? String(saved.sleepHours) : '');
  const hours = Number(sleep.replace(',', '.'));
  const valid = sleep.trim() !== '' && Number.isFinite(hours) && hours >= 0 && hours <= 16;
  const entry: Recovery = { date, energy, soreness, sleepHours: hours };
  const advice = valid ? recoveryAdvice(entry) : null;
  const save = (rest = false) => {
    if (!valid) { toast('Enter sleep between 0 and 16 hours'); return false; }
    setProfile((p) => ({ ...p, recovery: [...(p.recovery ?? []).filter((r) => r.date !== date).slice(-89), entry],
      restDays: rest ? [...(p.restDays ?? []).filter((d) => d !== date).slice(-89), date] : (p.restDays ?? []).filter((d) => d !== date) }));
    return true;
  };
  const plan = activePlan(workout);
  return <Screen>
    <BackHeader title="Recovery check-in" onBack={() => router.back()} />
    <T size={26} w="s">How are you feeling?</T>
    <T color={C.muted}>A quick check before deciding how to move today.</T>
    {([{ title: 'Energy', value: energy, set: setEnergy, low: 'Low', high: 'High' }, { title: 'Soreness', value: soreness, set: setSoreness, low: 'None', high: 'Very sore' }]).map((field) => <Card key={field.title} style={{ gap: 12 }}>
      <T w="s">{field.title}</T><Row gap={8}>{[1, 2, 3, 4, 5].map((n) => <Chip key={n} label={String(n)} on={field.value === n} onPress={() => field.set(n)} />)}</Row>
      <Row style={{ justifyContent: 'space-between' }}><T size={12} color={C.muted}>{field.low}</T><T size={12} color={C.muted}>{field.high}</T></Row>
    </Card>)}
    <Input label="Sleep last night" value={sleep} onChange={setSleep} keyboard="decimal-pad" unit="hours" placeholder="e.g. 7.5" />
    {advice && <Card style={{ backgroundColor: C.lavender, gap: 8 }}><T size={18} w="s">{advice.level}</T><T color={C.muted}>{advice.text}</T></Card>}
    <Btn title="Save check-in" onPress={() => { if (save((profile.restDays ?? []).includes(date))) { toast('Check-in saved'); router.back(); } }} />
    <Btn title="Choose a recovery day" kind="ghost" onPress={() => { if (save(true)) { toast('Recovery day planned'); router.replace('/day'); } }} />
    {plan && <Btn title={workout.session ? 'Resume workout' : 'Continue to workout'} kind="ghost" onPress={() => { if (save()) router.replace({ pathname: '/workout/session', params: { plan: plan.id, day: String(nextDayIdx(workout, plan)) } }); }} />}
    <View style={{ gap: 8 }}><T size={16} w="s">Recent check-ins</T>{[...(profile.recovery ?? [])].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7).map((r) => <T key={r.date} size={13} color={C.muted}>{r.date} · Energy {r.energy}/5 · Soreness {r.soreness}/5 · {r.sleepHours}h sleep</T>)}</View>
  </Screen>;
}
