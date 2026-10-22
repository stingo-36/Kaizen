import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Activity, ArrowRight, AtSign, Dumbbell, Eye, EyeOff, Footprints, Lock, LucideIcon, Mail, Sparkles, User, Utensils, Wallet } from '@/components/ico';
import { ComponentRef, ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, themed } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboard';
import { Btn, Ring, Segmented, T, Tap } from './ui';

export function Field({ icon: Icon, value, onChange, placeholder, secure, autoComplete, onSubmit }: {
  icon: LucideIcon; value: string; onChange: (v: string) => void; placeholder: string; secure?: boolean;
  autoComplete?: 'email' | 'username' | 'password' | 'new-password' | 'name'; onSubmit?: () => void;
}) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={[st.field, focus && { borderColor: C.ink }]}>
      <Icon size={18} color={C.muted} strokeWidth={1.9} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.faint} style={st.input}
        secureTextEntry={secure && !show} autoCapitalize={autoComplete === 'name' ? 'words' : 'none'} autoCorrect={false} autoComplete={autoComplete}
        keyboardType={autoComplete === 'email' ? 'email-address' : 'default'}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onSubmitEditing={onSubmit} returnKeyType={onSubmit ? 'go' : 'next'} accessibilityLabel={placeholder} />
      {secure && <Pressable onPress={() => setShow(!show)} hitSlop={10} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} color={C.muted} /> : <Eye size={18} color={C.muted} />}</Pressable>}
    </View>
  );
}

/* Today at a glance: a ring per tracked area beside the day's numbers, each dot matching its ring. */
const RINGS = [
  { value: 0.8, color: '#9BE7BE' },
  { value: 0.6, color: '#FFC3A6' },
  { value: 0.72, color: '#FFE38F' },
];
const STATS: { icon: LucideIcon; label: string; value: string; dot?: string }[] = [
  { icon: Activity, label: 'Habits', value: '4 of 5', dot: RINGS[0].color },
  { icon: Dumbbell, label: 'Workout', value: '45 min', dot: RINGS[1].color },
  { icon: Utensils, label: 'Food', value: '1,240 kcal', dot: RINGS[2].color },
  { icon: Footprints, label: 'Steps', value: '6,812' },
  { icon: Wallet, label: 'Spent', value: '₹840' },
];
function DayRings() {
  const size = 138, stroke = 11, gap = 4;
  return (
    <View style={st.visual} accessible accessibilityLabel="Example day: 4 of 5 habits, push workout, 1,240 kcal, 6,812 steps, ₹840 spent">
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {RINGS.map((r, i) => (
          <View key={i} style={{ position: 'absolute' }}>
            <Ring value={r.value} size={size - i * 2 * (stroke + gap)} stroke={stroke} color={r.color} track="rgba(255,255,255,0.16)" />
          </View>
        ))}
        <T size={10} w="s" color="rgba(255,255,255,0.8)" style={{ letterSpacing: 1 }}>TODAY</T>
      </View>
      <View style={st.stats}>
        {STATS.map(({ icon: Icon, label, value, dot }) => (
          <View key={label} style={st.stat}>
            {dot ? <View style={[st.dot, { backgroundColor: dot }]} /> : <Icon size={13} color="rgba(255,255,255,0.75)" />}
            <T size={12} color="rgba(255,255,255,0.75)" style={{ width: 54 }}>{label}</T>
            <T size={13} w="s" color={C.white} numberOfLines={1} style={{ flexShrink: 1 }}>{value}</T>
          </View>
        ))}
      </View>
    </View>
  );
}

export function AuthShell({ mode, children }: { mode: 'login' | 'register'; children: ReactNode }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const sheetY = useRef(0);
  // With the keyboard up, slide the form to the top so the fields and button sit above it.
  useEffect(() => {
    if (kb) setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, sheetY.current - insets.top - 8), animated: true }), 50);
  }, [kb, insets.top]);
  return (
    <View style={{ flex: 1, backgroundColor: '#4A4FB0' }}>
      <ScrollView ref={scroll} contentContainerStyle={{ flexGrow: 1, paddingBottom: kb }} keyboardShouldPersistTaps="handled" bounces={false}>
        <LinearGradient colors={['#6A6ED0', '#4A4FB0']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.top, { paddingTop: insets.top + 18 }]}>
          <View style={st.blob} />
          <View style={st.brand}><View style={st.mark}><Activity size={19} color={C.white} /></View><T size={18} w="b" color={C.white}>Pulse</T></View>
          <DayRings />
          <T size={34} w="b" color={C.white} style={{ lineHeight: 37 }}>{mode === 'login' ? 'Your whole day,\nin one place.' : 'Build a better\nroutine.'}</T>
          <T size={15} color="rgba(255,255,255,0.88)" style={{ marginTop: 8 }}>{mode === 'login' ? 'Habits, workouts, meals, steps and spending. Log in to pick up where you left off.' : 'One app for your habits, workouts, meals, steps and spending.'}</T>
        </LinearGradient>
        <View style={[st.sheet, { paddingBottom: (kb ? 16 : insets.bottom) + 24 }]} onLayout={(e) => { sheetY.current = e.nativeEvent.layout.y; }}>
          <Segmented options={[['login', 'Log in'], ['register', 'Sign up']]} value={mode} onChange={(v) => v !== mode && router.replace(v === 'login' ? '/login' : '/register')} />
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

export function DemoCard({ onPress }: { onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={st.demo} accessibilityRole="button" accessibilityLabel="Fill in the demo account">
      <View style={st.demoIc}><Sparkles size={17} color={C.white} /></View>
      <View style={{ flex: 1 }}><T size={14} w="s">Try the demo</T><T size={13} color={C.muted}>test1 · test1</T></View>
      <ArrowRight size={18} color={C.accent} />
    </Tap>
  );
}

export const AuthIcons = { AtSign, Lock, User, Mail };
export { Btn };

const st = themed(() => StyleSheet.create({
  top: { paddingHorizontal: 24, paddingBottom: 48, overflow: 'hidden' },
  blob: { position: 'absolute', width: 300, height: 300, borderRadius: 150, right: -120, top: -130, backgroundColor: 'rgba(255,255,255,0.12)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  mark: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  visual: { flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 22, marginBottom: 22 },
  stats: { flex: 1, minWidth: 0, gap: 7, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  dot: { width: 9, height: 9, borderRadius: 5, marginHorizontal: 2 },
  sheet: { flex: 1, backgroundColor: C.bg, borderTopLeftRadius: 30, borderTopRightRadius: 30, marginTop: -26, padding: 22, gap: 14 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 54, paddingHorizontal: 16, borderRadius: 16, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line },
  input: { flex: 1, fontFamily: F.r, fontSize: 16, color: C.ink, paddingVertical: 14 },
  demo: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.accent, borderStyle: 'dashed' },
  demoIc: { width: 36, height: 36, borderRadius: 11, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
}));
