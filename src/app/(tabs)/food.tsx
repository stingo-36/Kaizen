import { useRouter } from 'expo-router';
import { Plus, Trash2 } from '@/components/ico';
import { StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/charts';
import { AppHeader } from '@/components/header';
import { PagerScreen } from '@/components/pager';
import { Bar, Card, Gauge, IconBtn, Row, Stat, T, Tap, useToast } from '@/components/ui';
import { addDays, monIndex, parse, today, WEEK, ymd } from '@/lib/dates';
import { amountText, macrosOf, mealFor, MEALS, sumMacros, targets } from '@/lib/food';
import { useFood } from '@/lib/food-store';
import { PASTEL } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';

export default function Food() {
  const router = useRouter();
  const toast = useToast();
  const { profile } = useStore();
  const { food, setFood } = useFood();
  const k = today(), entries = food.days[k] ?? [];
  const tot = sumMacros(entries), goal = targets(profile);
  const left = goal.kcal - tot.kcal;
  const add = (meal = mealFor()) => router.push({ pathname: '/food/add', params: { meal } });

  const remove = (id: string) => {
    const before = food.days[k] ?? [];
    const gone = before.find((e) => e.id === id);
    setFood((f) => ({ ...f, days: { ...f.days, [k]: (f.days[k] ?? []).filter((e) => e.id !== id) } }));
    if (gone) toast(`Removed ${gone.item.name}`, () => setFood((f) => ({ ...f, days: { ...f.days, [k]: before } })));
  };

  const todayPage = () => (
    <>
      <Card style={{ alignItems: 'center', paddingVertical: 18, gap: 14 }}>
        <Gauge value={goal.kcal ? tot.kcal / goal.kcal : 0} size={180}>
          <T size={32} w="b">{Math.abs(left)}</T>
          <T size={13} color={C.muted}>{left >= 0 ? 'kcal left' : 'kcal over'}</T>
        </Gauge>
        <Row gap={14} style={{ alignSelf: 'stretch', marginTop: -18 }}>
          {([['Protein', tot.p, goal.p, PASTEL[2][1]], ['Carbs', tot.c, goal.c, '#C99A1C'], ['Fat', tot.f, goal.f, C.accent]] as const).map(([l, v, g, col]) => (
            <View key={l} style={{ flex: 1, gap: 6 }}>
              <T size={12} w="s" color={C.muted}>{l}</T>
              <Bar value={g ? v / g : 0} color={col} />
              <T size={12} w="s">{Math.round(v)}<T size={11} color={C.muted}> / {g} g</T></T>
            </View>
          ))}
        </Row>
        <T size={12} color={C.muted}>{tot.kcal} eaten · goal {goal.kcal} kcal ({profile.goal.toLowerCase()})</T>
      </Card>

      {MEALS.map(([m, label]) => {
        const list = entries.filter((e) => e.meal === m), mk = sumMacros(list).kcal;
        return (
          <Card key={m} style={{ paddingVertical: 6 }}>
            <Row style={{ justifyContent: 'space-between', paddingVertical: 8 }}>
              <View><T size={16} w="s">{label}</T><T size={12} color={C.muted}>{list.length ? `${mk} kcal` : 'Nothing logged'}</T></View>
              <Tap onPress={() => add(m)} scale={0.92} style={st.addBtn} accessibilityLabel={`Add food to ${label}`}>
                <Plus size={16} color={C.onInk} strokeWidth={2.4} /><T size={13} w="s" color={C.onInk}>Add</T>
              </Tap>
            </Row>
            {list.map((e) => {
              const mm = macrosOf(e);
              return (
                <Row key={e.id} style={st.entry}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={14} w="s" numberOfLines={1}>{e.item.name}</T>
                    <T size={12} color={C.muted} numberOfLines={1}>{amountText(e)} · P {mm.p} · C {mm.c} · F {mm.f}</T>
                  </View>
                  <T size={14} w="s">{mm.kcal}</T>
                  <IconBtn icon={Trash2} size={32} label={`Remove ${e.item.name}`} onPress={() => remove(e.id)} />
                </Row>
              );
            })}
          </Card>
        );
      })}
    </>
  );

  // Last 7 days, Monday-first labels for each actual weekday.
  const days = Array.from({ length: 7 }, (_, i) => ymd(addDays(new Date(), i - 6)));
  const totals = days.map((d) => sumMacros(food.days[d] ?? []));
  const logged = totals.filter((t) => t.kcal > 0);
  const avg = logged.length ? Math.round(logged.reduce((a, t) => a + t.kcal, 0) / logged.length) : 0;
  const avgP = logged.length ? Math.round(logged.reduce((a, t) => a + t.p, 0) / logged.length) : 0;
  const weekPage = () => (
    <>
      <Row gap={12}>
        <Stat label="Avg per day" value={avg} unit=" kcal" tone={PASTEL[1]} />
        <Stat label="Avg protein" value={avgP} unit=" g" tone={PASTEL[2]} />
        <Stat label="Days logged" value={`${logged.length}/7`} tone={PASTEL[0]} />
      </Row>
      <Card>
        <Row style={{ justifyContent: 'space-between' }}><T size={16} w="s">Last 7 days</T><T size={12} color={C.muted}>goal {goal.kcal} kcal</T></Row>
        <View style={{ marginTop: 10 }}>
          <BarChart values={totals.map((t) => t.kcal)} labels={days.map((d) => WEEK[monIndex(parse(d))])} highlight={6}
            max={Math.ceil(Math.max(goal.kcal, ...totals.map((t) => t.kcal)) / 500) * 500} suffix=" kcal" />
        </View>
      </Card>
      {!logged.length && <T size={13} color={C.muted} center>Log a few meals and your week shows up here.</T>}
    </>
  );

  return (
    <PagerScreen tabs header={<AppHeader title="Food" subtitle={`${tot.kcal} of ${goal.kcal} kcal today`} right={<IconBtn icon={Plus} dark label="Add food" onPress={() => add()} />} />}
      pages={[{ key: 'today', label: 'Today', render: todayPage }, { key: 'week', label: 'Week', render: weekPage }]} />
  );
}

const st = themed(() => StyleSheet.create({
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 99, backgroundColor: C.ink },
  entry: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: C.line, gap: 8 },
}));
