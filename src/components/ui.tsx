import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronRight, LucideIcon } from '@/components/ico';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, Animated, KeyboardTypeOptions, Modal, Platform, Pressable, PressableProps, ScrollView, StyleProp, StyleSheet, Text, TextInput, TextProps,
  TextStyle, View, ViewStyle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle, G } from 'react-native-svg';

import { C, F, R, SP, themed, TY } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboard';
import { FocusReplay, Stagger, useVisit } from './motion';

export const haptic = (kind: 'light' | 'success' | 'select' = 'light') => {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'select') Haptics.selectionAsync().catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/* ---------- text ---------- */
type TProps = TextProps & { size?: number; w?: keyof typeof F; color?: string; center?: boolean; style?: StyleProp<TextStyle> };
export function T({ size = 15, w = 'r', color = C.ink, center, style, ...rest }: TProps) {
  const ls = size >= 22 ? -0.03 * size : size >= 17 ? -0.01 * size : 0;
  return <Text {...rest} style={[{ fontFamily: F[w], fontSize: size, color, letterSpacing: ls, lineHeight: Math.round(size * 1.3) }, center && { textAlign: 'center' }, style]} />;
}
export const Label = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <T size={11} w="s" color={C.muted} style={[{ letterSpacing: 0.8, textTransform: 'uppercase' }, style]}>{children}</T>
);

/* ---------- layout ---------- */
export function Screen({ children, tabs, scroll = true, style }: { children: ReactNode; tabs?: boolean; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const pad = { paddingBottom: kb ? kb + 24 : (tabs ? 110 : 32) + insets.bottom };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <FocusReplay>
        {scroll ? (
          <ScrollView contentContainerStyle={[s.screen, pad, style]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><Stagger>{children}</Stagger></ScrollView>
        ) : (
          <View style={[s.screen, { flex: 1 }, pad, style]}>{children}</View>
        )}
      </FocusReplay>
    </SafeAreaView>
  );
}
export const Row = ({ children, style, gap = 12 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);
export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => <View style={[s.card, style]}>{children}</View>;

/* ---------- pressables ---------- */
/** Pressable that scales slightly while pressed. */
const APressable = Animated.createAnimatedComponent(Pressable);
export function Tap({ children, style, scale = 0.97, onPress, ...rest }: Omit<PressableProps, 'style'> & { children: ReactNode; style?: StyleProp<ViewStyle>; scale?: number }) {
  const [v] = useState(() => new Animated.Value(1));
  const to = (n: number) => Animated.spring(v, { toValue: n, useNativeDriver: Platform.OS !== 'web', speed: 40, bounciness: 6 }).start();
  return (
    <APressable accessibilityRole={onPress ? 'button' : undefined} onPressIn={() => to(scale)} onPressOut={() => to(1)} onPress={onPress} {...rest} style={[style, { transform: [{ scale: v }] }]}>
      {children}
    </APressable>
  );
}
type BtnProps = { title: string; onPress?: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'light'; icon?: LucideIcon; busy?: boolean; style?: StyleProp<ViewStyle>; small?: boolean };
export function Btn({ title, onPress, kind = 'primary', icon: Icon, busy, style, small }: BtnProps) {
  const bg = { primary: C.ink, ghost: C.soft, danger: C.dangerSoft, light: C.white }[kind];
  const fg = { primary: C.onInk, ghost: C.ink, danger: C.danger, light: C.onWhite }[kind];
  return (
    <Tap onPress={busy ? undefined : onPress} accessibilityRole="button" accessibilityLabel={title}
      style={[s.btn, small && s.btnSm, { backgroundColor: bg }, kind === 'ghost' && { borderWidth: 1, borderColor: C.line }, busy && { opacity: 0.7 }, style]}>
      {busy ? <ActivityIndicator color={fg} /> : Icon ? <Icon size={small ? 16 : 19} color={fg} strokeWidth={2} /> : null}
      <T size={small ? 13 : 16} w="s" color={fg}>{title}</T>
    </Tap>
  );
}
export function IconBtn({ icon: Icon, onPress, dark, label, size = 42, disabled }: { icon: LucideIcon; onPress?: () => void; dark?: boolean; label: string; size?: number; disabled?: boolean }) {
  return (
    <Tap onPress={disabled ? undefined : onPress} accessibilityLabel={label} accessibilityRole="button" scale={0.9}
      style={[s.iconBtn, { width: size, height: size }, dark && { backgroundColor: C.ink }, disabled && { opacity: 0.3 }]}>
      <Icon size={20} color={dark ? C.onInk : C.ink} strokeWidth={1.9} />
    </Tap>
  );
}
export function Chip({ label, on, onPress, style }: { label: string; on?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Tap onPress={() => { haptic('select'); onPress?.(); }} accessibilityRole="button" accessibilityState={{ selected: !!on }} scale={0.95}
      style={[s.chip, on && { backgroundColor: C.ink, borderColor: C.ink }, style]}>
      <T size={13} w="s" color={on ? C.onInk : C.ink}>{label}</T>
    </Tap>
  );
}
export function Segmented({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.seg}>
      {options.map(([v, l]) => (
        <Pressable key={v} onPress={() => { haptic('select'); onChange(v); }} style={[s.segBtn, value === v && { backgroundColor: C.ink }]} accessibilityRole="tab" accessibilityState={{ selected: value === v }}>
          <T size={14} w="s" color={value === v ? C.onInk : C.muted}>{l}</T>
        </Pressable>
      ))}
    </View>
  );
}

/** Labelled text box with a clear border and focus ring, so it reads as editable. */
export function Input({ label, value, onChange, placeholder, unit, keyboard, secure, style }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; unit?: string; keyboard?: KeyboardTypeOptions; secure?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[{ minWidth: 0, gap: 6 }, style]}>
      {label ? <T size={13} w="s" color={C.muted}>{label}</T> : null}
      <View style={[s.input, focus && { borderColor: C.accent, backgroundColor: C.card }]}>
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.faint} keyboardType={keyboard}
          secureTextEntry={secure} autoCapitalize={secure || keyboard === 'email-address' ? 'none' : undefined} autoCorrect={secure || keyboard === 'email-address' ? false : undefined}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={s.inputText} accessibilityLabel={label ?? placeholder} />
        {unit ? <T size={14} w="m" color={C.muted}>{unit}</T> : null}
      </View>
    </View>
  );
}

/* ---------- data viz primitives ---------- */
const clamp01 = (v: number) => Math.max(0, Math.min(1, v || 0));
const EASE = { duration: 700, easing: Easing.out(Easing.cubic) };
/** Animated 0–1 fill: grows from empty on every visit to the screen, and glides between values in between. */
function useFill(value: number, duration = EASE.duration) {
  const visit = useVisit();
  const v = useSharedValue(0);
  const seen = useRef(visit);
  useEffect(() => {
    if (seen.current !== visit) { seen.current = visit; v.value = 0; }
    v.value = withTiming(value, { ...EASE, duration });
  }, [value, visit, duration, v]);
  return v;
}
/** Progress bar that fills smoothly whenever its value changes. */
export function Bar({ value, color = C.accent, height = 6, track = C.track }: { value: number; color?: string; height?: number; track?: string }) {
  const v = useFill(clamp01(value));
  const fill = useAnimatedStyle(() => ({ width: `${v.value * 100}%` }));
  return (
    <View style={{ height, borderRadius: 99, backgroundColor: track, overflow: 'hidden' }}>
      <Reanimated.View style={[{ height: '100%', borderRadius: 99, backgroundColor: color }, fill]} />
    </View>
  );
}
const ACircle = Reanimated.createAnimatedComponent(Circle);
export function Ring({ value, size = 36, stroke = 4, color = C.accent, track = C.track, children }: { value: number; size?: number; stroke?: number; color?: string; track?: string; children?: ReactNode }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const v = useFill(clamp01(value));
  const ring = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - v.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <ACircle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${c} ${c}`} animatedProps={ring} />
        </G>
      </Svg>
      {children}
    </View>
  );
}
/** 270° dial, open at the bottom. */
export function Gauge({ value, size = 190, children }: { value: number; size?: number; children?: ReactNode }) {
  const stroke = 14, r = size / 2 - stroke, c = 2 * Math.PI * r, arc = c * 0.75;
  const v = useFill(Math.max(0.001, clamp01(value)), 900);
  const dial = useAnimatedProps(() => ({ strokeDasharray: `${arc * v.value} ${c}` }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <G transform={`rotate(135 ${size / 2} ${size / 2})`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.track} strokeWidth={stroke} fill="none" strokeLinecap="round" strokeDasharray={`${arc} ${c}`} />
          <ACircle cx={size / 2} cy={size / 2} r={r} stroke={C.accent} strokeWidth={stroke} fill="none" strokeLinecap="round" animatedProps={dial} />
        </G>
      </Svg>
      {children}
    </View>
  );
}

/* ---------- toast ---------- */
type ToastFn = (msg: string, undo?: () => void) => void;
const ToastCtx = createContext<ToastFn>(() => {});
export const useToast = () => useContext(ToastCtx);
export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ text: string; undo?: () => void } | null>(null);
  const [y] = useState(() => new Animated.Value(80));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const hide = useCallback(() => Animated.timing(y, { toValue: 80, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start(() => setMsg(null)), [y]);
  const show: ToastFn = useCallback((text, undo) => {
    setMsg({ text, undo });
    Animated.spring(y, { toValue: 0, useNativeDriver: Platform.OS !== 'web', speed: 18, bounciness: 6 }).start();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(hide, undo ? 4000 : 2200);
  }, [y, hide]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && (
        <Animated.View pointerEvents="box-none" style={[s.toastWrap, { bottom: insets.bottom + 96, transform: [{ translateY: y }] }]}>
          <View style={s.toast} accessibilityLiveRegion="polite">
            <T size={14} w="m" color={C.onInk} style={{ flexShrink: 1 }}>{msg.text}</T>
            {msg.undo && <Pressable onPress={() => { msg.undo?.(); hide(); }} hitSlop={10}><T size={14} w="b" color={C.accent}>Undo</T></Pressable>}
          </View>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

/* ---------- bottom sheet ---------- */
export function Sheet({ open, onClose, title, subtitle, children }: { open: boolean; onClose: () => void; title: string; subtitle?: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={[s.sheet, { paddingBottom: kb ? kb + 16 : insets.bottom + 20 }]}>
        <View style={s.grab} />
        <T size={21} w="s">{title}</T>
        {subtitle ? <T size={14} color={C.muted}>{subtitle}</T> : null}
        <ScrollView style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 10, paddingTop: 6 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView>
      </View>
    </Modal>
  );
}

export const s = themed(() => StyleSheet.create({
  screen: { paddingHorizontal: 20, paddingTop: 16, gap: SP.section },
  card: { backgroundColor: C.card, borderRadius: R.card, padding: SP.pad, borderWidth: 1, borderColor: C.line },
  btn: { minHeight: 50, borderRadius: R.pill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20 },
  btnSm: { minHeight: 38, paddingHorizontal: 16 },
  iconBtn: { borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  chip: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: C.field, backgroundColor: C.card },
  input: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: C.field, backgroundColor: C.card },
  inputText: { flex: 1, minWidth: 0, width: 0, fontFamily: F.m, fontSize: 16, color: C.ink, paddingVertical: 12 },
  seg: { flexDirection: 'row', backgroundColor: C.card, borderRadius: 16, padding: 4, borderWidth: 1, borderColor: C.line },
  segBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: 'center' },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: C.ink, paddingVertical: 12, paddingHorizontal: 18, borderRadius: 16, maxWidth: 420 },
  backdrop: { flex: 1, backgroundColor: 'rgba(20,20,20,0.4)' },
  sheet: { maxHeight: '88%', backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, gap: 6 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 99, backgroundColor: C.field, marginBottom: 10 },
  tile: { flex: 1, minWidth: 0, minHeight: 128, borderRadius: R.tile, padding: 16, justifyContent: 'space-between', gap: 14 },
  tileIc: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: R.card, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  linkIc: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
}));

/* ---------- tab header with profile avatar (shown on every tab) ---------- */
export function TabHeader({ title, subtitle, right, onAvatar, initial }: { title: string; subtitle?: string; right?: ReactNode; onAvatar: () => void; initial: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {subtitle ? <T size={13} color={C.muted} numberOfLines={1}>{subtitle}</T> : null}
        <T size={TY.title} w="b" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ lineHeight: 32 }}>{title}</T>
      </View>
      {right}
      <Tap onPress={onAvatar} scale={0.9} accessibilityLabel="Open your profile" style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
        <T size={16} w="b" color={C.white}>{initial}</T>
      </Tap>
    </View>
  );
}
/** Small labelled number tile. */
export function Stat({ label, value, unit, tone, onPress }: { label: string; value: string | number; unit?: string; tone?: [string, string]; onPress?: () => void }) {
  const bg = tone?.[0] ?? C.card, ink = tone?.[1] ?? C.ink;
  return (
    <Tap onPress={onPress} scale={onPress ? 0.97 : 1} style={{ flex: 1, minWidth: 0, minHeight: 88, alignSelf: 'stretch', justifyContent: 'space-between', borderRadius: R.tile, paddingVertical: 14, paddingHorizontal: 14, gap: 10, backgroundColor: bg, borderWidth: tone ? 0 : 1, borderColor: C.line }}>
      <T size={12} w="s" color={tone ? ink : C.muted} numberOfLines={2} style={{ lineHeight: 16, opacity: tone ? 0.85 : 1 }}>{label}</T>
      <T size={20} w="b" color={ink} numberOfLines={1} adjustsFontSizeToFit>{value}{unit ? <T size={12} w="m" color={ink}>{unit}</T> : null}</T>
    </Tap>
  );
}
export const SectionTitle = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -8 }}>
    <T size={11} w="s" color={C.muted} style={{ letterSpacing: 0.8, textTransform: 'uppercase' }}>{title}</T>
    {action ? <Pressable onPress={onAction} hitSlop={10}><T size={12.5} w="s" color={C.accent}>{action}</T></Pressable> : null}
  </View>
);

/* ---------- navigation pieces ---------- */
/** Back arrow, centred title and an optional right action, for stack screens. */
export function BackHeader({ title, onBack, right }: { title: string; onBack: () => void; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <IconBtn icon={ArrowLeft} label="Back" onPress={onBack} />
      <T size={17} w="s" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>{title}</T>
      {right ?? <View style={{ width: 42 }} />}
    </View>
  );
}

/** Big pastel button that opens a section: icon, label, headline number and a short line. */
export function NavTile({ icon: Icon, tone, label, value, sub, onPress, style }: { icon: LucideIcon; tone: [string, string]; label: string; value: string; sub?: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Tap onPress={() => { haptic('select'); onPress(); }} accessibilityLabel={`${label}: ${value}${sub ? `, ${sub}` : ''}. Open`} style={[s.tile, { backgroundColor: tone[0] }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={s.tileIc}><Icon size={19} color={tone[1]} strokeWidth={2} /></View>
        <ChevronRight size={18} color={tone[1]} style={{ opacity: 0.6 }} />
      </View>
      <View style={{ gap: 2 }}>
        <T size={13} w="s" color={tone[1]} style={{ opacity: 0.8 }}>{label}</T>
        <T size={TY.hero} w="b" color={tone[1]} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
        {sub ? <T size={12} w="m" color={tone[1]} numberOfLines={1} style={{ opacity: 0.8 }}>{sub}</T> : null}
      </View>
    </Tap>
  );
}

/** Tappable row inside a list: icon, title, subtitle, chevron. */
export function LinkRow({ icon: Icon, tone, title, sub, onPress, right }: { icon: LucideIcon; tone?: [string, string]; title: string; sub?: string; onPress: () => void; right?: ReactNode }) {
  return (
    <Tap onPress={onPress} scale={0.98} style={s.linkRow} accessibilityLabel={title}>
      <View style={[s.linkIc, { backgroundColor: tone?.[0] ?? C.soft }]}><Icon size={18} color={tone?.[1] ?? C.ink} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={15} w="s" numberOfLines={1}>{title}</T>
        {sub ? <T size={12} color={C.muted} numberOfLines={1}>{sub}</T> : null}
      </View>
      {right ?? <ChevronRight size={18} color={C.faint} />}
    </Tap>
  );
}
