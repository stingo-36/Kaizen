import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Notepad, Search } from '@/components/ico';
import { AddSheet } from '@/components/tracker/add-sheet';
import { Chip, Empty, EntryRow, Fab, ListCard, Section } from '@/components/tracker/parts';
import { BackHeader, Screen, T } from '@/components/ui';
import { goBack } from '@/lib/nav';
import { C, F, PASTEL, themed } from '@/lib/theme';
import { dayName } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';

/** Notes: starred first, then newest; search and filter by tag. Tap one to read it in full. */
export default function Notes() {
  const router = useRouter();
  const { entries } = useWorkNest();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const notes = useMemo(() => entries.filter((e) => e.kind === 'Note' && e.status === 'Open')
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt)), [entries]);
  const tags = useMemo(() => [...new Set(notes.flatMap((n) => n.tags))].slice(0, 20), [notes]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase().replace(/^#/, '');
    return notes.filter((n) => (!tag || n.tags.includes(tag))
      && (!needle || [n.subject, n.lastUpdate?.note ?? '', ...n.tags].join(' ').toLowerCase().includes(needle)));
  }, [notes, q, tag]);
  const pinned = shown.filter((n) => n.pinned), rest = shown.filter((n) => !n.pinned);

  const rows = (items: typeof notes) => (
    <ListCard>
      {items.map((n, i) => (
        <EntryRow key={n.id} first={i === 0} title={n.subject} sub={n.lastUpdate?.note} pinned={n.pinned}
          lead={<View style={st.ic}><Notepad size={15} color={PASTEL[1][1]} /></View>}
          meta={[dayName(n.updatedAt.slice(0, 10)), ...n.tags.slice(0, 3).map((t) => `#${t}`)].join('  ·  ')}
          onPress={() => router.push(`/tracker/entry/${n.id}`)} />
      ))}
    </ListCard>
  );

  return (
    <Screen overlay={<Fab label="Add a note" onPress={() => setAdding(true)} />} style={{ paddingBottom: 110 }}>
      <BackHeader title="Notes" onBack={() => goBack('/tracker')} />
      {notes.length ? (
        <View style={{ gap: 10 }}>
          <View style={st.search}>
            <Search size={14} color={C.faint} />
            <TextInput value={q} onChangeText={setQ} placeholder="Search notes or #tag" placeholderTextColor={C.faint} style={st.searchText} accessibilityLabel="Search notes" />
          </View>
          {tags.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip label="All" on={!tag} onPress={() => setTag(null)} />
              {tags.map((t) => <Chip key={t} label={`#${t}`} on={tag === t} onPress={() => setTag(tag === t ? null : t)} />)}
            </ScrollView>
          ) : null}
        </View>
      ) : <Empty title="No notes yet" text="Tap + to write one, with a date and tags, like on WorkNest." />}
      {pinned.length ? <View style={{ gap: 12 }}><Section title="Starred" count={pinned.length} />{rows(pinned)}</View> : null}
      {rest.length ? <View style={{ gap: 12 }}><Section title={pinned.length ? 'Other notes' : 'All notes'} count={rest.length} />{rows(rest)}</View> : null}
      {notes.length && !shown.length ? <T size={13} color={C.muted} center>Nothing matches.</T> : null}
      <AddSheet open={adding} mode="note" onClose={() => setAdding(false)} />
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  ic: { width: 30, height: 30, borderRadius: 10, backgroundColor: PASTEL[1][0], alignItems: 'center', justifyContent: 'center' },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  searchText: { flex: 1, minWidth: 0, fontFamily: F.r, fontSize: 14, color: C.ink, paddingVertical: 8 },
}));
