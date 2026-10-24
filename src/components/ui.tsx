import * as Haptics from 'expo-haptics';
import { ArrowLeft, ChevronRight, LucideIcon } from '@/components/ico';
import { createContext, ReactNode, useCallback, useContext, useEffect, useId, useRef, useState } from 'react';
import {
  Animated, KeyboardTypeOptions, Modal, Platform, Pressable, PressableProps, ScrollView, StyleProp, StyleSheet, Text, TextProps, TextStyle, View, ViewStyle,
} from 'react-native';
import {
  Avatar, Button as PButton, Card as PCard, Chip as PChip, IconButton, List, Snackbar, TextInput as PTextInput,
} from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Reanimated, { useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import Svg, { Circle, Defs, G, LinearGradient, Rect, Stop } from 'react-native-svg';

import { C, F, H, R, SP, themed, TY } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboard';
import { FocusReplay, Stagger, useVisit } from './motion';
import { pi } from './paper-icons';

export const haptic = (kind: 'light' | 'success' | 'select' = 'light') => {
  if (Platform.OS === 'web') return;
  if (kind === 'success') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  else if (kind === 'select') Haptics.selectionAsync().catch(() => {});
  else Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

/* ---------- text ---------- */
type TProps = TextProps & { size?: number; w?: keyof typeof F; color?: string; center?: boolean; style?: StyleProp<TextStyle> };
export function T({ size = 15, w = 'r', color = C.ink, center, style, ...rest }: TProps) {
  // Headings tighten and sit snug; body text gets room to breathe.
  const ls = size >= 22 ? -0.025 * size : size >= 17 ? -0.01 * size : 0.1;
  const lh = size >= 22 ? 1.15 : size >= 17 ? 1.25 : 1.4;
  return <Text {...rest} style={[{ fontFamily: size >= 17 ? H[w] : F[w], fontSize: size, color, letterSpacing: ls, lineHeight: Math.round(size * lh) }, center && { textAlign: 'center' }, style]} />;
}
export const Label = ({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) => (
  <T size={13} w="s" color={C.muted} style={style}>{children}</T>
);

/* ---------- layout ---------- */
/**
 * `footer` stays pinned at the bottom (above the keyboard) while the content scrolls, for a screen's main action.
 * `overlay` floats above the content (e.g. a + button); place it with absolute positioning.
 */
export function Screen({ children, tabs, scroll = true, style, footer, overlay }: { children: ReactNode; tabs?: boolean; scroll?: boolean; style?: StyleProp<ViewStyle>; footer?: ReactNode; overlay?: ReactNode }) {
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  // Tab screens sit above the bottom navigation bar, which handles the home-indicator inset itself.
  const pad = { paddingBottom: footer ? 20 : kb ? kb + 24 : tabs ? 28 : 32 + insets.bottom };
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <FocusReplay>
        {scroll ? (
          <ScrollView contentContainerStyle={[s.screen, pad, style]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><Stagger>{children}</Stagger></ScrollView>
        ) : (
          <View style={[s.screen, { flex: 1 }, pad, style]}>{children}</View>
        )}
        {footer ? <View style={[s.footer, { paddingBottom: kb ? kb + 10 : insets.bottom + 12 }]}>{footer}</View> : null}
        {overlay}
      </FocusReplay>
    </SafeAreaView>
  );
}
export const Row = ({ children, style, gap = 12 }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

/** Navy-to-cobalt feature surface, with content kept above the decorative gradient. */
export function FeatureCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const id = `feature-${useId().replace(/:/g, '')}`;
  return <View style={[s.feature, style]}>
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
      <Defs><LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%"><Stop offset="0" stopColor={C.hero} /><Stop offset="1" stopColor={C.heroEnd} /></LinearGradient></Defs>
      <Rect width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
    {children}
  </View>;
}
/* Style keys that belong on the Paper card itself; everything else lays out its content. */
const CARD_OUTER = new Set(['backgroundColor', 'borderRadius', 'borderColor', 'borderWidth', 'flex', 'flexGrow', 'flexShrink', 'flexBasis', 'alignSelf',
  'width', 'minWidth', 'maxWidth', 'height', 'minHeight', 'opacity', 'margin', 'marginTop', 'marginBottom', 'marginLeft', 'marginRight', 'marginHorizontal', 'marginVertical']);
/** Paper's Card hands layout props (index, borderRadiusStyles…) to its direct children; this absorbs them. */
const CardBody = ({ children }: { children: ReactNode }) => <>{children}</>;
/** Flat Paper card. A column card cascades its rows in on every visit; row cards animate as one piece. */
export const Card = ({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) => {
  const outer: Record<string, unknown> = {}, inner: Record<string, unknown> = {};
  Object.entries(StyleSheet.flatten(style) ?? {}).forEach(([k, v]) => { (CARD_OUTER.has(k) ? outer : inner)[k] = v; });
  const row = inner.flexDirection === 'row' || inner.flexDirection === 'row-reverse';
  return (
    <PCard mode="contained" style={[s.card, outer as ViewStyle]} contentStyle={[s.cardIn, inner as ViewStyle]}>
      <CardBody>{row ? children : <Stagger step={45} max={8} lift={10} base={80}>{children}</Stagger>}</CardBody>
    </PCard>
  );
};

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
type BtnProps = { title: string; onPress?: () => void; kind?: 'primary' | 'ghost' | 'danger' | 'light' | 'glass'; icon?: LucideIcon; busy?: boolean; style?: StyleProp<ViewStyle>; small?: boolean };
/** Paper pill button. primary = filled blue, ghost/light/glass = soft tonal blue, danger = red tonal. */
export function Btn({ title, onPress, kind = 'primary', icon, busy, style, small }: BtnProps) {
  const { minHeight, ...rest } = StyleSheet.flatten(style) ?? {};
  const mode = kind === 'primary' ? 'contained' : 'contained-tonal';
  const colors = kind === 'danger' ? { buttonColor: C.dangerSoft, textColor: C.danger }
    : kind === 'light' ? { buttonColor: C.card, textColor: C.accent } : kind === 'primary' ? {} : { buttonColor: C.accentTint, textColor: C.accent };
  return (
    <PButton mode={mode} {...colors} icon={icon ? pi(icon, 2) : undefined} loading={busy} onPress={busy ? undefined : onPress} accessibilityLabel={title}
      style={[s.btn, rest]} contentStyle={{ minHeight: (minHeight as number) ?? (small ? 40 : 52) }}
      labelStyle={{ fontFamily: F.s, fontSize: small ? 13.5 : 15.5, letterSpacing: 0.1, marginVertical: 0 }}>
      {title}
    </PButton>
  );
}
export function IconBtn({ icon, onPress, dark, label, size = 42, disabled }: { icon: LucideIcon; onPress?: () => void; dark?: boolean; label: string; size?: number; disabled?: boolean }) {
  return (
    <IconButton icon={pi(icon, dark ? 2.2 : 1.9)} mode="contained" containerColor={dark ? C.accent : C.card} iconColor={dark ? C.white : C.ink}
      size={20} onPress={onPress} disabled={disabled} accessibilityLabel={label} style={{ width: size, height: size, margin: 0, borderRadius: size / 2 }} />
  );
}
export function Chip({ label, on, onPress, style }: { label: string; on?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <PChip mode={on ? 'flat' : 'outlined'} selected={!!on} showSelectedCheck={false} onPress={() => { haptic('select'); onPress?.(); }} compact
      accessibilityState={{ selected: !!on }} style={[s.chip, on && { backgroundColor: C.accentSoft, borderColor: C.accentSoft }, style]}
      textStyle={{ fontFamily: F.s, fontSize: 13, color: on ? C.accentInk : C.ink }}>
      {label}
    </PChip>
  );
}
export function Segmented({ options, value, onChange }: { options: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.segment} accessibilityRole="tablist">
      {options.map(([v, l]) => <Pressable key={v} accessibilityRole="tab" accessibilityLabel={l} accessibilityState={{ selected: value === v }}
        onPress={() => { haptic('select'); onChange(v); }} style={[s.segmentItem, value === v && s.segmentOn]}>
        <T size={12} w={value === v ? 's' : 'm'} color={value === v ? C.ink : C.muted}>{l}</T>
      </Pressable>)}
    </View>
  );
}

/** Paper outlined text field with a floating label; the unit rides in the label so narrow fields keep room for the value. */
export function Input({ label, value, onChange, placeholder, unit, keyboard, secure, style }: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string; unit?: string; keyboard?: KeyboardTypeOptions; secure?: boolean; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ minWidth: 0 }, style]}>
      <PTextInput mode="outlined" label={label && unit ? `${label} (${unit})` : label} value={value} onChangeText={onChange} placeholder={placeholder} keyboardType={keyboard} secureTextEntry={secure}
        autoCapitalize={secure || keyboard === 'email-address' ? 'none' : undefined} autoCorrect={secure || keyboard === 'email-address' ? false : undefined}
        outlineStyle={{ borderRadius: R.field }} style={{ backgroundColor: C.card, fontSize: 16 }} contentStyle={{ fontFamily: F.m }} accessibilityLabel={label ?? placeholder} />
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
/** Progress ring. Pass `gradient` for a two-tone stroke that sweeps from the first colour to the second. */
export function Ring({ value, size = 36, stroke = 4, color = C.accent, gradient, track = C.track, children }: {
  value: number; size?: number; stroke?: number; color?: string; gradient?: [string, string]; track?: string; children?: ReactNode;
}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const gid = `rg${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const v = useFill(clamp01(value));
  const ring = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - v.value) }));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        {gradient && (
          <Defs>
            <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={gradient[0]} /><Stop offset="1" stopColor={gradient[1]} />
            </LinearGradient>
          </Defs>
        )}
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <ACircle cx={size / 2} cy={size / 2} r={r} stroke={gradient ? `url(#${gid})` : color} strokeWidth={stroke} fill="none" strokeLinecap="round"
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
  const [msg, setMsg] = useState<{ text: string; undo?: () => void; n: number } | null>(null);
  const [open, setOpen] = useState(false);
  const insets = useSafeAreaInsets();
  const show: ToastFn = useCallback((text, undo) => { setMsg((m) => ({ text, undo, n: (m?.n ?? 0) + 1 })); setOpen(true); }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      <Snackbar key={msg?.n} visible={open} onDismiss={() => setOpen(false)} duration={msg?.undo ? 4000 : 2200}
        action={msg?.undo ? { label: 'Undo', onPress: () => msg.undo?.(), labelStyle: { fontFamily: F.s } } : undefined}
        wrapperStyle={{ bottom: insets.bottom + 84 }} style={{ borderRadius: 14 }} accessibilityLiveRegion="polite">
        <T size={14} w="m" color={C.white}>{msg?.text ?? ''}</T>
      </Snackbar>
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
  screen: { width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: SP.page, paddingTop: 12, gap: SP.section },
  footer: { paddingHorizontal: 20, paddingTop: 10, gap: 8, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line },
  card: { backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line },
  feature: { borderRadius: R.card, padding: 21, overflow: 'hidden', gap: 16 },
  cardIn: { padding: SP.pad },
  btn: { borderRadius: R.btn, justifyContent: 'center' },
  chip: { borderRadius: 12, backgroundColor: C.card, borderColor: C.line },
  segment: { flexDirection: 'row', padding: 4, gap: 4, borderRadius: 13, backgroundColor: C.soft },
  segmentItem: { flex: 1, minHeight: 40, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },
  segmentOn: { backgroundColor: C.card },
  backdrop: { flex: 1, backgroundColor: 'rgba(17,24,39,0.4)' },
  sheet: { maxHeight: '88%', backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 20, paddingTop: 12, gap: 6 },
  grab: { alignSelf: 'center', width: 40, height: 5, borderRadius: 99, backgroundColor: C.field, marginBottom: 10 },
  linkRow: { borderRadius: R.tile, backgroundColor: C.card, overflow: 'hidden' },
  linkIc: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
}));

/* ---------- tab header with profile avatar (shown on every tab) ---------- */
export function TabHeader({ title, subtitle, right, onAvatar, initial }: { title: string; subtitle?: string; right?: ReactNode; onAvatar: () => void; initial: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {subtitle ? <T size={11} w="m" color={C.muted} numberOfLines={1} style={{ letterSpacing: 0.8, marginBottom: 5 }}>{subtitle.toUpperCase()}</T> : null}
        <T size={TY.title} w="b" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={{ lineHeight: 34 }}>{title}</T>
      </View>
      {right}
      <Tap onPress={onAvatar} scale={0.9} accessibilityLabel="Open your profile">
        <Avatar.Text size={38} label={initial} color={C.accentInk} style={{ backgroundColor: C.accentSoft }} labelStyle={{ fontFamily: F.s, fontSize: 15 }} />
      </Tap>
    </View>
  );
}
/** Small labelled number tile. */
export function Stat({ label, value, unit, onPress }: { label: string; value: string | number; unit?: string; tone?: [string, string]; onPress?: () => void }) {
  const bg = C.card, ink = C.ink;
  return (
    <Tap onPress={onPress} scale={onPress ? 0.97 : 1} style={{ flex: 1, minWidth: 0, minHeight: 88, alignSelf: 'stretch', justifyContent: 'space-between', borderRadius: R.tile, paddingVertical: 14, paddingHorizontal: 14, gap: 10, backgroundColor: bg, borderWidth: 1, borderColor: C.line }}>
      <T size={12} w="m" color={C.muted} numberOfLines={2} style={{ lineHeight: 16 }}>{label}</T>
      <T size={20} w="b" color={ink} numberOfLines={1} adjustsFontSizeToFit>{value}{unit ? <T size={12} w="m" color={ink}>{unit}</T> : null}</T>
    </Tap>
  );
}
/** Section heading in the Material list-subheader position, with an optional text action. */
export const SectionTitle = ({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -10, minHeight: 36 }}>
    <T size={17} w="s">{title}</T>
    {action ? <PButton mode="text" compact onPress={onAction} labelStyle={{ fontFamily: F.s, fontSize: 13.5, marginHorizontal: 8 }}>{action}</PButton> : null}
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

/** Tappable row inside a list: icon, title, subtitle, chevron. */
export function LinkRow({ icon: Icon, tone, title, sub, onPress, right }: { icon: LucideIcon; tone?: [string, string]; title: string; sub?: string; onPress: () => void; right?: ReactNode }) {
  return (
    <View style={s.linkRow}>
      <List.Item title={title} description={sub} onPress={onPress} accessibilityLabel={title} titleNumberOfLines={1} descriptionNumberOfLines={1}
        titleStyle={{ fontFamily: F.s, fontSize: 15, color: C.ink }} descriptionStyle={{ fontFamily: F.r, fontSize: 12.5, color: C.muted }}
        style={{ paddingVertical: 10, paddingLeft: 14, paddingRight: 8 }}
        left={() => <View style={[s.linkIc, { backgroundColor: tone?.[0] ?? C.soft }]}><Icon size={18} color={tone?.[1] ?? C.ink} /></View>}
        right={() => <View style={{ alignSelf: 'center' }}>{right ?? <ChevronRight size={18} color={C.faint} />}</View>} />
    </View>
  );
}
