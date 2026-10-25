import { useRouter } from 'expo-router';
import { Flame, LucideIcon, Moon, Plus, Sun, Sunrise, Trash2, Utensils } from '@/components/ico';
import { StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';

import { BarChart } from '@/components/charts';
import { AppHeader } from '@/components/header';
import { PagerScreen } from '@/components/pager';
import { pi } from '@/components/paper-icons';
import { Bar, Btn, Card, FeatureCard, IconBtn, Row, SectionTitle, Stat, T, useToast } from '@/components/ui';
import { logKcal } from '@/lib/calories';
import { addDays, monIndex, parse, today, WEEK, ymd } from '@/lib/dates';
import { amountText, Macros, macrosOf, Meal, mealFor, MEALS, sumMacros, targets } from '@/lib/food';
import { useFood } from '@/lib/food-store';
import { PASTEL } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';

const MEAL_ICON: Record<Meal, LucideIcon> = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snacks: Utensils };
/** Each macro keeps a related clay, caramel or sand accent across this screen. */
const MACROS: { key: 'p' | 'c' | 'f'; label: string; grad: [string, string] }[] = [
  { key: 'p', label: 'Protein', grad: [C.accent, C.accent2] },
  { key: 'c', label: 'Carbs', grad: ['#A76932', '#DFC29B'] },
  { key: 'f', label: 'Fat', grad: [C.lavenderInk, '#CEB394'] },
];

function MacroTile({ label, value, goal, grad }: { label: string; value: number; goal: number; grad: [string, string] }) {
  return (
    <View style={st.macro} accessible accessibilityLabel={`${label}: ${Math.round(value)} of ${goal} grams`}>
      <T size={13} w="s">{label}</T>
      <T size={11} w="s">{Math.round(value)} / {goal} g</T><View style={{ alignSelf: 'stretch', marginTop: 6 }}><Bar value={goal ? value / goal : 0} color={grad[0]} height={5} /></View>
    </View>
  );
}

/** Portion on one line, then "● 4g  ● 46g  ● 1g" with each dot in its macro's colour. */
function MacroLine({ amount, m }: { amount: string; m: Macros }) {
  return (
    <>
      <T size={12} color={C.muted} numberOfLines={1}>{amount}</T>
      <Row gap={12}>
        {MACROS.map(({ key, label, grad }) => (
          <View key={key} style={st.macroVal} accessible accessibilityLabel={`${label} ${m[key]} grams`}>
            <View style={[st.dot, { backgroundColor: grad[0] }]} /><T size={12} w="m" color={C.ink}>{m[key]}g</T>
          </View>
        ))}
      </Row>
    </>
  );
}

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
      <FeatureCard>
        <T size={11} w="s" color={C.heroMuted}>{left >= 0 ? 'LEFT FOR TODAY' : 'OVER TODAY'}</T>
        <Row gap={7} style={{ alignItems: 'baseline' }}>
          <T size={40} w="s" color={C.white}>{Math.abs(left).toLocaleString()}</T><T size={13} color={C.heroMuted}>kcal</T>
        </Row>
        <T size={12} color={C.heroMuted}>{tot.kcal.toLocaleString()} eaten · {goal.kcal.toLocaleString()} daily target</T>
        <Bar value={goal.kcal ? tot.kcal / goal.kcal : 0} color={C.heroMuted} track="rgba(255,255,255,0.18)" height={6} />
        <Row gap={6}><Flame size={14} color={C.heroMuted} /><T size={12} color={C.heroMuted}>{burned} kcal burned · {profile.goal}</T></Row>
      </FeatureCard>
      <Row gap={8} style={{ alignItems: 'stretch' }}>
        {MACROS.map(({ key, label, grad }) => <MacroTile key={key} label={label} value={tot[key]} goal={goal[key]} grad={grad} />)}
      </Row>

      <Btn title="Meal templates · log your usual" kind="ghost" onPress={() => router.push('/food/templates')} />
      <SectionTitle title="Meals" action="Add food" onAction={() => add()} />
      {MEALS.map(([m, label]) => {
        const list = entries.filter((e) => e.meal === m), mk = sumMacros(list).kcal, Icon = MEAL_ICON[m];
        return (
          <Card key={m} style={{ paddingVertical: 14, gap: 0 }}>
            <Row gap={12}>
              <View style={st.mealIc}><Icon size={20} color={C.accent} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={16} w="s">{label}</T>
                <T size={12.5} color={C.muted}>{list.length ? `${list.length} item${list.length > 1 ? 's' : ''} · ${mk} kcal` : 'Nothing logged yet'}</T>
              </View>
              <IconButton mode="contained-tonal" icon={pi(Plus, 2.2)} size={18} containerColor={C.accentTint} iconColor={C.accent}
                onPress={() => add(m)} accessibilityLabel={`Add food to ${label}`} style={{ margin: 0 }} />
            </Row>
            {list.map((e) => {
              const mm = macrosOf(e);
              return (
                <Row key={e.id} gap={10} style={st.entry}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <T size={14.5} w="m" numberOfLines={1}>{e.item.name}</T>
                    <MacroLine amount={amountText(e)} m={mm} />
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T size={15} w="b">{mm.kcal}</T>
                    <T size={11} color={C.muted}>kcal</T>
                  </View>
                  <IconButton icon={pi(Trash2)} size={18} iconColor={C.faint} onPress={() => remove(e.id)} accessibilityLabel={`Remove ${e.item.name}`} style={{ margin: 0 }} />
                </Row>
              );
            })}
          </Card>
        );
      })}

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
  macro: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  mealIc: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: C.accentTint },
  entry: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.line },
  dot: { width: 7, height: 7, borderRadius: 4 },
  macroVal: { flexDirection: 'row', alignItems: 'center', gap: 4 },
}));
