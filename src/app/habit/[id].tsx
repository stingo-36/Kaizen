import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Flame } from '@/components/ico';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { LineChart } from '@/components/charts';
import { HabitIcon } from '@/components/icons';
import { Bar, Btn, Card, IconBtn, Row, Screen, Sheet, T, Tap, useToast } from '@/components/ui';
import { addDays, mondayOf, monIndex, today, WEEK, ymd } from '@/lib/dates';
import { bestStreak, cleanDays, isDone, isScheduled, nextMilestone, pastel, rate, scheduleText, streak, totalDone } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';
import { useHabitActions } from '@/lib/useHabitActions';
import { useNow } from '@/lib/useNow';
import { goBack } from '@/lib/nav';

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { habits, setHabits } = useStore();
  const { skip } = useHabitActions();
  const [calOffset, setCalOffset] = useState(0);
  const [slipOpen, setSlipOpen] = useState(false);
  const now = useNow(30000);
  const h = habits.find((x) => x.id === id);
  if (!h) return <Screen><IconBtn icon={ArrowLeft} label="Back" onPress={() => goBack('/habits')} /><T>This habit no longer exists.</T></Screen>;
  const [bg, ink] = pastel(h), k = today();

  const header = (
    <>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconBtn icon={ArrowLeft} label="Back" onPress={() => goBack('/habits')} />
        <Tap onPress={() => router.push({ pathname: '/habit/edit', params: { id: h.id } })}><T size={15} w="s" color={C.accent}>Edit</T></Tap>
      </Row>
      <Row gap={16}>
        <View style={[st.bigIc, { backgroundColor: bg }]}><HabitIcon index={h.icon} color={ink} size={28} /></View>
        <View style={{ flex: 1 }}><T size={24} w="b">{h.name}</T><T size={14} color={C.muted}>{scheduleText(h)}</T></View>
      </Row>
    </>
  );

  if (h.type === 'quit') {
    const days = cleanDays(h), best = Math.max(h.bestClean || 0, days), next = nextMilestone(days);
    const ms = now - new Date(h.quitStart ?? now).getTime();
    return (
      <Screen>
        {header}
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <T size={14} color={C.muted}>Clean for</T>
          <T size={56} w="b" style={{ lineHeight: 62 }}>{days}<T size={22} w="m"> day{days === 1 ? '' : 's'}</T></T>
          <T size={14} color={C.muted}>{Math.floor((ms % 864e5) / 36e5)} hours {Math.floor((ms % 36e5) / 6e4)} min</T>
        </Card>
        <Card style={{ gap: 10 }}>
          <Row style={{ justifyContent: 'space-between' }}><T size={15} w="s">Next milestone: {next} days</T><T size={13} color={C.muted}>{next - days} to go</T></Row>
          <Bar value={days / next} />
        </Card>
        <Card><Row style={{ justifyContent: 'space-between' }}><T size={16} w="s">Best run</T><T size={14} color={C.muted}>{best} day{best === 1 ? '' : 's'}</T></Row></Card>
        <Btn title="I slipped up" kind="danger" onPress={() => setSlipOpen(true)} />
        <Sheet open={slipOpen} onClose={() => setSlipOpen(false)} title="Reset your counter?" subtitle="It happens. Your best run is kept, and the counter starts again from now.">
          <Btn title="Reset counter" kind="danger" onPress={() => {
            setHabits((hs) => hs.map((x) => (x.id === h.id ? { ...x, bestClean: Math.max(x.bestClean || 0, cleanDays(x)), quitStart: new Date().toISOString() } : x)));
            setSlipOpen(false); toast('Counter reset. Keep going.');
          }} />
          <Btn title="Cancel" kind="ghost" onPress={() => setSlipOpen(false)} />
        </Sheet>
      </Screen>
    );
  }

  const s = streak(h), best = bestStreak(h), all = rate(h, h.createdAt, k);
  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + calOffset);
  const y = base.getFullYear(), m = base.getMonth(), last = new Date(y, m + 1, 0).getDate();
  const monthEnd = ymd(new Date(y, m, last));
  const monthRate = rate(h, ymd(new Date(y, m, 1)), monthEnd < k ? monthEnd : k);
  const lead = monIndex(new Date(y, m, 1));
  const canPrev = ymd(new Date(y, m, 1)) > h.createdAt;
  const trend = Array.from({ length: 12 }, (_, i) => {
    const st0 = addDays(mondayOf(), (i - 11) * 7), en = addDays(st0, 6), end = ymd(en) > k ? k : ymd(en);
    const r = ymd(st0) > k ? null : rate(h, ymd(st0), end);
    return { label: st0.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), r: r == null ? null : Math.round(r * 100) };
  });
  const dueToday = isScheduled(h, k) && !isDone(h, k), skipped = !!h.skips[k];

  return (
    <Screen>
      {header}
      <Card style={{ alignItems: 'center', paddingVertical: 24 }}>
        <Row gap={8}><Flame size={36} color={C.accent} /><T size={56} w="b" style={{ lineHeight: 62 }}>{s}</T></Row>
        <T size={14} color={C.muted}>day streak{best > s ? ` · best is ${best}` : s ? ' · your best yet' : ''}</T>
      </Card>
      <Row gap={10}>
        {[[best, 'Best'], [all == null ? '–' : `${Math.round(all * 100)}%`, 'Done'], [totalDone(h), 'Total']].map(([v, l]) => (
          <Card key={l as string} style={{ flex: 1, alignItems: 'center', paddingVertical: 14 }}><T size={21} w="b">{v}</T><T size={12} color={C.muted}>{l}</T></Card>
        ))}
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <T size={16} w="s">{base.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</T>
          <Row gap={6}>
            {monthRate != null && <T size={13} color={C.muted}>{Math.round(monthRate * 100)}% done</T>}
            <IconBtn icon={ChevronLeft} size={32} label="Previous month" disabled={!canPrev} onPress={() => setCalOffset(calOffset - 1)} />
            <IconBtn icon={ChevronRight} size={32} label="Next month" disabled={calOffset >= 0} onPress={() => setCalOffset(calOffset + 1)} />
          </Row>
        </Row>
        <View style={st.cal}>
          {WEEK.map((w, i) => <T key={`w${i}`} size={12} w="s" color={C.muted} center style={st.cell}>{w}</T>)}
          {Array.from({ length: lead }, (_, i) => <View key={`e${i}`} style={st.cell} />)}
          {Array.from({ length: last }, (_, i) => {
            const dk = ymd(new Date(y, m, i + 1)), off = !isScheduled(h, dk) || dk < h.createdAt;
            const done = !off && isDone(h, dk), sk = !off && !done && h.skips[dk], miss = !off && !done && !sk && dk < k;
            return (
              <View key={dk} style={st.cell}>
                <View style={[st.day, done && { backgroundColor: C.green }, sk && { backgroundColor: C.soft }, dk === k && { borderWidth: 2, borderColor: C.accent }, off && { opacity: 0.3 }]}>
                  <T size={13} w={done || dk === k ? 's' : 'r'} color={done ? C.white : miss ? C.danger : C.muted}>{i + 1}</T>
                </View>
              </View>
            );
          })}
        </View>
        <Row gap={14} style={{ marginTop: 12 }}>
          <Row gap={6}><View style={[st.leg, { backgroundColor: C.green }]} /><T size={12} color={C.muted}>Done</T></Row>
          <Row gap={6}><View style={[st.leg, { backgroundColor: C.soft }]} /><T size={12} color={C.muted}>Skipped</T></Row>
          <Row gap={6}><View style={[st.leg, { borderWidth: 2, borderColor: C.accent }]} /><T size={12} color={C.muted}>Today</T></Row>
        </Row>
      </Card>
      <Card>
        <Row style={{ justifyContent: 'space-between', marginBottom: 8 }}><T size={16} w="s">Weekly completion</T><T size={13} color={C.muted}>last 12 weeks</T></Row>
        <LineChart values={trend.map((t) => t.r)} labels={trend.map((t) => t.label)} min={0} max={100} unit="%" />
      </Card>
      {(dueToday || skipped) && <Btn title={skipped ? 'Undo skip' : 'Skip today'} kind="ghost" onPress={() => skip(h)} />}
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  bigIc: { width: 58, height: 58, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cal: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, padding: 3, alignItems: 'center' },
  day: { width: '100%', aspectRatio: 1, borderRadius: 99, alignItems: 'center', justifyContent: 'center' },
  leg: { width: 10, height: 10, borderRadius: 5 },
}));
