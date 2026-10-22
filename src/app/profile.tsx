import { useRouter } from 'expo-router';
import { ArrowLeft, Bell, Cloud, CloudOff, HeartPulse, LogOut, RefreshCw, Wallet } from '@/components/ico';
import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { Btn, Card, Chip, IconBtn, Input, Label, Row, Screen, Segmented, T, Tap, haptic, useToast } from '@/components/ui';
import { today } from '@/lib/dates';
import { ensurePermission, syncHabitReminders } from '@/lib/notifications';
import { EQUIPMENT, GOALS, LEVELS, missingDetails, Profile as P } from '@/lib/profile';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';
import { goBack } from '@/lib/nav';
import { useTheme } from '@/lib/theme-store';
import type { ThemeMode } from '@/lib/theme';

const num = (v: string) => { const n = parseFloat(v.replace(',', '.')); return Number.isFinite(n) ? n : null; };

export default function Profile() {
  const router = useRouter();
  const toast = useToast();
  const { user, profile, setProfile, habits, logout, sync, syncNow } = useStore();
  const [d, setD] = useState({
    name: profile.name, age: profile.age ? String(profile.age) : '', heightCm: profile.heightCm ? String(profile.heightCm) : '',
    weightKg: profile.weightKg ? String(profile.weightKg) : '', injuries: profile.injuries,
    sex: profile.sex, goal: profile.goal, level: profile.level, days: profile.days, minutes: profile.minutes, equipment: profile.equipment,
  });
  const theme = useTheme();
  const [err, setErr] = useState('');
  const set = <K extends keyof typeof d>(k: K, v: (typeof d)[K]) => { setD({ ...d, [k]: v }); setErr(''); };

  const save = () => {
    const age = num(d.age), h = num(d.heightCm), w = num(d.weightKg);
    if (!d.name.trim()) return setErr('Enter your name');
    if (d.age && (age == null || age < 12 || age > 100)) return setErr('Enter an age between 12 and 100');
    if (d.heightCm && (h == null || h < 100 || h > 250)) return setErr('Enter your height in cm (100–250)');
    if (d.weightKg && (w == null || w < 30 || w > 300)) return setErr('Enter your weight in kg (30–300)');
    setProfile((p): P => {
      const weightLog = w && w !== p.weightKg ? [...p.weightLog.filter((x) => x.date !== today()), { date: today(), kg: w }] : p.weightLog;
      return { ...p, name: d.name.trim(), age: age ? Math.round(age) : null, heightCm: h, weightKg: w, sex: d.sex, goal: d.goal, level: d.level,
        days: d.days, minutes: d.minutes, equipment: d.equipment, injuries: d.injuries.trim(), weightLog };
    });
    haptic('success');
    toast('Profile saved');
  };
  const missing = missingDetails(profile);

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconBtn icon={ArrowLeft} label="Back" onPress={() => goBack('/')} />
        <T size={17} w="s">Profile</T>
        <View style={{ width: 42 }} />
      </Row>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={st.avatar}><T size={22} w="b" color={C.white}>{(d.name || '?')[0].toUpperCase()}</T></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={18} w="s" numberOfLines={1}>{d.name || 'Your name'}</T>
          <T size={13} color={C.muted} numberOfLines={1}>{user?.email}</T>
        </View>
      </Card>
      {missing.length > 0 && (
        <Card style={{ backgroundColor: C.accentTint, borderColor: 'transparent' }}>
          <T size={14} w="s">Add your {missing.join(', ')}</T>
          <T size={13} color={C.muted} style={{ marginTop: 2 }}>These make your AI plans and calorie counts accurate.</T>
        </Card>
      )}

      <Label>About you</Label>
      <Card style={{ gap: 14 }}>
        <Input label="Name" value={d.name} onChange={(v) => set('name', v)} placeholder="Your name" />
        <Row gap={10}>
          <Input label="Age" value={d.age} onChange={(v) => set('age', v)} placeholder="26" unit="yrs" keyboard="number-pad" style={{ flex: 1 }} />
          <Input label="Height" value={d.heightCm} onChange={(v) => set('heightCm', v)} placeholder="175" unit="cm" keyboard="decimal-pad" style={{ flex: 1 }} />
          <Input label="Weight" value={d.weightKg} onChange={(v) => set('weightKg', v)} placeholder="72" unit="kg" keyboard="decimal-pad" style={{ flex: 1 }} />
        </Row>
        <View style={{ gap: 8 }}>
          <T size={12} w="s" color={C.muted}>Sex (for calorie maths)</T>
          <Row gap={8} style={{ justifyContent: 'center' }}><Chip label="Male" on={d.sex === 'male'} onPress={() => set('sex', 'male')} /><Chip label="Female" on={d.sex === 'female'} onPress={() => set('sex', 'female')} /></Row>
        </View>
      </Card>

      <Label>Training</Label>
      <Card style={{ gap: 14 }}>
        <View style={{ gap: 8 }}><T size={12} w="s" color={C.muted}>Goal</T>
          <View style={st.wrap}>{GOALS.map((g) => <Chip key={g} label={g} on={d.goal === g} onPress={() => set('goal', g)} />)}</View></View>
        <View style={{ gap: 8 }}><T size={12} w="s" color={C.muted}>Experience</T>
          <View style={st.wrap}>{LEVELS.map((l) => <Chip key={l} label={l} on={d.level === l} onPress={() => set('level', l)} />)}</View></View>
        <View style={{ gap: 8 }}><T size={12} w="s" color={C.muted}>Days per week</T>
          <View style={st.wrap}>{[2, 3, 4, 5, 6].map((n) => <Chip key={n} label={`${n}`} on={d.days === n} onPress={() => set('days', n)} style={{ minWidth: 48, alignItems: 'center' }} />)}</View></View>
        <View style={{ gap: 8 }}><T size={12} w="s" color={C.muted}>Session length</T>
          <View style={st.wrap}>{[30, 45, 60, 90].map((n) => <Chip key={n} label={`${n} min`} on={d.minutes === n} onPress={() => set('minutes', n)} />)}</View></View>
        <View style={{ gap: 8 }}><T size={12} w="s" color={C.muted}>Equipment</T>
          <View style={st.wrap}>{EQUIPMENT.map((e) => <Chip key={e} label={e} on={d.equipment === e} onPress={() => set('equipment', e)} />)}</View></View>
        <Input label="Injuries or limits" value={d.injuries} onChange={(v) => set('injuries', v)} placeholder="Lower back, left knee" />
      </Card>
      {err ? <T size={13} color={C.danger}>{err}</T> : null}
      <Btn title="Save profile" onPress={save} />

      <Label>Appearance</Label>
      <Card style={{ gap: 10 }}>
        <Segmented options={[['light', 'Light'], ['dark', 'Dark'], ['system', 'System']]} value={theme.mode}
          onChange={(v) => { theme.setMode(v as ThemeMode); setTimeout(() => router.push('/profile'), 0); }} />
        <T size={12} color={C.muted}>System follows your phone’s dark mode setting.</T>
      </Card>

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {sync === 'offline' ? <CloudOff size={20} color={C.danger} /> : <Cloud size={20} color={C.green} />}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={15} w="s">{sync === 'offline' ? 'Offline' : sync === 'syncing' ? 'Syncing…' : 'Synced to the cloud'}</T>
          <T size={12} color={C.muted}>{sync === 'offline' ? 'Changes are saved here and upload when you’re back online.' : 'Your profile, habits and workouts are backed up.'}</T>
        </View>
        <IconBtn icon={RefreshCw} size={36} label="Sync now" onPress={syncNow} />
      </Card>
      <Card style={{ paddingVertical: 4, paddingHorizontal: 6 }}>
        {Platform.OS !== 'web' && (
          <Tap style={st.item} onPress={async () => {
            const ok = await ensurePermission();
            if (ok) { await syncHabitReminders(habits); toast('Reminders are on'); } else toast('Allow notifications for Pulse in your phone’s Settings');
          }}><Bell size={20} color={C.accent} /><T size={15} w="s" style={{ flex: 1 }}>Turn on reminders</T></Tap>
        )}
        <Tap style={st.item} onPress={() => router.push('/health')}><HeartPulse size={20} color={C.accent} /><T size={15} w="s" style={{ flex: 1 }}>Google Fit & Health Connect</T></Tap>
        <Tap style={st.item} onPress={() => router.navigate('/spendwise')}><Wallet size={20} color={C.accent} /><T size={15} w="s" style={{ flex: 1 }}>SpendWise</T></Tap>
        <Tap style={st.item} onPress={logout}><LogOut size={20} color={C.danger} /><T size={15} w="s" color={C.danger} style={{ flex: 1 }}>Log out</T></Tap>
      </Card>
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, paddingHorizontal: 12 },
}));
