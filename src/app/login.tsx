import { useRouter } from 'expo-router';
import { ArrowRight } from '@/components/ico';
import { useState } from 'react';
import { Pressable } from 'react-native';

import { AuthIcons, AuthShell, Btn, DemoCard, Field, OrRule } from '@/components/auth';
import { Row, T } from '@/components/ui';
import { DEMO, useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function Login() {
  const { login } = useStore();
  const router = useRouter();
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    const e = await login(user, pw);
    setBusy(false);
    if (e) setErr(e);
  };
  return (
    <AuthShell mode="login">
      <Field icon={AuthIcons.Mail} label="Email" value={user} onChange={(v) => { setUser(v); setErr(''); }} placeholder="you@example.com" autoComplete="email" />
      <Field icon={AuthIcons.Lock} label="Password" value={pw} onChange={(v) => { setPw(v); setErr(''); }} placeholder="Your password" secure autoComplete="password" onSubmit={submit} />
      {err ? <T size={13} color={C.danger}>{err}</T> : null}
      <Btn title="Log in" icon={ArrowRight} onPress={submit} busy={busy} style={{ marginTop: 6 }} />
      <OrRule />
      <DemoCard onPress={() => { setUser(DEMO.username); setPw(DEMO.password); setErr(''); }} />
      <Row gap={4} style={{ justifyContent: 'center', marginTop: 6 }}>
        <T size={13.5} color={C.muted}>New here?</T>
        <Pressable onPress={() => router.replace('/register')} hitSlop={8}><T size={13.5} w="s" color={C.accent}>Create an account</T></Pressable>
      </Row>
    </AuthShell>
  );
}
