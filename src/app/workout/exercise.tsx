import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { ChevronDown, ChevronUp, Lightbulb } from '@/components/ico';
import { useState } from 'react';
import { View } from 'react-native';

import { LineChart } from '@/components/charts';
import { ExerciseDemo } from '@/components/exercise-demo';
import { BackHeader, Card, Chip, Row, Screen, T, Tap } from '@/components/ui';
import { findInLibrary, libMeta, useLibrary, useSimpleSteps } from '@/lib/exercises';
import { fmtShort, parse } from '@/lib/dates';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';
import { bestFor, e1rm, SetLog } from '@/lib/workout';
import { goBack } from '@/lib/nav';

type Metric = 'weight' | 'volume' | '1rm';

export default function ExerciseScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const { workout: W } = useStore();
  const [metric, setMetric] = useState<Metric>('weight');
  const [howOpen, setHowOpen] = useState(false);
  const { list } = useLibrary();
  const lib = findInLibrary(list, name ?? '');
  const steps = useSimpleSteps(howOpen ? lib : null);
  const planEx = W.plans.flatMap((p) => p.days.flatMap((d) => d.exercises)).find((e) => e.name === name);
  const cardio = planEx?.kind === 'cardio' || W.logs.some((l) => l.exercises.some((e) => e.name === name && e.kind === 'cardio'));
  // Cardio sessions show as one "set" of minutes so the same chart and history work.
  const hist = W.logs.map((l, idx) => {
    const x = l.exercises.find((e) => e.name === name);
    const d: SetLog[] = x?.kind === 'cardio' ? (x.cardio?.done ? [{ w: 0, r: x.cardio.minutes, done: true }] : []) : x?.sets.filter((s) => s.done) ?? [];
    return d.length ? { l, d, idx } : null;
  }).filter(Boolean) as { l: (typeof W.logs)[number]; d: SetLog[]; idx: number }[];
  const best = bestFor(W, name);
  const val = (h: (typeof hist)[number]) => (metric === 'volume' ? h.d.reduce((a, s) => a + s.w * s.r, 0) : metric === '1rm' ? Math.max(...h.d.map((s) => e1rm(s.w, s.r))) : Math.max(...h.d.map((s) => s.w || s.r)));
  const first = hist[0], last = hist[hist.length - 1];
  const change = first && last && val(first) ? Math.round(((val(last) - val(first)) / val(first)) * 100) : null;

  return (
    <Screen>
      <BackHeader title={name ?? ''} onBack={() => goBack('/workouts')} />
      {planEx?.tip ? (
        <Card style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: C.accentTint, borderColor: 'transparent' }}>
          <Lightbulb size={17} color={C.accent} />
          <T size={14} style={{ flex: 1, lineHeight: 20 }}>{planEx.tip}</T>
        </Card>
      ) : null}
      {lib && (
        <Card style={{ gap: 10 }}>
          <Tap onPress={() => setHowOpen(!howOpen)} scale={0.99} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} accessibilityLabel={howOpen ? 'Hide how to' : 'Show how to'}>
            {lib.img ? <Image source={lib.img} style={{ width: 52, height: 52, borderRadius: 12, backgroundColor: C.soft }} contentFit="cover" /> : null}
            <View style={{ flex: 1, minWidth: 0 }}><T size={16} w="s">How to</T><T size={12} color={C.muted} numberOfLines={1}>{libMeta(lib)}</T></View>
            {howOpen ? <ChevronUp size={18} color={C.muted} /> : <ChevronDown size={18} color={C.muted} />}
          </Tap>
          {howOpen && <ExerciseDemo img={lib.img} img2={lib.img2} />}
          {howOpen && steps.map((s, i) => (
            <Row key={i} gap={10} style={{ alignItems: 'flex-start' }}>
              <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}><T size={11} w="b" color={C.accent}>{i + 1}</T></View>
              <T size={14} style={{ flex: 1, lineHeight: 20 }}>{s}</T>
            </Row>
          ))}
        </Card>
      )}
      {!hist.length ? (
        <Card><T size={16} w="s">No sessions yet</T><T size={13} color={C.muted} style={{ marginTop: 4 }}>Log this in a workout and your progress will show here.</T></Card>
      ) : (
        <>
          {!cardio && <Row gap={8}>
            {([['weight', 'Weight'], ['volume', 'Volume'], ['1rm', 'Est. 1RM']] as [Metric, string][]).map(([v, l]) => <Chip key={v} label={l} on={metric === v} onPress={() => setMetric(v)} />)}
          </Row>}
          <Card>
            <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0 }}><T size={12} color={C.muted}>{cardio ? 'Longest session' : 'Best set'}</T><T size={22} w="s" numberOfLines={1} adjustsFontSizeToFit>{cardio ? `${Math.max(...hist.map((h) => h.d[0].r))} min` : best ? (best.w ? `${best.w} kg × ${best.r}` : `${best.r} reps`) : '–'}</T></View>
              {change != null && <T size={13} w="s" color={change >= 0 ? C.green : C.danger} style={{ flexShrink: 1, textAlign: 'right', maxWidth: '50%' }}>{change >= 0 ? '+' : ''}{change}% since {fmtShort(parse(first.l.date))}</T>}
            </Row>
            <View style={{ marginTop: 12 }}>
              <LineChart values={hist.map((h) => Math.round(val(h) * 10) / 10)} labels={hist.map((h) => fmtShort(parse(h.l.date)))} unit={cardio ? ' min' : metric === 'volume' || best?.w ? ' kg' : ' reps'} />
            </View>
          </Card>
          <Card style={{ paddingVertical: 4 }}>
            {hist.slice().reverse().map((h, i) => {
              const prev = bestFor(W, name, h.idx), top = h.d.reduce((a, s) => (e1rm(s.w, s.r) > e1rm(a.w, a.r) ? s : a));
              const pr = !cardio && h.idx > 0 && (!prev || e1rm(top.w, top.r) > e1rm(prev.w, prev.r));
              return (
                <Row key={h.l.id} style={[{ paddingVertical: 12 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.line }]}>
                  <View style={{ flex: 1 }}>
                    <T size={15} w="s">{parse(h.l.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</T>
                    <T size={12} color={C.muted}>{cardio ? `${h.d[0].r} min` : h.d.map((s) => (s.w ? `${s.w}×${s.r}` : `${s.r}`)).join(' · ')}</T>
                  </View>
                  {pr && <View style={{ paddingVertical: 3, paddingHorizontal: 9, borderRadius: 99, backgroundColor: '#DCEFCF' }}><T size={11} w="b" color="#2F3D24">PR</T></View>}
                </Row>
              );
            })}
          </Card>
        </>
      )}
    </Screen>
  );
}
