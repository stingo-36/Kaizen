import { Redirect, useRouter } from 'expo-router';
import { Bell, CheckCircle2, Dumbbell, Flame, HeartPulse, Footprints, ListChecks, LucideIcon, Play, Sparkles, Wallet } from '@/components/ico';
import { ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/header';
import { HabitIcon } from '@/components/icons';
import { InsightCard } from '@/components/insight-card';
import { RecentResourcesCard } from '@/components/resources';
import { TrackerCard } from '@/components/tracker-card';
import { Bar, Btn, Card, FeatureCard, IconBtn, Ring, Row, Screen, SectionTitle, Sheet, T, Tap } from '@/components/ui';
import { kcalForPlanDay, logKcal } from '@/lib/calories';
import { fmtTime, today } from '@/lib/dates';
import { sumMacros, targets } from '@/lib/food';
import { useFood } from '@/lib/food-store';
import { useHealth } from '@/lib/health-store';
import { dayStreak, dueOn, isDone, isScheduled, PASTEL, pastel } from '@/lib/habits';
import { homeLayout, type HomeCardId } from '@/lib/planning';
import { inr, thisMonth } from '@/lib/spend';
import { useSpend } from '@/lib/spend-store';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';
import { activePlan, nextDayIdx } from '@/lib/workout';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
const STEP_GOAL = 8000;
const hm = (min: number) => `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;

/** Small coloured tile: icon + label, a big value and one line under it. */
function Tile({ tone, icon: Icon, label, value, sub, onPress }: { tone: [string, string]; icon: LucideIcon; label: string; value: string; sub: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={st.tile} accessibilityLabel={`${label}: ${value}, ${sub}. Open`}>
      <Row gap={8}><View style={[st.tileIc, { backgroundColor: tone[0] }]}><Icon size={13} color={tone[1]} /></View><T size={12} w="s" color={tone[1]}>{label}</T></Row>
      <View style={{ gap: 2 }}>
        <T size={20} w="b" color={C.ink} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
        <T size={12} color={C.muted} numberOfLines={1}>{sub}</T>
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
  // Warm sand complements the soft-black daily overview.
  const [wBg, wInk] = [C.lavender, C.lavenderInk];
  const rings = [
    due.length ? done / due.length : 0, profile.minutes ? minsToday / profile.minutes : 0, goal ? eaten / goal : 0, steps != null ? steps / STEP_GOAL : 0,
  ].map((v) => Math.min(1, v));
  const score = Math.round((rings.reduce((a, v) => a + v, 0) / (steps != null ? 4 : 3)) * 100);
  const streak = dayStreak(habits);

  const layout = homeLayout(profile.homeLayout);
  const cards: Record<HomeCardId, ReactNode> = {
    overview: (<>
      <FeatureCard>
        <Row gap={14} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 125, gap: 9 }}>
            <T size={10} w="s" color={C.heroMuted} style={st.label}>Today’s overview</T>
            <T size={21} w="s" color={C.white}>You’re building momentum.</T>
            <T size={12} color={C.heroMuted}>One good choice at a time.</T>
          </View>
          <Ring value={score / 100} size={108} stroke={8} color={C.heroMuted} track="rgba(255,255,255,0.18)">
            <T size={28} w="s" color={C.white}>{score}%</T>
            <T size={10} color={C.heroMuted}>daily progress</T>
          </Ring>
        </Row>
        <Row style={st.overviewFoot}>
          <Row gap={6} style={{ flexShrink: 1 }}><Flame size={14} color={C.heroMuted} /><T size={12} color={C.heroMuted} style={{ flexShrink: 1 }}>{streak ? `${streak}-day streak` : 'A little better, every day'}</T></Row>
          <T size={11} color={C.heroMuted}>{minsToday}m training</T>
        </Row>
      </FeatureCard>

    </>),
    snapshot: (<>
      <SectionTitle title="Your daily snapshot" />
      <Row gap={12} style={{ alignItems: 'stretch' }}>
        <Tap style={st.snapshot} onPress={() => router.navigate('/habits')} accessibilityLabel={`Habits: ${done} of ${due.length} complete. Open habits`}>
          <View style={[st.tileIc, { backgroundColor: C.accentTint }]}><ListChecks size={17} color={C.accent} /></View>
          <T size={25} w="s">{done}<T size={13} color={C.muted}> / {due.length}</T></T>
          <T size={12} color={C.muted}>Habits complete</T>
          <Bar value={due.length ? done / due.length : 0} height={5} />
        </Tap>
        <Tap style={st.snapshot} onPress={() => router.push('/health')} accessibilityLabel={`Steps: ${steps == null ? 'Connect Health Connect' : steps}. Open health`}>
          <View style={[st.tileIc, { backgroundColor: C.lavender }]}><Footprints size={17} color={C.lavenderInk} /></View>
          <T size={25} w="s">{steps == null ? '–' : steps.toLocaleString()}</T>
          <T size={12} color={C.muted}>{steps == null ? 'Connect your steps' : 'Steps today'}</T>
          <Bar value={steps == null ? 0 : steps / STEP_GOAL} height={5} color={C.lavenderInk} />
        </Tap>
      </Row>

    </>),
    workout: (<>
      <SectionTitle title="Your next session" action={plan ? 'View plan' : undefined} onAction={() => plan && router.push({ pathname: '/workout/plan', params: { id: plan.id } })} />
      {W.session ? (
        <View style={[st.hero, { backgroundColor: wBg }]}>
          <T size={11} w="s" color={wInk} style={st.label}>Workout in progress</T>
          <T size={20} w="b" color={wInk}>{W.plans.find((p) => p.id === W.session?.planId)?.days[W.session.day]?.title ?? 'Workout'}</T>
          <Btn title="Resume" icon={Play} small onPress={() => router.push('/workout/session')} style={{ minHeight: 42 }} />
        </View>
      ) : profile.restDays?.includes(k) ? (
        <Card style={{ backgroundColor: C.lavender, gap: 8 }}><T size={20} w="s">Recovery day</T><T color={C.muted}>Rest or gentle movement is on today’s plan.</T><Btn title="Review today’s plan" small kind="ghost" onPress={() => router.push('/day')} /></Card>
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

    </>),
    integrations: (<>
      {/* Neutral metric cards with restrained icon accents. */}
      <Row gap={12} style={{ alignItems: 'stretch' }}>
        <Tile tone={PASTEL[0]} icon={Wallet} label="Spend" onPress={() => router.navigate('/spendwise')}
          value={month ? inr(month.totalSpend) : spend.status === 'on' ? '–' : 'Connect'}
          sub={month ? `${inr(month.todaySpend)} spent today` : 'SpendWise'} />
        <Tile tone={PASTEL[1]} icon={HeartPulse} label="Google Fit" onPress={() => router.push('/health')}
          value={sleepMin != null ? hm(sleepMin) : steps != null ? steps.toLocaleString() : 'Connect'}
          sub={sleepMin != null ? `sleep${restingHr != null ? ` · ${restingHr} bpm resting` : ''}` : steps != null ? 'steps today' : 'Sleep, steps, heart rate'} />
      </Row>

    </>),
    tracker: (<>
      <TrackerCard />
    </>),
    resources: (<>
      <RecentResourcesCard />
    </>),
    insight: (<>
      <InsightCard />

    </>),
  };

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

      {layout.order.filter((id) => !layout.hidden.includes(id)).map((id) => <View key={id} style={{ gap: 14 }}>{cards[id]}</View>)}

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
  overviewFoot: { justifyContent: 'space-between', paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.18)', flexWrap: 'wrap' },
  snapshot: { flex: 1, minWidth: 0, gap: 8, padding: 16, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  next: { gap: 16, padding: 18, borderRadius: 22, backgroundColor: C.lavender },
  nextIc: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  label: { letterSpacing: 0.6, textTransform: 'uppercase' },
  hero: { borderRadius: 22, padding: 18, gap: 14 },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.card },
  tile: { flex: 1, minWidth: 0, minHeight: 120, borderRadius: 20, padding: 16, gap: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, justifyContent: 'space-between' },
  tileIc: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  ic: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
}));
