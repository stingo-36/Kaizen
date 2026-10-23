import { Redirect, useRouter } from 'expo-router';
import { Bell, CheckCircle2, Dumbbell, Flame, HeartPulse, LucideIcon, Play, Sparkles, Wallet } from '@/components/ico';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/header';
import { HabitIcon } from '@/components/icons';
import { InsightCard } from '@/components/insight-card';
import { RecentResourcesCard } from '@/components/resources';
import { TrackerCard } from '@/components/tracker-card';
import { Btn, IconBtn, Ring, Row, Screen, Sheet, T, Tap } from '@/components/ui';
import { kcalForPlanDay, logKcal } from '@/lib/calories';
import { fmtTime, today } from '@/lib/dates';
import { sumMacros, targets } from '@/lib/food';
import { useFood } from '@/lib/food-store';
import { useHealth } from '@/lib/health-store';
import { dayStreak, dueOn, isDone, isScheduled, PASTEL, pastel } from '@/lib/habits';
import { inr, thisMonth } from '@/lib/spend';
import { useSpend } from '@/lib/spend-store';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';
import { activePlan, nextDayIdx } from '@/lib/workout';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const STEP_GOAL = 8000;
const hm = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

const ON_ACCENT = C.accentInk;
/** One ring on the blue "Your day" card. */
function DayRing({ value, text, label, onPress }: { value: number; text: string; label: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} scale={0.94} style={{ flex: 1, alignItems: 'center', gap: 8 }} accessibilityLabel={`${label}: ${text}. Open`}>
      <Ring value={value} size={58} stroke={6} gradient={[C.accent, C.accent2]} track={C.card}><T size={13} w="b" color={C.accentInk}>{text}</T></Ring>
      <T size={12} w="m" color={ON_ACCENT}>{label}</T>
    </Tap>
  );
}

/** Small coloured tile: icon + label, a big value and one line under it. */
function Tile({ tone, icon: Icon, label, value, sub, onPress }: { tone: [string, string]; icon: LucideIcon; label: string; value: string; sub: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={[st.tile, { backgroundColor: tone[0] }]} accessibilityLabel={`${label}: ${value}, ${sub}. Open`}>
      <Row gap={8}><View style={st.tileIc}><Icon size={13} color={tone[1]} /></View><T size={12} w="s" color={tone[1]}>{label}</T></Row>
      <View style={{ gap: 2 }}>
        <T size={20} w="b" color={tone[1]} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
        <T size={12} color={tone[1]} numberOfLines={1} style={{ opacity: 0.85 }}>{sub}</T>
      </View>
    </Tap>
  );
}

export default function Home() {
  const router = useRouter();
  const { user, me, habits, workout: W, profile } = useStore();
  const { food } = useFood();
  const health = useHealth();
  const spend = useSpend();
  const [remOpen, setRemOpen] = useState(false);
  if (W.pending) return <Redirect href="/workout/done" />;

  const k = today(), name = (profile.name || user?.name || me || '').split(' ')[0];
  const due = dueOn(habits, k), done = due.filter((h) => isDone(h, k)).length;
  const reminders = habits.filter((h) => h.reminder && h.type === 'build' && isScheduled(h, k)).sort((a, b) => (a.reminder as string).localeCompare(b.reminder as string));
  const doneToday = W.logs.filter((l) => l.date === k);
  const minsToday = doneToday.reduce((a, l) => a + l.duration, 0);
  const plan = activePlan(W), nd = nextDayIdx(W, plan), day = plan?.days[nd];
  const est = day ? kcalForPlanDay(profile, day.exercises) : 0;
  const eaten = sumMacros(food.days[k] ?? []).kcal, goal = targets(profile).kcal;
  const { steps, sleepMin, restingHr } = health.data;
  const month = spend.summaries[thisMonth()];
  // Workouts are the coral area; the blue "Your day" card is this screen's one featured card.
  const [wBg, wInk] = PASTEL[4];
  const rings = [
    due.length ? done / due.length : 0, profile.minutes ? minsToday / profile.minutes : 0, goal ? eaten / goal : 0, steps != null ? steps / STEP_GOAL : 0,
  ].map((v) => Math.min(1, v));
  const score = Math.round((rings.reduce((a, v) => a + v, 0) / (steps != null ? 4 : 3)) * 100);
  const streak = dayStreak(habits);

  return (
    <Screen tabs>
      <AppHeader title={name ? `Hi, ${name}` : greeting()}
        subtitle={new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
        right={(
          <View>
            <IconBtn icon={Bell} label="Today's reminders" onPress={() => setRemOpen(true)} />
            {reminders.some((h) => !isDone(h, k)) && <View style={st.dot} />}
          </View>
        )} />

      <View style={st.day}>
        <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ gap: 2 }}>
            <T size={13} w="m" color={ON_ACCENT}>Your day</T>
            <Row gap={6} style={{ alignItems: 'flex-end' }}>
              <T size={40} w="b" color={C.accentInk} style={{ lineHeight: 44 }}>{score}%</T>
              <T size={13} w="m" color={ON_ACCENT} style={{ marginBottom: 7 }}>done</T>
            </Row>
          </View>
          {streak > 0 && (
            <View style={st.streak}><Flame size={14} color={C.accent} /><T size={12.5} w="s" color={C.accentInk}>{streak}-day streak</T></View>
          )}
        </Row>
        <Row gap={6} style={{ alignItems: 'flex-start' }}>
          <DayRing value={rings[0]} text={due.length ? `${done}/${due.length}` : '–'} label="Habits" onPress={() => router.navigate('/habits')} />
          <DayRing value={rings[1]} text={`${minsToday}m`} label="Workout" onPress={() => router.navigate('/workouts')} />
          <DayRing value={rings[2]} text={goal ? `${Math.round((eaten / goal) * 100)}%` : '–'} label="Food" onPress={() => router.navigate('/food')} />
          <DayRing value={rings[3]} text={steps == null ? '–' : steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : `${steps}`} label="Steps" onPress={() => router.push('/health')} />
        </Row>
      </View>

      {W.session ? (
        <View style={[st.hero, { backgroundColor: wBg }]}>
          <T size={11} w="s" color={wInk} style={st.label}>Workout in progress</T>
          <T size={20} w="b" color={wInk}>{W.plans.find((p) => p.id === W.session?.planId)?.days[W.session.day]?.title ?? 'Workout'}</T>
          <Btn title="Resume" icon={Play} small onPress={() => router.push('/workout/session')} style={{ minHeight: 42 }} />
        </View>
      ) : doneToday.length ? (
        <Tap onPress={() => router.navigate('/workouts')} style={[st.hero, { backgroundColor: wBg }]} accessibilityLabel="Today’s workout is done. Open workouts">
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={11} w="s" color={wInk} style={st.label}>Today’s workout</T>
            <View style={st.chip}><T size={11} w="b" color={wInk}>Done</T></View>
          </Row>
          <Row gap={10}>
            <CheckCircle2 size={24} color={wInk} />
            <T size={20} w="b" color={wInk} numberOfLines={1} style={{ flex: 1 }}>{doneToday[doneToday.length - 1].title}{doneToday.length > 1 ? ` +${doneToday.length - 1}` : ''}</T>
          </Row>
          <T size={13} color={wInk}>{minsToday} min · {doneToday.reduce((a, l) => a + logKcal(profile, l), 0)} kcal · nice work, rest up</T>
        </Tap>
      ) : plan && day ? (
        <View style={st.next}>
          <Row gap={14}>
            <View style={[st.nextIc, { backgroundColor: wBg }]}><Dumbbell size={24} color={wInk} /></View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={12.5} w="m" color={C.muted} numberOfLines={1}>Up next · {profile.minutes} min</T>
              <T size={20} w="b" numberOfLines={1}>{day.title}</T>
            </View>
            <View style={[st.chip, { backgroundColor: C.accentTint }]}><T size={12} w="s" color={C.accent}>≈ {est} kcal</T></View>
          </Row>
          <Row gap={10}>
            <Btn title="View" kind="ghost" small onPress={() => router.push({ pathname: '/workout/plan', params: { id: plan.id, day: String(nd) } })} style={{ flex: 1, minHeight: 44 }} />
            <Btn title="Start" icon={Play} small onPress={() => router.push({ pathname: '/workout/session', params: { day: String(nd), plan: plan.id } })} style={{ flex: 1, minHeight: 44 }} />
          </Row>
        </View>
      ) : (
        <Tap onPress={() => router.push('/workout/new')} style={[st.hero, { backgroundColor: wBg }]}>
          <Sparkles size={20} color={wInk} />
          <T size={20} w="b" color={wInk}>Create your workout plan</T>
          <T size={13} color={wInk}>Built from your profile, with cardio.</T>
        </Tap>
      )}

      {/* Tiles follow the fixed pastel order: first green, then amber. */}
      <Row gap={12} style={{ alignItems: 'stretch' }}>
        <Tile tone={PASTEL[0]} icon={Wallet} label="Spend" onPress={() => router.navigate('/spendwise')}
          value={month ? inr(month.totalSpend) : spend.status === 'on' ? '–' : 'Connect'}
          sub={month ? `${inr(month.todaySpend)} spent today` : 'SpendWise'} />
        <Tile tone={PASTEL[1]} icon={HeartPulse} label="Google Fit" onPress={() => router.push('/health')}
          value={sleepMin != null ? hm(sleepMin) : steps != null ? steps.toLocaleString() : 'Connect'}
          sub={sleepMin != null ? `sleep${restingHr != null ? ` · ${restingHr} bpm resting` : ''}` : steps != null ? 'steps today' : 'Sleep, steps, heart rate'} />
      </Row>

      <TrackerCard />
      <RecentResourcesCard />
      <InsightCard />

      <Sheet open={remOpen} onClose={() => setRemOpen(false)} title="Today's reminders">
        {reminders.length ? reminders.map((h) => (
          <Row key={h.id} style={{ paddingVertical: 6 }}>
            <View style={[st.ic, { backgroundColor: pastel(h)[0] }]}><HabitIcon index={h.icon} color={pastel(h)[1]} size={18} /></View>
            <View style={{ flex: 1, minWidth: 0 }}><T size={15} w="s">{h.name}</T><T size={13} color={C.muted}>{fmtTime(h.reminder as string)}</T></View>
            {isDone(h, k) && <T size={12} w="b" color={C.green}>Done</T>}
          </Row>
        )) : <T size={14} color={C.muted}>No reminders set for today. Turn one on when you add or edit a habit.</T>}
        <Btn title="Close" kind="ghost" onPress={() => setRemOpen(false)} />
      </Sheet>
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  dot: { position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: 5, backgroundColor: C.accent, borderWidth: 2, borderColor: C.bg },
  day: { gap: 18, padding: 20, borderRadius: 26, backgroundColor: C.accentSoft },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.card },
  next: { gap: 16, padding: 18, borderRadius: 22, backgroundColor: C.card },
  nextIc: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { letterSpacing: 0.6, textTransform: 'uppercase' },
  hero: { borderRadius: 22, padding: 18, gap: 14 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.card },
  tile: { flex: 1, minWidth: 0, minHeight: 120, borderRadius: 20, padding: 16, gap: 14, justifyContent: 'space-between' },
  tileIc: { width: 26, height: 26, borderRadius: 13, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  ic: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
}));
