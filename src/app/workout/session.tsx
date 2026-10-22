import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Flag, Flame, HeartPulse, Plus, X } from '@/components/ico';
import { useEffect, useRef, useState } from 'react';
import { AppState, Platform, StyleSheet, TextInput, View } from 'react-native';

import { ExercisePicker } from '@/components/exercise-picker';
import { Bar, Btn, Card, Chip, IconBtn, Row, Screen, Sheet, T, Tap, haptic, useToast } from '@/components/ui';
import { kcalForLive, kcalForLogs } from '@/lib/calories';
import { fmtClock, today, uid } from '@/lib/dates';
import { cancelAlert, ensurePermission, scheduleRestAlert } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { C, F, PASTEL, themed } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import { findPRs, Intensity, Kind, lastFor, LiveExercise, newSession, Session, SessionLog, sessionToExerciseLogs, timedSeconds } from '@/lib/workout';
import { goBack } from '@/lib/nav';

export default function SessionScreen() {
  // Keep the screen on during a workout (phones only; the web preview doesn't support it).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    activateKeepAwakeAsync('workout').catch(() => {});
    return () => { deactivateKeepAwake('workout').catch?.(() => {}); };
  }, []);
  const { day, plan: planParam } = useLocalSearchParams<{ day?: string; plan?: string }>();
  const router = useRouter();
  const toast = useToast();
  const { workout: W, setWorkout, profile } = useStore();
  const [discardOpen, setDiscardOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [add, setAdd] = useState({ name: '', kind: 'strength' as Kind, intensity: 'moderate' as Intensity });
  const now = useNow(500);
  const restEndRef = useRef(0);

  // Start a session for the requested plan and day unless one is already running.
  useEffect(() => {
    setWorkout((w) => {
      if (w.session) return w;
      const p = w.plans.find((x) => x.id === planParam) ?? w.plans.find((x) => x.id === w.activePlanId) ?? w.plans[0];
      if (!p) return w;
      return { ...w, session: newSession(p, Math.min(+(day ?? 0) || 0, p.days.length - 1)) };
    });
    ensurePermission().catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rest end is a timestamp, so the countdown stays right after the phone sleeps. While the app is open,
  // buzz and show a toast when it runs out; with the screen locked the scheduled notification does that.
  useEffect(() => { restEndRef.current = W.session?.restEnd || 0; }, [W.session?.restEnd]);
  useEffect(() => {
    const t = setInterval(() => {
      const end = restEndRef.current;
      if (end && Date.now() >= end) {
        restEndRef.current = 0;
        if (AppState.currentState === 'active') { haptic('success'); toast('Rest over. Next set!'); }
      }
    }, 500);
    return () => clearInterval(t);
  }, [toast]);

  const s = W.session;
  const plan = s ? W.plans.find((p) => p.id === s.planId) : null;
  if (!s) return <Screen><T>{W.plans.length ? 'Starting your workout…' : 'Create a plan first.'}</T></Screen>;
  const title = plan?.days[s.day]?.title ?? 'Workout';
  const units = (x: LiveExercise) => (x.kind === 'cardio' ? 1 : x.sets.length);
  const doneUnits = (x: LiveExercise) => (x.kind === 'cardio' ? +x.cardio.done : x.sets.filter((t) => t.done).length);
  const total = s.ex.reduce((a, x) => a + units(x), 0), done = s.ex.reduce((a, x) => a + doneUnits(x), 0);
  const kcal = kcalForLive(profile, s.ex);
  const resting = s.restEnd > now;
  const cur = s.ex.findIndex((x) => doneUnits(x) < units(x));

  const update = (fn: (s: Session) => void) => setWorkout((w) => { if (!w.session) return w; const n: Session = JSON.parse(JSON.stringify(w.session)); fn(n); return { ...w, session: n }; });
  const setVal = (i: number, j: number, k: 'w' | 'r', v: string) => update((n) => { n.ex[i].sets[j][k] = v.replace(',', '.'); });
  const setCardio = (i: number, k: 'minutes' | 'km', v: string) => update((n) => { n.ex[i].cardio[k] = v.replace(',', '.'); });
  const toggleSet = async (i: number, j: number) => {
    const x = s.ex[i], wasDone = x.sets[j].done;
    await cancelAlert(s.restId);
    let restId: string | null = null, restEnd = 0;
    if (!wasDone) {
      haptic('light');
      restEnd = Date.now() + x.rest * 1000;
      const nextIdx = x.sets.findIndex((t, k) => k !== j && !t.done);
      const nextName = nextIdx >= 0 ? x.name : s.ex[i + 1]?.name ?? 'Finish your workout';
      restId = await scheduleRestAlert(x.rest, nextName);
    }
    update((n) => { n.ex[i].sets[j].done = !wasDone; n.restEnd = restEnd; n.restId = restId; });
  };
  const toggleCardio = (i: number) => { haptic('light'); update((n) => { n.ex[i].cardio.done = !n.ex[i].cardio.done; }); };
  const addSet = (i: number) => update((n) => { const last = n.ex[i].sets[n.ex[i].sets.length - 1]; n.ex[i].sets.push({ w: last?.w ?? '', r: last?.r ?? '', done: false }); });
  const adjustRest = async (sec: number) => {
    await cancelAlert(s.restId);
    if (sec === 0) return update((n) => { n.restEnd = 0; n.restId = null; });
    const restEnd = Math.max(Date.now() + 1000, s.restEnd + sec * 1000);
    const restId = await scheduleRestAlert((restEnd - Date.now()) / 1000, 'Next set');
    update((n) => { n.restEnd = restEnd; n.restId = restId; });
  };
  const addExercise = (picked?: { name: string; kind: Kind }) => {
    const name = (picked?.name ?? add.name).trim(), kind = picked?.kind ?? add.kind;
    if (!name) return;
    update((n) => {
      n.ex.push({
        name, kind, tSets: kind === 'cardio' ? 1 : 3, tReps: kind === 'cardio' ? '' : '8-12', tW: 0, rest: kind === 'cardio' ? 0 : 90,
        intensity: add.intensity, met: 0,
        sets: kind === 'cardio' ? [] : Array.from({ length: 3 }, () => ({ w: '', r: '', done: false })),
        cardio: { minutes: kind === 'cardio' ? '20' : '', km: '', done: false },
      });
    });
    setAddOpen(false); setAdd({ name: '', kind: 'strength', intensity: 'moderate' }); toast(`Added ${name}`);
  };
  const finish = async () => {
    if (!done) return toast('Tick off at least one set or cardio first');
    await cancelAlert(s.restId);
    const exercises = sessionToExerciseLogs(s);
    const log: SessionLog = {
      id: uid(), date: today(), planId: s.planId, day: s.day, title, feel: 'just right',
      duration: Math.max(1, Math.round((Date.now() - s.start) / 60000)), exercises, prs: findPRs(W, exercises), kcal: kcalForLogs(profile, exercises),
    };
    setWorkout((w) => ({ ...w, session: null, pending: log }));
    router.replace('/workout/done');
  };

  return (
    <Screen>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6}><View style={st.rec} /><T size={14} w="b" style={{ fontVariant: ['tabular-nums'] }}>{fmtClock(now - s.start)}</T></Row>
          <T size={16} w="s" numberOfLines={1} style={{ flexShrink: 1, textAlign: 'center' }}>{title}</T>
          <IconBtn icon={X} label="Discard workout" onPress={() => setDiscardOpen(true)} />
        </Row>
        <Row gap={10}>
          <View style={{ flex: 1 }}><Bar value={total ? done / total : 0} /></View>
          <T size={12} color={C.muted}>{done}/{total}</T>
          <View style={st.kcal}><Flame size={13} color={C.accent} /><T size={12} w="b" color={C.accent}>{kcal} kcal</T></View>
        </Row>
        {resting && (
          <View style={st.rest}>
            <T size={11} w="s" color={PASTEL[4][1]} center style={{ letterSpacing: 0.8 }}>REST</T>
            <T size={42} w="s" color={PASTEL[4][1]} center style={{ fontVariant: ['tabular-nums'], lineHeight: 48 }}>{fmtClock(s.restEnd - now + 999)}</T>
            <Row gap={8} style={{ justifyContent: 'center', marginTop: 6 }}>
              <Tap style={st.restBtn} onPress={() => adjustRest(-15)}><T size={13} w="b" color={PASTEL[4][1]}>−15s</T></Tap>
              <Tap style={st.restBtn} onPress={() => adjustRest(15)}><T size={13} w="b" color={PASTEL[4][1]}>+15s</T></Tap>
              <Tap style={[st.restBtn, { backgroundColor: C.ink }]} onPress={() => adjustRest(0)}><T size={13} w="b" color={C.onInk}>Skip</T></Tap>
            </Row>
          </View>
        )}
        {s.ex.map((x, i) => {
          const last = lastFor(W, x.name), timed = timedSeconds(x.tReps) > 0;
          const lastText = last?.set ? (last.set.w ? `${last.set.w} × ${last.set.r}` : `${last.set.r} reps`) : last?.cardio ? `${last.cardio.minutes} min` : '';
          return (
            <Card key={x.name + i} style={i === cur ? { borderColor: C.ink, borderWidth: 2 } : undefined}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Tap style={{ flex: 1, minWidth: 0 }} scale={0.98} onPress={() => router.push({ pathname: '/workout/exercise', params: { name: x.name } })}>
                  <Row gap={6}>{x.kind === 'cardio' && <HeartPulse size={15} color={C.accent} />}<T size={15} w="s" style={{ flexShrink: 1 }}>{x.name}</T></Row>
                </Tap>
                {lastText ? <View style={st.last}><T size={11} w="s" color={C.muted}>Last: {lastText}</T></View> : null}
              </Row>
              {x.kind === 'cardio' ? (
                <>
                  <T size={12} color={C.muted}>Target {x.cardio.minutes || '–'} min · {x.intensity}</T>
                  <View style={[st.set, { marginTop: 10 }]}>
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}><T size={11} w="s" color={C.muted} center>minutes</T>
                      <TextInput value={x.cardio.minutes} onChangeText={(v) => setCardio(i, 'minutes', v)} keyboardType="decimal-pad" style={[st.input, st.colInput, x.cardio.done && st.inputDone]} selectTextOnFocus accessibilityLabel={`${x.name} minutes`} /></View>
                    <View style={{ flex: 1, minWidth: 0, gap: 4 }}><T size={11} w="s" color={C.muted} center>km (optional)</T>
                      <TextInput value={x.cardio.km} onChangeText={(v) => setCardio(i, 'km', v)} keyboardType="decimal-pad" style={[st.input, st.colInput, x.cardio.done && st.inputDone]} selectTextOnFocus accessibilityLabel={`${x.name} distance`} /></View>
                    <Tap scale={0.85} onPress={() => toggleCardio(i)} style={[st.check, { alignSelf: 'flex-end' }, x.cardio.done && { backgroundColor: C.ink, borderColor: C.ink }]} accessibilityRole="checkbox" accessibilityState={{ checked: x.cardio.done }} accessibilityLabel={`${x.name} done`}>
                      {x.cardio.done && <Check size={17} color={C.onInk} strokeWidth={2.6} />}
                    </Tap>
                  </View>
                </>
              ) : (
                <>
                  <T size={12} color={C.muted}>Target {x.tSets} × {x.tReps}{x.tW ? ` @ ${x.tW} kg` : ''}</T>
                  <View style={[st.set, { marginTop: 10 }]}>
                    <T size={11} w="s" color={C.muted} center style={{ width: 22 }}>#</T>
                    <T size={11} w="s" color={C.muted} center style={{ flex: 1 }}>kg</T>
                    <T size={11} w="s" color={C.muted} center style={{ flex: 1 }}>{timed ? 'sec' : 'reps'}</T>
                    <View style={{ width: 40 }} />
                  </View>
                  {x.sets.map((t, j) => (
                    <View key={j} style={[st.set, { marginTop: 8 }]}>
                      <T size={13} w="b" color={C.muted} center style={{ width: 22 }}>{j + 1}</T>
                      <TextInput value={t.w} onChangeText={(v) => setVal(i, j, 'w', v)} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={C.faint} style={[st.input, t.done && st.inputDone]} selectTextOnFocus accessibilityLabel={`${x.name} set ${j + 1} weight`} />
                      <TextInput value={t.r} onChangeText={(v) => setVal(i, j, 'r', v)} keyboardType="number-pad" style={[st.input, t.done && st.inputDone]} selectTextOnFocus accessibilityLabel={`${x.name} set ${j + 1} reps`} />
                      <Tap scale={0.85} onPress={() => toggleSet(i, j)} style={[st.check, t.done && { backgroundColor: C.ink, borderColor: C.ink }]} accessibilityRole="checkbox" accessibilityState={{ checked: t.done }} accessibilityLabel={`Set ${j + 1} done`}>
                        {t.done && <Check size={17} color={C.onInk} strokeWidth={2.6} />}
                      </Tap>
                    </View>
                  ))}
                  <Tap onPress={() => addSet(i)} style={st.addSet}><Plus size={14} color={C.muted} /><T size={12} w="s" color={C.muted}>Add set</T></Tap>
                </>
              )}
            </Card>
          );
        })}
        <Btn title="Add exercise or cardio" kind="ghost" icon={Plus} onPress={() => setAddOpen(true)} />
        <Btn title="Finish workout" icon={Flag} onPress={finish} />

        <Sheet open={addOpen} onClose={() => setAddOpen(false)} title="Add to this workout" subtitle="Only for today. Add it to the plan to keep it.">
          <TextInput value={add.name} onChangeText={(v) => setAdd({ ...add, name: v })} placeholder="e.g. Cable fly or Rowing machine" placeholderTextColor={C.faint} style={[st.input, { width: 'auto', flex: 0, textAlign: 'left', paddingHorizontal: 12, height: 48 }]} accessibilityLabel="Exercise name" />
          <Row gap={8}><Chip label="Strength" on={add.kind === 'strength'} onPress={() => setAdd({ ...add, kind: 'strength' })} /><Chip label="Cardio" on={add.kind === 'cardio'} onPress={() => setAdd({ ...add, kind: 'cardio' })} /></Row>
          {add.kind === 'cardio' && <Row gap={8}>{(['easy', 'moderate', 'hard'] as Intensity[]).map((v) => <Chip key={v} label={v[0].toUpperCase() + v.slice(1)} on={add.intensity === v} onPress={() => setAdd({ ...add, intensity: v })} />)}</Row>}
          <Btn title="Add" onPress={() => addExercise()} />
          <T size={12} w="s" color={C.muted} style={{ marginTop: 6 }}>OR PICK FROM THE LIBRARY</T>
          <ExercisePicker limit={10} onPick={(e) => addExercise({ name: e.name, kind: e.kind })} />
        </Sheet>
        <Sheet open={discardOpen} onClose={() => setDiscardOpen(false)} title="Discard this workout?" subtitle="Your logged sets won't be saved.">
          <Btn title="Discard workout" kind="danger" onPress={async () => { await cancelAlert(s.restId); setWorkout((w) => ({ ...w, session: null })); setDiscardOpen(false); goBack('/workouts'); }} />
          <Btn title="Keep going" kind="ghost" onPress={() => setDiscardOpen(false)} />
        </Sheet>
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  rec: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  kcal: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, backgroundColor: C.accentSoft },
  rest: { borderRadius: 20, backgroundColor: PASTEL[4][0], padding: 16 },
  restBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 99, backgroundColor: C.card },
  last: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, backgroundColor: C.soft },
  set: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { flex: 1, minWidth: 0, width: 0, height: 44, borderRadius: 12, borderWidth: 1, borderColor: C.field, backgroundColor: C.bg, textAlign: 'center', fontFamily: F.s, fontSize: 15, color: C.ink },
  colInput: { flex: 0, width: '100%' },
  inputDone: { backgroundColor: C.soft, borderColor: 'transparent' },
  check: { width: 40, height: 40, borderRadius: 12, borderWidth: 1.5, borderColor: C.field, alignItems: 'center', justifyContent: 'center' },
  addSet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: C.soft },
}));
