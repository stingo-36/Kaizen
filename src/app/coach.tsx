import { ArrowUp, RefreshCw, Sparkles, Trash2, X } from '@/components/ico';
import { ComponentRef, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Chip, IconBtn, Row, T, Tap, haptic } from '@/components/ui';
import { askCoach, ChatMsg, loadChat, saveChat } from '@/lib/coach-chat';
import { uid } from '@/lib/dates';
import { useFood } from '@/lib/food-store';
import { useHealth } from '@/lib/health-store';
import { goBack } from '@/lib/nav';
import { useStore } from '@/lib/store';
import { C, F, themed } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboard';

const STARTERS = ['How am I doing this week?', 'What should I eat for more protein?', 'Make today’s workout shorter', 'Why do I keep missing habits?', 'How much sleep do I need?'];

const makeMsg = (role: ChatMsg['role'], text: string): ChatMsg => ({ id: uid(), role, text, at: Date.now() });

/** Renders "- " lines as bullets and everything else as paragraphs. */
function Reply({ text }: { text: string }) {
  return (
    <View style={{ gap: 6 }}>
      {text.split('\n').map((l) => l.trim()).filter(Boolean).map((l, i) => /^[-•*]\s+/.test(l) ? (
        <Row key={i} gap={8} style={{ alignItems: 'flex-start' }}><View style={st.dot} /><T size={15} style={{ flex: 1, lineHeight: 21 }}>{l.replace(/^[-•*]\s+/, '')}</T></Row>
      ) : <T key={i} size={15} style={{ lineHeight: 21 }}>{l}</T>)}
    </View>
  );
}

/** AI chat, opened from the ✨ button in every tab header. */
export default function Coach() {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const { me, habits, workout: W, profile } = useStore();
  const { food } = useFood();
  const { data: health } = useHealth();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);

  useEffect(() => { if (me) loadChat(me).then(setMsgs); }, [me]);
  useEffect(() => { if (kb) setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60); }, [kb]);

  const ask = async (history: ChatMsg[]) => {
    if (!me) return;
    setErr(''); setBusy(true);
    try {
      const reply = await askCoach(history, { habits, W, p: profile, food, health });
      const all = [...history, makeMsg('assistant', reply)];
      setMsgs(all); saveChat(me, all);
    } catch (e) {
      setErr((e as Error).message); saveChat(me, history);
    }
    setBusy(false);
  };
  const send = (q = text) => {
    const t = q.trim();
    if (!t || busy) return;
    haptic('light');
    const next = [...msgs, makeMsg('user', t)];
    setMsgs(next); setText('');
    ask(next);
  };
  const clear = () => { setMsgs([]); setErr(''); if (me) saveChat(me, []); };
  const canRetry = !!err && msgs[msgs.length - 1]?.role === 'user';

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <Row style={st.head}>
        <View style={[st.badge, { backgroundColor: C.accentTint }]}><Sparkles size={18} color={C.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={18} w="b">Coach</T>
          <T size={12} color={C.muted} numberOfLines={1}>Knows your habits, workouts and food</T>
        </View>
        {msgs.length ? <IconBtn icon={Trash2} label="Clear chat" onPress={clear} /> : null}
        <IconBtn icon={X} label="Close coach" onPress={() => goBack('/')} />
      </Row>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 12 }} keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: true })} showsVerticalScrollIndicator={false}>
        {!msgs.length && (
          <View style={{ gap: 14 }}>
            <View style={[st.hello, { backgroundColor: C.accentTint }]}>
              <T size={17} w="s" color={C.ink}>Ask me anything about training, food or your routines.</T>
              <T size={13} color={C.muted}>I can see your habits, plan, meals and health numbers.</T>
            </View>
            <Row gap={8} style={{ flexWrap: 'wrap' }}>{STARTERS.map((s) => <Chip key={s} label={s} onPress={() => send(s)} />)}</Row>
          </View>
        )}
        {msgs.map((m) => m.role === 'user' ? (
          <View key={m.id} style={st.me}><T size={15} color={C.onInk} style={{ lineHeight: 21 }}>{m.text}</T></View>
        ) : (
          <View key={m.id} style={st.coach}><Reply text={m.text} /></View>
        ))}
        {busy && <Row gap={8} style={st.coach}><ActivityIndicator size="small" color={C.accent} /><T size={14} color={C.muted}>Thinking…</T></Row>}
        {err ? (
          <View style={st.err}>
            <T size={13} color={C.danger} style={{ flex: 1 }}>{err}</T>
            {canRetry && !busy ? (
              <Tap onPress={() => ask(msgs)} style={st.retry} accessibilityLabel="Try again">
                <RefreshCw size={14} color={C.ink} /><T size={13} w="s">Retry</T>
              </Tap>
            ) : null}
          </View>
        ) : null}
      </ScrollView>
      <View style={[st.bar, { marginBottom: kb ? kb + 8 : insets.bottom + 12 }]}>
        <TextInput value={text} onChangeText={setText} placeholder="Ask your coach…" placeholderTextColor={C.faint} style={st.input} multiline maxLength={500}
          submitBehavior="submit" returnKeyType="send" onSubmitEditing={() => send()} accessibilityLabel="Message to coach" />
        <Tap onPress={() => send()} scale={0.9} style={[st.send, (!text.trim() || busy) && { opacity: 0.4 }]} accessibilityLabel="Send">
          <ArrowUp size={20} color={C.onInk} strokeWidth={2.4} />
        </Tap>
      </View>
    </SafeAreaView>
  );
}

const st = themed(() => StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: C.line },
  badge: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  hello: { borderRadius: 22, padding: 18, gap: 8 },
  me: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: C.ink, borderRadius: 20, borderBottomRightRadius: 6, paddingVertical: 10, paddingHorizontal: 14 },
  coach: { alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: C.card, borderRadius: 20, borderBottomLeftRadius: 6, padding: 14, borderWidth: 1, borderColor: C.line },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 8 },
  err: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16, backgroundColor: C.dangerSoft },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, backgroundColor: C.card },
  bar: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginHorizontal: 16, padding: 6, paddingLeft: 16, borderRadius: 26, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  input: { flex: 1, minWidth: 0, maxHeight: 110, fontFamily: F.r, fontSize: 15, color: C.ink, paddingVertical: 10 },
  send: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
}));
