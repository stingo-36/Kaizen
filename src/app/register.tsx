import { useRouter } from 'expo-router';
import { ArrowRight } from '@/components/ico';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthIcons, AuthShell, Btn, Field } from '@/components/auth';
import { Row, T } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Register() {
  const { register } = useStore();
  const router = useRouter();
  const [f, setF] = useState({ name: '', email: '', pw: '', pw2: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => { setF({ ...f, [k]: v }); setErr(''); };
  const submit = async () => {
    if (f.pw !== f.pw2) return setErr('The passwords don’t match');
    setBusy(true);
    const e = await register(f.name, f.email, f.pw);
    setBusy(false);
    if (e) setErr(e);
  };
  return (
    <AuthShell mode="register">
      <Field icon={AuthIcons.User} value={f.name} onChange={set('name')} placeholder="Your name" autoComplete="name" />
      <Field icon={AuthIcons.Mail} value={f.email} onChange={set('email')} placeholder="Email" autoComplete="email" />
      <Field icon={AuthIcons.Lock} value={f.pw} onChange={set('pw')} placeholder="Password (8+ characters)" secure autoComplete="new-password" />
      <Field icon={AuthIcons.Lock} value={f.pw2} onChange={set('pw2')} placeholder="Confirm password" secure autoComplete="new-password" onSubmit={submit} />
      {err ? <T size={13} color={C.danger}>{err}</T> : null}
      <Btn title="Create account" icon={ArrowRight} onPress={submit} busy={busy} style={{ minHeight: 50, marginTop: 4 }} />
      <Row gap={4} style={{ justifyContent: 'center', marginTop: 10 }}>
        <T size={13.5} color={C.muted}>Already have an account?</T>
        <Pressable onPress={() => router.replace('/login')} hitSlop={8}><T size={13.5} w="s" color={C.accent}>Log in</T></Pressable>
      </Row>
    </AuthShell>
  );
}
