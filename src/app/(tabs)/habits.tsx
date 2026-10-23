import { useRouter } from 'expo-router';
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, Flame, Moon, Plus, Sun, Sunrise } from '@/components/ico';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BarChart, LineChart } from '@/components/charts';
import { HabitCard, HabitLinkRow } from '@/components/habit-card';
import { AppHeader } from '@/components/header';
import { Item } from '@/components/motion';
import { PagerScreen } from '@/components/pager';
import { HabitIcon } from '@/components/icons';
import { Bar, Btn, Card, IconBtn, Label, Ring, Row, Screen, SectionTitle, Stat, T, Tap, haptic } from '@/components/ui';
import { addDays, DAY_NAMES, fmtShort, monIndex, mondayOf, parse, today, WEEK, ymd } from '@/lib/dates';
import { bestStreak, cleanDays, dayStreak, dueOn, Habit, isDone, nextMilestone, PASTEL, pastel, rate, streak, totalDone, weekData } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';
import { useHabitActions } from '@/lib/useHabitActions';

const PARTS = [['morning', 'Morning', Sunrise], ['afternoon', 'Afternoon', Sun], ['evening', 'Evening', Moon], ['anytime', 'Anytime', Clock]] as const;
const partOf = (h: Habit) => { if (!h.reminder) return 'anytime'; const hr = +h.reminder.slice(0, 2); return hr < 12 ? 'morning' : hr < 17 ? 'afternoon' : 'evening'; };

export default function Habits() {
  const { habits } = useStore();
  const { tap } = useHabitActions();
  const router = useRouter();
  const k = today();
  const [sel, setSel] = useState(k);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showDone, setShowDone] = useState(false);
  const isToday = sel === k;
  const monday = addDays(mondayOf(), weekOffset * 7);
  const shiftWeek = (n: number) => {
    const next = Math.min(0, weekOffset + n);
    if (next === weekOffset) return;
    haptic('select');
    const pick = ymd(addDays(mondayOf(), next * 7 + monIndex(parse(sel))));
    setWeekOffset(next); setSel(pick > k ? k : pick);
  };
  const addBtn = <IconBtn icon={Plus} label="Add habit" dark onPress={() => router.push('/habit/edit')} />;
  if (!habits.length) {
    return (
      <Screen tabs>
        <AppHeader title="Habits" right={addBtn} />
        <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 28 }}>
          <View style={[st.ic36, { width: 56, height: 56, borderRadius: 28, backgroundColor: PASTEL[0][0] }]}><HabitIcon index={1} color={PASTEL[0][1]} size={26} /></View>
          <T size={18} w="s">Start with one small habit</T>
          <T size={14} color={C.muted} center style={{ lineHeight: 20 }}>Build a good habit or quit a bad one. Your progress and stats show up here.</T>
          <Btn title="Create a habit" icon={Plus} onPress={() => router.push('/habit/edit')} style={{ alignSelf: 'stretch', marginTop: 8 }} />
        </Card>
      </Screen>
    );
  }

  const due = dueOn(habits, sel);
  const quits = habits.filter((h) => h.type === 'quit');
  const build = habits.filter((h) => h.type === 'build');
  const rest = build.filter((h) => !due.includes(h));
  // Finished habits are tucked away so the list only shows what's left.
  const doneList = due.filter((h) => isDone(h, sel)), todo = due.filter((h) => !isDone(h, sel));
  const groups: Record<string, Habit[]> = {};
  todo.forEach((h) => { (groups[partOf(h)] = groups[partOf(h)] || []).push(h); });
  Object.values(groups).forEach((g) => g.sort((a, b) => (a.reminder || '99').localeCompare(b.reminder || '99')));

  // stats
  const wk = weekData(habits, 0);
  const diff = wk.cur != null && wk.prev != null ? Math.round((wk.cur - wk.prev) * 100) : null;
  const bestI = wk.days.reduce((b, d, i) => (!d.future && d.r > (b < 0 ? -1 : wk.days[b].r) ? i : b), -1);
  const ranked = build.map((h) => ({ h, r: rate(h, ymd(addDays(new Date(), -29)), k), s: streak(h) })).filter((x) => x.r != null).sort((a, b) => (b.r as number) - (a.r as number));
  // Weekly completion for the last 8 weeks, and which weekdays go best.
  const weeks = Array.from({ length: 8 }, (_, w) => {
    const mon = addDays(mondayOf(), (w - 7) * 7);
    let due = 0, dn = 0;
    for (let i = 0; i < 7; i++) { const dk = ymd(addDays(mon, i)); if (dk > k) break; const c = wk.counts(dk); due += c.due; dn += c.done; }
    return { mon, r: due ? Math.round((dn / due) * 100) : null };
  });
  const byDay = Array.from({ length: 7 }, (_, i) => {
    let due = 0, dn = 0;
    for (let w = 0; w < 8; w++) { const dk = ymd(addDays(mondayOf(), -w * 7 + i)); if (dk > k) continue; const c = wk.counts(dk); due += c.due; dn += c.done; }
    return { name: DAY_NAMES[(i + 1) % 7].slice(0, 3), r: due ? dn / due : null };
  });
  const bestDay = byDay.reduce((b, d, i) => (d.r != null && (b < 0 || d.r > (byDay[b].r ?? -1)) ? i : b), -1);

  const todayPage = () => (
    <>
      {/* Week strip */}
      <View style={st.weekCard}>
        <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4 }}>
          <IconBtn icon={ChevronLeft} size={32} label="Previous week" onPress={() => shiftWeek(-1)} />
          <T size={14} w="s">{parse(sel).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</T>
          <IconBtn icon={ChevronRight} size={32} label="Next week" onPress={() => shiftWeek(1)} disabled={weekOffset >= 0} />
        </Row>
        <View style={{ flexDirection: 'row', gap: 2 }}>
          {Array.from({ length: 7 }, (_, i) => {
            const d = addDays(monday, i), dk = ymd(d), future = dk > k, on = dk === sel;
            const dd = dueOn(habits, dk), all = !future && dd.length > 0 && dd.every((h) => isDone(h, dk));
            return (
              <Tap key={dk} onPress={future ? undefined : () => { haptic('select'); setSel(dk); }} scale={0.92} style={[st.dcell, on && st.dcellOn, future && { opacity: 0.4 }]}
                accessibilityLabel={`${d.toDateString()}${dk === k ? ', today' : ''}`} accessibilityState={{ selected: on, disabled: future }}>
                <T size={11} w="s" color={on ? C.white : C.muted}>{d.toLocaleDateString(undefined, { weekday: 'short' })}</T>
                <T size={15} w="s" color={on ? C.white : C.ink}>{d.getDate()}</T>
                <View style={[st.doneDot, all && { backgroundColor: on ? C.white : C.green }]} />
              </Tap>
            );
          })}
        </View>
      </View>

      {due.length > 0 && (
        <View style={st.dayHero}>
          <Row style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <View style={{ gap: 2 }}>
              <T size={13} w="m" color={C.accentInk}>{isToday ? 'Today' : 'This day'}</T>
              <T size={30} w="b" color={C.accentInk}>{due.length - todo.length} of {due.length} done</T>
            </View>
            <View style={st.heroChip}><Flame size={14} color={C.accent} /><T size={12.5} w="s" color={C.accentInk}>{dayStreak(habits)}-day streak</T></View>
          </Row>
          <Bar value={(due.length - todo.length) / due.length} color={C.accent} track={C.card} height={8} />
        </View>
      )}

      {/* All habits for the selected day */}
      <SectionTitle title={isToday ? 'Today' : parse(sel).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })} action={isToday ? undefined : 'Back to today'} onAction={() => setSel(k)} />
      {!due.length ? <Card><T size={16} w="s">Rest day</T><T size={14} color={C.muted} style={{ marginTop: 4 }}>No habits are scheduled for {isToday ? 'today' : 'this day'}.</T></Card>
        : !todo.length ? (
          <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: PASTEL[0][0], borderColor: 'transparent' }}>
            <CheckCircle2 size={26} color={PASTEL[0][1]} />
            <View style={{ flex: 1 }}><T size={15} w="s" color={PASTEL[0][1]}>All done{isToday ? ' for today' : ''}</T><T size={13} color={PASTEL[0][1]}>{due.length} of {due.length} habits complete</T></View>
          </Card>
        ) : PARTS.filter(([key]) => groups[key]).map(([key, label, Icon]) => (
          <View key={key} style={{ gap: 8 }}>
            <Row gap={6} style={{ paddingHorizontal: 2 }}><Icon size={13} color={C.muted} /><Label>{label}</Label></Row>
            <View style={st.group}>
              {groups[key].map((h, i) => <Item key={h.id} delay={i * 40}><HabitCard flat first={i === 0} h={h} day={sel} onTap={() => tap(h, sel)} /></Item>)}
            </View>
          </View>
        ))}
      {doneList.length > 0 && (
        <View style={{ gap: 12 }}>
          <Tap onPress={() => setShowDone(!showDone)} scale={0.98} style={st.doneToggle} accessibilityLabel={showDone ? 'Hide completed habits' : 'Show completed habits'}>
            <CheckCircle2 size={16} color={C.green} />
            <T size={13} w="s" color={C.muted} style={{ flex: 1 }}>{doneList.length} done</T>
            <T size={13} w="s" color={C.accent}>{showDone ? 'Hide' : 'Show'}</T>
            {showDone ? <ChevronUp size={16} color={C.accent} /> : <ChevronDown size={16} color={C.accent} />}
          </Tap>
          {showDone && <View style={st.group}>{doneList.map((h, i) => <Item key={h.id}><HabitCard flat first={i === 0} h={h} day={sel} onTap={() => tap(h, sel)} /></Item>)}</View>}
        </View>
      )}

      {quits.length > 0 && (
        <View style={{ gap: 12 }}>
          <Label>Quitting</Label>
          {quits.map((h) => {
            const days = cleanDays(h), next = nextMilestone(days);
            return (
              <Tap key={h.id} style={[st.card, { flexDirection: 'row', alignItems: 'center', gap: 12 }]} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}>
                <View style={[st.ic36, { backgroundColor: pastel(h)[0] }]}><HabitIcon index={h.icon} color={pastel(h)[1]} size={17} /></View>
                <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
                  <Row style={{ justifyContent: 'space-between' }}><T size={15} w="s" numberOfLines={1} style={{ flex: 1 }}>{h.name}</T><T size={12} color={C.muted}><T size={15} w="b">{days}</T> / {next} days</T></Row>
                  <Bar value={days / next} />
                </View>
              </Tap>
            );
          })}
        </View>
      )}
      {rest.length > 0 && (
        <View style={{ gap: 12 }}>
          <Label>Not scheduled {isToday ? 'today' : 'this day'}</Label>
          {rest.map((h) => <HabitLinkRow key={h.id} h={h} />)}
        </View>
      )}
    </>
  );
  // 30-day score vs the 30 days before, and a 12-week calendar for the heatmap.
  const span = (from: number, to: number) => {
    let due = 0, dn = 0;
    for (let i = from; i < to; i++) { const dk = ymd(addDays(new Date(), -i)); const c = wk.counts(dk); due += i === 0 ? c.done : c.due; dn += c.done; }
    return due ? dn / due : null;
  };
  const score = span(0, 30), prevScore = span(30, 60);
  const scoreDiff = score != null && prevScore != null ? Math.round((score - prevScore) * 100) : null;
  const checkIns = build.reduce((a, h) => a + totalDone(h), 0);
  const best = Math.max(0, ...build.map(bestStreak));
  const heat = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, i) => {
    const dk = ymd(addDays(mondayOf(), (w - 11) * 7 + i));
    if (dk > k) return -1;
    const c = wk.counts(dk);
    return c.due ? c.done / c.due : null;
  }));
  const HEAT = [C.heat1, C.heat2, C.heat3, C.accent];
  const heatColor = (r: number | null) => (r == null ? C.soft : r <= 0 ? C.track : HEAT[Math.min(3, Math.floor(r * 4))]);

  const statsPage = () => (
    <>
      {build.length > 0 ? (
        <>
          {/* Score hero */}
          <View style={st.hero}>
            <Ring value={score ?? 0} size={96} stroke={10} color={PASTEL[0][1]} track={C.glass}>
              <T size={24} w="b" color={PASTEL[0][1]}>{score == null ? '–' : Math.round(score * 100)}<T size={13} w="s" color={PASTEL[0][1]}>{score == null ? '' : '%'}</T></T>
            </Ring>
            <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
              <T size={13} color={PASTEL[0][1]}>30-day score</T>
              <T size={18} w="b" color={PASTEL[0][1]} numberOfLines={2}>{score == null ? 'Just getting started' : score >= 0.8 ? 'On fire' : score >= 0.5 ? 'Building momentum' : 'Room to grow'}</T>
              {scoreDiff ? <T size={12} w="s" color={PASTEL[0][1]}>{scoreDiff > 0 ? '↑' : '↓'} {Math.abs(scoreDiff)}% vs previous 30 days</T> : null}
            </View>
          </View>
          <Row gap={12}>
            <Stat label="Day streak" value={dayStreak(habits)} unit=" d" tone={PASTEL[0]} />
            <Stat label="Best streak" value={best} unit=" d" tone={PASTEL[1]} />
            <Stat label="Check-ins" value={checkIns} tone={PASTEL[2]} />
          </Row>

          {/* Heatmap: one column per week, Monday at the top */}
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={16} w="s">Consistency</T>
              <T size={12} color={C.muted}>last 12 weeks</T>
            </Row>
            <Row gap={6} style={{ alignItems: 'stretch' }}>
              <View style={{ justifyContent: 'space-between', paddingVertical: 1 }}>
                {WEEK.map((d, i) => <T key={i} size={9} w="s" color={i % 2 ? 'transparent' : C.faint} style={{ lineHeight: 13 }}>{d}</T>)}
              </View>
              {heat.map((col, w) => (
                <View key={w} style={{ flex: 1, gap: 4 }}>
                  {col.map((r, i) => <View key={i} style={[st.heat, { backgroundColor: r === -1 ? 'transparent' : heatColor(r) }]} />)}
                </View>
              ))}
            </Row>
            <Row gap={4} style={{ justifyContent: 'flex-end' }}>
              <T size={11} color={C.muted} style={{ marginRight: 4 }}>Less</T>
              {[C.track, ...HEAT].map((c) => <View key={c} style={[st.heat, { width: 11, aspectRatio: undefined, height: 11, backgroundColor: c }]} />)}
              <T size={11} color={C.muted} style={{ marginLeft: 4 }}>More</T>
            </Row>
          </Card>

          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={16} w="s">Last 7 days</T>
              {diff ? <View style={[st.pill, { backgroundColor: diff > 0 ? PASTEL[0][0] : C.dangerSoft }]}><T size={11} w="b" color={diff > 0 ? PASTEL[0][1] : C.danger}>{diff > 0 ? '↑' : '↓'} {Math.abs(diff)}% vs last week</T></View> : null}
            </Row>
            <View style={{ marginTop: 12 }}>
              <BarChart values={wk.days.map((d) => (d.future ? null : Math.round(d.r * 100)))} labels={wk.days.map((d) => WEEK[monIndex(parse(d.dk))])} highlight={bestI} max={100} suffix="%" />
            </View>
          </Card>

          {/* Best weekdays as small columns */}
          <Card style={{ gap: 12 }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={16} w="s">Best days</T>
              {bestDay >= 0 && <T size={12} w="s" color={C.green}>{byDay[bestDay].name} is your strongest</T>}
            </Row>
            <Row gap={8} style={{ alignItems: 'flex-end' }}>
              {byDay.map((d, i) => (
                <View key={d.name} style={{ flex: 1, alignItems: 'center', gap: 6 }} accessible accessibilityLabel={`${d.name}: ${d.r == null ? 'no data' : `${Math.round(d.r * 100)}%`}`}>
                  <T size={10} w="s" color={i === bestDay ? C.accent : C.muted}>{d.r == null ? '–' : `${Math.round(d.r * 100)}`}</T>
                  <View style={st.colTrack}><View style={[st.colFill, { height: `${Math.max(6, (d.r ?? 0) * 100)}%`, backgroundColor: i === bestDay ? C.accent : C.accentSoft }]} /></View>
                  <T size={11} w="s" color={i === bestDay ? C.ink : C.muted}>{d.name.slice(0, 2)}</T>
                </View>
              ))}
            </Row>
          </Card>

          <Card>
            <Row style={{ justifyContent: 'space-between' }}>
              <T size={15} w="s">8-week trend</T>
              <T size={12} color={C.muted}>weekly completion</T>
            </Row>
            <View style={{ marginTop: 12 }}>
              <LineChart values={weeks.map((w) => w.r)} labels={weeks.map((w) => fmtShort(w.mon))} unit="%" min={0} max={100} />
            </View>
          </Card>

          <SectionTitle title="By habit · 30 days" />
          {ranked.map(({ h, r, s }) => {
            const [bg, ink] = pastel(h);
            return (
              <Tap key={h.id} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })} style={[st.card, st.rank]} scale={0.98}>
                <Ring value={r as number} size={48} stroke={5} color={ink} track={bg}>
                  <HabitIcon index={h.icon} color={ink} size={18} />
                </Ring>
                <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                  <T size={15} w="s" numberOfLines={1}>{h.name}</T>
                  <Row gap={12}>
                    <Row gap={3}><Flame size={12} color={s ? C.accent : C.faint} /><T size={12} color={C.muted}>{s ? `${s} day streak` : 'No streak'}</T></Row>
                    <T size={12} color={C.faint}>Best {bestStreak(h)}d</T>
                  </Row>
                </View>
                <T size={18} w="b" color={ink}>{Math.round((r as number) * 100)}<T size={11} w="s" color={ink}>%</T></T>
              </Tap>
            );
          })}
          {!ranked.length && <T size={13} color={C.muted}>Stats appear after your first scheduled day.</T>}
        </>
      ) : <Card><T size={16} w="s">No stats yet</T><T size={14} color={C.muted} style={{ marginTop: 4 }}>Stats appear once you have a habit to build.</T></Card>}
    </>
  );

  return (
    <PagerScreen tabs header={<AppHeader title="Habits" subtitle={`${build.length} building · ${quits.length} quitting`} right={addBtn} />}
      pages={[{ key: 'today', label: 'Today', render: todayPage }, { key: 'stats', label: 'Stats', render: statsPage }]} />
  );
}

const st = themed(() => StyleSheet.create({
  weekCard: { gap: 6, padding: 8, borderRadius: 20, backgroundColor: C.card },
  dcell: { flex: 1, minWidth: 0, alignItems: 'center', gap: 3, paddingVertical: 8, borderRadius: 14 },
  dcellOn: { backgroundColor: C.accent },
  dayHero: { gap: 16, padding: 20, borderRadius: 26, backgroundColor: C.accentSoft },
  heroChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.card },
  doneDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'transparent', marginTop: 2 },
  count: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 99, backgroundColor: C.soft },
  card: { backgroundColor: C.card, borderRadius: 20, padding: 14 },
  group: { backgroundColor: C.card, borderRadius: 20, paddingHorizontal: 14 },
  ic36: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  doneToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.soft },
  rank: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 18, borderRadius: 22, backgroundColor: PASTEL[0][0] },
  heat: { width: '100%', aspectRatio: 1, borderRadius: 4 },
  pill: { paddingVertical: 3, paddingHorizontal: 9, borderRadius: 99 },
  colTrack: { width: '100%', maxWidth: 28, height: 80, borderRadius: 8, backgroundColor: C.track, justifyContent: 'flex-end', overflow: 'hidden' },
  colFill: { width: '100%', borderRadius: 8 },
}));
