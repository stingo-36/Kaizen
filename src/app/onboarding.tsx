import { ArrowLeft, ArrowRight, Check } from '@/components/ico';
import { ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Bar, Btn, Card, Chip, IconBtn, Input, Row, Screen, T, haptic } from '@/components/ui';
import { today } from '@/lib/dates';
import { Equipment, EQUIPMENT, Goal, GOALS, Level, LEVELS, Sex } from '@/lib/profile';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';

const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) ? n : null; };

const Group = ({ label, children }: { label: string; children: ReactNode }) => (
  <View style={{ gap: 8 }}><T size={13} w="s" color={C.muted}>{label}</T><View style={st.wrap}>{children}</View></View>
);

const STEPS = [
  { title: 'About you', sub: 'Used for accurate calorie targets and workout plans.' },
  { title: 'Your goal', sub: 'Your plans, food targets and coach tips follow this.' },
  { title: 'Your training week', sub: 'We’ll build your first plan around it. You can change it any time in Profile.' },
];

/** First run after sign-up: collects the details the plans and calorie maths need. */
export default function Onboarding() {
  const { profile, setProfile } = useStore();
  const [step, setStep] = useState(0);
  const [err, setErr] = useState('');
  const [d, setD] = useState({
    age: profile.age ? String(profile.age) : '', heightCm: profile.heightCm ? String(profile.heightCm) : '', weightKg: profile.weightKg ? String(profile.weightKg) : '',
    sex: profile.sex as Sex | null, goal: profile.goal as Goal, level: profile.level as Level, days: profile.days, minutes: profile.minutes,
    equipment: profile.equipment as Equipment, injuries: profile.injuries,
  });
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => { setD({ ...d, [k]: v }); setErr(''); };

  const check = () => {
    if (step !== 0) return '';
    const age = num(d.age), h = num(d.heightCm), w = num(d.weightKg);
    if (age == null || age < 12 || age > 100) return 'Enter an age between 12 and 100';
    if (!d.sex) return 'Choose male or female';
    if (h == null || h < 100 || h > 250) return 'Enter your height in cm (100–250)';
    if (w == null || w < 30 || w > 300) return 'Enter your weight in kg (30–300)';
    return '';
  };
  const finish = (skip = false) => {
    const age = num(d.age), h = num(d.heightCm), w = num(d.weightKg);
    setProfile((p) => skip ? { ...p, onboarded: true } : {
      ...p, age: age ? Math.round(age) : null, heightCm: h, weightKg: w, sex: d.sex, goal: d.goal, level: d.level, days: d.days, minutes: d.minutes,
      equipment: d.equipment, injuries: d.injuries.trim(), weightLog: w ? [{ date: today(), kg: w }] : p.weightLog, onboarded: true,
    });
    haptic('success');
  };
  const next = () => {
    const e = check();
    if (e) return setErr(e);
    haptic('select');
    if (step < STEPS.length - 1) setStep(step + 1); else finish();
  };

  return (
    <Screen style={st.page}>
      <Row style={{ justifyContent: 'space-between' }}>
        {step > 0 ? <IconBtn icon={ArrowLeft} label="Back" onPress={() => { setErr(''); setStep(step - 1); }} /> : <View style={{ width: 42 }} />}
        <T size={13} w="s" color={C.muted}>Step {step + 1} of {STEPS.length}</T>
        <Btn title="Skip" kind="ghost" small onPress={() => finish(true)} style={{ minHeight: 34, paddingHorizontal: 12 }} />
      </Row>
      <Bar value={(step + 1) / STEPS.length} height={6} />
      <View style={{ gap: 4 }}>
        <T size={13} color={C.muted}>Welcome{profile.name ? `, ${profile.name.split(' ')[0]}` : ''}</T>
        <T size={28} w="b" style={{ lineHeight: 34 }}>{STEPS[step].title}</T>
        <T size={14} color={C.muted} style={{ lineHeight: 20 }}>{STEPS[step].sub}</T>
      </View>

      {step === 0 ? (
        <Card style={{ gap: 14 }}>
          <Row gap={10}>
            <Input label="Age" value={d.age} onChange={(v) => set('age', v)} placeholder="e.g. 26" unit="yrs" keyboard="number-pad" style={{ flex: 1 }} />
            <Input label="Height" value={d.heightCm} onChange={(v) => set('heightCm', v)} placeholder="e.g. 175" unit="cm" keyboard="decimal-pad" style={{ flex: 1 }} />
          </Row>
          <Input label="Weight" value={d.weightKg} onChange={(v) => set('weightKg', v)} placeholder="e.g. 72" unit="kg" keyboard="decimal-pad" />
          <Group label="Sex (for calorie maths)">
            <Chip label="Male" on={d.sex === 'male'} onPress={() => set('sex', 'male')} style={st.half} />
            <Chip label="Female" on={d.sex === 'female'} onPress={() => set('sex', 'female')} style={st.half} />
          </Group>
        </Card>
      ) : step === 1 ? (
        <Card style={{ gap: 16 }}>
          <Group label="Main goal">{GOALS.map((g) => <Chip key={g} label={g} on={d.goal === g} onPress={() => set('goal', g)} style={st.half} />)}</Group>
          <Group label="Experience">{LEVELS.map((l) => <Chip key={l} label={l} on={d.level === l} onPress={() => set('level', l)} style={st.third} />)}</Group>
        </Card>
      ) : (
        <Card style={{ gap: 16 }}>
          <Group label="Days per week">{[2, 3, 4, 5, 6].map((n) => <Chip key={n} label={`${n}`} on={d.days === n} onPress={() => set('days', n)} style={st.fifth} />)}</Group>
          <Group label="Session length">{[30, 45, 60, 90].map((n) => <Chip key={n} label={`${n} min`} on={d.minutes === n} onPress={() => set('minutes', n)} style={st.quarter} />)}</Group>
          <Group label="Equipment">{EQUIPMENT.map((e) => <Chip key={e} label={e} on={d.equipment === e} onPress={() => set('equipment', e)} />)}</Group>
          <Input label="Injuries or limits (optional)" value={d.injuries} onChange={(v) => set('injuries', v)} placeholder="e.g. lower back, left knee" />
        </Card>
      )}

      {err ? <T size={13} color={C.danger}>{err}</T> : null}
      <Btn title={step < STEPS.length - 1 ? 'Continue' : 'Finish setup'} icon={step < STEPS.length - 1 ? ArrowRight : Check} onPress={next} />
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  page: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  half: { flexGrow: 1, flexBasis: '45%', alignItems: 'center' },
  third: { flexGrow: 1, flexBasis: '30%', alignItems: 'center' },
  quarter: { flexGrow: 1, flexBasis: '22%', alignItems: 'center' },
  fifth: { flexGrow: 1, flexBasis: '17%', alignItems: 'center' },
}));
