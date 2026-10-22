import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ArrowLeftRight, CheckCircle2, Ellipsis, HeartPulse, Pencil, Play, Plus, Sparkles, Trash2 } from '@/components/ico';
import { useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { PagerScreen } from '@/components/pager';
import { BackHeader, Btn, Card, Chip, IconBtn, Row, Screen, Segmented, Sheet, T, Tap, haptic, useToast } from '@/components/ui';
import { kcalForPlanDay } from '@/lib/calories';
import { PASTEL } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, F, themed } from '@/lib/theme';
import { aiDescribeExercise, aiRetune, aiSuggestExercises, fmtKg, Intensity, keyPoints, Kind, normExercise, Plan, PlanDay, PlanExercise } from '@/lib/workout';
import { goBack } from '@/lib/nav';

type Suggestion = PlanExercise & { why: string };
const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const detail = (e: PlanExercise) => (e.kind === 'cardio'
  ? `${e.minutes} min · ${e.intensity}${e.met ? ` · MET ${e.met}` : ''}`
  : `${e.sets} × ${e.reps} · ${fmtKg(e.weight)} · ${e.rest >= 120 ? `${+(e.rest / 60).toFixed(1)} min` : `${e.rest}s`} rest`);

export default function PlanScreen() {
  const { id, day: dayParam } = useLocalSearchParams<{ id?: string; day?: string }>();
  const router = useRouter();
  const toast = useToast();
  const { workout: W, setWorkout, profile } = useStore();
  const plan = W.plans.find((p) => p.id === id) ?? W.plans.find((p) => p.id === W.activePlanId) ?? W.plans[0];
  const [sel, setSel] = useState(() => Math.max(0, +(dayParam ?? 0) || 0));
  const [menu, setMenu] = useState(false);
  const [rename, setRename] = useState<string | null>(null);
  const [del, setDel] = useState(false);
  const [busy, setBusy] = useState('');
  // add / swap sheet
  const [sheet, setSheet] = useState<null | { mode: 'add' | 'swap'; index: number }>(null);
  const [tab, setTab] = useState<'lib' | 'ai' | 'own'>('lib');
  const [hint, setHint] = useState('');
  const [sugs, setSugs] = useState<Suggestion[]>([]);
  const [own, setOwn] = useState({ name: '', kind: 'strength' as Kind, sets: '3', reps: '8-12', weight: '', minutes: '20', intensity: 'moderate' as Intensity });
  const [sheetErr, setSheetErr] = useState('');

  if (!plan) return <Screen><IconBtn icon={ArrowLeft} label="Back" onPress={() => goBack('/workouts')} /><T>This plan no longer exists.</T></Screen>;
  const d = Math.min(sel, plan.days.length - 1), day = plan.days[d];
  const isActive = plan.id === (W.activePlanId ?? W.plans[0]?.id);
  const update = (fn: (p: Plan) => void) => setWorkout((w) => ({ ...w, plans: w.plans.map((p) => { if (p.id !== plan.id) return p; const n = clone(p); fn(n); n.updatedAt = new Date().toISOString().slice(0, 10); return n; }) }));

  const openSheet = (mode: 'add' | 'swap', index: number) => {
    setSheet({ mode, index }); setTab('lib'); setHint(''); setSugs([]); setSheetErr('');
    setOwn({ name: '', kind: 'strength', sets: '3', reps: '8-12', weight: '', minutes: '20', intensity: 'moderate' });
  };
  const loadSuggestions = async (mode: 'add' | 'swap', index: number, h: string) => {
    setBusy('sugs'); setSheetErr('');
    try { setSugs(await aiSuggestExercises(profile, day, mode, mode === 'swap' ? day.exercises[index] : null, h)); }
    catch (e) { setSheetErr((e as Error).message); }
    setBusy('');
  };
  const place = (ex: PlanExercise) => {
    if (!sheet) return;
    const fresh = ex; // normExercise always gives it an id
    const old = sheet.mode === 'swap' ? day.exercises[sheet.index]?.name : null;
    update((p) => { if (sheet.mode === 'swap') p.days[d].exercises[sheet.index] = fresh; else p.days[d].exercises.push(fresh); });
    setSheet(null); haptic('success');
    toast(old ? `Swapped ${old} for ${fresh.name}` : `Added ${fresh.name}`);
  };
  const addWithAI = async (name: string, kind: Kind) => {
    setBusy('own'); setSheetErr('');
    try { place(await aiDescribeExercise(profile, name, kind)); } catch (e) { setSheetErr((e as Error).message); }
    setBusy('');
  };
  const addOwn = async (withAI: boolean) => {
    const name = own.name.trim();
    if (!name) return setSheetErr('Enter the exercise name');
    if (withAI) return addWithAI(name, own.kind);
    place(normExercise({ name, kind: own.kind, sets: own.sets, reps: own.reps, weight: own.weight, minutes: own.minutes, intensity: own.intensity, rest: 90 }));
  };
  const remove = (i: number) => {
    const removed = day.exercises[i], before = clone(plan);
    update((p) => { p.days[d].exercises.splice(i, 1); });
    toast(`Removed ${removed.name}`, () => setWorkout((w) => ({ ...w, plans: w.plans.map((p) => (p.id === before.id ? before : p)) })));
  };
  const retune = async () => {
    setMenu(false); setBusy('retune');
    try {
      const next = await aiRetune(plan, profile, W.logs);
      setWorkout((w) => ({ ...w, plans: w.plans.map((p) => (p.id === plan.id ? next : p)), lastChanges: { date: next.updatedAt, items: next.changes } }));
      toast('Plan updated from your progress');
    } catch (e) { toast((e as Error).message); }
    setBusy('');
  };

  const points = keyPoints(plan);
  const dayPage = (dd: PlanDay, di: number) => (
    <>
      <Card style={{ paddingVertical: 6 }}>
        <Row style={{ justifyContent: 'space-between', paddingTop: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}><T size={16} w="s">{dd.title}</T><T size={12} color={C.muted} numberOfLines={1}>{dd.focus}</T></View>
          <View style={[st.badge, { backgroundColor: C.accentSoft }]}><T size={11} w="b" color={C.accent}>≈ {kcalForPlanDay(profile, dd.exercises)} kcal</T></View>
        </Row>
        {dd.exercises.map((e, i) => {
          const [bg, ink] = e.kind === 'cardio' ? PASTEL[4] : PASTEL[i % 4];
          return (
            <View key={e.id} style={[st.ex, { borderTopWidth: 1, borderTopColor: C.line }]}>
              <View style={[st.n, { backgroundColor: bg }]}>{e.kind === 'cardio' ? <HeartPulse size={15} color={ink} /> : <T size={13} w="b" color={ink}>{i + 1}</T>}</View>
              <Tap style={{ flex: 1, minWidth: 0 }} scale={0.98} onPress={() => router.push({ pathname: '/workout/exercise', params: { name: e.name } })} accessibilityLabel={`${e.name}. Open details and form tips`}>
                <T size={15} w="s" numberOfLines={2}>{e.name}</T>
                <T size={12} color={C.muted}>{detail(e)}</T>
              </Tap>
              <IconBtn icon={ArrowLeftRight} size={34} label={`Swap ${e.name}`} onPress={() => openSheet('swap', i)} />
              <IconBtn icon={Trash2} size={34} label={`Remove ${e.name}`} onPress={() => remove(i)} />
            </View>
          );
        })}
        <Tap onPress={() => openSheet('add', -1)} style={st.add}><Plus size={17} color={C.accent} /><T size={14} w="s" color={C.accent}>Add exercise or cardio</T></Tap>
      </Card>
      {points.length > 0 && (
        <Card style={{ gap: 8 }}>
          <Row gap={8}><Sparkles size={16} color={C.accent} /><T size={16} w="s">Key points</T></Row>
          {points.map((c) => <Row key={c} gap={8} style={{ alignItems: 'flex-start' }}><View style={st.bullet} /><T size={13} color={C.muted} style={{ flex: 1, lineHeight: 19 }}>{c}</T></Row>)}
        </Card>
      )}
      <Btn title={`Start ${dd.title}`} icon={Play} onPress={() => {
        if (!isActive) setWorkout((w) => ({ ...w, activePlanId: plan.id }));
        router.push({ pathname: '/workout/session', params: { day: String(di), plan: plan.id } });
      }} />
    </>
  );

  return (
    <>
      <PagerScreen index={d} onIndex={setSel}
        header={(
          <View style={{ gap: 8 }}>
            <BackHeader title="" onBack={() => goBack('/workouts')} right={<IconBtn icon={Ellipsis} label="Plan options" onPress={() => setMenu(true)} />} />
            <Row gap={8}>
              <T size={24} w="b" numberOfLines={2} style={{ flexShrink: 1, lineHeight: 30 }}>{plan.name}</T>
              {isActive ? <View style={[st.badge, { backgroundColor: PASTEL[0][0] }]}><T size={11} w="b" color={PASTEL[0][1]}>Active</T></View>
                : <Tap onPress={() => { setWorkout((w) => ({ ...w, activePlanId: plan.id })); toast('Set as active plan'); }} style={[st.badge, { backgroundColor: C.soft }]}><T size={11} w="b">Make active</T></Tap>}
            </Row>
            {busy === 'retune' && <Row gap={8}><ActivityIndicator color={C.accent} /><T size={13} color={C.accent}>Re-tuning your plan from your workouts…</T></Row>}
          </View>
        )}
        pages={plan.days.map((dd, i) => ({ key: `${i}`, label: plan.days.length > 4 || plan.days.some((x) => x.title.length > 9) ? `Day ${i + 1}` : dd.title, render: () => dayPage(dd, i) }))} />

      <Sheet open={menu} onClose={() => setMenu(false)} title="Plan options">
        {!isActive && <Tap style={st.opt} onPress={() => { setMenu(false); setWorkout((w) => ({ ...w, activePlanId: plan.id })); toast('Set as active plan'); }}><CheckCircle2 size={19} color={C.accent} /><T size={16} w="s">Make this my active plan</T></Tap>}
        <Tap style={st.opt} onPress={retune}><Sparkles size={19} color={C.accent} /><T size={16} w="s">Re-tune with AI from my workouts</T></Tap>
        <Tap style={st.opt} onPress={() => { setMenu(false); setRename(plan.name); }}><Pencil size={19} color={C.accent} /><T size={16} w="s">Rename plan</T></Tap>
        <Tap style={st.opt} onPress={() => { setMenu(false); setDel(true); }}><Trash2 size={19} color={C.danger} /><T size={15} w="s" color={C.danger}>Delete plan</T></Tap>
        <Btn title="Close" kind="ghost" onPress={() => setMenu(false)} />
      </Sheet>

      <Sheet open={rename != null} onClose={() => setRename(null)} title="Rename plan">
        <TextInput value={rename ?? ''} onChangeText={setRename} style={st.input} maxLength={50} autoFocus placeholder="Plan name" placeholderTextColor={C.faint} accessibilityLabel="Plan name" />
        <Btn title="Save name" onPress={() => { const n = (rename ?? '').trim(); if (n) update((p) => { p.name = n; }); setRename(null); }} />
      </Sheet>

      <Sheet open={del} onClose={() => setDel(false)} title={`Delete "${plan.name}"?`} subtitle="Your past workouts stay in your history.">
        <Btn title="Delete plan" kind="danger" onPress={() => {
          setWorkout((w) => { const plans = w.plans.filter((p) => p.id !== plan.id); return { ...w, plans, activePlanId: w.activePlanId === plan.id ? plans[0]?.id ?? null : w.activePlanId }; });
          setDel(false); goBack('/workouts'); toast('Plan deleted');
        }} />
        <Btn title="Cancel" kind="ghost" onPress={() => setDel(false)} />
      </Sheet>

      <Sheet open={!!sheet} onClose={() => setSheet(null)} title={sheet?.mode === 'swap' ? `Swap ${day.exercises[sheet.index]?.name ?? ''}` : `Add to ${day.title}`}>
        <Segmented options={sheet?.mode === 'swap' ? [['lib', 'Library'], ['ai', 'AI picks']] : [['lib', 'Library'], ['ai', 'AI picks'], ['own', 'My own']]} value={tab}
          onChange={(v) => { setTab(v as 'lib' | 'ai' | 'own'); setSheetErr(''); if (v === 'ai' && sheet?.mode === 'swap' && !sugs.length) loadSuggestions('swap', sheet.index, ''); }} />
        {tab === 'lib' ? (
          <ExercisePicker busy={busy === 'own'} onPick={(e, ai) => (ai ? addWithAI(e.name, e.kind) : place(e))}
            initial={sheet?.mode === 'swap' ? day.exercises[sheet.index]?.name.split(' ').slice(-1)[0] : ''} />
        ) : tab === 'ai' ? (
          <>
            {sheet?.mode === 'add' && (
              <Row gap={8}>
                <TextInput value={hint} onChangeText={setHint} placeholder="Optional: e.g. cardio, biceps, no equipment" placeholderTextColor={C.faint} style={[st.input, { flex: 1 }]} accessibilityLabel="What kind of exercise" />
                <Btn title="Suggest" small onPress={() => loadSuggestions('add', -1, hint.trim())} busy={busy === 'sugs'} />
              </Row>
            )}
            {busy === 'sugs' && <Row gap={8} style={{ paddingVertical: 10 }}><ActivityIndicator color={C.accent} /><T size={13} color={C.muted}>Your coach is thinking…</T></Row>}
            {sugs.map((sg) => (
              <Tap key={sg.id} style={st.sug} onPress={() => place(sg)}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Row gap={6}>{sg.kind === 'cardio' && <HeartPulse size={14} color={C.accent} />}<T size={15} w="s" style={{ flexShrink: 1 }}>{sg.name}</T></Row>
                  <T size={12} color={C.muted}>{detail(sg)}</T>
                  {sg.why ? <T size={12} color={C.muted} style={{ marginTop: 2 }}>{sg.why}</T> : null}
                </View>
                <Plus size={18} color={C.accent} />
              </Tap>
            ))}
          </>
        ) : (
          <>
            <TextInput value={own.name} onChangeText={(v) => setOwn({ ...own, name: v })} placeholder="Exercise name, e.g. Cable fly or Cycling" placeholderTextColor={C.faint} style={st.input} accessibilityLabel="Exercise name" />
            <Row gap={8}><Chip label="Strength" on={own.kind === 'strength'} onPress={() => setOwn({ ...own, kind: 'strength' })} /><Chip label="Cardio" on={own.kind === 'cardio'} onPress={() => setOwn({ ...own, kind: 'cardio' })} /></Row>
            {own.kind === 'strength' ? (
              <Row gap={8}>
                <Small label="Sets" value={own.sets} onChange={(v) => setOwn({ ...own, sets: v })} numeric />
                <Small label="Reps" value={own.reps} onChange={(v) => setOwn({ ...own, reps: v })} />
                <Small label="Weight kg" value={own.weight} onChange={(v) => setOwn({ ...own, weight: v })} numeric />
              </Row>
            ) : (
              <>
                <Small label="Minutes" value={own.minutes} onChange={(v) => setOwn({ ...own, minutes: v })} numeric />
                <Row gap={8}>{(['easy', 'moderate', 'hard'] as Intensity[]).map((i) => <Chip key={i} label={i[0].toUpperCase() + i.slice(1)} on={own.intensity === i} onPress={() => setOwn({ ...own, intensity: i })} />)}</Row>
              </>
            )}
            <Row gap={8}>
              <Btn title="Add" small kind="ghost" onPress={() => addOwn(false)} style={{ flex: 1, minHeight: 46 }} />
              <Btn title="Fill targets with AI" small icon={Sparkles} busy={busy === 'own'} onPress={() => addOwn(true)} style={{ flex: 2, minHeight: 46 }} />
            </Row>
          </>
        )}
        {sheetErr ? <T size={13} color={C.danger}>{sheetErr}</T> : null}
      </Sheet>
    </>
  );
}

function Small({ label, value, onChange, numeric }: { label: string; value: string; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      <T size={11} w="s" color={C.muted}>{label}</T>
      <TextInput value={value} onChangeText={onChange} keyboardType={numeric ? 'decimal-pad' : 'default'} style={st.input} accessibilityLabel={label} />
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99 },
  ex: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  n: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, backgroundColor: C.soft },
  sug: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.soft },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 7 },
  input: { minHeight: 46, minWidth: 0, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.soft, fontFamily: F.r, fontSize: 15, color: C.ink },
}));
