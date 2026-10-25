import { useRouter } from 'expo-router';
import { Flame, Medal, Minus, Sparkles, TrendingDown, TrendingUp, Trophy } from '@/components/ico';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Btn, Card, Chip, Label, Row, Screen, T, Tap, haptic, useToast } from '@/components/ui';
import { today } from '@/lib/dates';
import { PASTEL } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';
import { Feel, logVolume, Plan, progressionFor } from '@/lib/workout';

export default function Done() {
  const router = useRouter();
  const toast = useToast();
  const { workout: W, setWorkout } = useStore();
  const [applyProgression, setApplyProgression] = useState(true);
  const pnd = W.pending;
  const plan = pnd ? W.plans.find((p) => p.id === pnd.planId) : undefined;
  const preview = useMemo(() => (pnd && plan ? progressionFor(JSON.parse(JSON.stringify(plan)), pnd, pnd.feel, false) : []), [pnd, plan]);
  if (!pnd) return null;
  const sets = pnd.exercises.reduce((a, x) => a + x.sets.filter((s) => s.done).length, 0);
  const cardioMin = pnd.exercises.reduce((a, x) => a + (x.cardio?.done ? x.cardio.minutes : 0), 0);
  const setFeel = (feel: Feel) => setWorkout((w) => (w.pending ? { ...w, pending: { ...w.pending, feel } } : w));
  const save = () => {
    setWorkout((w) => {
      if (!w.pending) return w;
      const log = w.pending;
      let changes: { text: string }[] = [];
      const plans = w.plans.map((p): Plan => {
        if (p.id !== log.planId) return p;
        const n: Plan = JSON.parse(JSON.stringify(p));
        changes = applyProgression ? progressionFor(n, log, log.feel, true) : [];
        return n;
      });
      return { ...w, plans, logs: [...w.logs, log], pending: null, lastChanges: changes.length ? { date: today(), items: changes.map((c) => c.text) } : w.lastChanges };
    });
    haptic('success');
    toast(pnd.prs.length ? `New PR: ${pnd.prs[0]}` : preview.length && applyProgression ? `Plan updated: ${preview.length} change${preview.length > 1 ? 's' : ''}` : `Workout saved · ${pnd.kcal} kcal`);
    router.dismissTo('/workouts');
  };
  const discard = () => { setWorkout((w) => ({ ...w, pending: null })); toast('Workout discarded'); router.dismissTo('/workouts'); };

  const tiles: [number, string, string | number][] = [[0, 'Calories', `${pnd.kcal}`], [1, 'Volume', `${(logVolume(pnd) / 1000).toFixed(1)}t`], [2, cardioMin ? 'Cardio' : 'Sets', cardioMin ? `${cardioMin}m` : sets]];
  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 4, paddingTop: 10 }}>
        <View style={st.trophy}><Trophy size={30} color={PASTEL[0][1]} /></View>
        <T size={28} w="b">Workout done</T>
        <T size={14} color={C.muted}>{pnd.title} · {pnd.duration} min</T>
      </View>
      <Row gap={10}>
        {tiles.map(([tone, l, v]) => (
          <View key={l} style={[st.mini, { backgroundColor: PASTEL[tone][0] }]}>
            <T size={12} w="s" color={PASTEL[tone][1]}>{l}</T><T size={22} w="s" color={PASTEL[tone][1]}>{v}</T>
          </View>
        ))}
      </Row>
      <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Flame size={18} color={C.accent} />
        <T size={13} color={C.muted} style={{ flex: 1, lineHeight: 19 }}>About {pnd.kcal} kcal from your reps, loads, rest and cardio, using your weight, height and age.</T>
      </Card>
      {pnd.prs.length > 0 && (
        <Card style={{ gap: 6 }}>
          <Row gap={8}><Medal size={17} color={C.accent} /><T size={16} w="s">Personal records</T></Row>
          {pnd.prs.map((p) => <T key={p} size={13} color={C.muted}>•  {p}</T>)}
        </Card>
      )}
      <Label>How did it feel?</Label>
      <Row gap={8} style={{ flexWrap: 'wrap' }}>
        {([['easy', 'Easy'], ['just right', 'Just right'], ['hard', 'Hard']] as [Feel, string][]).map(([v, l]) => <Chip key={v} label={l} on={pnd.feel === v} onPress={() => setFeel(v)} />)}
      </Row>
      <Card style={{ gap: 8 }}>
        <Row gap={8}><Sparkles size={16} color={C.ink} /><T size={16} w="s">Next time</T></Row>
        {preview.length ? preview.map((c) => (
          <Row key={c.text} gap={8}>
            {c.dir === 'up' ? <TrendingUp size={17} color={C.green} /> : c.dir === 'down' ? <TrendingDown size={17} color={C.accent} /> : <Minus size={17} color={C.muted} />}
            <T size={14} style={{ flex: 1 }}>{c.text}</T>
          </Row>
        )) : <T size={13} color={C.muted}>Same targets next time. Hit the top of each rep range to move up.</T>}
      </Card>
      {preview.length > 0 && <Tap onPress={() => setApplyProgression((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: applyProgression }} style={{ padding: 16, backgroundColor: C.accentTint, borderRadius: 16 }}>
        <T w="m">{applyProgression ? '✓' : '○'} Apply these targets to my next session</T>
      </Tap>}
      <Row gap={10}>
        <Btn title="Discard" kind="ghost" onPress={discard} style={{ flex: 1 }} />
        <Btn title="Save workout" onPress={save} style={{ flex: 2 }} />
      </Row>
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  trophy: { width: 64, height: 64, borderRadius: 32, backgroundColor: PASTEL[0][0], alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  mini: { flex: 1, minWidth: 0, borderRadius: 18, padding: 12, gap: 10 },
}));
