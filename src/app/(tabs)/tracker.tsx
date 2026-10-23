import { useLocalSearchParams } from 'expo-router';
import { ReactNode, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

import { AppHeader } from '@/components/header';
import { ResourcesView } from '@/components/resources';
import { nestTone } from '@/components/tracker-card';
import { ArrowUp, Briefcase, CalendarClock, Check, ChevronDown, ChevronUp, Flag, LogOut, Plus, RefreshCw, ShieldCheck } from '@/components/ico';
import { Btn, IconBtn, Input, Row, Screen, Sheet, T, Tap, haptic, useToast } from '@/components/ui';
import { C, F, PASTEL, themed } from '@/lib/theme';
import { addDays, dayKey, dayLabel, NestEntry, WORKNEST_URL } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';

const host = WORKNEST_URL.replace(/^https?:\/\//, '');

/* A list screen, so it runs a size below the rest of Kaizen: 14 for titles, 12 for detail, 10.5 for labels. */
const FS = { title: 14, meta: 12, label: 10.5 };

type View_ = 'todo' | 'followups' | 'notes' | 'resources';
type Scope = 'work' | 'personal';

function Connect({ again }: { again?: boolean }) {
  const { connect, link } = useWorkNest();
  const toast = useToast();
  const [email, setEmail] = useState(link?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!email.trim()) return setErr('Enter your WorkNest email');
    if (!password) return setErr('Enter your WorkNest password');
    setBusy(true); setErr('');
    try {
      await connect(email, password);
      haptic('success'); toast('WorkNest connected');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t connect');
    } finally { setBusy(false); }
  };

  return (
    <View style={[st.card, { gap: 14, padding: 16 }]}>
      <Row gap={10}>
        <View style={[st.badge, { backgroundColor: nestTone()[0] }]}><Briefcase size={18} color={nestTone()[1]} /></View>
        <T size={17} w="s" style={{ flex: 1 }}>{again ? 'Sign in to WorkNest again' : 'Connect WorkNest'}</T>
      </Row>
      <T size={13} color={C.muted} style={{ lineHeight: 18 }}>
        {again
          ? 'WorkNest no longer accepts this phone’s key. Sign in once more to keep your Tracker here.'
          : 'See and add your to-dos, follow-ups and notes. Nothing else in WorkNest is shared.'}
      </T>
      <View style={st.server}>
        <ShieldCheck size={14} color={C.green} />
        <T size={12} w="m" style={{ flex: 1 }} numberOfLines={1}>{host}</T>
        <T size={10} w="s" color={C.muted} style={{ letterSpacing: 0.5 }}>TRACKER ONLY</T>
      </View>
      <Input label="Email" value={email} onChange={(v) => { setEmail(v); setErr(''); }} placeholder="you@example.com" keyboard="email-address" />
      <Input label="Password" value={password} onChange={(v) => { setPassword(v); setErr(''); }} placeholder="Your WorkNest password" secure />
      {err ? <T size={12} color={C.danger}>{err}</T> : null}
      <Btn title="Connect" onPress={submit} busy={busy} small />
      <T size={11} color={C.muted}>Your password isn’t saved. Kaizen keeps only a Tracker key on this phone.</T>
    </View>
  );
}

/* ---------- switching ---------- */
/** Text tabs with an underline, like WorkNest's own Tracker header. */
function Tabs({ value, onChange, items }: { value: View_; onChange: (v: View_) => void; items: [View_, string, number][] }) {
  return (
    // Scrolls sideways on narrow phones, where four labels with counts don't fit.
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.tabs} contentContainerStyle={{ gap: 18 }}>
      {items.map(([v, label, n]) => {
        const on = v === value;
        return (
          <Pressable key={v} onPress={() => { haptic('select'); onChange(v); }} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[st.tab, on && { borderBottomColor: C.ink }]} hitSlop={6}>
            <T size={13} w={on ? 's' : 'm'} color={on ? C.ink : C.muted}>{label} <T size={12} w="s" color={on ? C.accent : C.faint}>{n}</T></T>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** Small two-way pill: Work / Personal. */
function ScopeToggle({ value, onChange, work, personal }: { value: Scope; onChange: (v: Scope) => void; work: number; personal: number }) {
  return (
    <View style={st.toggle} accessibilityRole="radiogroup">
      {([['work', 'Work', work], ['personal', 'Personal', personal]] as const).map(([v, label, n]) => {
        const on = v === value;
        return (
          <Pressable key={v} onPress={() => { haptic('select'); onChange(v); }} accessibilityRole="radio" accessibilityState={{ checked: on }}
            style={[st.toggleBtn, on && { backgroundColor: C.ink }]}>
            <T size={12} w="s" color={on ? C.onInk : C.muted}>{label} {n}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- adding ---------- */
/** "Today", "Tomorrow", "Mon 26 Oct" or "No date" for the add box's date pill. */
function dueText(due: string | null) {
  if (!due) return 'No date';
  const today = dayKey();
  return due === today ? 'Today' : due === addDays(today, 1) ? 'Tomorrow' : dayLabel(due);
}

/** Pick a due day: quick choices, then the next two weeks. A plain list, so it ships without a native date picker. */
function DuePicker({ open, value, onPick, onClose }: { open: boolean; value: string | null; onPick: (d: string | null) => void; onClose: () => void }) {
  const today = dayKey();
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i + 2));
  const pick = (d: string | null) => { haptic('select'); onPick(d); onClose(); };
  const chip = (d: string | null, label: string) => (
    <Pressable key={label} onPress={() => pick(d)} accessibilityRole="radio" accessibilityState={{ checked: value === d }}
      style={[st.mini, { paddingVertical: 7, paddingHorizontal: 12 }, value === d && { backgroundColor: C.ink, borderColor: C.ink }]}>
      <T size={12.5} w="s" color={value === d ? C.onInk : C.ink}>{label}</T>
    </Pressable>
  );
  return (
    <Sheet open={open} onClose={onClose} title="Due date">
      <View style={st.chips}>{chip(today, 'Today')}{chip(addDays(today, 1), 'Tomorrow')}{chip(null, 'No date')}</View>
      <T size={10.5} w="s" color={C.muted} style={{ letterSpacing: 0.8, marginTop: 6 }}>LATER</T>
      <View style={st.chips}>{days.map((d) => chip(d, dayLabel(d)))}</View>
    </Sheet>
  );
}

/** One line to type in, with a date pill (Today by default) like WorkNest's add box. */
function Composer({ view, scope }: { view: View_; scope: Scope }) {
  const { add } = useWorkNest();
  const toast = useToast();
  const [text, setText] = useState('');
  const [person, setPerson] = useState('');
  const [due, setDue] = useState<string | null>(dayKey());
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const sticky = view === 'todo' && scope === 'personal';

  const submit = async () => {
    const subject = text.trim();
    if (!subject) return setErr(view === 'notes' ? 'Give the note a title' : 'Write something first');
    if (view === 'followups' && !person.trim()) return setErr('Who did you update?');
    setBusy(true); setErr('');
    try {
      const today = dayKey();
      await add(
        view === 'followups' ? { kind: 'FollowUp', person: person.trim(), subject }
          : view === 'notes' ? { kind: 'Note', subject }
          : sticky ? { kind: 'Task', personal: true, subject }
          : { kind: 'Task', subject, dueDate: due && due < today ? today : due },
      );
      haptic('success');
      setText(''); setPerson(''); setDue(dayKey());
      toast(view === 'followups' ? 'Follow-up added' : view === 'notes' ? 'Note added' : sticky ? 'Sticky note added' : 'To-do added');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t add it');
    } finally { setBusy(false); }
  };

  const pointy = isPointy(text) || /^\s*[*•]/.test(text);
  const type = (v: string) => { setText(continuePoints(text, v)); setErr(''); };
  const placeholder = view === 'followups' ? 'What did you tell them?' : view === 'notes' ? 'New note title' : sticky ? 'Jot a personal to-do…' : 'Add a to-do…';
  return (
    <View style={{ gap: 8 }}>
      {view === 'followups' && (
        <TextInput value={person} onChangeText={(v) => { setPerson(v); setErr(''); }} placeholder="Who? e.g. Ashwini" placeholderTextColor={C.faint}
          style={[st.field, st.fieldText]} accessibilityLabel="Person" />
      )}
      <View style={[st.field, (sticky || pointy) && { alignItems: 'flex-end' }, sticky && { backgroundColor: PASTEL[1][0], borderColor: 'transparent' }]}>
        <Plus size={15} color={sticky ? PASTEL[1][1] : C.faint} style={sticky || pointy ? { marginBottom: 13 } : undefined} />
        <TextInput value={text} onChangeText={type} placeholder={placeholder} placeholderTextColor={sticky ? PASTEL[1][1] : C.faint}
          multiline submitBehavior={sticky || pointy ? 'newline' : 'submit'} onSubmitEditing={sticky || pointy ? undefined : submit} returnKeyType={sticky || pointy ? 'default' : 'done'}
          style={[st.fieldText, sticky && { color: PASTEL[1][1], minHeight: 54, textAlignVertical: 'top' }]} accessibilityLabel={placeholder} />
        {view === 'todo' && scope === 'work' && (
          <Pressable onPress={() => setPicking(true)} accessibilityRole="button" accessibilityLabel={`Due: ${dueText(due)}. Change`} hitSlop={6} style={[st.datePill, pointy && { marginBottom: 7 }]}>
            <CalendarClock size={13} color={due ? C.accent : C.muted} />
            <T size={12} w="s" color={due ? C.accent : C.muted}>{dueText(due)}</T>
          </Pressable>
        )}
        <Pressable onPress={busy ? undefined : submit} accessibilityRole="button" accessibilityLabel="Add" hitSlop={8}
          style={[st.send, { backgroundColor: text.trim() ? C.ink : C.track }, (sticky || pointy) && { marginBottom: 6 }]}>
          {busy ? <ActivityIndicator size="small" color={C.onInk} /> : <ArrowUp size={14} color={text.trim() ? C.onInk : C.faint} />}
        </Pressable>
      </View>
      <DuePicker open={picking} value={due} onPick={setDue} onClose={() => setPicking(false)} />
      {err ? <T size={12} color={C.danger}>{err}</T> : null}
    </View>
  );
}

/* ---------- point-wise text ---------- */
/** A line written as a point: "* milk", "*milk", "- milk", "• milk", or numbered: "1. milk", "2) eggs". */
const POINT = /^\s*(?:[*•]\s*|-\s+|\d{1,2}[.)]\s+)(?=\S)/;
const NUMBER = /^\s*(\d{1,2})[.)]\s+/;
const isPointy = (text: string) => text.split('\n').some((l) => POINT.test(l));

/** Text where lines starting with * (or - / •) show as bullet points and "1." lines as a numbered list; other lines stay plain. */
function Points({ text, size, w = 'm', color, lineHeight, max, done }: { text: string; size: number; w?: 'r' | 'm' | 's'; color: string; lineHeight: number; max?: number; done?: boolean }) {
  const strike = done ? { textDecorationLine: 'line-through' as const } : null;
  if (!isPointy(text)) return <T size={size} w={w} color={color} numberOfLines={max} style={[{ lineHeight }, strike]}>{text}</T>;
  const lines = text.split('\n').filter((l) => l.trim()).slice(0, max);
  return (
    <View style={{ gap: 3 }}>
      {lines.map((l, i) => POINT.test(l) ? (
        <Row key={i} gap={7} style={{ alignItems: 'flex-start' }}>
          {NUMBER.test(l)
            ? <T size={size} w="s" color={color} style={{ lineHeight, minWidth: size }}>{NUMBER.exec(l)![1]}.</T>
            : <View style={[st.point, { backgroundColor: color, marginTop: lineHeight / 2 - 2 }]} />}
          <T size={size} w={w} color={color} style={[{ flex: 1, lineHeight }, strike]}>{l.replace(POINT, '')}</T>
        </Row>
      ) : <T key={i} size={size} w={w} color={color} style={[{ lineHeight }, strike]}>{l.trim()}</T>)}
    </View>
  );
}

/** Typing Enter after a point starts the next one (numbered lists count up); Enter on an empty point ends the list. */
function continuePoints(prev: string, next: string) {
  if (next.length !== prev.length + 1 || !next.endsWith('\n')) return next;
  const last = prev.split('\n').pop() ?? '';
  if (!/^\s*(?:[*•-]|\d{1,2}[.)])/.test(last)) return next;
  if (!POINT.test(last)) return prev.slice(0, prev.length - last.length);
  const n = NUMBER.exec(last);
  return n ? `${next}${Number(n[1]) + 1}. ` : `${next}* `;
}

/** Swipe a row right to tick it off (or reopen it), as an alternative to its circle. */
function SwipeToggle({ done, onToggle, children }: { done: boolean; onToggle: () => void; children: ReactNode }) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <Swipeable ref={ref} friction={1.4} leftThreshold={72} overshootLeft={false} dragOffsetFromLeft={12}
      onSwipeableWillOpen={() => { onToggle(); setTimeout(() => ref.current?.close(), 180); }}
      renderLeftActions={() => (
        <View style={[st.swipe, { backgroundColor: done ? C.soft : C.green }]}>
          {done ? <RefreshCw size={15} color={C.ink} /> : <Check size={16} color={C.white} />}
          <T size={12} w="s" color={done ? C.ink : C.white}>{done ? 'Reopen' : 'Done'}</T>
        </View>
      )}>
      {children}
    </Swipeable>
  );
}

/* ---------- rows ---------- */
function CheckDot({ done, onPress, label, color = C.field }: { done: boolean; onPress: () => void; label: string; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={label}
      style={[st.dot, { borderColor: color }, done && { backgroundColor: C.green, borderColor: C.green }]}>
      {done ? <Check size={11} color={C.white} /> : null}
    </Pressable>
  );
}

function EntryRow({ e, first, meta, metaTone, onToggle }: { e: NestEntry; first?: boolean; meta?: string; metaTone?: string; onToggle?: () => void }) {
  const done = e.status === 'Done';
  const row = (
    <View style={[st.row, !first && st.rule]}>
      {onToggle ? <CheckDot done={done} onPress={onToggle} label={`${done ? 'Reopen' : 'Mark done'}: ${e.subject}`} /> : <View style={st.bullet} />}
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        {meta ? <T size={FS.label} w="s" color={metaTone ?? C.muted} style={{ letterSpacing: 0.5, lineHeight: 13 }} numberOfLines={1}>{meta.toUpperCase()}</T> : null}
        <Points text={e.subject} size={FS.title} color={done ? C.muted : C.ink} lineHeight={19} done={done} />
        {e.lastUpdate ? (isPointy(e.lastUpdate.note) ? (
          <View style={{ gap: 2 }}>
            <T size={FS.meta} w="m" color={C.muted} style={{ lineHeight: 16 }}>{e.lastUpdate.fromThem ? 'Reply:' : 'Latest:'}</T>
            <Points text={e.lastUpdate.note} size={FS.meta} w="r" color={C.muted} lineHeight={16} max={5} />
          </View>
        ) : (
          <T size={FS.meta} color={C.muted} numberOfLines={2} style={{ lineHeight: 16 }}>
            <T size={FS.meta} w="m" color={C.muted}>{e.lastUpdate.fromThem ? 'Reply: ' : 'Latest: '}</T>{e.lastUpdate.note}
          </T>
        )) : null}
      </View>
      {e.pinned ? <Flag size={13} color={PASTEL[1][1]} style={{ marginTop: 3 }} /> : null}
    </View>
  );
  return onToggle ? <SwipeToggle done={done} onToggle={onToggle}>{row}</SwipeToggle> : row;
}

/** A small caps label, then rows on one card. */
function Group({ title, count, tone, children }: { title: string; count?: number; tone?: string; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Row gap={6}>
        <T size={FS.label} w="s" color={tone ?? C.muted} style={{ letterSpacing: 0.8 }}>{title.toUpperCase()}</T>
        {count != null ? <T size={FS.label} w="s" color={C.faint}>{count}</T> : null}
      </Row>
      <View style={st.card}>{children}</View>
    </View>
  );
}

/* ---------- to-do lists ---------- */
function WorkTodos({ list, toggle }: { list: NestEntry[]; toggle: (e: NestEntry) => void }) {
  const [showDone, setShowDone] = useState(false);
  const today = dayKey();
  const open = list.filter((e) => e.status === 'Open');
  const done = list.filter((e) => e.status === 'Done');
  const now = open.filter((e) => e.dueDate && e.dueDate <= today);
  const later = open.filter((e) => e.dueDate && e.dueDate > today);
  const undated = open.filter((e) => !e.dueDate);
  const days = [...new Set(later.map((e) => e.dueDate!))];

  if (!list.length) return <Empty text="No work to-dos. Add one above." />;
  return (
    <View style={{ gap: 16 }}>
      {now.length > 0 && (
        <Group title="Today" count={now.length} tone={PASTEL[4][1]}>
          {now.map((e, i) => (
            <EntryRow key={e.id} e={e} first={i === 0} onToggle={() => toggle(e)}
              meta={e.dueDate! < today ? `Overdue · ${dayLabel(e.dueDate!)}` : undefined} metaTone={C.danger} />
          ))}
        </Group>
      )}
      {days.map((d) => {
        const rows = later.filter((e) => e.dueDate === d);
        return (
          <Group key={d} title={d === addDays(today, 1) ? 'Tomorrow' : dayLabel(d)} count={rows.length}>
            {rows.map((e, i) => <EntryRow key={e.id} e={e} first={i === 0} onToggle={() => toggle(e)} />)}
          </Group>
        );
      })}
      {undated.length > 0 && (
        <Group title="No date" count={undated.length}>
          {undated.map((e, i) => <EntryRow key={e.id} e={e} first={i === 0} onToggle={() => toggle(e)} />)}
        </Group>
      )}
      {done.length > 0 && (
        <View style={{ gap: 6 }}>
          <Pressable onPress={() => setShowDone((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showDone }} hitSlop={8}>
            <Row gap={6}>
              <Check size={12} color={C.green} />
              <T size={12} w="m" color={C.muted} style={{ flex: 1 }}>{done.length} done recently</T>
              {showDone ? <ChevronUp size={14} color={C.faint} /> : <ChevronDown size={14} color={C.faint} />}
            </Row>
          </Pressable>
          {showDone && <View style={st.card}>{done.map((e, i) => <EntryRow key={e.id} e={e} first={i === 0} onToggle={() => toggle(e)} />)}</View>}
        </View>
      )}
    </View>
  );
}

/** Personal to-dos as sticky notes, like WorkNest's own Personal board. Tap one to edit or tick it. */
function Stickies({ list, toggle }: { list: NestEntry[]; toggle: (e: NestEntry) => void }) {
  const { edit } = useWorkNest();
  const toast = useToast();
  const [open, setOpen] = useState<NestEntry | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);

  const shown = [...list].sort((a, b) => Number(a.status === 'Done') - Number(b.status === 'Done'));
  if (!list.length) return <Empty text="No personal to-dos. Jot one above." />;

  const save = async () => {
    if (!open || !draft.trim()) return;
    setBusy(true);
    try { await edit(open.id, draft); setOpen(null); toast('Sticky note saved'); } catch (e) {
      toast(e instanceof Error ? e.message : 'Couldn’t save it');
    } finally { setBusy(false); }
  };

  return (
    <>
      <View style={st.grid}>
        {shown.map((e, i) => {
          const tone = PASTEL[i % PASTEL.length], done = e.status === 'Done';
          return (
            <Tap key={e.id} onPress={() => { setOpen(e); setDraft(e.subject); }} accessibilityLabel={`Sticky note: ${e.subject}. Edit`}
              style={[st.sticky, { backgroundColor: tone[0], transform: [{ rotate: i % 2 ? '0.8deg' : '-0.8deg' }] }, done && { opacity: 0.5 }]}>
              <Points text={e.subject} size={13} color={tone[1]} lineHeight={18} max={6} done={done} />
              <CheckDot done={done} color={tone[1]} onPress={() => toggle(e)} label={`${done ? 'Reopen' : 'Mark done'}: ${e.subject}`} />
            </Tap>
          );
        })}
      </View>
      <Sheet open={!!open} onClose={() => setOpen(null)} title="Sticky note" subtitle="Personal · only you see this">
        <TextInput value={draft} onChangeText={(v) => setDraft(continuePoints(draft, v))} multiline autoFocus style={[st.area, { backgroundColor: PASTEL[1][0], color: PASTEL[1][1] }]} accessibilityLabel="Sticky note text" />
        <Btn title="Save" onPress={save} busy={busy} small />
        {open && <Btn title={open.status === 'Done' ? 'Reopen' : 'Mark done'} kind="ghost" small onPress={() => { toggle(open); setOpen(null); }} />}
      </Sheet>
    </>
  );
}

const Empty = ({ text }: { text: string }) => <T size={13} color={C.muted} center style={{ paddingVertical: 20 }}>{text}</T>;

export default function Tracker() {
  const toast = useToast();
  const { status, link, entries, at, busy, error, load, setDone, disconnect, resources, loadResources } = useWorkNest();
  const params = useLocalSearchParams<{ view?: View_ }>();
  const [view, setView] = useState<View_>(params.view ?? 'todo');
  // Opened from Home's "Recently saved" card or after saving a resource: follow the new ?view=.
  const [seenView, setSeenView] = useState(params.view);
  if (params.view !== seenView) { setSeenView(params.view); if (params.view) setView(params.view); }
  const [scope, setScope] = useState<Scope>('work');

  const lists = useMemo(() => ({
    work: entries.filter((e) => e.kind === 'Task' && !e.personal),
    personal: entries.filter((e) => e.kind === 'Task' && e.personal),
    followups: entries.filter((e) => e.kind === 'FollowUp'),
    notes: entries.filter((e) => e.kind === 'Note' && e.status === 'Open'),
  }), [entries]);
  const openCount = (l: NestEntry[]) => l.filter((e) => e.status === 'Open').length;
  const today = dayKey();
  const dueToday = lists.work.filter((e) => e.status === 'Open' && e.dueDate && e.dueDate <= today).length;

  const toggle = (e: NestEntry) => {
    const done = e.status !== 'Done';
    haptic(done ? 'success' : 'light');
    setDone(e.id, done).then(
      () => { if (done) toast('Marked done', () => setDone(e.id, false).catch(() => {})); },
      (err) => toast(err instanceof Error ? err.message : 'Couldn’t update it'),
    );
  };

  return (
    <Screen tabs style={{ gap: 16 }}>
      <AppHeader title="Tracker" subtitle={status === 'on' ? (dueToday ? `${dueToday} to-do${dueToday > 1 ? 's' : ''} for today` : 'Nothing due today') : 'From WorkNest'}
        right={status === 'on' ? <IconBtn icon={RefreshCw} label="Refresh" onPress={() => { load(); loadResources(); }} /> : undefined} />

      {status === 'loading' ? (
        <Row gap={8}><ActivityIndicator color={C.accent} /><T size={13} color={C.muted}>Loading…</T></Row>
      ) : status !== 'on' ? (
        <Connect again={status === 'expired'} />
      ) : (
        <>
          <View style={{ gap: 12 }}>
            <Tabs value={view} onChange={setView} items={[
              ['todo', 'To-do', openCount(lists.work) + openCount(lists.personal)],
              ['followups', 'Follow-ups', openCount(lists.followups)],
              ['notes', 'Notes', lists.notes.length],
              ['resources', 'Resources', resources.length],
            ]} />
            {view === 'todo' && <ScopeToggle value={scope} onChange={setScope} work={openCount(lists.work)} personal={openCount(lists.personal)} />}
            {view !== 'resources' && <Composer view={view} scope={scope} />}
          </View>

          {view === 'resources' ? <ResourcesView /> : view === 'todo' ? (
            scope === 'work' ? <WorkTodos list={lists.work} toggle={toggle} /> : <Stickies list={lists.personal} toggle={toggle} />
          ) : view === 'followups' ? (
            lists.followups.length ? (
              <View style={st.card}>
                {lists.followups.map((e, i) => (
                  <EntryRow key={e.id} e={e} first={i === 0} onToggle={() => toggle(e)}
                    meta={[e.lastUpdate?.fromThem ? 'Replied' : null, e.person, e.dueDate ? dayLabel(e.dueDate) : null].filter(Boolean).join(' · ')}
                    metaTone={e.lastUpdate?.fromThem || (e.dueDate && e.dueDate <= today && e.status === 'Open') ? PASTEL[4][1] : undefined} />
                ))}
              </View>
            ) : <Empty text="No open follow-ups." />
          ) : lists.notes.length ? (
            <View style={st.card}>
              {lists.notes.map((e, i) => <EntryRow key={e.id} e={e} first={i === 0} meta={e.tags.length ? e.tags.map((t) => `#${t}`).join(' ') : undefined} />)}
            </View>
          ) : <Empty text="No notes yet." />}

          <View style={{ gap: 10, marginTop: 4 }}>
            {busy ? <Row gap={6} style={{ justifyContent: 'center' }}><ActivityIndicator size="small" color={C.accent} /><T size={11} color={C.muted}>Updating…</T></Row>
              : error ? <T size={11} color={C.danger} center>{error}</T>
              : at ? <T size={11} color={C.faint} center>Updated {new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</T> : null}
            <Pressable style={st.out} onPress={async () => { await disconnect(); toast('WorkNest disconnected'); }} accessibilityRole="button">
              <LogOut size={14} color={C.danger} />
              <T size={12} w="s" color={C.danger}>Disconnect WorkNest</T>
              <T size={11} color={C.faint} numberOfLines={1} style={{ flex: 1 }}>· {link?.email}</T>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  badge: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  server: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.soft },
  tabs: { borderBottomWidth: 1, borderBottomColor: C.line },
  tab: { paddingBottom: 8, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  toggle: { flexDirection: 'row', alignSelf: 'flex-start', padding: 3, borderRadius: 99, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  toggleBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 99 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 42, paddingLeft: 12, paddingRight: 5, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  fieldText: { flex: 1, minWidth: 0, fontFamily: F.r, fontSize: 14, color: C.ink, paddingVertical: 9, paddingHorizontal: 0 },
  send: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  datePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 5, paddingHorizontal: 9, borderRadius: 99, backgroundColor: C.accentTint },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  mini: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99, borderWidth: 1, borderColor: C.field },
  area: { minHeight: 90, borderRadius: 14, padding: 12, fontFamily: F.m, fontSize: 14, textAlignVertical: 'top' },
  // Rows carry the card's side padding and background, so the swipe action shows behind them edge to edge.
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 11, paddingHorizontal: 12, backgroundColor: C.card },
  rule: { borderTopWidth: 1, borderTopColor: C.line },
  swipe: { width: 110, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  bullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.faint, marginTop: 7, marginHorizontal: 6 },
  point: { width: 4, height: 4, borderRadius: 2, opacity: 0.7 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sticky: { width: '47%', flexGrow: 1, minHeight: 104, borderRadius: 14, padding: 12, gap: 10, justifyContent: 'space-between' },
  out: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 6 },
}));
