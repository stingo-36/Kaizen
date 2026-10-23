import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Briefcase, ShieldCheck } from '@/components/ico';
import { nestTone } from '@/components/tracker-card';
import { Btn, haptic, Input, Row, T, useToast } from '@/components/ui';
import { C, themed } from '@/lib/theme';
import { WORKNEST_URL } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';

const host = WORKNEST_URL.replace(/^https?:\/\//, '');

/** Sign in to WorkNest once; Kaizen keeps only a Tracker key. */
export function Connect({ again }: { again?: boolean }) {
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
    <View style={st.card}>
      <Row gap={10}>
        <View style={[st.badge, { backgroundColor: nestTone()[0] }]}><Briefcase size={18} color={nestTone()[1]} /></View>
        <T size={16} w="s" style={{ flex: 1 }}>{again ? 'Sign in to WorkNest again' : 'Connect WorkNest'}</T>
      </Row>
      <T size={13} color={C.muted} style={{ lineHeight: 18 }}>
        {again
          ? 'WorkNest no longer accepts this phone’s key. Sign in once more to keep your Tracker here.'
          : 'See and add your to-dos, follow-ups, notes and saved resources. Nothing else in WorkNest is shared.'}
      </T>
      <View style={st.server}>
        <ShieldCheck size={14} color={C.green} />
        <T size={12} w="m" style={{ flex: 1 }} numberOfLines={1}>{host}</T>
      </View>
      <Input label="Email" value={email} onChange={(v) => { setEmail(v); setErr(''); }} placeholder="you@example.com" keyboard="email-address" />
      <Input label="Password" value={password} onChange={(v) => { setPassword(v); setErr(''); }} placeholder="Your WorkNest password" secure />
      {err ? <T size={12} color={C.danger}>{err}</T> : null}
      <Btn title="Connect" onPress={submit} busy={busy} small />
      <T size={11} color={C.muted}>Your password isn’t saved. Kaizen keeps only a Tracker key on this phone.</T>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { gap: 14, padding: 16, backgroundColor: C.card, borderRadius: 16 },
  badge: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  server: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 12, backgroundColor: C.soft },
}));
