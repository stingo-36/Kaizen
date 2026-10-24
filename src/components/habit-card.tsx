import { useRouter } from 'expo-router';
import { Check, Clock, Flame, Plus } from '@/components/ico';
import { StyleSheet, View } from 'react-native';

import { fmtTime, today } from '@/lib/dates';
import { count, Habit, isDone, pastel, scheduleText, streak } from '@/lib/habits';
import { C, themed } from '@/lib/theme';
import { HabitIcon } from './icons';
import { Bar, T, Tap } from './ui';

/**
 * One habit: icon, name, time + status, round check (or + for counted habits).
 * `flat` renders it as a row inside a grouped card (with a divider unless `first`).
 */
export function HabitCard({ h, day = today(), onTap, flat, first }: { h: Habit; day?: string; onTap: () => void; flat?: boolean; first?: boolean }) {
  const router = useRouter();
  const [bg, ink] = pastel(h);
  const n = count(h, day), dn = isDone(h, day), s = streak(h), isToday = day === today();
  const status = dn ? 'Done' : h.skips[day] ? 'Skipped' : h.goal > 1 ? `${n} of ${h.goal}` : s && isToday ? `${s} day streak` : 'To do';
  return (
    <View style={[flat ? st.row : st.card, flat && !first && st.rule]}>
      <Tap style={st.main} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })} accessibilityLabel={`${h.name}, ${status}. Open details`}>
        <View style={[st.ic, { backgroundColor: bg }]}><HabitIcon index={h.icon} color={ink} size={18} /></View>
        <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <T size={14} w="m" color={dn ? C.muted : C.ink} numberOfLines={1} style={dn && { textDecorationLine: 'line-through' }}>{h.name}</T>
          <View style={st.meta}>
            {h.reminder ? <View style={st.time}><Clock size={10} color={C.muted} /><T size={11} w="s" color={C.muted}>{fmtTime(h.reminder)}</T></View> : null}
            <T size={12} color={C.muted}>{status}</T>
            {dn && s > 1 && isToday ? <View style={st.meta}><Flame size={12} color={C.accent} /><T size={12} w="s" color={C.muted}>{s}</T></View> : null}
          </View>
          {h.goal > 1 && !dn && <View style={{ marginTop: 3 }}><Bar value={n / h.goal} color={ink} height={4} /></View>}
        </View>
      </Tap>
      <Tap onPress={onTap} scale={0.85} accessibilityRole="checkbox" accessibilityState={{ checked: dn }} accessibilityLabel={h.goal > 1 && !dn ? `Add one to ${h.name}` : `Mark ${h.name} ${dn ? 'not done' : 'done'}`}
        style={[st.check, h.goal > 1 && !dn && { borderColor: 'transparent', backgroundColor: bg }, dn && { backgroundColor: C.green, borderColor: C.green }]}>
        {dn ? <Check size={14} color={C.white} strokeWidth={2.8} /> : h.goal > 1 ? <Plus size={15} color={ink} strokeWidth={2.4} /> : null}
      </Tap>
    </View>
  );
}

/** Compact link row for habits not scheduled today or quit habits. */
export function HabitLinkRow({ h, meta }: { h: Habit; meta?: string }) {
  const router = useRouter();
  const [bg, ink] = pastel(h);
  return (
    <Tap style={[st.card, { opacity: 0.8 }]} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}>
      <View style={[st.ic, { backgroundColor: bg }]}><HabitIcon index={h.icon} color={ink} size={18} /></View>
      <View style={{ flex: 1 }}><T size={14} w="m" numberOfLines={1}>{h.name}</T><T size={12} color={C.muted}>{meta ?? scheduleText(h)}</T></View>
    </Tap>
  );
}

const st = themed(() => StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, paddingRight: 14, borderRadius: 20, backgroundColor: C.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11 },
  rule: { borderTopWidth: 1, borderTopColor: C.line },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minWidth: 0 },
  ic: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  time: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingVertical: 1, paddingHorizontal: 6, borderRadius: 99, backgroundColor: C.soft },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: C.faint, alignItems: 'center', justifyContent: 'center' },
}));
