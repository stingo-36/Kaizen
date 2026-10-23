import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { X } from '@/components/ico';
import { Btn, haptic, Row, Sheet, T, useToast } from '@/components/ui';
import { C, F, PASTEL, themed } from '@/lib/theme';
import { dayKey, NewEntry } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';
import { Avatar, Chip, DateChoice, FieldLabel, LineInput, StarToggle, TextArea } from './parts';

export type AddMode = 'work' | 'personal' | 'followup' | 'note';

/** WorkNest's built-in channel list, for a WorkNest that hasn't sent the user's own yet. */
const DEFAULT_CHANNELS = ['Slack', 'Email', 'Call', 'Meeting', 'Teams', 'In person', 'Other'];
const defaultChannel = (list: string[]) => list.find((c) => c.toLowerCase() === 'slack') ?? list[0] ?? 'Slack';
const tagOf = (raw: string) => raw.trim().replace(/^#+/, '').trim().toLowerCase().replace(/\s+/g, '-').slice(0, 40);

const TITLES: Record<AddMode, string> = { work: 'New to-do', personal: 'New sticky note', followup: 'New follow-up', note: 'New note' };

/**
 * Add a to-do, sticky note, follow-up or note, with the same fields as WorkNest's Tracker:
 * to-dos take a due date; follow-ups who, where and a reminder; notes a body, date and tags; any can be starred.
 */
export function AddSheet({ open, mode, onClose, initial = '' }: { open: boolean; mode: AddMode; onClose: () => void; initial?: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={TITLES[mode]}>
      {/* Keyed so each open starts from a clean form. */}
      {open ? <AddForm key={`${mode}:${initial}`} mode={mode} initial={initial} onDone={onClose} /> : null}
    </Sheet>
  );
}

function AddForm({ mode, initial, onDone }: { mode: AddMode; initial: string; onDone: () => void }) {
  const { add, options, entries } = useWorkNest();
  const toast = useToast();
  const today = dayKey();
  const channels = options.channels.length ? options.channels : DEFAULT_CHANNELS;

  const [subject, setSubject] = useState(initial);
  const [due, setDue] = useState<string | null>(mode === 'personal' ? null : today);
  const [person, setPerson] = useState('');
  const [channel, setChannel] = useState(defaultChannel(channels));
  const [body, setBody] = useState('');
  const [noteDay, setNoteDay] = useState<string | null>(today);
  const [tags, setTags] = useState<string[]>([]);
  const [tagText, setTagText] = useState('');
  const [pinned, setPinned] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // Names you've logged before; the closest matches to what's typed first.
  const people = useMemo(() => {
    const q = person.trim().toLowerCase();
    return options.people.filter((p) => p.toLowerCase() !== q && (!q || p.toLowerCase().includes(q))).slice(0, 8);
  }, [options.people, person]);
  // Saved note tags plus tags already on notes, minus the ones picked.
  const tagIdeas = useMemo(() => {
    const used = entries.filter((e) => e.kind === 'Note').flatMap((e) => e.tags);
    const q = tagOf(tagText);
    return [...new Set([...options.noteTags, ...used])].filter((t) => !tags.includes(t) && (!q || t.includes(q))).slice(0, 10);
  }, [options.noteTags, entries, tags, tagText]);

  const addTag = (raw: string) => {
    const t = tagOf(raw);
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagText('');
  };

  const save = async () => {
    const text = subject.trim();
    if (!text) return setErr(mode === 'note' ? 'Give the note a title' : mode === 'followup' ? 'Write what you’re waiting on first' : 'Write the to-do first');
    if (mode === 'followup' && !person.trim()) return setErr('Who are you waiting on?');
    const entry: NewEntry =
      mode === 'work' ? { kind: 'Task', subject: text, dueDate: due, pinned }
      : mode === 'personal' ? { kind: 'Task', personal: true, subject: text, dueDate: due, pinned }
      // The first message is a real history row, like WorkNest's own form.
      : mode === 'followup' ? { kind: 'FollowUp', person: person.trim(), subject: text, note: text, channel, dueDate: due, pinned }
      : {
        kind: 'Note', subject: text, channel: 'Other', tags: tagText.trim() ? [...tags, tagOf(tagText)] : tags, pinned,
        ...(body.trim() ? { note: body.trim() } : {}),
        // Now when it's today, else midday of the chosen day (no timezone drift), like WorkNest.
        occurredAt: noteDay && noteDay !== today ? new Date(`${noteDay}T12:00:00`).toISOString() : null,
      };
    setBusy(true); setErr('');
    try {
      await add(entry);
      haptic('success');
      toast(mode === 'personal' ? 'Sticky note added' : mode === 'followup' ? 'Follow-up added' : mode === 'note' ? 'Note added' : 'To-do added');
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t add it');
    } finally { setBusy(false); }
  };

  return (
    <View style={{ gap: 14, paddingBottom: 6 }}>
      {mode === 'personal' ? (
        <TextArea value={subject} onChange={(v) => { setSubject(v); setErr(''); }} placeholder="Jot a personal to-do… (* starts a list)" minHeight={96} autoFocus tone={PASTEL[1]} />
      ) : (
        <LineInput value={subject} onChange={(v) => { setSubject(v); setErr(''); }} autoFocus
          placeholder={mode === 'followup' ? 'What are you waiting on?' : mode === 'note' ? 'Note title' : 'What needs doing?'} />
      )}

      {mode === 'followup' ? (
        <>
          <View style={{ gap: 8 }}>
            <FieldLabel>Who</FieldLabel>
            <LineInput value={person} onChange={(v) => { setPerson(v); setErr(''); }} placeholder="Type a name" />
            {people.length ? (
              <View style={st.chips}>
                {people.map((p) => <Chip key={p} label={p} onPress={() => setPerson(p)} icon={<Avatar name={p} size={18} />} />)}
              </View>
            ) : null}
          </View>
          <View style={{ gap: 8 }}>
            <FieldLabel>Where</FieldLabel>
            <View style={st.chips}>{channels.map((c) => <Chip key={c} label={c} on={channel === c} onPress={() => setChannel(c)} />)}</View>
          </View>
        </>
      ) : null}

      {mode === 'note' ? (
        <View style={{ gap: 8 }}>
          <FieldLabel>Note</FieldLabel>
          <TextArea value={body} onChange={setBody} placeholder="Write the note… (* or 1. starts a list)" minHeight={110} />
        </View>
      ) : null}

      <View style={{ gap: 8 }}>
        <FieldLabel>{mode === 'followup' ? 'Remind me' : mode === 'note' ? 'Date' : 'Due'}</FieldLabel>
        {mode === 'note'
          ? <DateChoice value={noteDay} onChange={setNoteDay} past />
          : <DateChoice value={due} onChange={setDue} allowNone />}
      </View>

      {mode === 'note' ? (
        <View style={{ gap: 8 }}>
          <FieldLabel hint="Enter adds a tag">Tags</FieldLabel>
          {tags.length ? (
            <View style={st.chips}>
              {tags.map((t) => (
                <Pressable key={t} onPress={() => setTags(tags.filter((x) => x !== t))} style={st.tag} accessibilityRole="button" accessibilityLabel={`Remove #${t}`}>
                  <T size={12.5} w="s" color={PASTEL[1][1]}>#{t}</T><X size={12} color={PASTEL[1][1]} />
                </Pressable>
              ))}
            </View>
          ) : null}
          <TagField value={tagText} onChange={(v) => (/[,\n]$/.test(v) ? addTag(v) : setTagText(v))} onSubmit={() => addTag(tagText)} />
          {tagIdeas.length ? <View style={st.chips}>{tagIdeas.map((t) => <Chip key={t} label={`#${t}`} onPress={() => addTag(t)} />)}</View> : null}
        </View>
      ) : null}

      <Row style={{ justifyContent: 'space-between' }}>
        <StarToggle value={pinned} onChange={setPinned} />
      </Row>
      {err ? <T size={12.5} color={C.danger}>{err}</T> : null}
      <Btn title={mode === 'note' ? 'Add note' : mode === 'followup' ? 'Add follow-up' : mode === 'personal' ? 'Add sticky note' : 'Add to-do'} onPress={save} busy={busy} />
    </View>
  );
}

/** One-line tag box: return (or a comma) adds the tag. */
function TagField({ value, onChange, onSubmit }: { value: string; onChange: (v: string) => void; onSubmit: () => void }) {
  return (
    <TextInput value={value} onChangeText={onChange} onSubmitEditing={onSubmit} submitBehavior="submit" returnKeyType="done" placeholder="e.g. deploy, design"
      placeholderTextColor={C.faint} autoCapitalize="none" accessibilityLabel="Add a tag" style={st.line} />
  );
}

const st = themed(() => StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10, borderRadius: 99, backgroundColor: PASTEL[1][0] },
  line: { minHeight: 46, borderRadius: 14, borderWidth: 1.5, borderColor: C.field, backgroundColor: C.card, paddingHorizontal: 12, fontFamily: F.r, fontSize: 14, color: C.ink },
}));
