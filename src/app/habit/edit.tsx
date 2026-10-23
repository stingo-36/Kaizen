import { useLocalSearchParams, useRouter } from 'expo-router';
import { Minus, Plus } from '@/components/ico';
import { useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { HabitIcon } from '@/components/icons';
import { Btn, Label, Row, Screen, Segmented, Sheet, T, Tap, haptic, useToast } from '@/components/ui';
import { DAY_NAMES, parse, today, WEEK, ymd } from '@/lib/dates';
import { Habit, ICONS, isQuitIcon, newHabit, PASTEL } from '@/lib/habits';
import { ensurePermission, syncHabitReminders } from '@/lib/notifications';
import { useStore } from '@/lib/store';
import { C, F, themed } from '@/lib/theme';
import { useNow } from '@/lib/useNow';
import { goBack } from '@/lib/nav';

const TIMES = ['06:00', '06:30', '07:00', '07:30', '08:00', '09:00', '12:00', '13:00', '17:00', '18:00', '19:00', '20:00', '21:00', '21:30', '22:00', '22:30'];
const fmt = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`; };

export default function EditHabit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const toast = useToast();
  const { habits, setHabits } = useStore();
  const existing = id ? habits.find((h) => h.id === id) : undefined;
  const [d, setD] = useState<Habit & { quitDate: string }>(() => ({
    ...(existing ? JSON.parse(JSON.stringify(existing)) : newHabit()),
    quitDate: existing?.quitStart ? ymd(new Date(existing.quitStart)) : today(),
  }));
  const [err, setErr] = useState('');
  const [timeOpen, setTimeOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const now = useNow(60000);
  const isQuit = d.type === 'quit';
  const order = ICONS.map((_, i) => i).sort((a, b) => (isQuit ? +isQuitIcon(b) - +isQuitIcon(a) : +isQuitIcon(a) - +isQuitIcon(b))).slice(0, 12);

  const save = async () => {
    const name = d.name.trim();
    if (!name) return setErr('Give your habit a name');
    if (!isQuit && !d.days.length) return setErr('Pick at least one day to repeat on');
    const startChanged = isQuit && (!existing?.quitStart || ymd(new Date(existing.quitStart)) !== d.quitDate);
    const h: Habit = {
      ...(existing ?? newHabit()), name, type: d.type, icon: d.icon, days: d.days, goal: d.goal, reminder: isQuit ? null : d.reminder,
      quitStart: isQuit ? (startChanged ? (d.quitDate === today() ? new Date().toISOString() : parse(d.quitDate).toISOString()) : existing?.quitStart ?? new Date().toISOString()) : null,
    };
    const next = existing ? habits.map((x) => (x.id === h.id ? h : x)) : [...habits, h];
    setHabits(() => next);
    if (h.reminder) {
      const ok = await ensurePermission();
      if (!ok && Platform.OS !== 'web') toast('Turn on notifications in Settings to get reminders');
    }
    syncHabitReminders(next).catch(() => {});
    haptic('success');
    toast(existing ? 'Changes saved' : `Added "${name}"`);
    goBack('/habits');
  };

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => goBack('/habits')} hitSlop={10}><T size={15} color={C.muted}>Cancel</T></Pressable>
        <T size={17} w="s">{existing ? 'Edit habit' : 'New habit'}</T>
        <Pressable onPress={save} hitSlop={10}><T size={15} w="s" color={C.accent}>Save</T></Pressable>
      </Row>
      <Segmented options={[['build', 'Build a habit'], ['quit', 'Quit a habit']]} value={d.type} onChange={(v) => {
        const type = v as Habit['type'];
        let icon = d.icon;
        if (type === 'quit' && !isQuitIcon(icon)) icon = ICONS.findIndex((_, i) => isQuitIcon(i));
        if (type === 'build' && isQuitIcon(icon)) icon = 0;
        setD({ ...d, type, icon });
      }} />
      <View style={{ gap: 8 }}>
        <Label>Name</Label>
        <TextInput value={d.name} onChangeText={(v) => { setD({ ...d, name: v }); setErr(''); }} placeholder={isQuit ? 'No smoking' : 'Read 20 pages'} placeholderTextColor={C.faint}
          style={st.input} maxLength={40} autoFocus={!existing} returnKeyType="done" accessibilityLabel="Habit name" />
        {err ? <T size={13} color={C.danger}>{err}</T> : null}
      </View>
      <View style={{ gap: 8 }}>
        <Label>Icon</Label>
        <View style={st.icons}>
          {order.map((i) => {
            const [bg, ink] = PASTEL[i % 4];
            return (
              <Tap key={i} onPress={() => { haptic('select'); setD({ ...d, icon: i }); }} scale={0.9} style={st.iconCell} accessibilityLabel={ICONS[i]} accessibilityState={{ selected: d.icon === i }}>
                <View style={[st.iconTile, { backgroundColor: bg }, d.icon === i && { borderWidth: 2.5, borderColor: C.accent }]}><HabitIcon index={i} color={ink} size={22} /></View>
              </Tap>
            );
          })}
        </View>
      </View>
      {isQuit ? (
        <View style={{ gap: 8 }}>
          <Label>Quit since</Label>
          <Row gap={8}>
            {[0, 1, 7, 30].map((n) => {
              const dk = ymd(new Date(now - n * 864e5));
              return <Pressable key={n} onPress={() => setD({ ...d, quitDate: dk })} style={[st.pill, d.quitDate === dk && st.pillOn]}><T size={13} w="s" color={d.quitDate === dk ? C.white : C.ink}>{n === 0 ? 'Today' : n === 1 ? 'Yesterday' : `${n} days ago`}</T></Pressable>;
            })}
          </Row>
        </View>
      ) : (
        <>
          <View style={{ gap: 8 }}>
            <Label>Repeat on</Label>
            <Row gap={6} style={{ justifyContent: 'space-between' }}>
              {WEEK.map((w, i) => {
                const js = (i + 1) % 7, on = d.days.includes(js);
                return (
                  <Tap key={i} scale={0.9} onPress={() => { haptic('select'); setD({ ...d, days: on ? d.days.filter((x) => x !== js) : [...d.days, js] }); }}
                    style={[st.dayBtn, on && { backgroundColor: C.accent, borderColor: C.accent }]} accessibilityLabel={DAY_NAMES[js]} accessibilityState={{ selected: on }}>
                    <T size={14} w="s" color={on ? C.white : C.muted}>{w}</T>
                  </Tap>
                );
              })}
            </Row>
          </View>
          <View style={st.setting}>
            <View><T size={16} w="s">Daily goal</T><T size={13} color={C.muted}>Times per day</T></View>
            <Row gap={14}>
              <Tap scale={0.88} style={st.step} onPress={() => setD({ ...d, goal: Math.max(1, d.goal - 1) })} accessibilityLabel="Decrease goal"><Minus size={16} color={C.ink} /></Tap>
              <T size={18} w="b">{d.goal}</T>
              <Tap scale={0.88} style={[st.step, { backgroundColor: C.accentSoft }]} onPress={() => setD({ ...d, goal: Math.min(20, d.goal + 1) })} accessibilityLabel="Increase goal"><Plus size={16} color={C.accent} /></Tap>
            </Row>
          </View>
          <View style={st.setting}>
            <Pressable onPress={() => d.reminder && setTimeOpen(true)} style={{ flex: 1 }}>
              <T size={16} w="s">Reminder</T>
              <T size={13} color={d.reminder ? C.accent : C.muted}>{d.reminder ? `${fmt(d.reminder)} · tap to change` : 'Off'}</T>
            </Pressable>
            <Switch value={!!d.reminder} onValueChange={(v) => { setD({ ...d, reminder: v ? '09:00' : null }); if (v) setTimeOpen(true); }}
              trackColor={{ true: C.ink, false: C.field }} thumbColor={C.white} accessibilityLabel="Reminder" />
          </View>
        </>
      )}
      <View style={{ gap: 10, marginTop: 8 }}>
        <Btn title={existing ? 'Save changes' : 'Create habit'} onPress={save} />
        {existing && <Btn title="Delete habit" kind="danger" onPress={() => setDelOpen(true)} />}
      </View>

      <Sheet open={timeOpen} onClose={() => setTimeOpen(false)} title="Reminder time">
        <View style={st.times}>
          {TIMES.map((t) => (
            <Pressable key={t} onPress={() => { setD({ ...d, reminder: t }); setTimeOpen(false); }} style={[st.pill, d.reminder === t && st.pillOn]}>
              <T size={13} w="s" color={d.reminder === t ? C.white : C.ink}>{fmt(t)}</T>
            </Pressable>
          ))}
        </View>
      </Sheet>
      <Sheet open={delOpen} onClose={() => setDelOpen(false)} title={`Delete "${d.name}"?`} subtitle="This removes the habit and all its history.">
        <Btn title="Delete habit" kind="danger" onPress={() => {
          const copy = existing as Habit, idx = habits.indexOf(copy), next = habits.filter((x) => x.id !== copy.id);
          setHabits(() => next); syncHabitReminders(next).catch(() => {}); setDelOpen(false);
          router.dismissTo('/habits');
          toast('Habit deleted', () => setHabits((hs) => { const n = [...hs]; n.splice(idx, 0, copy); return n; }));
        }} />
        <Btn title="Cancel" kind="ghost" onPress={() => setDelOpen(false)} />
      </Sheet>
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  input: { minHeight: 54, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line, fontFamily: F.r, fontSize: 16, color: C.ink },
  icons: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  iconCell: { width: `${100 / 6}%`, padding: 4 },
  iconTile: { aspectRatio: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dayBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  setting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: 16, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  step: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.soft, alignItems: 'center', justifyContent: 'center' },
  pill: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 99, borderWidth: 1, borderColor: C.field, backgroundColor: C.card },
  pillOn: { backgroundColor: C.accent, borderColor: C.accent },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
}));
