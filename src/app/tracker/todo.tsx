import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Check, ChevronDown, ChevronUp } from '@/components/ico';
import { AddSheet } from '@/components/tracker/add-sheet';
import { CheckDot, Empty, EntryRow, Fab, ListCard, Points, Section, TextArea } from '@/components/tracker/parts';
import { BackHeader, Btn, haptic, Row, Screen, Segmented, Sheet, T, Tap, useToast } from '@/components/ui';
import { goBack } from '@/lib/nav';
import { C, PASTEL, themed } from '@/lib/theme';
import { dayKey, dayLabel, dayName, NestEntry } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';

type Scope = 'work' | 'personal';

/** To-do: Work grouped by day (Today, Tomorrow, later days, No date), Personal as sticky notes. */
export default function Todo() {
  const router = useRouter();
  const toast = useToast();
  const { entries, setDone } = useWorkNest();
  const [scope, setScope] = useState<Scope>('work');
  const [adding, setAdding] = useState(false);
  const today = dayKey();

  const work = useMemo(() => entries.filter((e) => e.kind === 'Task' && !e.personal), [entries]);
  const personal = useMemo(() => entries.filter((e) => e.kind === 'Task' && e.personal), [entries]);
  const openCount = (l: NestEntry[]) => l.filter((e) => e.status === 'Open').length;

  const toggle = (e: NestEntry) => {
    const done = e.status !== 'Done';
    haptic(done ? 'success' : 'light');
    setDone(e.id, done).then(
      () => { if (done) toast('Marked done', () => setDone(e.id, false).catch(() => {})); },
      (err) => toast(err instanceof Error ? err.message : 'Couldn’t update it'),
    );
  };

  return (
    <Screen overlay={<Fab label={scope === 'work' ? 'Add a to-do' : 'Add a sticky note'} onPress={() => setAdding(true)} />} style={{ paddingBottom: 110 }}>
      <BackHeader title="To-do" onBack={() => goBack('/tracker')} />
      <Segmented value={scope} onChange={(v) => setScope(v as Scope)}
        options={[['work', `Work  ${openCount(work)}`], ['personal', `Personal  ${openCount(personal)}`]]} />
      {scope === 'work'
        ? <WorkList list={work} today={today} toggle={toggle} open={(e) => router.push(`/tracker/entry/${e.id}`)} />
        : <Stickies list={personal} toggle={toggle} />}
      <AddSheet open={adding} mode={scope} onClose={() => setAdding(false)} />
    </Screen>
  );
}

function WorkList({ list, today, toggle, open }: { list: NestEntry[]; today: string; toggle: (e: NestEntry) => void; open: (e: NestEntry) => void }) {
  const [showDone, setShowDone] = useState(false);
  const live = list.filter((e) => e.status === 'Open');
  const done = list.filter((e) => e.status === 'Done');
  // Starred first within a day, like WorkNest.
  const byStar = (a: NestEntry, b: NestEntry) => Number(b.pinned) - Number(a.pinned);
  const now = live.filter((e) => e.dueDate && e.dueDate <= today).sort((a, b) => byStar(a, b) || a.dueDate!.localeCompare(b.dueDate!));
  const later = live.filter((e) => e.dueDate && e.dueDate > today);
  const days = [...new Set(later.map((e) => e.dueDate!))].sort();
  const undated = live.filter((e) => !e.dueDate).sort(byStar);

  if (!list.length) return <Empty title="No work to-dos" text="Tap + to add one. It shows up in WorkNest too." />;

  const rows = (items: NestEntry[], overdue = false) => (
    <ListCard>
      {items.map((e, i) => (
        <EntryRow key={e.id} first={i === 0} title={e.subject} done={e.status === 'Done'} pinned={e.pinned}
          lead={<CheckDot done={e.status === 'Done'} onPress={() => toggle(e)} label={`${e.status === 'Done' ? 'Reopen' : 'Mark done'}: ${e.subject}`} />}
          meta={overdue && e.dueDate! < today ? `Overdue · ${dayLabel(e.dueDate!)}` : undefined} metaTone={C.danger}
          onToggle={() => toggle(e)} onPress={() => open(e)} />
      ))}
    </ListCard>
  );

  return (
    <View style={{ gap: 18 }}>
      {now.length ? <View style={{ gap: 12 }}><Section title="Today" count={now.length} tone={PASTEL[4][1]} />{rows(now, true)}</View> : null}
      {days.map((d) => {
        const items = later.filter((e) => e.dueDate === d).sort(byStar);
        return <View key={d} style={{ gap: 12 }}><Section title={dayName(d)} count={items.length} />{rows(items)}</View>;
      })}
      {undated.length ? <View style={{ gap: 12 }}><Section title="No date" count={undated.length} />{rows(undated)}</View> : null}
      {!now.length && !days.length && !undated.length ? <Empty title="All done" text="Nothing open. Tap + to add a to-do." /> : null}
      {done.length ? (
        <View style={{ gap: 12 }}>
          <Pressable onPress={() => setShowDone((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: showDone }} hitSlop={8}>
            <Row gap={6} style={{ paddingHorizontal: 4 }}>
              <Check size={13} color={C.green} />
              <T size={12} w="m" color={C.muted} style={{ flex: 1 }}>{done.length} done recently</T>
              {showDone ? <ChevronUp size={14} color={C.faint} /> : <ChevronDown size={14} color={C.faint} />}
            </Row>
          </Pressable>
          {showDone ? rows(done) : null}
        </View>
      ) : null}
      <T size={11} color={C.faint} center>Swipe right to mark done · tap to open</T>
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
  const today = dayKey();

  if (!list.length) return <Empty title="No sticky notes" text="Tap + to jot a personal to-do. Only you see these." />;
  const shown = [...list].sort((a, b) => Number(a.status === 'Done') - Number(b.status === 'Done') || Number(b.pinned) - Number(a.pinned));

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
              <Row style={{ justifyContent: 'space-between' }}>
                <T size={11} w="s" color={tone[1]} style={{ opacity: 0.75 }}>{e.dueDate ? (e.dueDate < today && !done ? 'Overdue' : dayName(e.dueDate)) : ''}</T>
                <CheckDot done={done} color={tone[1]} onPress={() => toggle(e)} label={`${done ? 'Reopen' : 'Mark done'}: ${e.subject}`} />
              </Row>
            </Tap>
          );
        })}
      </View>
      <Sheet open={!!open} onClose={() => setOpen(null)} title="Sticky note" subtitle="Personal · only you see this">
        <View style={{ gap: 10, paddingBottom: 6 }}>
          <TextArea value={draft} onChange={setDraft} placeholder="Sticky note text" minHeight={110} autoFocus tone={PASTEL[1]} />
          <Btn title="Save" onPress={save} busy={busy} small />
          {open ? <Btn title={open.status === 'Done' ? 'Reopen' : 'Mark done'} kind="ghost" small onPress={() => { toggle(open); setOpen(null); }} /> : null}
        </View>
      </Sheet>
    </>
  );
}

const st = themed(() => StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sticky: { width: '47%', flexGrow: 1, minHeight: 112, borderRadius: 14, padding: 12, gap: 10, justifyContent: 'space-between' },
}));
