import { useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { CalendarDays, Check, RefreshCw, Reply, Send, Star } from '@/components/ico';
import { Avatar, Chip, DateChoice, Points, TK } from '@/components/tracker/parts';
import { BackHeader, Btn, haptic, IconBtn, Row, Screen, Sheet, T, useToast } from '@/components/ui';
import { goBack } from '@/lib/nav';
import { C, F, PASTEL, themed } from '@/lib/theme';
import { dayKey, dayName, NestEntryDetail, NestUpdate } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';

const DEFAULT_CHANNELS = ['Slack', 'Email', 'Call', 'Meeting', 'Teams', 'In person', 'Other'];
const KIND: Record<string, string> = { Task: 'To-do', FollowUp: 'Follow-up', Note: 'Note' };
const when = (iso: string) => {
  const d = new Date(iso);
  return `${dayName(iso.slice(0, 10))}, ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};

/** One to-do, follow-up or note with its whole history, and a box to add to it, like WorkNest's entry page. */
export default function Entry() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { entries, getEntry, addToEntry, setDone, change, options } = useWorkNest();
  const listed = entries.find((e) => e.id === id);
  const [entry, setEntry] = useState<NestEntryDetail | null>(null);
  const [err, setErr] = useState('');
  const [dating, setDating] = useState(false);

  const refresh = useCallback(() => getEntry(id).then(setEntry).catch((e) => setErr(e instanceof Error ? e.message : 'Couldn’t load it')), [getEntry, id]);
  // Fetch on open; the list version shows meanwhile.
  useEffect(() => { refresh(); }, [refresh]);

  const kind = entry?.kind ?? listed?.kind;
  const subject = entry?.subject ?? listed?.subject ?? '';
  const status = entry?.status ?? listed?.status ?? 'Open';
  const pinned = entry?.pinned ?? listed?.pinned ?? false;
  const due = entry?.dueDate ?? listed?.dueDate ?? null;
  const person = entry?.person ?? listed?.person ?? null;
  const tags = entry?.tags ?? listed?.tags ?? [];
  const today = dayKey();

  if (!kind) {
    return (
      <Screen>
        <BackHeader title="Tracker" onBack={() => goBack('/tracker')} />
        {err ? <T size={13} color={C.danger}>{err}</T> : <ActivityIndicator color={C.accent} />}
      </Screen>
    );
  }

  const act = (p: Promise<unknown>, done?: string) => p.then(() => { if (done) toast(done); refresh(); }, (e) => toast(e instanceof Error ? e.message : 'Couldn’t update it'));
  const toggleDone = () => { haptic(status === 'Open' ? 'success' : 'light'); act(setDone(id, status === 'Open'), status === 'Open' ? 'Marked done' : 'Reopened'); };
  const toggleStar = () => { haptic('select'); act(change(id, { pinned: !pinned })); };
  const setDue = (d: string | null) => { setDating(false); act(change(id, { dueDate: d }), d ? `Moved to ${dayName(d)}` : 'Date cleared'); };

  // Oldest first, so the thread reads top to bottom.
  const history = [...(entry?.updates ?? [])].reverse();
  const [body, ...additions] = kind === 'Note' ? history : [null, ...history];

  return (
    <Screen footer={<Composer kind={kind} person={person} channels={options.channels.length ? options.channels : DEFAULT_CHANNELS}
      onSend={async (u) => { const e = await addToEntry(id, u); setEntry(e); }} />}>
      <BackHeader title={KIND[kind]} onBack={() => goBack(kind === 'FollowUp' ? '/tracker/followups' : kind === 'Note' ? '/tracker/notes' : '/tracker/todo')}
        right={<IconBtn icon={Star} label={pinned ? 'Unstar' : 'Star'} onPress={toggleStar} />} />

      <View style={{ gap: 10 }}>
        {kind === 'FollowUp' && person ? (
          <Row gap={10}>
            <Avatar name={person} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={15} w="s">{person}</T>
              <T size={12} color={C.muted}>{history.find((u) => !u.fromThem)?.channel ?? 'Follow-up'}</T>
            </View>
          </Row>
        ) : null}
        <Points text={subject} size={18} w="s" lineHeight={24} done={status === 'Done'} color={status === 'Done' ? C.muted : C.ink} />
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {pinned ? <Pill tone={PASTEL[1]} icon={<Star size={11} color={PASTEL[1][1]} weight="fill" />} text="Starred" /> : null}
          {status === 'Done' ? <Pill tone={[C.soft, C.green]} icon={<Check size={11} color={C.green} />} text="Done" /> : null}
          {kind !== 'Note' ? (
            <Pressable onPress={() => setDating(true)} accessibilityRole="button" accessibilityLabel="Change date">
              <Pill tone={due && due < today && status === 'Open' ? [C.dangerSoft, C.danger] : [C.accentTint, C.accent]} icon={<CalendarDays size={11} color={due && due < today && status === 'Open' ? C.danger : C.accent} />}
                text={due ? `${kind === 'FollowUp' ? 'Remind' : 'Due'} ${dayName(due)}${due < today && status === 'Open' ? ' · overdue' : ''}` : 'No date · set one'} />
            </Pressable>
          ) : null}
          {tags.map((t) => <Pill key={t} tone={[C.soft, C.muted]} text={`#${t}`} />)}
        </Row>
      </View>

      <Btn title={status === 'Open' ? 'Mark done' : 'Reopen'} icon={status === 'Open' ? Check : RefreshCw} kind="ghost" small onPress={toggleDone} style={{ alignSelf: 'flex-start' }} />

      {!entry ? <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-start' }} />
        : kind === 'FollowUp' ? <Thread updates={history} person={person ?? 'They'} />
        : (
          <View style={{ gap: 12 }}>
            {body ? <View style={st.body}><Points text={(body as NestUpdate).note} size={14} w="r" lineHeight={21} /></View> : null}
            {additions.length ? <T size={TK.label} w="s" color={C.muted} style={{ letterSpacing: 0.6 }}>{kind === 'Note' ? 'ADDED LATER' : 'NOTES'}</T> : null}
            {additions.map((u) => u ? (
              <View key={u.id} style={st.added}>
                <Points text={u.note} size={13.5} w="r" lineHeight={20} />
                <T size={11} color={C.faint}>{when(u.occurredAt)}</T>
              </View>
            ) : null)}
            {!body && !additions.length ? <T size={13} color={C.muted}>{kind === 'Note' ? 'No text yet. Add it below.' : 'No notes yet.'}</T> : null}
          </View>
        )}
      {err ? <T size={12} color={C.danger}>{err}</T> : null}

      <Sheet open={dating} onClose={() => setDating(false)} title={kind === 'FollowUp' ? 'Remind me' : 'Due date'}>
        <View style={{ paddingBottom: 8 }}><DateChoice value={due} onChange={setDue} allowNone /></View>
      </Sheet>
    </Screen>
  );
}

function Pill({ tone, icon, text }: { tone: [string, string]; icon?: ReactNode; text: string }) {
  return <View style={[st.pill, { backgroundColor: tone[0] }]}>{icon}<T size={11.5} w="s" color={tone[1]}>{text}</T></View>;
}

/** A follow-up's history as a conversation: what you said on the right, their replies on the left. */
function Thread({ updates, person }: { updates: NestUpdate[]; person: string }) {
  if (!updates.length) return <T size={13} color={C.muted}>Nothing recorded yet.</T>;
  return (
    <View style={{ gap: 10 }}>
      {updates.map((u) => (
        <View key={u.id} style={[st.bubble, u.fromThem ? st.theirs : st.mine]}>
          {u.note ? <Points text={u.note} size={13.5} w="r" lineHeight={19} color={u.fromThem ? C.ink : C.onInk} /> : <T size={13} color={C.muted}>Replied</T>}
          <T size={10.5} color={u.fromThem ? C.faint : C.onInk} style={!u.fromThem && { opacity: 0.7 }}>{u.fromThem ? person : 'You'} · {u.channel} · {when(u.occurredAt)}</T>
        </View>
      ))}
    </View>
  );
}

/** The add box at the bottom: "I followed up" / "they replied" and where, for a follow-up; a note for anything else. */
function Composer({ kind, person, channels, onSend }: { kind: string; person: string | null; channels: string[]; onSend: (u: { note: string; channel?: string; fromThem?: boolean }) => Promise<void> }) {
  const toast = useToast();
  const follow = kind === 'FollowUp';
  const [fromThem, setFromThem] = useState(false);
  const [channel, setChannel] = useState(channels.find((c) => c.toLowerCase() === 'slack') ?? channels[0]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const canSend = (follow && fromThem) || !!text.trim();

  const send = async () => {
    if (!canSend || busy) return;
    setBusy(true);
    try {
      await onSend({ note: text.trim(), channel: follow ? channel : 'Other', fromThem: follow ? fromThem : false });
      haptic('success'); setText('');
      toast(follow ? (fromThem ? 'Reply recorded' : 'Message recorded') : 'Added');
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t add it');
    } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 8 }}>
      {follow ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
          <Chip label="I followed up" on={!fromThem} onPress={() => setFromThem(false)} icon={<Send size={12} color={!fromThem ? C.onInk : C.ink} />} />
          <Chip label={`${person ?? 'They'} replied`} on={fromThem} onPress={() => setFromThem(true)} icon={<Reply size={12} color={fromThem ? C.onInk : C.ink} />} />
          <View style={{ width: 1, backgroundColor: C.line, marginHorizontal: 2 }} />
          {channels.map((c) => <Chip key={c} label={c} on={channel === c} onPress={() => setChannel(c)} />)}
        </ScrollView>
      ) : null}
      <Row gap={8} style={{ alignItems: 'flex-end' }}>
        <TextInput value={text} onChangeText={setText} multiline placeholder={follow ? (fromThem ? `What did ${person ?? 'they'} say? (optional)` : 'What did you tell them?') : kind === 'Note' ? 'Add to this note…' : 'Add a note…'}
          placeholderTextColor={C.faint} style={st.input} accessibilityLabel="Add an update" />
        <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Send" style={[st.send, !canSend && { opacity: 0.35 }]}>
          {busy ? <ActivityIndicator size="small" color={C.onInk} /> : <Send size={17} color={C.onInk} />}
        </Pressable>
      </Row>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99 },
  body: { padding: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  added: { gap: 4, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 14, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  bubble: { maxWidth: '86%', gap: 4, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 16 },
  mine: { alignSelf: 'flex-end', backgroundColor: C.ink, borderBottomRightRadius: 5 },
  theirs: { alignSelf: 'flex-start', backgroundColor: C.card, borderWidth: 1, borderColor: C.line, borderBottomLeftRadius: 5 },
  input: { flex: 1, minWidth: 0, maxHeight: 110, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: C.field, backgroundColor: C.card, paddingHorizontal: 14, paddingTop: 11, paddingBottom: 11, fontFamily: F.r, fontSize: 14, color: C.ink },
  send: { width: 44, height: 44, borderRadius: 22, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
}));

