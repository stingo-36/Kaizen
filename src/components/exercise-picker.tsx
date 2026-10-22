import { HeartPulse, Plus, Search, Sparkles } from '@/components/ico';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, View } from 'react-native';

import { libMeta, libToPlan, MUSCLE_GROUPS, searchLibrary, useLibrary } from '@/lib/exercises';
import { C, F, themed } from '@/lib/theme';
import { PlanExercise } from '@/lib/workout';
import { Btn, Chip, IconBtn, Row, T, Tap } from './ui';

/** Search the free exercise library; tap to add with defaults, or the sparkle to let the AI set targets. */
export function ExercisePicker({ onPick, busy, initial = '', limit = 25 }: { onPick: (e: PlanExercise, ai: boolean) => void; busy?: boolean; initial?: string; limit?: number }) {
  const { list, loading, error, retry } = useLibrary();
  const [q, setQ] = useState(initial);
  const [group, setGroup] = useState<string | undefined>();
  const hits = useMemo(() => (q.trim() || group ? searchLibrary(list, q, group, limit) : []), [list, q, group, limit]);

  return (
    <View style={{ gap: 10 }}>
      <View style={st.search}>
        <Search size={17} color={C.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search exercises, e.g. row, squat, bike" placeholderTextColor={C.faint} style={st.input}
          autoCorrect={false} accessibilityLabel="Search exercises" />
      </View>
      <Row gap={6} style={{ flexWrap: 'wrap' }}>
        {MUSCLE_GROUPS.map(([g]) => <Chip key={g} label={g} on={group === g} onPress={() => setGroup(group === g ? undefined : g)} style={{ paddingVertical: 7, paddingHorizontal: 11 }} />)}
      </Row>
      {loading && <Row gap={8} style={{ paddingVertical: 8 }}><ActivityIndicator color={C.accent} /><T size={13} color={C.muted}>Loading exercise library…</T></Row>}
      {error ? <View style={{ gap: 8 }}><T size={13} color={C.danger}>{error}</T><Btn title="Try again" kind="ghost" small onPress={retry} /></View> : null}
      {busy && <Row gap={8}><ActivityIndicator color={C.accent} /><T size={13} color={C.muted}>Setting targets for you…</T></Row>}
      {!loading && !error && !hits.length && <T size={13} color={C.muted}>{q.trim() || group ? 'No matches. Try a shorter word.' : `${list.length} exercises. Search or pick a muscle group.`}</T>}
      {hits.map((e) => {
        const pe = libToPlan(e);
        return (
          <View key={e.id} style={st.row}>
            <Tap style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }} scale={0.98} onPress={() => onPick(pe, false)} accessibilityLabel={`Add ${e.name}`}>
              {pe.kind === 'cardio' ? <HeartPulse size={16} color={C.accent} /> : null}
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={15} w="s" numberOfLines={1}>{e.name}</T>
                <T size={12} color={C.muted} numberOfLines={1}>{libMeta(e)}</T>
              </View>
              <Plus size={18} color={C.accent} />
            </Tap>
            <IconBtn icon={Sparkles} size={34} label={`Add ${e.name} with AI targets`} onPress={busy ? undefined : () => onPick(pe, true)} />
          </View>
        );
      })}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 46, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.soft },
  input: { flex: 1, minWidth: 0, fontFamily: F.r, fontSize: 15, color: C.ink, paddingVertical: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingLeft: 12, paddingRight: 4, borderRadius: 16, backgroundColor: C.soft },
}));
