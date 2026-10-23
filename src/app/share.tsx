import { Image } from 'expo-image';
import { router } from 'expo-router';
import { SharePayload, useIncomingShare } from 'expo-sharing';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Check, Images, Link2, Plus, Sparkles, Trash2, X } from '@/components/ico';
import { BackHeader, Btn, Input, Row, Screen, T, haptic, useToast } from '@/components/ui';
import { draftResource, ResourceDraft } from '@/lib/ai';
import { goBack } from '@/lib/nav';
import { deleteScreenshots, firstLink, photoAccess, PhotoAccess, recentImages, Shot, shrink } from '@/lib/screenshots';
import { C, F, PASTEL, themed } from '@/lib/theme';
import { useWorkNest } from '@/lib/worknest-store';

const MAX_SHOTS = 6;

/* Browsers can't receive shares (expo-sharing throws there), so the web preview opens the screen with nothing shared.
   Chosen once at load, so the hook order never changes between renders. */
const NO_SHARE: SharePayload[] = [];
const useShared: () => { sharedPayloads: SharePayload[]; clearSharedPayloads: () => void } =
  Platform.OS === 'web' ? () => ({ sharedPayloads: NO_SHARE, clearSharedPayloads: () => {} }) : useIncomingShare;

/** Full-screen gallery: Screenshots album first (or every photo), tap to pick up to MAX_SHOTS. */
function GalleryPicker({ open, picked, onToggle, onClose }: { open: boolean; picked: string[]; onToggle: (s: Shot) => void; onClose: () => void }) {
  const [onlyShots, setOnlyShots] = useState(true);
  const [items, setItems] = useState<Shot[] | null>(null);
  useEffect(() => {
    if (!open) return;
    let live = true;
    recentImages({ limit: 90, screenshotsOnly: onlyShots }).then((r) => { if (live) setItems(r); }).catch(() => { if (live) setItems([]); });
    return () => { live = false; };
  }, [open, onlyShots]);
  const filter = (v: boolean) => { haptic('select'); setItems(null); setOnlyShots(v); };
  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <Row style={st.pickerHead}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close"><X size={20} color={C.ink} /></Pressable>
          <T size={16} w="s" style={{ flex: 1, textAlign: 'center' }}>Pick screenshots</T>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button"><T size={15} w="s" color={C.accent}>Done{picked.length ? ` (${picked.length})` : ''}</T></Pressable>
        </Row>
        <Row gap={8} style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          {([[true, 'Screenshots'], [false, 'All photos']] as const).map(([v, l]) => (
            <Pressable key={l} onPress={() => filter(v)} style={[st.chip, onlyShots === v && { backgroundColor: C.accent, borderColor: C.accent }]} accessibilityRole="radio" accessibilityState={{ checked: onlyShots === v }}>
              <T size={12.5} w="s" color={onlyShots === v ? C.white : C.ink}>{l}</T>
            </Pressable>
          ))}
        </Row>
        {items === null ? <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
          : items.length ? (
            <FlatList data={items} keyExtractor={(s) => s.id} numColumns={3} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40, gap: 6 }} columnWrapperStyle={{ gap: 6 }}
              renderItem={({ item }) => {
                const n = picked.indexOf(item.id);
                return (
                  <Pressable onPress={() => onToggle(item)} style={[st.cell, n >= 0 && { borderColor: C.accent }]} accessibilityRole="checkbox" accessibilityState={{ checked: n >= 0 }} accessibilityLabel="Photo">
                    <Image source={{ uri: item.uri }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={item.id} />
                    {n >= 0 ? <View style={st.pick}><T size={11} w="b" color={C.white}>{n + 1}</T></View> : null}
                  </Pressable>
                );
              }} />
          ) : <T size={13} color={C.muted} center style={{ marginTop: 40 }}>{onlyShots ? 'No screenshots found. Try All photos.' : 'No photos found.'}</T>}
      </SafeAreaView>
    </Modal>
  );
}
/** WorkNest's built-in types, for a WorkNest that hasn't sent the user's own list yet. */
const DEFAULT_TYPES = ['Website', 'App', 'Link', 'Tool', 'Command', 'Documentation', 'Snippet', 'Reference', 'Learning', 'Other'];

/**
 * Save something to WorkNest Resources: opened by sharing a reel or page link (and/or screenshots) to Kaizen,
 * or from Tracker → Resources. The AI reads the screenshots into text; the screenshots themselves are never
 * stored, and are deleted from the gallery after saving unless the user turns that off.
 */
export default function Share() {
  const toast = useToast();
  const { status, resourceTypes, saveResource } = useWorkNest();
  const { sharedPayloads, clearSharedPayloads } = useShared();

  // What came in: a link from the shared text, and any shared images (preselected).
  const shared = useMemo(() => {
    const text = sharedPayloads.filter((p) => p.shareType === 'text' || p.shareType === 'url').map((p) => p.value ?? '').join(' ');
    const images = sharedPayloads.filter((p) => p.shareType === 'image' && p.value).map((p) => p.value as string);
    return { link: firstLink(text), images };
  }, [sharedPayloads]);

  const [link, setLink] = useState('');
  const [access, setAccess] = useState<PhotoAccess | null>(null);
  const [recent, setRecent] = useState<Shot[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  // Uris for picked ids, including ones chosen in the full gallery that aren't in the recent row.
  const [uris, setUris] = useState<Record<string, string>>({});
  const [gallery, setGallery] = useState(false);
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
  const askPhotos = useCallback(async () => {
    const a = await photoAccess().catch(() => 'denied' as const);
    setAccess(a);
    if (a === 'granted') setRecent(await recentImages({ limit: 12 }).catch(() => []));
  }, []);
  // Ask once on open, so the recent row is ready; the Add button asks again if it was declined.
  useEffect(() => {
    let live = true;
    photoAccess().then(async (a) => {
      if (!live) return;
      setAccess(a);
      if (a === 'granted') { const r = await recentImages({ limit: 12 }).catch(() => []); if (live) setRecent(r); }
    }).catch(() => { if (live) setAccess('denied'); });
    return () => { live = false; };
  }, []);

  const types = resourceTypes.length ? resourceTypes : DEFAULT_TYPES;
  // The recent row: shared images first (so they can be unticked), then the latest screenshots.
  const row: Shot[] = useMemo(() => {
    const extra = shared.images.filter((u) => !recent.some((s) => s.id === u)).map((u) => ({ id: u, uri: u, at: 0 }));
    return [...extra, ...recent];
  }, [recent, shared.images]);
  const uriOf = (id: string) => uris[id] ?? row.find((s) => s.id === id)?.uri ?? id;

  const toggle = (s: Shot) => {
    haptic('select');
    setUris((u) => ({ ...u, [s.id]: s.uri }));
    setPicked((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : p.length >= MAX_SHOTS ? (toast(`Up to ${MAX_SHOTS} screenshots`), p) : [...p, s.id]));
  };
  const openGallery = () => {
    if (access === 'granted') return setGallery(true);
    if (access === 'blocked') return Linking.openSettings();
    askPhotos().then(() => setGallery(true));
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
    // Only the screenshots that were read; Android shows its own "allow Kaizen to delete" prompt.
    const gone = removeShots && picked.length ? await deleteScreenshots(picked) : true;
    toast(removeShots && picked.length ? (gone ? 'Saved to WorkNest · screenshots deleted' : 'Saved to WorkNest · screenshots kept') : 'Saved to WorkNest');
    clearSharedPayloads();
    router.replace('/tracker/saved');
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
      <Screen footer={(
        <>
          {err ? <T size={13} color={C.danger}>{err}</T> : null}
          <Btn title="Save to WorkNest" icon={Check} onPress={save} busy={phase === 'saving'} />
        </>
      )}>
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
            <T size={12} color={PASTEL[1][1]}>Go back and add screenshots where the names or links show, and Kaizen will list them.</T>
          </View>
        ) : null}
        <Input label="Title" value={title} onChange={setTitle} />
        <View style={{ gap: 6 }}>
          <T size={13} w="s" color={C.muted}>Type</T>
          <View style={st.chips}>
            {types.map((t) => (
              <Pressable key={t} onPress={() => { haptic('select'); setType(t); }} accessibilityRole="radio" accessibilityState={{ checked: type === t }}
                style={[st.chip, type === t && { backgroundColor: C.accent, borderColor: C.accent }]}>
                <T size={12.5} w="s" color={type === t ? C.white : C.ink}>{t}</T>
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
        {draft?.items.some((i) => i.suggested) ? <T size={12} color={C.muted}>“Suggested link” means the link wasn’t shown in the reel; Kaizen added the official one. Check it before relying on it.</T> : null}
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
      </Screen>
    );
  }

  const pickedShots = picked.map((id) => ({ id, uri: uriOf(id) }));
  return (
    <Screen footer={(
      <>
        {err ? <T size={13} color={C.danger}>{err}</T> : null}
        <Btn title={picked.length ? `Read ${picked.length} screenshot${picked.length > 1 ? 's' : ''}` : link.trim() ? 'Save with the link only' : 'Add a link or screenshots'}
          icon={Sparkles} onPress={read} />
      </>
    )}>
      <BackHeader title="Save to Resources" onBack={close} />
      <View style={{ gap: 6 }}>
        <Input label="Link" value={link} onChange={(v) => { setLink(v); setErr(''); }} placeholder="https://www.instagram.com/reel/…" keyboard="url" />
        {shared.link ? <T size={12} color={C.muted}>From your share. Kaizen reads the post’s title and caption, not the video.</T> : null}
      </View>

      <View style={{ gap: 10 }}>
        <View style={{ gap: 2 }}>
          <T size={13} w="s" color={C.muted}>Screenshots{picked.length ? ` · ${picked.length} of ${MAX_SHOTS}` : ''}</T>
          <T size={12} color={C.muted}>Add the ones where names or links show. They’re read once, then deleted after saving.</T>
        </View>

        <Pressable onPress={openGallery} accessibilityRole="button" style={st.addBtn}>
          <View style={st.addIc}><Images size={18} color={C.accent} /></View>
          <View style={{ flex: 1 }}>
            <T size={14} w="s">Add screenshots</T>
            <T size={12} color={C.muted}>{access === 'blocked' ? 'Photo access is off. Tap to open Settings.' : access === 'denied' ? 'Tap to allow photo access' : 'Choose from your gallery'}</T>
          </View>
          <Plus size={18} color={C.accent} />
        </Pressable>

        {pickedShots.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {pickedShots.map((s, i) => (
              <View key={s.id} style={[st.thumb, { borderColor: C.accent }]}>
                <Image source={{ uri: s.uri }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={s.id} />
                <View style={[st.pick, { left: 5, right: undefined }]}><T size={11} w="b" color={C.white}>{i + 1}</T></View>
                <Pressable onPress={() => toggle(s as Shot)} hitSlop={8} style={st.remove} accessibilityRole="button" accessibilityLabel={`Remove screenshot ${i + 1}`}>
                  <X size={12} color={C.white} />
                </Pressable>
              </View>
            ))}
          </ScrollView>
        ) : null}

        {row.length ? (
          <View style={{ gap: 6 }}>
            <T size={11} w="s" color={C.faint} style={{ letterSpacing: 0.6 }}>RECENT · TAP TO ADD</T>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {row.map((s) => {
                const on = picked.includes(s.id);
                return (
                  <Pressable key={s.id} onPress={() => toggle(s)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel="Recent screenshot"
                    style={[st.thumb, st.thumbSm, on && { borderColor: C.accent, opacity: 0.55 }]}>
                    <Image source={{ uri: s.uri }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={s.id} />
                    {on ? <View style={st.pick}><Check size={11} color={C.white} /></View> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>
      <GalleryPicker open={gallery} picked={picked} onToggle={toggle} onClose={() => setGallery(false)} />
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
  toggleRow: { padding: 14, borderRadius: 16, backgroundColor: C.card },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.accent, backgroundColor: C.accentTint },
  addIc: { width: 38, height: 38, borderRadius: 12, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  thumb: { width: 84, height: 150, borderRadius: 12, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: C.soft },
  thumbSm: { width: 62, height: 110, borderWidth: 2 },
  remove: { position: 'absolute', top: 5, right: 5, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  pickerHead: { paddingHorizontal: 16, paddingVertical: 14 },
  cell: { flex: 1 / 3, aspectRatio: 9 / 16, borderRadius: 10, overflow: 'hidden', borderWidth: 2.5, borderColor: 'transparent', backgroundColor: C.soft },
  pick: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
}));
