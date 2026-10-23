import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useIncomingShare } from 'expo-sharing';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';

import { Check, Link2, Sparkles, Trash2 } from '@/components/ico';
import { BackHeader, Btn, Input, Row, Screen, T, haptic, useToast } from '@/components/ui';
import { draftResource, ResourceDraft } from '@/lib/ai';
import { goBack } from '@/lib/nav';
import { deleteScreenshots, firstLink, recentScreenshots, Shot, shrink } from '@/lib/screenshots';
import { C, F, PASTEL, themed } from '@/lib/theme';
import { useWorkNest } from '@/lib/worknest-store';

const MAX_SHOTS = 6;
/** WorkNest's built-in types, for a WorkNest that hasn't sent the user's own list yet. */
const DEFAULT_TYPES = ['Website', 'App', 'Link', 'Tool', 'Command', 'Documentation', 'Snippet', 'Reference', 'Learning', 'Other'];

/**
 * Save something to WorkNest Resources: opened by sharing a reel or page link (and/or screenshots) to Pulse,
 * or from Tracker → Resources. The AI reads the screenshots into text; the screenshots themselves are never
 * stored, and are deleted from the gallery after saving unless the user turns that off.
 */
export default function Share() {
  const toast = useToast();
  const { status, resourceTypes, saveResource } = useWorkNest();
  const { sharedPayloads, clearSharedPayloads } = useIncomingShare();

  // What came in: a link from the shared text, and any shared images (preselected).
  const shared = useMemo(() => {
    const text = sharedPayloads.filter((p) => p.shareType === 'text' || p.shareType === 'url').map((p) => p.value ?? '').join(' ');
    const images = sharedPayloads.filter((p) => p.shareType === 'image' && p.value).map((p) => p.value as string);
    return { link: firstLink(text), images };
  }, [sharedPayloads]);

  const [link, setLink] = useState('');
  const [shots, setShots] = useState<Shot[] | 'denied' | null>(null);
  const [picked, setPicked] = useState<string[]>([]);
  const [phase, setPhase] = useState<'pick' | 'reading' | 'review' | 'saving'>('pick');
  const [draft, setDraft] = useState<ResourceDraft | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Other');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [removeShots, setRemoveShots] = useState(true);
  const [err, setErr] = useState('');

  // A new share (also one arriving while this screen is open) fills in its link and preselects its images.
  const [seenShare, setSeenShare] = useState<typeof shared | null>(null);
  if (seenShare !== shared) {
    setSeenShare(shared);
    if (shared.link) setLink(shared.link);
    if (shared.images.length) setPicked((p) => [...new Set([...shared.images, ...p])].slice(0, MAX_SHOTS));
  }
  useEffect(() => { recentScreenshots().then(setShots).catch(() => setShots([])); }, []);

  const types = resourceTypes.length ? resourceTypes : DEFAULT_TYPES;
  // Shared images that aren't among the recent screenshots still show (first) so they can be unticked.
  const grid: Shot[] = useMemo(() => {
    const recent = Array.isArray(shots) ? shots : [];
    const extra = shared.images.filter((u) => !recent.some((s) => s.id === u)).map((u) => ({ id: u, uri: u, at: 0 }));
    return [...extra, ...recent];
  }, [shots, shared.images]);
  const uriOf = (id: string) => grid.find((s) => s.id === id)?.uri ?? id;

  const toggle = (id: string) => {
    haptic('select');
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= MAX_SHOTS ? (toast(`Up to ${MAX_SHOTS} screenshots`), p) : [...p, id]));
  };

  const read = async () => {
    const l = link.trim() ? firstLink(link) : null;
    if (!l && !picked.length) return setErr('Paste a link or pick a screenshot first');
    setErr(''); setPhase('reading');
    try {
      const images = await Promise.all(picked.map((id) => shrink(uriOf(id))));
      const d = await draftResource({ link: l, images, types });
      setDraft(d);
      setTitle(d.resource.title); setType(d.resource.type); setDescription(d.resource.description); setTags(d.resource.tags.join(', '));
      setPhase('review');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t read that'); setPhase('pick');
    }
  };

  const save = async () => {
    if (!title.trim()) return setErr('Give it a title');
    setErr(''); setPhase('saving');
    try {
      await saveResource({
        title: title.trim(), type, description: description.trim(), url: draft?.resource.url ?? null,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t save it'); setPhase('review'); return;
    }
    haptic('success');
    // Only the screenshots that were read; Android shows its own "allow Pulse to delete" prompt.
    const gone = removeShots && picked.length ? await deleteScreenshots(picked) : true;
    toast(removeShots && picked.length ? (gone ? 'Saved to WorkNest · screenshots deleted' : 'Saved to WorkNest · screenshots kept') : 'Saved to WorkNest');
    clearSharedPayloads();
    router.replace({ pathname: '/tracker', params: { view: 'resources' } });
  };

  const close = () => { clearSharedPayloads(); goBack('/tracker'); };

  if (status !== 'on') {
    return (
      <Screen>
        <BackHeader title="Save to Resources" onBack={close} />
        <T size={14} color={C.muted}>Connect WorkNest in the Tracker tab first. Resources are saved to your WorkNest library.</T>
        <Btn title="Open Tracker" onPress={() => router.replace('/tracker')} small />
      </Screen>
    );
  }

  if (phase === 'reading') {
    return (
      <Screen scroll={false} style={{ justifyContent: 'center', alignItems: 'center', gap: 14 }}>
        <View style={[st.badge, { backgroundColor: C.accentTint }]}><Sparkles size={22} color={C.accent} /></View>
        <ActivityIndicator color={C.accent} />
        <T size={15} w="s" center>{picked.length ? `Reading ${picked.length} screenshot${picked.length > 1 ? 's' : ''}…` : 'Looking at the link…'}</T>
        <T size={13} color={C.muted} center>This takes a few seconds.</T>
      </Screen>
    );
  }

  if (phase === 'review' || phase === 'saving') {
    return (
      <Screen>
        <BackHeader title="Check and save" onBack={() => setPhase('pick')} />
        {draft?.source ? (
          <Row gap={8} style={st.source}>
            <Link2 size={14} color={C.muted} />
            <T size={12} color={C.muted} numberOfLines={1} style={{ flex: 1 }}>{[draft.source.author, draft.source.site].filter(Boolean).join(' · ')}</T>
          </Row>
        ) : null}
        {draft?.needsScreenshots ? (
          <View style={[st.note, { backgroundColor: PASTEL[1][0] }]}>
            <T size={13} w="s" color={PASTEL[1][1]}>The details are inside the video</T>
            <T size={12} color={PASTEL[1][1]}>Go back and add screenshots where the names or links show, and Pulse will list them.</T>
          </View>
        ) : null}
        <Input label="Title" value={title} onChange={setTitle} />
        <View style={{ gap: 6 }}>
          <T size={13} w="s" color={C.muted}>Type</T>
          <View style={st.chips}>
            {types.map((t) => (
              <Pressable key={t} onPress={() => { haptic('select'); setType(t); }} accessibilityRole="radio" accessibilityState={{ checked: type === t }}
                style={[st.chip, type === t && { backgroundColor: C.ink, borderColor: C.ink }]}>
                <T size={12.5} w="s" color={type === t ? C.onInk : C.ink}>{t}</T>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={{ gap: 6 }}>
          <T size={13} w="s" color={C.muted}>Description</T>
          <TextInput value={description} onChangeText={setDescription} multiline style={st.area} placeholderTextColor={C.faint}
            placeholder="What is this useful for?" accessibilityLabel="Description" />
        </View>
        <Input label="Tags (comma separated)" value={tags} onChange={setTags} placeholder="webdev, chrome-extension" />
        {draft?.items.some((i) => i.suggested) ? <T size={12} color={C.muted}>“Suggested link” means the link wasn’t shown in the reel; Pulse added the official one. Check it before relying on it.</T> : null}
        {picked.length ? (
          <Row style={st.toggleRow}>
            <Trash2 size={16} color={C.muted} />
            <View style={{ flex: 1 }}>
              <T size={14} w="s">Delete {picked.length} screenshot{picked.length > 1 ? 's' : ''} after saving</T>
              <T size={12} color={C.muted}>Android will ask you to confirm</T>
            </View>
            <Switch value={removeShots} onValueChange={setRemoveShots} trackColor={{ true: C.accent }} accessibilityLabel="Delete screenshots after saving" />
          </Row>
        ) : null}
        {err ? <T size={13} color={C.danger}>{err}</T> : null}
        <Btn title="Save to WorkNest" icon={Check} onPress={save} busy={phase === 'saving'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <BackHeader title="Save to Resources" onBack={close} />
      <View style={{ gap: 6 }}>
        <Input label="Link" value={link} onChange={(v) => { setLink(v); setErr(''); }} placeholder="https://www.instagram.com/reel/…" keyboard="url" />
        {shared.link ? <T size={12} color={C.muted}>From your share. Pulse reads the post’s title and caption, not the video.</T> : null}
      </View>

      <View style={{ gap: 8 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T size={13} w="s" color={C.muted}>Screenshots{picked.length ? ` · ${picked.length} picked` : ''}</T>
          {shots === 'denied' ? <Pressable onPress={() => Linking.openSettings()} hitSlop={8}><T size={12.5} w="s" color={C.accent}>Allow photos</T></Pressable> : null}
        </Row>
        <T size={12} color={C.muted}>Pick the ones where the names or links show. They’re read once, then deleted after saving.</T>
        {shots === null ? <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-start' }} />
          : grid.length ? (
            <View style={st.grid}>
              {grid.map((s) => {
                const n = picked.indexOf(s.id);
                return (
                  <Pressable key={s.id} onPress={() => toggle(s.id)} accessibilityRole="checkbox" accessibilityState={{ checked: n >= 0 }} accessibilityLabel="Screenshot"
                    style={[st.shot, n >= 0 && { borderColor: C.accent }]}>
                    <Image source={{ uri: s.uri }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={s.id} />
                    {n >= 0 ? <View style={st.pick}><T size={11} w="b" color={C.white}>{n + 1}</T></View> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : <T size={13} color={C.muted}>{shots === 'denied' ? 'Allow photo access to pick screenshots here, or share them to Pulse from your gallery.' : 'No screenshots yet.'}</T>}
      </View>

      {err ? <T size={13} color={C.danger}>{err}</T> : null}
      <Btn title={picked.length ? `Read ${picked.length} screenshot${picked.length > 1 ? 's' : ''}` : 'Continue with the link only'} icon={Sparkles} onPress={read} />
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  badge: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  source: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.soft },
  note: { borderRadius: 14, padding: 12, gap: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: C.field, backgroundColor: C.card },
  area: { minHeight: 160, borderRadius: 14, borderWidth: 1.5, borderColor: C.field, backgroundColor: C.card, padding: 12, fontFamily: F.r, fontSize: 14, lineHeight: 20, color: C.ink, textAlignVertical: 'top' },
  toggleRow: { padding: 14, borderRadius: 16, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shot: { width: '31.5%', aspectRatio: 9 / 16, borderRadius: 12, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: C.soft },
  pick: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
}));
