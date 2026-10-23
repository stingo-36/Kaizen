import { Activity, Bed, Dumbbell, Flame, Footprints, HeartPulse, LucideIcon, RefreshCw, Scale, Settings2, ShieldCheck } from '@/components/ico';
import { ActivityIndicator, Linking, Platform, StyleSheet, View } from 'react-native';

import { BackHeader, Btn, Card, IconBtn, Label, Row, Screen, T, Tap, haptic, useToast } from '@/components/ui';
import { today } from '@/lib/dates';
import { HEALTH_LABEL, HEALTH_TYPES, HealthType } from '@/lib/health-types';
import { useHealth } from '@/lib/health-store';
import { PASTEL } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';
import { goBack } from '@/lib/nav';

const ICON: Record<HealthType, LucideIcon> = {
  Steps: Footprints, SleepSession: Bed, TotalCaloriesBurned: Flame, ExerciseSession: Dumbbell, HeartRate: HeartPulse, RestingHeartRate: Activity, Weight: Scale,
};
const TONE: Record<HealthType, [string, string]> = {
  // Tiles take the fixed pastel order by position: green, amber, blue, purple, coral, then around again.
  Steps: PASTEL[0], SleepSession: PASTEL[1], TotalCaloriesBurned: PASTEL[2], ExerciseSession: PASTEL[3], HeartRate: PASTEL[4], RestingHeartRate: PASTEL[0], Weight: PASTEL[1],
};
const SOURCES = ['Google Fit', 'Samsung Health', 'Fitbit', 'Garmin', 'Mi Fitness', 'Oura'];
function Sources() {
  return <Row gap={6} style={{ flexWrap: 'wrap' }}>{SOURCES.map((s) => <View key={s} style={st.src}><T size={12} w="s" color={C.muted}>{s}</T></View>)}</Row>;
}
const hm = (m: number) => `${Math.floor(m / 60)}h ${m % 60}m`;

export default function Health() {
  const toast = useToast();
  const { status, granted, data, busy, connect, refresh, openSettings } = useHealth();
  const { profile, setProfile } = useStore();

  const value = (t: HealthType): [string, string] => {
    const d = data;
    switch (t) {
      case 'Steps': return [d.steps != null ? d.steps.toLocaleString() : '–', 'today'];
      case 'SleepSession': return [d.sleepMin ? hm(d.sleepMin) : '–', 'last night'];
      case 'TotalCaloriesBurned': return [d.kcal != null ? `${d.kcal}` : '–', 'kcal today'];
      case 'ExerciseSession': return [d.exercise ? `${d.exercise.count}` : '–', d.exercise?.count ? `${d.exercise.minutes} min today` : d.exercise?.last ? `last: ${d.exercise.last}` : 'today'];
      case 'HeartRate': return [d.hr ? `${d.hr.avg}` : '–', d.hr ? `bpm avg · ${d.hr.min}–${d.hr.max}` : 'bpm today'];
      case 'RestingHeartRate': return [d.restingHr != null ? `${d.restingHr}` : '–', 'bpm'];
      case 'Weight': return [d.weightKg != null ? `${d.weightKg}` : '–', 'kg latest'];
    }
  };
  const applyWeight = () => {
    const w = data.weightKg;
    if (!w) return;
    const k = today();
    setProfile((p) => ({ ...p, weightKg: w, weightLog: [...p.weightLog.filter((x) => x.date !== k), { date: k, kg: w }] }));
    haptic('success'); toast('Profile weight updated');
  };

  const missing = HEALTH_TYPES.filter((t) => !granted.includes(t));
  const updated = data.at ? new Date(data.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '';

  return (
    <Screen>
      <BackHeader title="Google Fit & Health" onBack={() => goBack('/')}
        right={status === 'ready' && granted.length ? <IconBtn icon={RefreshCw} label="Refresh" onPress={refresh} /> : undefined} />

      {status === 'unsupported' ? (
        <Card style={{ gap: 10 }}>
          <View style={[st.big, { backgroundColor: PASTEL[2][0] }]}><HeartPulse size={24} color={PASTEL[2][1]} /></View>
          <T size={18} w="s">{Platform.OS === 'web' ? 'Open Kaizen on your Android phone' : 'Available on Android'}</T>
          <T size={14} color={C.muted} style={{ lineHeight: 20 }}>
            Google Fit, Samsung Health, Fitbit and most watches share their data through Android’s Health Connect. Kaizen reads sleep, steps, calories, exercise sessions, heart rate, resting heart rate and weight from there.
          </T>
          <Sources />
        </Card>
      ) : status === 'checking' ? (
        <Row gap={8}><ActivityIndicator color={C.accent} /><T size={14} color={C.muted}>Checking Health Connect…</T></Row>
      ) : status !== 'ready' ? (
        <Card style={{ gap: 10 }}>
          <T size={18} w="s">{status === 'update-required' ? 'Update Health Connect' : 'Install Health Connect'}</T>
          <T size={14} color={C.muted} style={{ lineHeight: 20 }}>Kaizen reads your phone and watch data through Health Connect. Get it from the Play Store, then come back.</T>
          <Btn title="Open Play Store" onPress={() => Linking.openURL('market://details?id=com.google.android.apps.healthdata').catch(() => Linking.openURL('https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata'))} />
        </Card>
      ) : !granted.length ? (
        <Card style={{ gap: 12 }}>
          <View style={[st.big, { backgroundColor: PASTEL[0][0] }]}><ShieldCheck size={24} color={PASTEL[0][1]} /></View>
          <T size={18} w="s">Connect Google Fit and your watch</T>
          <T size={14} color={C.muted} style={{ lineHeight: 20 }}>Kaizen reads them through Health Connect. It asks for only these 7 types, writes nothing back, and you can turn each one off.</T>
          <View style={{ gap: 8 }}>
            {HEALTH_TYPES.map((t) => { const I = ICON[t]; return <Row key={t} gap={10}><I size={17} color={C.muted} /><T size={14}>{HEALTH_LABEL[t]}</T></Row>; })}
          </View>
          <Btn title="Connect" onPress={connect} busy={busy} />
        </Card>
      ) : (
        <>
          <View style={st.grid}>
            {HEALTH_TYPES.filter((t) => granted.includes(t)).map((t) => {
              const I = ICON[t], [bg, ink] = TONE[t], [v, sub] = value(t);
              return (
                <View key={t} style={[st.tile, { backgroundColor: bg }]}>
                  <Row gap={8}><I size={16} color={ink} /><T size={12} w="s" color={ink} numberOfLines={1} style={{ flex: 1 }}>{HEALTH_LABEL[t]}</T></Row>
                  <T size={24} w="b" color={ink} numberOfLines={1}>{v}</T>
                  <T size={12} w="m" color={ink} numberOfLines={1} style={{ opacity: 0.8 }}>{sub}</T>
                </View>
              );
            })}
          </View>
          {busy ? <Row gap={8}><ActivityIndicator color={C.accent} /><T size={13} color={C.muted}>Reading Health Connect…</T></Row>
            : updated ? <T size={12} color={C.muted} center>Updated {updated}</T> : null}
          {data.weightKg && data.weightKg !== profile.weightKg ? (
            <Tap onPress={applyWeight} style={st.row}>
              <Scale size={18} color={C.accent} />
              <T size={14} w="s" style={{ flex: 1 }}>Use {data.weightKg} kg as your profile weight</T>
            </Tap>
          ) : null}
          {missing.length > 0 && (
            <Card style={{ gap: 8 }}>
              <Label>Not shared yet</Label>
              <T size={13} color={C.muted}>{missing.map((t) => HEALTH_LABEL[t]).join(', ')}</T>
              <Btn title="Allow more" kind="ghost" small onPress={connect} />
            </Card>
          )}
          <Tap onPress={openSettings} style={st.row}><Settings2 size={18} color={C.ink} /><T size={14} w="s" style={{ flex: 1 }}>Manage in Health Connect</T></Tap>
          <Card style={{ gap: 8 }}>
            <T size={14} w="s">No numbers?</T>
            <T size={13} color={C.muted} style={{ lineHeight: 19 }}>Open Google Fit (or your watch app), go to its settings and turn on “Sync with Health Connect”.</T>
            <Sources />
          </Card>
        </>
      )}
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  big: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', flexGrow: 1, borderRadius: 20, padding: 14, gap: 6 },
  src: { paddingVertical: 5, paddingHorizontal: 10, borderRadius: 99, backgroundColor: C.soft },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
}));
