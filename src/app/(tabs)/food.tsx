import { useRouter } from 'expo-router';
import { LucideIcon, Moon, Plus, Sun, Sunrise, Trash2, Utensils } from '@/components/ico';
import { StyleSheet, View } from 'react-native';

import { BarChart } from '@/components/charts';
import { AppHeader } from '@/components/header';
import { PagerScreen } from '@/components/pager';
import { Bar, Card, IconBtn, Ring, Row, SectionTitle, Stat, T, Tap, useToast } from '@/components/ui';
import { logKcal } from '@/lib/calories';
import { addDays, monIndex, parse, today, WEEK, ymd } from '@/lib/dates';
import { amountText, macrosOf, Meal, mealFor, MEALS, sumMacros, targets } from '@/lib/food';
import { useFood } from '@/lib/food-store';
import { PASTEL } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';

const MEAL_ICON: Record<Meal, LucideIcon> = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snacks: Utensils };

export default function Food() {
  const router = useRouter();
  const toast = useToast();
  const { profile, workout: W } = useStore();
  const { food, setFood } = useFood();
  const k = today(), entries = food.days[k] ?? [];
  const tot = sumMacros(entries), goal = targets(profile);
  const left = goal.kcal - tot.kcal;
  const add = (meal = mealFor()) => router.push({ pathname: '/food/add', params: { meal } });
  const burned = W.logs.filter((l) => l.date === k).reduce((a, l) => a + logKcal(profile, l), 0);

  const remove = (id: string) => {
    const before = food.days[k] ?? [];
    const gone = before.find((e) => e.id === id);
    setFood((f) => ({ ...f, days: { ...f.days, [k]: (f.days[k] ?? []).filter((e) => e.id !== id) } }));
    if (gone) toast(`Removed ${gone.item.name}`, () => setFood((f) => ({ ...f, days: { ...f.days, [k]: before } })));
  };

  const todayPage = () => (
    <>
      {/* Food is the amber area: the calorie ring uses it, macros keep their own colours. */}
      <Card style={{ gap: 12 }}>
        <Row gap={16}>
          <Ring value={goal.kcal ? tot.kcal / goal.kcal : 0} size={96} stroke={10} color={PASTEL[1][1]} track={PASTEL[1][0]}>
            <T size={19} w="b">{tot.kcal.toLocaleString()}</T>
            <T size={11} color={C.muted}>of {goal.kcal.toLocaleString()}</T>
          </Ring>
          <View style={{ flex: 1, minWidth: 0, gap: 10 }}>
            {([['Protein', tot.p, goal.p, PASTEL[2][1]], ['Carbs', tot.c, goal.c, PASTEL[1][1]], ['Fat', tot.f, goal.f, PASTEL[4][1]]] as const).map(([l, v, g, col]) => (
              <View key={l} style={{ gap: 5 }}>
                <Row style={{ justifyContent: 'space-between' }}><T size={12.5} w="s">{l}</T><T size={12} color={C.muted}>{Math.round(v)} / {g} g</T></Row>
                <Bar value={g ? v / g : 0} color={col} height={6} />
              </View>
            ))}
          </View>
        </Row>
        <T size={12} color={C.muted}>{left >= 0 ? `${left} kcal left` : `${-left} kcal over`} · goal set for {profile.goal.toLowerCase()}</T>
      </Card>

      <View style={{ gap: 8 }}>
        <SectionTitle title="Meals" />
        <View style={st.meals}>
          {MEALS.map(([m, label], mi) => {
            const list = entries.filter((e) => e.meal === m), mk = sumMacros(list).kcal, Icon = MEAL_ICON[m];
            return (
              <View key={m} style={mi > 0 ? st.mealRule : undefined}>
                <Row style={{ paddingVertical: 12 }}>
                  <View style={[st.mealIc, { backgroundColor: PASTEL[1][0] }]}><Icon size={17} color={PASTEL[1][1]} /></View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={14} w="m">{label}</T>
                    <T size={12} color={C.muted} numberOfLines={1}>{list.length ? list.map((e) => e.item.name).join(', ') : 'Nothing logged yet'}</T>
                  </View>
                  {list.length ? <T size={13} w="s">{mk}</T> : null}
                  <Tap onPress={() => add(m)} scale={0.9} style={[st.addBtn, !list.length && { backgroundColor: C.ink, borderColor: C.ink }]} accessibilityLabel={`Add food to ${label}`}>
                    <Plus size={14} color={list.length ? C.ink : C.onInk} strokeWidth={2.4} />
                  </Tap>
                </Row>
                {list.map((e) => {
                  const mm = macrosOf(e);
                  return (
                    <Row key={e.id} style={st.entry}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T size={13.5} w="m" numberOfLines={1}>{e.item.name}</T>
                        <T size={12} color={C.muted} numberOfLines={1}>{amountText(e)} · P {mm.p} · C {mm.c} · F {mm.f}</T>
                      </View>
                      <T size={13} w="s">{mm.kcal}</T>
                      <IconBtn icon={Trash2} size={32} label={`Remove ${e.item.name}`} onPress={() => remove(e.id)} />
                    </Row>
                  );
                })}
              </View>
            );
          })}
        </View>
      </View>

      {/* Tiles follow the fixed pastel order: green, then amber. */}
      <Row gap={12}>
        <Stat label="Burned in workouts" value={burned} unit=" kcal" tone={PASTEL[0]} onPress={() => router.navigate('/workouts')} />
        <Stat label="Eaten per day" value={avg} unit=" kcal" tone={PASTEL[1]} />
      </Row>
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
        <Stat label="Avg per day" value={avg} unit=" kcal" tone={PASTEL[0]} />
        <Stat label="Avg protein" value={avgP} unit=" g" tone={PASTEL[1]} />
        <Stat label="Days logged" value={`${logged.length}/7`} tone={PASTEL[2]} />
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
      pages={[{ key: 'today', label: 'Today', render: todayPage }, { key: 'week', label: 'This week', render: weekPage }]} />
  );
}

const st = themed(() => StyleSheet.create({
  meals: { backgroundColor: C.card, borderRadius: 20, borderWidth: 1, borderColor: C.line, paddingHorizontal: 14 },
  mealRule: { borderTopWidth: 1, borderTopColor: C.line },
  mealIc: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: C.field, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  entry: { paddingVertical: 8, paddingLeft: 48, gap: 8 },
}));
