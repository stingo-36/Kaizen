import { Redirect, useRouter } from 'expo-router';
import { Bell, CheckCircle2, ChevronRight, Dumbbell, HeartPulse, ListChecks, Play, Sparkles, Utensils } from '@/components/ico';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/header';
import { HabitIcon } from '@/components/icons';
import { InsightCard } from '@/components/insight-card';
import { SpendCard } from '@/components/spend-card';
import { TrackerCard } from '@/components/tracker-card';
import { Btn, IconBtn, NavTile, Ring, Row, Screen, Sheet, T, Tap } from '@/components/ui';
import { kcalForPlanDay, logKcal } from '@/lib/calories';
import { fmtTime, today } from '@/lib/dates';
import { sumMacros, targets } from '@/lib/food';
import { useFood } from '@/lib/food-store';
import { useHealth } from '@/lib/health-store';
import { dayStreak, dueOn, isDone, isScheduled, PASTEL, pastel } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, themed, TY } from '@/lib/theme';
import { activePlan, nextDayIdx, weekLogs } from '@/lib/workout';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };

export default function Home() {
  const router = useRouter();
  const { user, me, habits, workout: W, profile } = useStore();
  const { food } = useFood();
  const health = useHealth();
  const [remOpen, setRemOpen] = useState(false);
  if (W.pending) return <Redirect href="/workout/done" />;

  const k = today(), name = (profile.name || user?.name || me || '').split(' ')[0];
  const due = dueOn(habits, k), done = due.filter((h) => isDone(h, k)).length;
  const reminders = habits.filter((h) => h.reminder && h.type === 'build' && isScheduled(h, k)).sort((a, b) => (a.reminder as string).localeCompare(b.reminder as string));
  const wl = weekLogs(W);
  const doneToday = W.logs.filter((l) => l.date === k);
  const plan = activePlan(W), nd = nextDayIdx(W, plan), day = plan?.days[nd];
  const est = day ? kcalForPlanDay(profile, day.exercises) : 0;
  const eaten = sumMacros(food.days[k] ?? []).kcal, goal = targets(profile).kcal;
  const pct = due.length ? done / due.length : 0;
  const steps = health.data.steps;

  return (
    <Screen tabs>
      <AppHeader title={name ? `Hi, ${name}` : greeting()}
        subtitle={`${greeting()} · ${new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}`}
        right={(
          <View>
            <IconBtn icon={Bell} label="Today's reminders" onPress={() => setRemOpen(true)} />
            {reminders.some((h) => !isDone(h, k)) && <View style={st.dot} />}
          </View>
        )} />

      {/* One main action: the workout for today */}
      {W.session ? (
        <Tap onPress={() => router.push('/workout/session')} style={st.hero}>
          <T size={13} color="rgba(255,255,255,0.9)">Workout in progress</T>
          <T size={22} w="b" color={C.white}>{W.plans.find((p) => p.id === W.session?.planId)?.days[W.session.day]?.title ?? 'Workout'}</T>
          <Btn title="Resume" kind="light" icon={Play} small onPress={() => router.push('/workout/session')} style={{ marginTop: 10, minHeight: 46 }} />
        </Tap>
      ) : doneToday.length ? (
        /* Today's training is finished: celebrate it instead of pointing at the next one */
        <Tap onPress={() => router.navigate('/workouts')} style={[st.hero, { backgroundColor: PASTEL[0][0] }]} accessibilityLabel="Today’s workout is done. Open workouts">
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={TY.sub} w="s" color={PASTEL[0][1]}>Today’s workout</T>
            <View style={[st.chip, { backgroundColor: C.glass }]}><T size={11} w="b" color={PASTEL[0][1]}>Done</T></View>
          </Row>
          <Row gap={10} style={{ marginTop: 8 }}>
            <CheckCircle2 size={26} color={PASTEL[0][1]} />
            <T size={TY.hero} w="b" color={PASTEL[0][1]} numberOfLines={1} style={{ flex: 1 }}>{doneToday[doneToday.length - 1].title}{doneToday.length > 1 ? ` +${doneToday.length - 1}` : ''}</T>
          </Row>
          <T size={TY.sub} color={PASTEL[0][1]} style={{ marginTop: 4, opacity: 0.85 }}>
            {doneToday.reduce((a, l) => a + l.duration, 0)} min · {doneToday.reduce((a, l) => a + logKcal(profile, l), 0)} kcal · nice work, rest up
          </T>
        </Tap>
      ) : plan && day ? (
        <View style={st.hero}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={13} color="rgba(255,255,255,0.9)">Today’s workout</T>
            <View style={st.chip}><T size={11} w="b" color={C.white}>≈ {est} kcal</T></View>
          </Row>
          <T size={22} w="b" color={C.white} style={{ marginTop: 4 }}>{day.title}</T>
          <T size={13} color="rgba(255,255,255,0.9)" numberOfLines={1}>{day.exercises.length} exercises · ~{profile.minutes} min</T>
          <Row gap={10} style={{ marginTop: 12 }}>
            <Btn title="View" kind="light" small onPress={() => router.push({ pathname: '/workout/plan', params: { id: plan.id, day: String(nd) } })} style={{ flex: 1, minHeight: 46 }} />
            <Btn title="Start" kind="light" icon={Play} small onPress={() => router.push({ pathname: '/workout/session', params: { day: String(nd), plan: plan.id } })} style={{ flex: 1, minHeight: 46 }} />
          </Row>
        </View>
      ) : (
        <Tap onPress={() => router.push('/workout/new')} style={[st.hero, { gap: 4 }]}>
          <Sparkles size={22} color={C.white} />
          <T size={20} w="b" color={C.white}>Create your workout plan</T>
          <T size={13} color="rgba(255,255,255,0.9)">Built from your profile, with cardio.</T>
        </Tap>
      )}

      {/* Sections: tap to open */}
      <View style={{ gap: 12 }}>
        <Row gap={12}>
          <NavTile icon={ListChecks} tone={PASTEL[0]} label="Habits" value={due.length ? `${done}/${due.length}` : '–'} sub={due.length ? `${dayStreak(habits)} day streak` : 'Add your first'} onPress={() => router.navigate('/habits')} />
          <NavTile icon={Dumbbell} tone={PASTEL[4]} label="Workouts" value={`${wl.length}/${profile.days}`} sub="this week" onPress={() => router.navigate('/workouts')} />
        </Row>
        <Row gap={12}>
          <NavTile icon={Utensils} tone={PASTEL[1]} label="Food" value={`${eaten}`} sub={`of ${goal} kcal`} onPress={() => router.navigate('/food')} />
          <NavTile icon={HeartPulse} tone={PASTEL[2]} label="Google Fit"
            value={steps != null ? steps.toLocaleString() : 'Connect'}
            sub={steps != null ? 'steps today' : 'Sleep, steps, heart rate'} onPress={() => router.push('/health')} />
        </Row>
      </View>

      <SpendCard />
      <TrackerCard />

      {/* Habits ring as a quick progress line */}
      {due.length > 0 && (
        <Tap onPress={() => router.navigate('/habits')} style={st.row}>
          <Ring value={pct} size={44} stroke={5} color={PASTEL[0][1]}><T size={11} w="b">{Math.round(pct * 100)}%</T></Ring>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={15} w="s">{done === due.length ? 'All habits done' : `${due.length - done} habit${due.length - done > 1 ? 's' : ''} left today`}</T>
            <T size={12} color={C.muted} numberOfLines={1}>{due.filter((h) => !isDone(h, k)).map((h) => h.name).join(', ') || 'Nice work'}</T>
          </View>
          <ChevronRight size={18} color={C.faint} />
        </Tap>
      )}

      <InsightCard />

      <Sheet open={remOpen} onClose={() => setRemOpen(false)} title="Today's reminders">
        {reminders.length ? reminders.map((h) => {
          const [bg, ink] = pastel(h);
          return (
            <Row key={h.id} style={{ paddingVertical: 6 }}>
              <View style={[st.ic, { backgroundColor: bg, borderRadius: 12 }]}><HabitIcon index={h.icon} color={ink} size={18} /></View>
              <View style={{ flex: 1, minWidth: 0 }}><T size={15} w="s">{h.name}</T><T size={13} color={C.muted}>{fmtTime(h.reminder as string)}</T></View>
              {isDone(h, k) && <T size={12} w="b" color={C.green}>Done</T>}
            </Row>
          );
        }) : <T size={14} color={C.muted}>No reminders set for today. Turn one on when you add or edit a habit.</T>}
        <Btn title="Close" kind="ghost" onPress={() => setRemOpen(false)} />
      </Sheet>
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  dot: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent, borderWidth: 2, borderColor: C.bg },
  hero: { borderRadius: 24, padding: 20, backgroundColor: C.accent },
  chip: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.24)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  ic: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
}));
