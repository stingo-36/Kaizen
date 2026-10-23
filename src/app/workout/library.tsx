import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { ChevronRight, Search } from '@/components/ico';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { ExerciseDemo } from '@/components/exercise-demo';
import { BackHeader, Btn, Chip, Label, Row, Screen, Sheet, T, Tap, haptic, useToast } from '@/components/ui';
import { cap, LibExercise, libMeta, libToPlan, MUSCLE_GROUPS, searchLibrary, useLibrary, useSimpleSteps } from '@/lib/exercises';
import { useStore } from '@/lib/store';
import { C, F, themed } from '@/lib/theme';
import { activePlan } from '@/lib/workout';
import { goBack } from '@/lib/nav';

export default function Library() {
  const router = useRouter();
  const toast = useToast();
  const { workout: W, setWorkout } = useStore();
  const { list, loading, error, retry } = useLibrary();
  const [q, setQ] = useState('');
  const [group, setGroup] = useState<string | undefined>();
  const [open, setOpen] = useState<LibExercise | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const plan = activePlan(W);
  const steps = useSimpleSteps(open);
  const hits = useMemo(() => searchLibrary(list, q, group, 60), [list, q, group]);

  const addToPlan = () => {
    if (!open || !plan) return;
    const ex = libToPlan(open), d = Math.min(dayIdx, plan.days.length - 1);
    setWorkout((w) => ({ ...w, plans: w.plans.map((p) => (p.id !== plan.id ? p : { ...p, days: p.days.map((dd, i) => (i === d ? { ...dd, exercises: [...dd.exercises, ex] } : dd)) })) }));
    haptic('success'); toast(`Added ${open.name} to ${plan.days[d].title}`); setOpen(null);
  };

  return (
    <Screen>
      <BackHeader title="Exercise library" onBack={() => goBack('/workouts')} />
      <View style={st.search}>
        <Search size={17} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search 870+ exercises" placeholderTextColor={C.faint} style={st.input} autoCorrect={false} accessibilityLabel="Search exercises" />
      </View>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {MUSCLE_GROUPS.map(([g]) => <Chip key={g} label={g} on={group === g} onPress={() => setGroup(group === g ? undefined : g)} />)}
      </Row>
      {loading && <Row gap={8}><ActivityIndicator color={C.accent} /><T size={13} color={C.muted}>Downloading the library (once)…</T></Row>}
      {error ? <View style={{ gap: 8 }}><T size={13} color={C.danger}>{error}</T><Btn title="Try again" kind="ghost" small onPress={retry} /></View> : null}
      <View style={{ gap: 8 }}>
        {hits.map((e) => (
          <Tap key={e.id} onPress={() => { setOpen(e); setDayIdx(0); }} scale={0.98} style={st.row} accessibilityLabel={`${e.name}. Show how to`}>
            {e.img ? <Image source={e.img} style={st.thumb} contentFit="cover" transition={150} /> : <View style={st.thumb} />}
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={15} w="s" numberOfLines={1}>{e.name}</T>
              <T size={12} color={C.muted} numberOfLines={1}>{libMeta(e)}</T>
            </View>
            <ChevronRight size={18} color={C.faint} />
          </Tap>
        ))}
      </View>
      {!loading && !error && !hits.length && <T size={13} color={C.muted} center>No matches. Try a shorter word.</T>}
      <T size={11} color={C.faint} center>Exercises from free-exercise-db (public domain)</T>

      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.name ?? ''} subtitle={open ? `${libMeta(open)}${open.level ? ` · ${cap(open.level)}` : ''}` : ''}>
        {open ? <ExerciseDemo img={open.img} img2={open.img2} /> : null}
        {steps.length > 0 && (
          <View style={{ gap: 8 }}>
            <Label>How to</Label>
            {steps.map((s, i) => (
              <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
                <View style={st.num}><T size={11} w="b" color={C.accent}>{i + 1}</T></View>
                <T size={13} color={C.ink} style={{ flex: 1, lineHeight: 19 }}>{s}</T>
              </Row>
            ))}
          </View>
        )}
        {plan ? (
          <>
            <Label style={{ marginTop: 6 }}>Add to {plan.name}</Label>
            <Row gap={6} style={{ flexWrap: 'wrap' }}>{plan.days.map((d, i) => <Chip key={d.title + i} label={d.title} on={dayIdx === i} onPress={() => setDayIdx(i)} />)}</Row>
            <Btn title="Add to plan" onPress={addToPlan} />
          </>
        ) : <Btn title="Create a plan first" kind="ghost" onPress={() => { setOpen(null); router.push('/workout/new'); }} />}
      </Sheet>
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  input: { flex: 1, minWidth: 0, fontFamily: F.r, fontSize: 15, color: C.ink, paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 18, backgroundColor: C.card },
  thumb: { width: 52, height: 52, borderRadius: 12, backgroundColor: C.soft },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center', marginTop: -1 },
}));
