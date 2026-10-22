import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { dayKey } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';
import { C, themed } from '@/lib/theme';
import { Briefcase, Check, ChevronRight } from './ico';
import { haptic, LinkRow, Row, T, useToast } from './ui';

// WorkNest's own colour: teal, outside the five pastels.
export const nestTone = (): [string, string] => [C.tealSoft, C.teal];
const SHOWN = 4;

/** Home card: today's WorkNest to-dos (work, due today or overdue), tickable right here. */
export function TrackerCard() {
  const router = useRouter();
  const toast = useToast();
  const { status, entries, setDone } = useWorkNest();
  const open = () => router.navigate('/tracker');

  if (status === 'loading') return null;
  if (status === 'off') return <LinkRow icon={Briefcase} tone={nestTone()} title="Connect WorkNest" sub="See today’s to-dos here" onPress={open} />;
  if (status === 'expired') return <LinkRow icon={Briefcase} tone={nestTone()} title="Reconnect WorkNest" sub="Sign in again to see your to-dos" onPress={open} />;

  const today = dayKey();
  // Ones ticked today stay listed (struck through), so a mis-tap can be undone on the spot.
  const todays = entries.filter((e) => e.kind === 'Task' && !e.personal && e.dueDate && e.dueDate <= today
    && (e.status === 'Open' || (e.completedAt && dayKey(new Date(e.completedAt)) === today)));
  const left = todays.filter((e) => e.status === 'Open').length;
  const personal = entries.filter((e) => e.kind === 'Task' && e.personal && e.status === 'Open').length;

  const toggle = (id: string, done: boolean) => {
    haptic(done ? 'success' : 'light');
    setDone(id, done).catch((err) => toast(err instanceof Error ? err.message : 'Couldn’t update it'));
  };

  return (
    <View style={st.card}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Today’s to-dos: ${left} left. Open Tracker`}>
        <Row gap={10}>
          <View style={[st.ic, { backgroundColor: nestTone()[0] }]}><Briefcase size={15} color={nestTone()[1]} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={14} w="s">Today’s to-dos</T>
            <T size={11.5} color={C.muted}>{todays.length ? (left ? `${left} left${personal ? ` · ${personal} personal` : ''}` : 'All done') : 'Nothing due today'}</T>
          </View>
          <ChevronRight size={16} color={C.faint} />
        </Row>
      </Pressable>
      {todays.slice(0, SHOWN).map((e) => {
        const done = e.status === 'Done', late = e.dueDate! < today;
        return (
          <Row key={e.id} gap={10} style={st.row}>
            <Pressable onPress={() => toggle(e.id, !done)} hitSlop={12} accessibilityRole="checkbox" accessibilityState={{ checked: done }}
              accessibilityLabel={`${done ? 'Reopen' : 'Mark done'}: ${e.subject}`} style={[st.dot, done && { backgroundColor: C.green, borderColor: C.green }]}>
              {done ? <Check size={10} color={C.white} /> : null}
            </Pressable>
            <T size={13} w="m" numberOfLines={1} color={done ? C.muted : C.ink} style={[{ flex: 1 }, done && { textDecorationLine: 'line-through' }]}>{e.subject}</T>
            {late && !done ? <T size={10} w="s" color={C.danger} style={{ letterSpacing: 0.4 }}>OVERDUE</T> : null}
          </Row>
        );
      })}
      {todays.length > SHOWN && (
        <Pressable onPress={open} accessibilityRole="button" hitSlop={6}>
          <T size={12} w="s" color={C.accent}>+{todays.length - SHOWN} more in Tracker</T>
        </Pressable>
      )}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  ic: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  row: { paddingTop: 9, borderTopWidth: 1, borderTopColor: C.line },
  dot: { width: 17, height: 17, borderRadius: 9, borderWidth: 1.5, borderColor: C.field, alignItems: 'center', justifyContent: 'center' },
}));
