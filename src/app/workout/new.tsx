import { useRouter } from 'expo-router';
import { Check, CircleAlert, Sparkles } from '@/components/ico';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BackHeader, Btn, Card, Chip, Label, Row, Screen, T, Tap, haptic, useToast } from '@/components/ui';
import { useHealth } from '@/lib/health-store';
import { useStore } from '@/lib/store';
import { C, F, themed } from '@/lib/theme';
import { aiCreatePlan } from '@/lib/workout';
import { goBack } from '@/lib/nav';

const FOCUS = ['Fat loss', 'Muscle gain', 'Strength', 'Full body', 'Chest & arms', 'Legs & glutes', 'Back & posture', 'Core', 'Running', 'Mobility', 'Low impact', 'Short sessions'];

export default function NewPlan() {
  const router = useRouter();
  const toast = useToast();
  const { profile, setProfile, setWorkout } = useStore();
  const { data: h, granted } = useHealth();
  const [days, setDays] = useState(profile.days);
  const [minutes, setMinutes] = useState(profile.minutes);
  const [focus, setFocus] = useState<string[]>([]);
  const [request, setRequest] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // What the coach will use, so you can see anything missing before building.
  const details: [string, string | null][] = [
    ['Age', profile.age ? `${profile.age} yrs` : null], ['Sex', profile.sex], ['Height', profile.heightCm ? `${profile.heightCm} cm` : null],
    ['Weight', profile.weightKg ? `${profile.weightKg} kg` : null], ['Goal', profile.goal], ['Level', profile.level], ['Equipment', profile.equipment],
    ['Injuries', profile.injuries || 'None'],
  ];
  const missing = details.filter(([, v]) => !v).map(([k]) => k.toLowerCase());
  const healthLine = [
    h.steps != null && `${h.steps} steps today`, h.sleepMin ? `${Math.round(h.sleepMin / 6) / 10} h sleep last night` : null,
    h.restingHr != null && `resting heart rate ${h.restingHr} bpm`, h.exercise?.last && `last tracked activity: ${h.exercise.last}`,
  ].filter(Boolean).join(', ');
  const toggle = (f: string) => setFocus((x) => (x.includes(f) ? x.filter((y) => y !== f) : [...x, f]));

  const create = async () => {
    setBusy(true); setErr('');
    const ask = [focus.length && `Focus on: ${focus.join(', ')}.`, request.trim(), healthLine && `From my fitness tracker (Google Fit / Health Connect): ${healthLine}. Set cardio and volume to fit this.`]
      .filter(Boolean).join('\n');
    try {
      const plan = await aiCreatePlan({ ...profile, days, minutes }, ask);
      if (days !== profile.days || minutes !== profile.minutes) setProfile((p) => ({ ...p, days, minutes }));
      setWorkout((w) => ({ ...w, plans: [...w.plans, plan], activePlanId: plan.id, selDay: 0 }));
      haptic('success');
      toast('Your new plan is ready');
      router.replace({ pathname: '/workout/plan', params: { id: plan.id } });
    } catch (e) {
      setErr((e as Error).message);
    }
    setBusy(false);
  };

  return (
    <Screen>
      <BackHeader title="New plan" onBack={() => goBack('/workouts')} />
      <T size={26} w="b" style={{ lineHeight: 32 }}>What should your plan focus on?</T>

      <Label>Days per week</Label>
      <View style={st.wrap}>{[2, 3, 4, 5, 6].map((n) => <Chip key={n} label={`${n} days`} on={days === n} onPress={() => setDays(n)} />)}</View>
      <Label>Session length</Label>
      <View style={st.wrap}>{[30, 45, 60, 90].map((n) => <Chip key={n} label={`${n} min`} on={minutes === n} onPress={() => setMinutes(n)} />)}</View>

      <Label>Focus (pick any)</Label>
      <View style={st.wrap}>{FOCUS.map((f) => <Chip key={f} label={f} on={focus.includes(f)} onPress={() => toggle(f)} />)}</View>
      <TextInput value={request} onChangeText={setRequest} placeholder="Anything else? e.g. I like cycling, no jumping" placeholderTextColor={C.faint}
        style={st.input} multiline maxLength={300} accessibilityLabel="Anything else for the plan" />

      <Card style={{ gap: 10 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={16} w="s">Your plan will use</T>
          <Tap onPress={() => router.push('/profile')} hitSlop={10}><T size={13} w="s" color={C.accent}>Edit</T></Tap>
        </Row>
        <View style={st.grid}>
          {details.map(([k, v]) => (
            <View key={k} style={st.detail}>
              {v ? <Check size={14} color={C.green} strokeWidth={2.6} /> : <CircleAlert size={14} color={C.danger} />}
              <T size={12} color={C.muted}>{k}</T>
              <T size={12} w="s" numberOfLines={1} style={{ flexShrink: 1 }} color={v ? C.ink : C.danger}>{v ?? 'Missing'}</T>
            </View>
          ))}
        </View>
        <Row gap={8} style={{ paddingTop: 4, borderTopWidth: 1, borderTopColor: C.line }}>
          {healthLine ? <Check size={14} color={C.green} strokeWidth={2.6} /> : <CircleAlert size={14} color={C.muted} />}
          <T size={12} color={C.muted} style={{ flex: 1 }}>{healthLine ? `Google Fit: ${healthLine}` : granted.length ? 'Google Fit: no data yet today' : 'Google Fit not connected (optional)'}</T>
        </Row>
        {missing.length > 0 && <T size={12} w="s" color={C.danger}>Add your {missing.join(', ')} in Profile for an accurate plan.</T>}
      </Card>

      {err ? <Card style={{ borderColor: C.danger }}><T size={13} color={C.danger}>{err}</T></Card> : null}
      <Btn title={busy ? 'Building your plan… (about 30 s)' : `Build my ${days}-day plan`} icon={Sparkles} busy={busy} onPress={create} />
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  input: { minHeight: 70, padding: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, fontFamily: F.r, fontSize: 15, color: C.ink, textAlignVertical: 'top' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 8 },
  detail: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: 8 },
}));
