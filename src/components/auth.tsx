import { Activity, AtSign, Dumbbell, Eye, EyeOff, Footprints, ListChecks, Lock, LucideIcon, Mail, Sparkles, User, Utensils, Wallet } from '@/components/ico';
import { ComponentRef, ReactNode, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { C, F, PASTEL, R, themed } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboard';
import { FocusReplay, Stagger } from './motion';
import { pi } from './paper-icons';
import { Btn, Ring, T } from './ui';

/** Paper outlined field with a leading icon, floating label and (for passwords) a show/hide toggle. */
export function Field({ icon, label, value, onChange, placeholder, secure, autoComplete, onSubmit }: {
  icon: LucideIcon; label: string; value: string; onChange: (v: string) => void; placeholder: string; secure?: boolean;
  autoComplete?: 'email' | 'username' | 'password' | 'new-password' | 'name'; onSubmit?: () => void;
}) {
  const [show, setShow] = useState(false);
  return (
    <TextInput mode="outlined" label={label} value={value} onChangeText={onChange} placeholder={placeholder}
      secureTextEntry={secure && !show} autoCapitalize={autoComplete === 'name' ? 'words' : 'none'} autoCorrect={false} autoComplete={autoComplete}
      keyboardType={autoComplete === 'email' ? 'email-address' : 'default'} onSubmitEditing={onSubmit} returnKeyType={onSubmit ? 'go' : 'next'}
      left={<TextInput.Icon icon={pi(icon)} color={(focused) => (focused ? C.accent : C.faint)} />}
      right={secure ? <TextInput.Icon icon={pi(show ? EyeOff : Eye)} onPress={() => setShow(!show)} accessibilityLabel={show ? 'Hide password' : 'Show password'} /> : undefined}
      outlineStyle={{ borderRadius: R.field }} style={{ backgroundColor: C.card }} contentStyle={{ fontFamily: F.r, fontSize: 15.5 }} accessibilityLabel={label} />
  );
}

/* ---------- hero illustration: a streak ring with the five areas floating around it ---------- */
const AREAS: { icon: LucideIcon; tone: number; x: number; y: number; tilt: number }[] = [
  { icon: ListChecks, tone: 0, x: -112, y: -6, tilt: -10 },
  { icon: Dumbbell, tone: 4, x: -66, y: -74, tilt: 6 },
  { icon: Utensils, tone: 1, x: 0, y: -100, tilt: -4 },
  { icon: Footprints, tone: 2, x: 66, y: -74, tilt: 8 },
  { icon: Wallet, tone: 3, x: 112, y: -6, tilt: -8 },
];

/** Gently bobs up and down forever, each one out of step with the others. */
function Float({ children, phase, amp = 6, style }: { children: ReactNode; phase: number; amp?: number; style?: object }) {
  const y = useSharedValue(0);
  useEffect(() => {
    const half = { duration: 1600, easing: Easing.inOut(Easing.sin) };
    y.value = withDelay(phase, withRepeat(withSequence(withTiming(-amp, half), withTiming(amp, half)), -1, true));
  }, [phase, amp, y]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return <Animated.View style={[style, a]}>{children}</Animated.View>;
}

/** Four-point sparkle that twinkles on a loop. */
function Twinkle({ size, x, y, delay }: { size: number; x: number; y: number; delay: number }) {
  const o = useSharedValue(0.3);
  useEffect(() => {
    o.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 900 }), withTiming(0.3, { duration: 900 })), -1));
  }, [delay, o]);
  const a = useAnimatedStyle(() => ({ opacity: o.value, transform: [{ scale: 0.8 + o.value * 0.3 }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y }, a]}>
      <Svg width={size} height={size} viewBox="-10 -10 20 20"><Path d="M0 -10C1 -1 1 -1 10 0C1 1 1 1 0 10C-1 1 -1 1 -10 0C-1 -1 -1 -1 0 -10Z" fill={C.white} /></Svg>
    </Animated.View>
  );
}

/** Soft cloud made of overlapping circles, drifting slowly sideways. */
function Cloud({ x, y, scale, drift }: { x: number; y: number; scale: number; drift: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 7000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);
  const a = useAnimatedStyle(() => ({ transform: [{ translateX: t.value * drift }, { scale }] }));
  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: 120, height: 56 }, a]}>
      <View style={[st.puff, { left: 0, top: 18, width: 44, height: 44 }]} />
      <View style={[st.puff, { left: 26, top: 0, width: 60, height: 60 }]} />
      <View style={[st.puff, { left: 66, top: 14, width: 46, height: 46 }]} />
    </Animated.View>
  );
}

function Hero({ compact }: { compact: boolean }) {
  const insets = useSafeAreaInsets();
  const h = compact ? 150 : 300;
  return (
    <View style={[st.hero, { paddingTop: insets.top + 14, height: h + insets.top }]}>
      <Cloud x={-30} y={insets.top + 40} scale={1} drift={18} />
      <Cloud x={220} y={insets.top + 8} scale={1.15} drift={-22} />
      <Cloud x={250} y={h + insets.top - 70} scale={0.7} drift={14} />
      <Twinkle size={16} x={40} y={insets.top + 120} delay={0} />
      <Twinkle size={12} x={310} y={insets.top + 150} delay={500} />
      <Twinkle size={20} x={180} y={insets.top + 30} delay={900} />
      <View style={st.brand}>
        <View style={st.mark}><Activity size={17} color={C.white} /></View>
        <T size={18} w="b" color={C.white}>Kaizen</T>
      </View>
      {!compact && (
        <View style={st.art} accessible accessibilityLabel="Kaizen tracks habits, workouts, food, steps and spending">
          <Float phase={0} amp={4}>
            <View style={st.ringBack}>
              <Ring value={0.72} size={104} stroke={10} color={C.white} track="rgba(255,255,255,0.28)">
                <T size={28} w="b" color={C.white}>42</T>
                <T size={11} w="m" color="rgba(255,255,255,0.9)" style={{ marginTop: -2 }}>day streak</T>
              </Ring>
            </View>
          </Float>
          {AREAS.map(({ icon: Icon, tone, x, y, tilt }, i) => (
            <Float key={tone} phase={i * 280} style={{ position: 'absolute', left: '50%', top: '50%', marginLeft: x - 21, marginTop: y - 21 }}>
              <View style={[st.tile, { backgroundColor: PASTEL[tone][0], transform: [{ rotate: `${tilt}deg` }] }]}><Icon size={20} color={PASTEL[tone][1]} /></View>
            </Float>
          ))}
        </View>
      )}
    </View>
  );
}

export function AuthShell({ mode, children }: { mode: 'login' | 'register'; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const formY = useRef(0);
  // With the keyboard up, slide the form to the top so the fields and button sit above it.
  useEffect(() => {
    if (kb) setTimeout(() => scroll.current?.scrollTo({ y: Math.max(0, formY.current - 12), animated: true }), 50);
  }, [kb]);
  const login = mode === 'login';
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" bounces={false} showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: (kb || insets.bottom) + 24 }}>
        <Hero compact={!login} />
        <FocusReplay>
          <View style={st.page} onLayout={(e) => { formY.current = e.nativeEvent.layout.y; }}>
            <Stagger step={55}>
              <View style={{ gap: 6, marginBottom: 4 }}>
                <T size={28} w="b">{login ? 'Welcome back' : 'Create your account'}</T>
                <T size={14.5} color={C.muted}>
                  {login ? 'Log in to pick up your streak where you left off.' : 'Habits, workouts, food, steps and spending, all in one place.'}
                </T>
              </View>
              {children}
            </Stagger>
          </View>
        </FocusReplay>
      </ScrollView>
    </View>
  );
}

/** Quiet secondary option under the main button: fills in the shared demo account. */
export function DemoCard({ onPress }: { onPress: () => void }) {
  return (
    <Button mode="contained-tonal" buttonColor={C.accentTint} icon={pi(Sparkles)} onPress={onPress} accessibilityLabel="Fill in the demo account"
      style={{ borderRadius: R.pill }} contentStyle={{ minHeight: 52 }} labelStyle={{ fontFamily: F.s, fontSize: 15, color: C.ink, marginVertical: 0 }}>
      Try the demo account
    </Button>
  );
}

/** "or" between the main action and the demo option. */
export function OrRule() {
  return (
    <View style={st.or}>
      <View style={st.rule} /><T size={12} color={C.faint}>or</T><View style={st.rule} />
    </View>
  );
}

export const AuthIcons = { AtSign, Lock, User, Mail };
export { Btn };

const st = themed(() => StyleSheet.create({
  hero: { backgroundColor: C.accent, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden', paddingHorizontal: 24 },
  puff: { position: 'absolute', borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.13)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 34, height: 34, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  art: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 26 },
  ringBack: { padding: 10, borderRadius: 99, backgroundColor: 'rgba(255,255,255,0.12)' },
  tile: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.white },
  page: { gap: 14, paddingHorizontal: 24, paddingTop: 26, maxWidth: 480, width: '100%', alignSelf: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  rule: { flex: 1, height: 1, backgroundColor: C.field },
}));
