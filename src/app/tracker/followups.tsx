import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { View } from 'react-native';

import { AddSheet } from '@/components/tracker/add-sheet';
import { Avatar, Empty, EntryRow, Fab, ListCard, Section } from '@/components/tracker/parts';
import { BackHeader, haptic, Screen, T, useToast } from '@/components/ui';
import { goBack } from '@/lib/nav';
import { C, PASTEL } from '@/lib/theme';
import { dayKey, dayLabel, dayName, NestEntry } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';

/** "Replied · today", "Due Fri 24 Oct", "Overdue · Wed 21 Oct". */
function followMeta(e: NestEntry, today: string) {
  if (e.status === 'Done') return e.completedAt ? `Done · ${dayName(e.completedAt.slice(0, 10))}` : 'Done';
  if (e.lastUpdate?.fromThem) return `Replied · ${dayName(e.lastUpdate.occurredAt.slice(0, 10))}`;
  if (e.dueDate) return e.dueDate < today ? `Overdue · ${dayLabel(e.dueDate)}` : `Remind ${dayName(e.dueDate)}`;
  return 'Waiting';
}

/** Follow-ups: who you're waiting on, what you told them, and what needs you now. */
export default function FollowUps() {
  const router = useRouter();
  const toast = useToast();
  const { entries, setDone } = useWorkNest();
  const [adding, setAdding] = useState(false);
  const today = dayKey();

  const groups = useMemo(() => {
    const all = entries.filter((e) => e.kind === 'FollowUp');
    const live = all.filter((e) => e.status === 'Open').sort((a, b) => Number(b.pinned) - Number(a.pinned));
    // Needs you: they replied, or the reminder day has come.
    const needs = live.filter((e) => e.lastUpdate?.fromThem || (e.dueDate && e.dueDate <= today));
    return { all, needs, waiting: live.filter((e) => !needs.includes(e)), done: all.filter((e) => e.status === 'Done') };
  }, [entries, today]);

  const toggle = (e: NestEntry) => {
    const done = e.status !== 'Done';
    haptic(done ? 'success' : 'light');
    setDone(e.id, done).then(
      () => { if (done) toast('Marked done', () => setDone(e.id, false).catch(() => {})); },
      (err) => toast(err instanceof Error ? err.message : 'Couldn’t update it'),
    );
  };

  const rows = (items: NestEntry[]) => (
    <ListCard>
      {items.map((e, i) => {
        const needs = e.status === 'Open' && (e.lastUpdate?.fromThem || (e.dueDate && e.dueDate <= today));
        return (
          <EntryRow key={e.id} first={i === 0} title={e.person ?? 'Someone'} sub={e.lastUpdate?.note || e.subject} done={e.status === 'Done'} pinned={e.pinned}
            lead={<Avatar name={e.person ?? '?'} />} meta={followMeta(e, today)} metaTone={needs ? PASTEL[4][1] : undefined}
            onToggle={() => toggle(e)} onPress={() => router.push(`/tracker/entry/${e.id}`)} />
        );
      })}
    </ListCard>
  );

  return (
    <Screen overlay={<Fab label="Add a follow-up" onPress={() => setAdding(true)} />} style={{ paddingBottom: 110 }}>
      <BackHeader title="Follow-ups" onBack={() => goBack('/tracker')} />
      {!groups.all.length ? <Empty title="No follow-ups" text="Tap + when you’re waiting on someone. Add who, where you told them and when to check back." /> : null}
      {groups.needs.length ? <View style={{ gap: 12 }}><Section title="Needs you" count={groups.needs.length} tone={PASTEL[4][1]} />{rows(groups.needs)}</View> : null}
      {groups.waiting.length ? <View style={{ gap: 12 }}><Section title="Waiting on them" count={groups.waiting.length} />{rows(groups.waiting)}</View> : null}
      {groups.done.length ? <View style={{ gap: 12 }}><Section title="Done recently" count={groups.done.length} />{rows(groups.done)}</View> : null}
      {groups.all.length ? <T size={11} color={C.faint} center>Swipe right to mark done · tap to see the history</T> : null}
      <AddSheet open={adding} mode="followup" onClose={() => setAdding(false)} />
    </Screen>
  );
}
