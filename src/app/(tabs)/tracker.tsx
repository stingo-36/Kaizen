import { Href, Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/header';
import { Bookmark, Chats, CheckSquare, ChevronRight, LogOut, LucideIcon, Notepad, RefreshCw } from '@/components/ico';
import { Connect } from '@/components/tracker/connect';
import { CheckDot, EntryRow, ListCard, Section, TK } from '@/components/tracker/parts';
import { FeatureCard, haptic, IconBtn, Row, Screen, T, Tap, useToast } from '@/components/ui';
import { C, PASTEL, themed } from '@/lib/theme';
import { dayKey, dayLabel, NestEntry } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';

/** A section tile: its own colour, one number, and it opens that section's page. */
function Tile({ icon: Icon, tone, label, value, unit, href }: { icon: LucideIcon; tone: [string, string]; label: string; value: number; unit?: string; href: Href }) {
  const router = useRouter();
  return (
    <Tap onPress={() => { haptic('select'); router.push(href); }} accessibilityLabel={`${label}: ${value}${unit ? ` ${unit}` : ''}. Open`}
      style={st.tile}>
      <Row style={{ justifyContent: 'space-between' }}>
        <View style={[st.tileIc, { backgroundColor: tone[0] }]}><Icon size={17} color={tone[1]} /></View>
        <ChevronRight size={16} color={tone[1]} style={{ opacity: 0.55 }} />
      </Row>
      <View style={{ gap: 2 }}>
        <T size={12.5} w="m" color={C.muted} style={{ opacity: 0.85 }}>{label}</T>
        <T size={22} w="b" color={C.ink}>{value}{unit ? <T size={12} w="m" color={C.muted}>{` ${unit}`}</T> : null}</T>
      </View>
    </Tap>
  );
}

/** Tracker tab: an overview with one tile per section and today's to-dos. Each section has its own page. */
export default function Tracker() {
  const router = useRouter();
  const toast = useToast();
  const { status, link, entries, at, busy, error, load, setDone, disconnect, resources, loadResources } = useWorkNest();
  const params = useLocalSearchParams<{ view?: string }>();
  const today = dayKey();

  const counts = useMemo(() => {
    const open = entries.filter((e) => e.status === 'Open');
    const work = open.filter((e) => e.kind === 'Task' && !e.personal);
    return {
      dueNow: work.filter((e) => e.dueDate && e.dueDate <= today),
      todo: work.length + open.filter((e) => e.kind === 'Task' && e.personal).length,
      followups: open.filter((e) => e.kind === 'FollowUp').length,
      replied: open.filter((e) => e.kind === 'FollowUp' && e.lastUpdate?.fromThem),
      notes: open.filter((e) => e.kind === 'Note').length,
    };
  }, [entries, today]);

  // Older links (Home card, a finished save) still ask for ?view=resources: send them to the Saved page.
  if (params.view === 'resources') return <Redirect href="/tracker/saved" />;

  const toggle = (e: NestEntry) => {
    const done = e.status !== 'Done';
    haptic(done ? 'success' : 'light');
    setDone(e.id, done).then(
      () => { if (done) toast('Marked done', () => setDone(e.id, false).catch(() => {})); },
      (err) => toast(err instanceof Error ? err.message : 'Couldn’t update it'),
    );
  };
  const upNext = [...counts.dueNow].sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.dueDate ?? '').localeCompare(b.dueDate ?? '')).slice(0, 4);

  return (
    <Screen tabs>
      <AppHeader title="Tracker"
        subtitle={status === 'on' ? new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }) + ' · WorkNest' : 'From WorkNest'}
        right={status === 'on' ? <IconBtn icon={RefreshCw} label="Refresh" onPress={() => { load(); loadResources(); }} /> : undefined} />

      {status === 'loading' ? (
        <Row gap={8}><ActivityIndicator color={C.accent} /><T size={13} color={C.muted}>Loading…</T></Row>
      ) : status !== 'on' ? (
        <Connect again={status === 'expired'} />
      ) : (
        <>
          <FeatureCard>
            <T size={11} w="s" color={C.heroMuted}>YOUR WORK, TOGETHER</T>
            <T size={34} w="s" color={C.white}>{counts.todo}<T size={14} color={C.heroMuted}> open to-dos</T></T>
            <T size={12} color={C.heroMuted}>{counts.dueNow.length} due today · Synced with WorkNest</T>
          </FeatureCard>
          <View style={st.grid}>
            <Row gap={12}>
              <Tile icon={CheckSquare} tone={[C.tealSoft, C.teal]} label="To-do" value={counts.dueNow.length} unit="today" href="/tracker/todo" />
              <Tile icon={Chats} tone={PASTEL[4]} label="Follow-ups" value={counts.followups} unit={counts.replied.length ? `· ${counts.replied.length} replied` : 'open'} href="/tracker/followups" />
            </Row>
            <Row gap={12}>
              <Tile icon={Notepad} tone={PASTEL[1]} label="Notes" value={counts.notes} href="/tracker/notes" />
              <Tile icon={Bookmark} tone={PASTEL[3]} label="Saved" value={resources.length} href="/tracker/saved" />
            </Row>
          </View>

          <View style={{ gap: 12 }}>
            <Section title="Up next today" count={counts.dueNow.length || undefined} action="All to-dos" onAction={() => router.push('/tracker/todo')} />
            {upNext.length ? (
              <ListCard>
                {upNext.map((e, i) => (
                  <EntryRow key={e.id} first={i === 0} title={e.subject} done={e.status === 'Done'} pinned={e.pinned}
                    lead={<CheckDot done={e.status === 'Done'} onPress={() => toggle(e)} label={`Mark done: ${e.subject}`} />}
                    meta={e.dueDate && e.dueDate < today ? `Overdue · ${dayLabel(e.dueDate)}` : undefined} metaTone={C.danger}
                    onToggle={() => toggle(e)} onPress={() => router.push(`/tracker/entry/${e.id}`)} />
                ))}
              </ListCard>
            ) : (
              <View style={st.clear}>
                <T size={TK.title} w="s">Nothing due today</T>
                <T size={TK.meta} color={C.muted}>{counts.todo ? `${counts.todo} open to-do${counts.todo > 1 ? 's' : ''} for later` : 'Add one from the To-do page'}</T>
              </View>
            )}
          </View>

          {counts.replied.length ? (
            <View style={{ gap: 12 }}>
              <Section title="They replied" count={counts.replied.length} tone={PASTEL[4][1]} />
              <ListCard>
                {counts.replied.slice(0, 3).map((e, i) => (
                  <EntryRow key={e.id} first={i === 0} title={e.person ?? e.subject} sub={e.lastUpdate?.note} pinned={e.pinned}
                    onPress={() => router.push(`/tracker/entry/${e.id}`)} />
                ))}
              </ListCard>
            </View>
          ) : null}

          <View style={{ gap: 10, alignItems: 'center' }}>
            {busy ? <Row gap={6}><ActivityIndicator size="small" color={C.accent} /><T size={11} color={C.muted}>Updating…</T></Row>
              : error ? <T size={11} color={C.danger} center>{error}</T>
              : at ? <T size={11} color={C.faint}>Updated {new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</T> : null}
            <Pressable style={st.out} onPress={async () => { await disconnect(); toast('WorkNest disconnected'); }} accessibilityRole="button">
              <LogOut size={14} color={C.danger} />
              <T size={12} w="s" color={C.danger}>Disconnect WorkNest</T>
              <T size={11} color={C.faint} numberOfLines={1} style={{ flexShrink: 1 }}>· {link?.email}</T>
            </Pressable>
          </View>
        </>
      )}
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  grid: { gap: 12 },
  tile: { flex: 1, minWidth: 0, minHeight: 112, borderRadius: 18, padding: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, justifyContent: 'space-between', gap: 12 },
  tileIc: { width: 32, height: 32, borderRadius: 16, backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center' },
  clear: { gap: 3, paddingVertical: 16, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.card },
  out: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, maxWidth: '100%' },
}));
