import { useLocalSearchParams } from 'expo-router';
import { Minus, Plus, Search, Zap } from '@/components/ico';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { BackHeader, Btn, Chip, IconBtn, Label, Row, Screen, Sheet, T, Tap, haptic, useToast } from '@/components/ui';
import { today, uid } from '@/lib/dates';
import { FoodItem, fmtQty, macrosOf, Meal, mealFor, MEALS, portionsOf, rememberFood, searchFoods } from '@/lib/food';
import { useFood } from '@/lib/food-store';
import { C, F, themed } from '@/lib/theme';
import { goBack } from '@/lib/nav';

const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) ? n : 0; };

export default function AddFood() {
  const toast = useToast();
  const { meal: mealParam } = useLocalSearchParams<{ meal?: Meal }>();
  const { food, setFood } = useFood();
  const [meal, setMeal] = useState<Meal>(MEALS.some(([m]) => m === mealParam) ? (mealParam as Meal) : mealFor());
  const [q, setQ] = useState('');
  const [results, setResults] = useState<FoodItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [pick, setPick] = useState<FoodItem | null>(null);
  const [unitIdx, setUnitIdx] = useState(0);
  const [qty, setQty] = useState(1);
  const [quick, setQuick] = useState<{ name: string; kcal: string; p: string; c: string; f: string } | null>(null);
  const seq = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  // Search as you type, after a short pause. Older replies are ignored.
  const onQuery = (v: string) => {
    setQ(v);
    if (timer.current) clearTimeout(timer.current);
    const term = v.trim(), n = ++seq.current;
    if (term.length < 2) { setResults([]); setErr(''); setBusy(false); return; }
    setBusy(true);
    timer.current = setTimeout(async () => {
      try { const r = await searchFoods(term); if (n === seq.current) { setResults(r); setErr(''); } }
      catch (e) { if (n === seq.current) setErr((e as Error).message); }
      if (n === seq.current) setBusy(false);
    }, 450);
  };

  const open = (f: FoodItem) => { setPick(f); setUnitIdx(0); setQty(1); };
  const portions = pick ? portionsOf(pick) : [];
  const portion = portions[Math.min(unitIdx, portions.length - 1)];
  const grams = portion ? qty * portion.g : 0;
  const preview = pick ? macrosOf({ item: pick, grams }) : null;
  // Quarter steps below one portion (¼, ½, ¾), half steps above.
  const step = (d: 1 | -1) => { haptic('select'); setQty((q) => Math.max(0.25, Math.min(20, q + d * ((d > 0 ? q < 1 : q <= 1) ? 0.25 : 0.5)))); };

  const log = (item: FoodItem, g: number, amount?: { qty: number; unit: string }) => {
    const k = today();
    setFood((f) => ({
      ...f,
      days: { ...f.days, [k]: [...(f.days[k] ?? []), { id: uid(), meal, item, grams: g, at: Date.now(), ...amount }] },
      recent: item.source === 'quick' ? f.recent : [item, ...f.recent.filter((r) => r.id !== item.id)].slice(0, 20),
    }));
    haptic('success');
    toast(`Added ${item.name} to ${MEALS.find(([m]) => m === meal)?.[1]}`);
  };
  const addPicked = () => {
    if (!pick || grams <= 0) return;
    log(pick, Math.round(grams), { qty, unit: portion.label });
    rememberFood(pick);
    setPick(null);
  };
  const addQuick = () => {
    if (!quick) return;
    const kcal = num(quick.kcal);
    if (kcal <= 0) return toast('Enter the calories');
    log({ id: `quick:${uid()}`, name: quick.name.trim() || 'Quick add', brand: '', source: 'quick', per100: { kcal, p: num(quick.p), c: num(quick.c), f: num(quick.f) }, serving: null }, 100);
    setQuick(null);
  };

  const list = q.trim().length >= 2 ? results : food.recent;
  return (
    <Screen>
      <BackHeader title="Add food" onBack={() => goBack('/food')} />
      {/* Meal picker: four small pills that always fit on one line */}
      <View style={st.meals} accessibilityRole="tablist">
        {MEALS.map(([m, l]) => (
          <Tap key={m} onPress={() => { haptic('select'); setMeal(m); }} scale={0.95} style={[st.meal, meal === m && st.mealOn]}
            accessibilityRole="tab" accessibilityState={{ selected: meal === m }} accessibilityLabel={l}>
            <T size={12} w="s" color={meal === m ? C.white : C.muted} numberOfLines={1} adjustsFontSizeToFit>{l}</T>
          </Tap>
        ))}
      </View>
      <View style={st.search}>
        <Search size={17} color={C.muted} />
        <TextInput value={q} onChangeText={onQuery} placeholder="Search foods, e.g. banana, paneer, oats" placeholderTextColor={C.faint} style={st.input}
          autoFocus autoCorrect={false} returnKeyType="search" accessibilityLabel="Search foods" />
        {busy && <ActivityIndicator size="small" color={C.accent} />}
      </View>
      <Tap onPress={() => setQuick({ name: '', kcal: '', p: '', c: '', f: '' })} style={st.quick} accessibilityLabel="Quick add calories">
        <Zap size={17} color={C.accent} /><T size={14} w="s" style={{ flex: 1 }}>Quick add calories</T><Plus size={17} color={C.accent} />
      </Tap>

      {err ? <T size={13} color={C.danger}>{err}</T> : null}
      <Label>{q.trim().length >= 2 ? (busy && !results.length ? 'Searching…' : `${results.length} results`) : food.recent.length ? 'Recent' : 'Search to get started'}</Label>
      <View style={{ gap: 8, marginTop: -8 }}>
        {list.map((f) => (
          <Tap key={f.id} onPress={() => open(f)} scale={0.98} style={st.row} accessibilityLabel={`${f.name}, ${f.per100.kcal} kcal per 100 grams`}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={15} w="s" numberOfLines={1}>{f.name}</T>
              <T size={12} color={C.muted} numberOfLines={1}>
                {f.brand ? `${f.brand} · ` : ''}{(() => { const p = portionsOf(f)[0]; return `${macrosOf({ item: f, grams: p.g }).kcal} kcal per ${p.label}`; })()}
              </T>
            </View>
            <View style={st.plus}><Plus size={16} color={C.white} strokeWidth={2.4} /></View>
          </Tap>
        ))}
        {q.trim().length >= 2 && !busy && !err && !results.length && <T size={13} color={C.muted}>Nothing found. Try another word or use quick add.</T>}
      </View>
      <T size={11} color={C.faint} center>Food data: USDA FoodData Central and Open Food Facts</T>

      <Sheet open={!!pick} onClose={() => setPick(null)} title={pick?.name ?? ''} subtitle={pick?.brand || 'How much did you have?'}>
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {portions.map((p, i) => <Chip key={p.label} label={p.label} on={i === unitIdx} onPress={() => setUnitIdx(i)} />)}
        </Row>
        <View style={st.amt}>
          <IconBtn icon={Minus} label="Less" onPress={() => step(-1)} disabled={qty <= 0.25} />
          <View style={{ flex: 1, alignItems: 'center' }}>
            <T size={28} w="b">{fmtQty(qty)}</T>
            <T size={13} color={C.muted} numberOfLines={1}>{portion?.label}</T>
          </View>
          <IconBtn icon={Plus} label="More" onPress={() => step(1)} />
        </View>
        {preview && (
          <Row gap={8}>
            {([['kcal', preview.kcal, ''], ['Protein', preview.p, 'g'], ['Carbs', preview.c, 'g'], ['Fat', preview.f, 'g']] as const).map(([l, v, u]) => (
              <View key={l} style={st.mac}><T size={11} w="s" color={C.muted}>{l}</T><T size={17} w="s">{v}{u}</T></View>
            ))}
          </Row>
        )}
        <Btn title={`Add to ${MEALS.find(([m]) => m === meal)?.[1]}`} onPress={addPicked} />
      </Sheet>

      <Sheet open={!!quick} onClose={() => setQuick(null)} title="Quick add" subtitle="When you know the numbers already.">
        {quick && (
          <>
            <TextInput value={quick.name} onChangeText={(v) => setQuick({ ...quick, name: v })} placeholder="Name (optional)" placeholderTextColor={C.faint} style={st.field} accessibilityLabel="Name" />
            <Row gap={8}>
              {([['kcal', 'Calories'], ['p', 'Protein g'], ['c', 'Carbs g'], ['f', 'Fat g']] as const).map(([key, l]) => (
                <View key={key} style={{ flex: 1, minWidth: 0, gap: 4 }}>
                  <T size={11} w="s" color={C.muted}>{l}</T>
                  <TextInput value={quick[key]} onChangeText={(v) => setQuick({ ...quick, [key]: v })} keyboardType="decimal-pad" style={st.field} accessibilityLabel={l} />
                </View>
              ))}
            </Row>
            <Btn title="Add" onPress={addQuick} />
          </>
        )}
      </Sheet>
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  meals: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: 99, backgroundColor: C.card },
  meal: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 7, paddingHorizontal: 4, borderRadius: 99 },
  mealOn: { backgroundColor: C.accent },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 50, paddingHorizontal: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  input: { flex: 1, minWidth: 0, fontFamily: F.r, fontSize: 15, color: C.ink, paddingVertical: 12 },
  quick: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 16, backgroundColor: C.accentTint },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingLeft: 14, borderRadius: 18, backgroundColor: C.card },
  plus: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  amt: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 72, paddingHorizontal: 10, borderRadius: 18, backgroundColor: C.soft },
  mac: { flex: 1, minWidth: 0, padding: 10, borderRadius: 14, backgroundColor: C.soft, gap: 2 },
  field: { minHeight: 46, minWidth: 0, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.soft, fontFamily: F.r, fontSize: 15, color: C.ink },
}));
