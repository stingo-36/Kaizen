import { useRouter } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { NestResource } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';
import { C, F, themed } from '@/lib/theme';
import { Bookmark, ChevronRight, ExternalLink, Plus, Search } from './ico';
import { Btn, haptic, Row, Sheet, T } from './ui';

/* WorkNest Resources on the phone: read from WorkNest, added from shared reels and screenshots (app/share.tsx). */

const open = (url: string) => Linking.openURL(url).catch(() => {});

/** Markdown down to one plain line, for list previews. */
export const plain = (md: string) => md
  .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim();

/** Inline Markdown: **bold** and [links](url) (tappable); everything else as written. */
function Inline({ text, size, color }: { text: string; size: number; color: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]*\]\([^)]+\))/g).filter(Boolean);
  return (
    <T size={size} color={color} style={{ flex: 1, lineHeight: Math.round(size * 1.45) }}>
      {parts.map((p, i) => {
        const bold = p.match(/^\*\*([^*]+)\*\*$/);
        if (bold) return <T key={i} size={size} w="s" color={color}>{bold[1]}</T>;
        const link = p.match(/^\[([^\]]*)\]\(([^)]+)\)$/);
        if (link) return <T key={i} size={size} w="s" color={C.accent} onPress={() => open(link[2])}>{link[1] || link[2]}</T>;
        return <Fragment key={i}>{p}</Fragment>;
      })}
    </T>
  );
}

/** The Markdown WorkNest stores in a resource's description: paragraphs, "- " bullets and "1." lists. */
export function Md({ text, size = 14, color = C.ink }: { text: string; size?: number; color?: string }) {
  const lines = text.split('\n').map((l) => l.trimEnd()).filter((l) => l.trim());
  return (
    <View style={{ gap: 6 }}>
      {lines.map((l, i) => {
        const num = l.match(/^\s*(\d+)[.)]\s+(.*)$/), dot = l.match(/^\s*[-*•]\s+(.*)$/);
        if (num || dot) {
          return (
            <Row key={i} gap={8} style={{ alignItems: 'flex-start' }}>
              {num ? <T size={size} w="s" color={C.accent} style={{ minWidth: size, lineHeight: Math.round(size * 1.45) }}>{num[1]}.</T>
                : <View style={[st.dot, { marginTop: Math.round(size * 0.6) }]} />}
              <Inline text={(num ? num[2] : dot![1])} size={size} color={color} />
            </Row>
          );
        }
        return <Row key={i}><Inline text={l.replace(/^#+\s*/, '')} size={size} color={color} /></Row>;
      })}
    </View>
  );
}

const host = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; } };

function ResourceRow({ r, first, onPress }: { r: NestResource; first?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${r.title}. ${r.type}. Open`} style={[st.row, !first && st.rule]}>
      <View style={st.ic}><Bookmark size={15} color={C.accent} /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T size={14} w="m" numberOfLines={2} style={{ lineHeight: 19 }}>{r.title}</T>
        {r.description ? <T size={12} color={C.muted} numberOfLines={2} style={{ lineHeight: 16 }}>{plain(r.description)}</T> : null}
        <T size={10.5} w="s" color={C.faint} style={{ letterSpacing: 0.4 }} numberOfLines={1}>
          {[r.type, r.url ? host(r.url) : null, ...r.tags.slice(0, 2).map((t) => `#${t}`)].filter(Boolean).join(' · ').toUpperCase()}
        </T>
      </View>
    </Pressable>
  );
}

/** One resource in full: description with tappable links, tags, and its link. */
function ResourceSheet({ r, onClose }: { r: NestResource | null; onClose: () => void }) {
  return (
    <Sheet open={!!r} onClose={onClose} title={r?.title ?? ''} subtitle={r ? [r.type, r.url ? host(r.url) : null].filter(Boolean).join(' · ') : undefined}>
      {r?.description ? <Md text={r.description} /> : <T size={13} color={C.muted}>No description.</T>}
      {r?.tags.length ? <T size={12} color={C.muted}>{r.tags.map((t) => `#${t}`).join('  ')}</T> : null}
      {r?.url ? <Btn title="Open link" icon={ExternalLink} kind="ghost" small onPress={() => open(r.url!)} /> : null}
      <T size={11} color={C.faint} center>Edit or delete it on WorkNest’s Resources page.</T>
    </Sheet>
  );
}

/** Tracker → Resources: search, filter by type, open one. "Add" opens the save screen. */
export function ResourcesView() {
  const router = useRouter();
  const { resources, resourcesError, loadResources } = useWorkNest();
  const [q, setQ] = useState('');
  const [type, setType] = useState<string | null>(null);
  const [openR, setOpenR] = useState<NestResource | null>(null);

  const types = useMemo(() => [...new Set(resources.map((r) => r.type))], [resources]);
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return resources.filter((r) => (!type || r.type === type)
      && (!needle || [r.title, r.description, r.url ?? '', r.type, ...r.tags].join(' ').toLowerCase().includes(needle)));
  }, [resources, q, type]);

  return (
    <View style={{ gap: 12 }}>
      <Row gap={8}>
        <View style={[st.search, { flex: 1 }]}>
          <Search size={14} color={C.faint} />
          <TextInput value={q} onChangeText={setQ} placeholder="Search resources" placeholderTextColor={C.faint} style={st.searchText} accessibilityLabel="Search resources" />
        </View>
        <Pressable onPress={() => { haptic('light'); router.push('/share'); }} accessibilityRole="button" accessibilityLabel="Add a resource from screenshots or a link" style={st.add}>
          <Plus size={16} color={C.onInk} />
        </Pressable>
      </Row>
      {types.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {[null, ...types].map((t) => (
            <Pressable key={t ?? 'all'} onPress={() => { haptic('select'); setType(t); }} accessibilityRole="radio" accessibilityState={{ checked: type === t }}
              style={[st.chip, type === t && { backgroundColor: C.ink, borderColor: C.ink }]}>
              <T size={12} w="s" color={type === t ? C.onInk : C.ink}>{t ?? 'All'}</T>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {resourcesError ? (
        <Pressable onPress={loadResources} accessibilityRole="button"><T size={12} color={C.danger}>{resourcesError} Tap to retry.</T></Pressable>
      ) : null}

      {shown.length ? (
        <View style={st.card}>{shown.map((r, i) => <ResourceRow key={r.id} r={r} first={i === 0} onPress={() => setOpenR(r)} />)}</View>
      ) : resources.length ? (
        <T size={13} color={C.muted} center style={{ paddingVertical: 20 }}>Nothing matches.</T>
      ) : (
        <View style={st.empty}>
          <T size={14} w="s" center>Save reels and links here</T>
          <T size={12.5} color={C.muted} center style={{ lineHeight: 18 }}>In Instagram, tap Share → Kaizen on a reel, add screenshots of the names or links, and Kaizen saves the list to your WorkNest Resources.</T>
          <Btn title="Add from screenshots" icon={Plus} small kind="ghost" onPress={() => router.push('/share')} />
        </View>
      )}
      <ResourceSheet r={openR} onClose={() => setOpenR(null)} />
    </View>
  );
}

/** Home card: the latest saved resources. Hidden until there's at least one. */
export function RecentResourcesCard() {
  const router = useRouter();
  const { status, resources } = useWorkNest();
  if (status !== 'on' || !resources.length) return null;
  const openTab = () => router.navigate({ pathname: '/tracker', params: { view: 'resources' } });
  return (
    <View style={st.home}>
      <Pressable onPress={openTab} accessibilityRole="button" accessibilityLabel={`Recently saved: ${resources.length}. Open Resources`}>
        <Row gap={10}>
          <View style={[st.ic, { width: 30, height: 30, borderRadius: 15 }]}><Bookmark size={15} color={C.accent} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={14} w="s">Recently saved</T>
            <T size={11.5} color={C.muted}>{resources.length} in WorkNest Resources</T>
          </View>
          <ChevronRight size={16} color={C.faint} />
        </Row>
      </Pressable>
      {resources.slice(0, 2).map((r) => (
        <Pressable key={r.id} onPress={openTab} style={st.homeRow} accessibilityRole="button">
          <T size={13} w="m" numberOfLines={1}>{r.title}</T>
          <T size={11.5} color={C.muted} numberOfLines={1}>{r.description ? plain(r.description) : r.type}</T>
        </Pressable>
      ))}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  rule: { borderTopWidth: 1, borderTopColor: C.line },
  ic: { width: 28, height: 28, borderRadius: 9, backgroundColor: C.accentTint, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: C.accent },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 40, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  searchText: { flex: 1, minWidth: 0, fontFamily: F.r, fontSize: 14, color: C.ink, paddingVertical: 8 },
  add: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  chip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: C.field, backgroundColor: C.card },
  empty: { gap: 10, padding: 18, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line, alignItems: 'center' },
  home: { gap: 10, padding: 14, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  homeRow: { paddingTop: 9, borderTopWidth: 1, borderTopColor: C.line, gap: 1 },
}));
