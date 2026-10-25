import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackHeader, Btn, Card, Chip, Input, Row, Screen, T, useToast } from '@/components/ui';
import { today, uid } from '@/lib/dates';
import { MEALS, sumMacros, type Meal } from '@/lib/food';
import { useFood } from '@/lib/food-store';
import { entriesFromTemplate, type MealTemplate } from '@/lib/planning';
import { C } from '@/lib/theme';

export default function MealTemplates() {
  const router = useRouter(), toast = useToast();
  const { food, setFood, ready } = useFood();
  const [name, setName] = useState(''), [meal, setMeal] = useState<Meal>('breakfast'), [date, setDate] = useState(today());
  const entries = (food.days[date] ?? []).filter((e) => e.meal === meal);
  const save = () => {
    if (!name.trim()) { toast('Give your template a name'); return; }
    if (!entries.length) { toast('Log this meal first, or choose a date with a logged meal'); return; }
    const template: MealTemplate = { id: uid(), name: name.trim().slice(0, 60), meal, entries: entries.map(({ item, grams, qty, unit }) => ({ item, grams, qty, unit })) };
    setFood((f) => ({ ...f, templates: [...(f.templates ?? []), template] }));
    setName(''); toast('Meal template saved');
  };
  const log = (template: MealTemplate) => {
    const key = today(), additions = entriesFromTemplate(template, template.meal, uid);
    setFood((f) => ({ ...f, days: { ...f.days, [key]: [...(f.days[key] ?? []), ...additions] } }));
    const ids = new Set(additions.map((e) => e.id));
    toast(`Logged ${template.name}`, () => setFood((f) => ({ ...f, days: { ...f.days, [key]: (f.days[key] ?? []).filter((e) => !ids.has(e.id)) } })));
  };
  if (!ready) return <Screen><BackHeader title="Meal templates" onBack={() => router.back()} /><T color={C.muted}>Loading your saved meals…</T></Screen>;
  return <Screen>
    <BackHeader title="Meal templates" onBack={() => router.back()} />
    <T size={25} w="s">Your usual, in one tap.</T>
    <T color={C.muted}>Save a logged meal, then add the same foods and portions again. Templates stay on this phone for your account.</T>
    {(food.templates ?? []).map((template) => <Card key={template.id} style={{ gap: 10 }}>
      <T size={18} w="s">{template.name}</T><T size={12} color={C.muted}>{template.meal} · {template.entries.length} items · {sumMacros(template.entries).kcal} kcal</T>
      <T size={13} color={C.muted}>{template.entries.map((e) => `${e.item.name} (${e.grams}g)`).join(', ')}</T>
      <Row gap={8}><Btn title="Log for today" small onPress={() => log(template)} /><Btn title="Remove" small kind="ghost" onPress={() => {
        setFood((f) => ({ ...f, templates: (f.templates ?? []).filter((t) => t.id !== template.id) }));
        toast('Template removed', () => setFood((f) => ({ ...f, templates: [...(f.templates ?? []).filter((t) => t.id !== template.id), template] })));
      }} /></Row>
    </Card>)}
    {!(food.templates ?? []).length && <Card><T color={C.muted}>No templates yet. Log a meal, then save it below.</T></Card>}
    <Card style={{ gap: 14 }}>
      <T size={18} w="s">Save a meal as a template</T>
      <Input label="Template name" value={name} onChange={setName} placeholder="My usual breakfast" />
      <Input label="Copy from date (YYYY-MM-DD)" value={date} onChange={setDate} placeholder={today()} />
      <Row gap={6} style={{ flexWrap: 'wrap' }}>{MEALS.map(([key, label]) => <Chip key={key} label={label} on={meal === key} onPress={() => setMeal(key)} />)}</Row>
      <View style={{ gap: 6 }}><T size={13} color={C.muted}>{entries.length ? `${entries.length} foods · ${sumMacros(entries).kcal} kcal` : 'No foods logged for this meal and date.'}</T>{entries.map((entry) => <T key={entry.id} size={13}>{entry.item.name} · {entry.grams}g</T>)}</View>
      <Btn title="Save template" onPress={save} />
      <Btn title="Log a meal first" kind="ghost" onPress={() => router.push({ pathname: '/food/add', params: { meal } })} />
    </Card>
  </Screen>;
}
