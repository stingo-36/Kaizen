import { useRouter } from 'expo-router';
import { Check, Clock, Flame, Plus } from '@/components/ico';
import { StyleSheet, View } from 'react-native';

import { fmtTime, today } from '@/lib/dates';
import { count, Habit, isDone, pastel, scheduleText, streak } from '@/lib/habits';
import { C, themed } from '@/lib/theme';
import { HabitIcon } from './icons';
import { Bar, T, Tap } from './ui';

/** Full-width habit card: pastel icon, name, time tag + status, round check (or + for counted habits). */
export function HabitCard({ h, day = today(), onTap }: { h: Habit; day?: string; onTap: () => void }) {
  const router = useRouter();
  const [bg, ink] = pastel(h);
  const n = count(h, day), dn = isDone(h, day), s = streak(h), isToday = day === today();
  const status = dn ? 'Done' : h.skips[day] ? 'Skipped' : h.goal > 1 ? `${n} of ${h.goal}` : s && isToday ? `${s} day streak` : 'To do';
  return (
    <View style={[st.card, dn && { backgroundColor: bg, borderColor: 'transparent' }]}>
      <Tap style={st.main} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })} accessibilityLabel={`${h.name}, ${status}. Open details`}>
        <View style={[st.ic, { backgroundColor: dn ? C.glass : bg }]}><HabitIcon index={h.icon} color={ink} size={21} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
          <T size={15} w="s" color={dn ? ink : C.ink} numberOfLines={1}>{h.name}</T>
          <View style={st.meta}>
            {h.reminder ? <View style={[st.time, dn && { backgroundColor: C.glass }]}><Clock size={11} color={dn ? ink : C.muted} /><T size={11} w="s" color={dn ? ink : C.muted}>{fmtTime(h.reminder)}</T></View> : null}
            <T size={12} color={dn ? ink : C.muted}>{status}</T>
            {dn && s > 1 && isToday ? <View style={st.meta}><Flame size={12} color={C.accent} /><T size={12} w="s" color={ink}>{s}</T></View> : null}
          </View>
          {h.goal > 1 && <View style={{ marginTop: 2 }}><Bar value={n / h.goal} color={ink} height={5} track={dn ? C.glass : C.track} /></View>}
        </View>
      </Tap>
      <Tap onPress={onTap} scale={0.85} accessibilityRole="checkbox" accessibilityState={{ checked: dn }} accessibilityLabel={h.goal > 1 && !dn ? `Add one to ${h.name}` : `Mark ${h.name} ${dn ? 'not done' : 'done'}`}
        style={[st.check, h.goal > 1 && !dn && { borderColor: 'transparent', backgroundColor: bg }, dn && { backgroundColor: C.ink, borderColor: C.ink }]}>
        {dn ? <Check size={16} color={C.onInk} strokeWidth={2.6} /> : h.goal > 1 ? <Plus size={16} color={ink} strokeWidth={2.4} /> : null}
      </Tap>
    </View>
  );
}

/** Compact link row for habits not scheduled today or quit habits. */
export function HabitLinkRow({ h, meta }: { h: Habit; meta?: string }) {
  const router = useRouter();
  const [bg, ink] = pastel(h);
  return (
    <Tap style={[st.card, { opacity: 0.75 }]} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}>
      <View style={[st.ic, { backgroundColor: bg }]}><HabitIcon index={h.icon} color={ink} size={21} /></View>
      <View style={{ flex: 1 }}><T size={15} w="s" numberOfLines={1}>{h.name}</T><T size={12} color={C.muted}>{meta ?? scheduleText(h)}</T></View>
    </Tap>
  );
}

const st = themed(() => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 14, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  ic: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 99, backgroundColor: C.soft },
  check: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: C.field, alignItems: 'center', justifyContent: 'center' },
}));
