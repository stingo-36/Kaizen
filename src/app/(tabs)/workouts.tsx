import { Redirect, useRouter } from 'expo-router';
import { BookOpen, CheckCircle2, ChevronRight, Dumbbell, Flame, HeartPulse, Play, Plus, Scale, Sparkles } from '@/components/ico';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { BarChart } from '@/components/charts';
import { AppHeader } from '@/components/header';
import { InsightCard } from '@/components/insight-card';
import { PagerScreen } from '@/components/pager';
import { Btn, Card, LinkRow, Row, SectionTitle, Sheet, Stat, T, Tap, useToast } from '@/components/ui';
import { kcalForPlanDay, logKcal } from '@/lib/calories';
import { addDays, mondayOf, parse, today, WEEK, ymd } from '@/lib/dates';
import { PASTEL } from '@/lib/habits';
import { missingDetails } from '@/lib/profile';
import { useStore } from '@/lib/store';
import { C, F, themed, toneOf, TY } from '@/lib/theme';
import { activePlan, logVolume, nextDayIdx, prCount, weekLogs } from '@/lib/workout';

export default function Workouts() {
  // The blue Today card is this tab's one featured card.
  const router = useRouter();
  const toast = useToast();
  const { workout: W, profile, setProfile } = useStore();
  const [wOpen, setWOpen] = useState(false);
  const [wVal, setWVal] = useState('');
  const [showAll, setShowAll] = useState(false);
  if (W.pending) return <Redirect href="/workout/done" />;

  const plan = activePlan(W), k = today();
  const wk = weekLogs(W);
  const doneToday = W.logs.filter((l) => l.date === k);
  const kcalToday = W.logs.filter((l) => l.date === k).reduce((a, l) => a + logKcal(profile, l), 0);
  const kcalWeek = wk.reduce((a, l) => a + logKcal(profile, l), 0);
  const kcalAll = W.logs.reduce((a, l) => a + logKcal(profile, l), 0);
  const volWeek = wk.reduce((a, l) => a + logVolume(l), 0);
  const mon = mondayOf();
  const dayKcal = Array.from({ length: 7 }, (_, i) => { const dk = ymd(addDays(mon, i)); return dk > k ? null : W.logs.filter((l) => l.date === dk).reduce((a, l) => a + logKcal(profile, l), 0); });
  const maxK = Math.max(100, ...dayKcal.map((v) => v ?? 0));
  const wl = profile.weightLog, first = wl[0]?.kg, delta = profile.weightKg && first ? +(profile.weightKg - first).toFixed(1) : 0;
  const nd = nextDayIdx(W, plan), day = plan?.days[nd];
  const estKcal = day ? kcalForPlanDay(profile, day.exercises) : 0;
  const missing = missingDetails(profile);
  const openDay = (i: number) => plan && router.push({ pathname: '/workout/plan', params: { id: plan.id, day: String(i) } });

  const saveWeight = () => {
    const v = parseFloat(wVal.replace(',', '.'));
    if (!(v >= 30 && v <= 300)) return toast('Enter a weight between 30 and 300 kg');
    setProfile((p) => ({ ...p, weightKg: v, weightLog: [...p.weightLog.filter((x) => x.date !== k), { date: k, kg: v }] }));
    setWOpen(false); toast('Weight updated');
  };

  /* ---------- Today: the next workout and the week's days ---------- */
  const todayPage = () => (
    <>
      {missing.length > 0 && (
        <Tap onPress={() => router.push('/profile')} style={[st.card, { backgroundColor: C.accentTint, borderColor: 'transparent' }]}>
          <T size={14} w="s">Add your {missing.join(', ')} in Profile</T>
          <T size={13} color={C.muted}>Needed for accurate calories and AI plans.</T>
        </Tap>
      )}
      {plan && plan.days.length !== profile.days && !W.session && (
        <Tap onPress={() => router.push('/workout/new')} style={[st.card, { backgroundColor: C.accentTint, borderColor: 'transparent' }]}>
          <T size={14} w="s">Your plan has {plan.days.length} days, but you train {profile.days} days a week</T>
          <T size={13} w="s" color={C.accent} style={{ marginTop: 2 }}>Build a {profile.days}-day plan</T>
        </Tap>
      )}
      {W.session ? (
        <View style={st.hero}>
          <T size={11} w="s" color={C.accentInk} style={st.label}>Workout in progress</T>
          <T size={20} w="b" color={C.accentInk}>{plan?.days[W.session.day]?.title ?? 'Workout'}</T>
          <Btn title="Resume workout" icon={Play} onPress={() => router.push('/workout/session')} style={{ marginTop: 12, minHeight: 48 }} />
        </View>
      ) : doneToday.length ? (
        <View style={st.hero}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={11} w="s" color={C.accentInk} style={st.label}>Today’s workout</T>
            <View style={st.chip}><T size={11} w="b" color={C.accentInk}>Done</T></View>
          </Row>
          <Row gap={10} style={{ marginTop: 8 }}>
            <CheckCircle2 size={26} color={C.accentInk} />
            <T size={TY.hero} w="b" color={C.accentInk} numberOfLines={1} style={{ flex: 1 }}>{doneToday[doneToday.length - 1].title}{doneToday.length > 1 ? ` +${doneToday.length - 1}` : ''}</T>
          </Row>
          <T size={TY.sub} color={C.accentInk} style={{ marginTop: 4 }}>
            {doneToday.reduce((a, l) => a + l.duration, 0)} min · {kcalToday} kcal burned. Recover well, see you next session.
          </T>
        </View>
      ) : plan && day ? (
        <View style={st.hero}>
          <Row style={{ justifyContent: 'space-between' }}>
            <T size={11} w="s" color={C.accentInk} style={st.label}>Today · Day {nd + 1} of {plan.days.length}</T>
            <View style={st.chip}><T size={11} w="b" color={C.accentInk}>≈ {estKcal} kcal</T></View>
          </Row>
          <T size={TY.hero} w="b" color={C.accentInk} style={{ marginTop: 6 }}>{day.title}</T>
          <T size={13} color={C.accentInk} numberOfLines={1}>{day.exercises.length} exercises · ~{profile.minutes} min</T>
          <Row gap={10} style={{ marginTop: 14 }}>
            <Btn title="Open workout" kind="light" small onPress={() => openDay(nd)} style={{ flex: 1, minHeight: 46 }} />
            <Btn title="Start" icon={Play} small onPress={() => router.push({ pathname: '/workout/session', params: { day: String(nd), plan: plan.id } })} style={{ flex: 1, minHeight: 46 }} />
          </Row>
        </View>
      ) : (
        <View style={[st.hero, { gap: 8 }]}>
          <View style={st.heroIc}><Sparkles size={22} color={C.accentInk} /></View>
          <T size={20} w="b" color={C.accentInk}>Create your first plan</T>
          <T size={14} color={C.accentInk}>Your AI coach builds a weekly plan with strength and cardio from your profile.</T>
          <Btn title="Create a plan" kind="light" icon={Sparkles} onPress={() => router.push('/workout/new')} style={{ marginTop: 6 }} />
        </View>
      )}

      <View style={[st.card, { gap: 10, paddingVertical: 12 }]}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={11} w="s" color={C.muted} style={st.label}>This week</T>
          <T size={12} color={C.muted}>{wk.length} of {profile.days} done</T>
        </Row>
        <Row gap={2}>
          {WEEK.map((w, i) => {
            const dk = ymd(addDays(mon, i)), did = W.logs.some((l) => l.date === dk), isT = dk === k;
            return (
              <View key={w + i} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${w}: ${did ? 'trained' : isT ? 'today' : 'no workout'}`}>
                <View style={[st.wday, did ? { backgroundColor: PASTEL[0][0] } : isT ? { borderWidth: 2, borderColor: C.accent } : { borderWidth: 1.5, borderColor: C.faint, borderStyle: 'dashed' }]}>
                  {did ? <CheckCircle2 size={15} color={PASTEL[0][1]} /> : null}
                </View>
                <T size={11} w="s" color={isT ? C.ink : C.muted}>{w}</T>
              </View>
            );
          })}
        </Row>
      </View>

      <InsightCard compact />
      {plan && (
        <View style={{ gap: 12 }}>
          <SectionTitle title="This week's workouts" />
          {plan.days.map((d, i) => {
            const cardio = d.exercises.every((e) => e.kind === 'cardio');
            return (
              <LinkRow key={d.title + i} icon={cardio ? HeartPulse : Dumbbell} tone={toneOf(i + 1)} title={d.title}
                sub={`${d.exercises.length} exercises${i === nd && !doneToday.length ? ' · today' : ''}`} onPress={() => openDay(i)} />
            );
          })}
        </View>
      )}

      <Row gap={12}>
        <Stat label="This week" value={`${wk.length}/${profile.days}`} unit=" done" tone={PASTEL[0]} />
        <Stat label="Burned today" value={kcalToday} unit=" kcal" tone={PASTEL[1]} />
      </Row>
    </>
  );

  /* ---------- Plans and the exercise library ---------- */
  const plansPage = () => (
    <>
      <LinkRow icon={BookOpen} tone={PASTEL[4]} title="Exercise library" sub="Search 870+ exercises with how-to steps" onPress={() => router.push('/workout/library')} />
      <SectionTitle title="My plans" action="+ New plan" onAction={() => router.push('/workout/new')} />
      {W.plans.length ? W.plans.map((p) => (
        <Tap key={p.id} onPress={() => router.push({ pathname: '/workout/plan', params: { id: p.id } })} style={[st.card, st.planRow]}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Row gap={8}>
              <T size={15} w="s" numberOfLines={1} style={{ flexShrink: 1 }}>{p.name}</T>
              {p.id === plan?.id && <View style={st.active}><T size={11} w="b" color={PASTEL[0][1]}>Active</T></View>}
            </Row>
            <T size={12} color={C.muted} numberOfLines={1}>{p.days.length} days · {p.days.reduce((a, d) => a + d.exercises.length, 0)} exercises</T>
          </View>
          <ChevronRight size={18} color={C.faint} />
        </Tap>
      )) : <Btn title="Create a plan" icon={Sparkles} onPress={() => router.push('/workout/new')} />}
      {W.plans.length > 0 && <Btn title="New plan" kind="ghost" icon={Plus} onPress={() => router.push('/workout/new')} />}
    </>
  );

  /* ---------- Progress: weight, calories, recent sessions ---------- */
  const recent = W.logs.slice().reverse().slice(0, showAll ? 20 : 3);
  const progressPage = () => (
    <>
      <Tap onPress={() => { setWVal(profile.weightKg ? String(profile.weightKg) : ''); setWOpen(true); }} style={[st.card, st.weight]} accessibilityLabel="Update your weight">
        <View style={[st.ic, { backgroundColor: PASTEL[2][0] }]}><Scale size={18} color={PASTEL[2][1]} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={12} color={C.muted}>Current weight</T>
          <T size={24} w="s">{profile.weightKg ? `${profile.weightKg}` : '–'}<T size={13} color={C.muted}> kg</T></T>
          {delta !== 0 && <T size={12} w="s" color={delta < 0 ? C.green : C.accent}>{delta > 0 ? '+' : ''}{delta} kg since {parse(wl[0].date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</T>}
        </View>
        <T size={13} w="s" color={C.accent}>Update</T>
      </Tap>
      <Row gap={12}>
        <Stat label="This week" value={kcalWeek} unit=" kcal" tone={PASTEL[0]} />
        <Stat label="All time" value={kcalAll >= 10000 ? `${(kcalAll / 1000).toFixed(1)}k` : kcalAll} unit=" kcal" tone={PASTEL[1]} />
      </Row>
      <Row gap={12}>
        <Stat label="Volume" value={(volWeek / 1000).toFixed(1)} unit=" t wk" tone={PASTEL[2]} />
        <Stat label="PRs" value={prCount(W)} tone={PASTEL[3]} />
        <Stat label="Sessions" value={W.logs.length} tone={PASTEL[4]} />
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={6}><Flame size={16} color={C.accent} /><T size={16} w="s">Calories burned</T></Row>
          <T size={13} color={C.muted}>{kcalWeek} kcal</T>
        </Row>
        {kcalWeek ? <View style={{ marginTop: 10 }}><BarChart values={dayKcal} labels={WEEK} highlight={(new Date().getDay() + 6) % 7} max={Math.ceil(maxK / 100) * 100} suffix=" kcal" /></View>
          : <T size={13} color={C.muted} style={{ marginTop: 8 }}>No workouts yet this week.</T>}
      </Card>
      {W.logs.length > 0 && (
        <View style={{ gap: 12 }}>
          <SectionTitle title="Recent sessions" action={W.logs.length > 3 ? (showAll ? 'Show less' : 'Show all') : undefined} onAction={() => setShowAll(!showAll)} />
          {recent.map((l) => (
            <Card key={l.id} style={{ paddingVertical: 12 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T size={15} w="s" numberOfLines={1} style={{ flex: 1 }}>{l.title}</T>
                <T size={12} color={C.muted}>{parse(l.date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })}</T>
              </Row>
              <T size={12} color={C.muted} style={{ marginTop: 2 }}>{l.duration} min · {logKcal(profile, l)} kcal{l.prs.length ? ` · ${l.prs.length} PR` : ''}</T>
            </Card>
          ))}
        </View>
      )}
    </>
  );

  return (
    <>
      <PagerScreen tabs header={<AppHeader title="Workouts" subtitle={plan ? plan.name : 'No plan yet'} />}
        pages={[{ key: 'today', label: 'Today', render: todayPage }, { key: 'plans', label: 'Plans', render: plansPage }, { key: 'progress', label: 'Progress', render: progressPage }]} />
      <Sheet open={wOpen} onClose={() => setWOpen(false)} title="Update your weight" subtitle="Used for calorie estimates and your progress.">
        <View style={st.wInput}>
          <TextInput value={wVal} onChangeText={setWVal} keyboardType="decimal-pad" placeholder="72.5" placeholderTextColor={C.faint} style={st.wText} autoFocus accessibilityLabel="Weight in kilograms" />
          <T size={15} color={C.muted}>kg</T>
        </View>
        <Btn title="Save weight" onPress={saveWeight} />
      </Sheet>
    </>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 20, padding: 14 },
  label: { letterSpacing: 0.6, textTransform: 'uppercase' },
  wday: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  weight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ic: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  hero: { borderRadius: 26, padding: 20, backgroundColor: C.accentSoft },
  heroIc: { width: 44, height: 44, borderRadius: 14, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.card },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  active: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: 99, backgroundColor: PASTEL[0][0] },
  wInput: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.soft },
  wText: { flex: 1, minWidth: 0, width: 0, fontFamily: F.s, fontSize: 22, color: C.ink },
}));
