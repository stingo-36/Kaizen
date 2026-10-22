import { Activity, AtSign, Dumbbell, Eye, EyeOff, Footprints, ListChecks, Lock, LucideIcon, Mail, Sparkles, User, Utensils, Wallet } from '@/components/ico';
import { ComponentRef, ReactNode, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, PASTEL, themed } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboard';
import { Btn, T, Tap } from './ui';

export function Field({ icon: Icon, value, onChange, placeholder, secure, autoComplete, onSubmit }: {
  icon: LucideIcon; value: string; onChange: (v: string) => void; placeholder: string; secure?: boolean;
  autoComplete?: 'email' | 'username' | 'password' | 'new-password' | 'name'; onSubmit?: () => void;
}) {
  const [show, setShow] = useState(false);
  const [focus, setFocus] = useState(false);
  return (
    <View style={[st.field, focus && { borderColor: C.ink }]}>
      <Icon size={17} color={focus ? C.ink : C.muted} strokeWidth={1.9} />
      <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.faint} style={st.input}
        secureTextEntry={secure && !show} autoCapitalize={autoComplete === 'name' ? 'words' : 'none'} autoCorrect={false} autoComplete={autoComplete}
        keyboardType={autoComplete === 'email' ? 'email-address' : 'default'}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} onSubmitEditing={onSubmit} returnKeyType={onSubmit ? 'go' : 'next'} accessibilityLabel={placeholder} />
      {secure && <Pressable onPress={() => setShow(!show)} hitSlop={10} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
        {show ? <EyeOff size={18} color={C.muted} /> : <Eye size={18} color={C.muted} />}</Pressable>}
    </View>
  );
}

/* What Pulse covers, shown as a strip of the same pastel tones the app uses for each area. */
const AREAS: { icon: LucideIcon; label: string; tone: number }[] = [
  { icon: ListChecks, label: 'Habits', tone: 0 },
  { icon: Dumbbell, label: 'Workouts', tone: 4 },
  { icon: Utensils, label: 'Food', tone: 1 },
  { icon: Footprints, label: 'Steps', tone: 2 },
  { icon: Wallet, label: 'Spend', tone: 3 },
];

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
        contentContainerStyle={[st.page, { paddingTop: insets.top + 20, paddingBottom: (kb || insets.bottom) + 24 }]}>
        <View style={st.brand}>
          <View style={st.mark}><Activity size={17} color={C.white} /></View>
          <T size={17} w="b">Pulse</T>
        </View>

        <View style={{ gap: 8, marginTop: 36 }}>
          <T size={28} w="b" style={{ lineHeight: 33 }}>{login ? 'Welcome back' : 'Create your account'}</T>
          <T size={14.5} color={C.muted} style={{ lineHeight: 21 }}>
            {login ? 'Log in to pick up your day where you left off.' : 'Habits, workouts, meals, steps and spending, all in one place.'}
          </T>
        </View>

        <View style={st.areas} accessible accessibilityLabel="Pulse tracks habits, workouts, food, steps and spending">
          {AREAS.map(({ icon: Icon, label, tone }) => (
            <View key={label} style={st.area}>
              <View style={[st.areaIc, { backgroundColor: PASTEL[tone][0] }]}><Icon size={17} color={PASTEL[tone][1]} /></View>
              <T size={11} w="m" color={C.muted} numberOfLines={1}>{label}</T>
            </View>
          ))}
        </View>

        <View style={st.form} onLayout={(e) => { formY.current = e.nativeEvent.layout.y; }}>{children}</View>
      </ScrollView>
    </View>
  );
}

/** Quiet secondary option under the main button: fills in the shared demo account. */
export function DemoCard({ onPress }: { onPress: () => void }) {
  return (
    <Tap onPress={onPress} style={st.demo} scale={0.98} accessibilityRole="button" accessibilityLabel="Fill in the demo account">
      <Sparkles size={15} color={C.accent} />
      <T size={13.5} w="s" color={C.ink}>Try the demo account</T>
    </Tap>
  );
}

/** "or" between the main action and the demo option. */
export function OrRule() {
  return (
    <View style={st.or}>
      <View style={st.rule} /><T size={11.5} color={C.faint}>or</T><View style={st.rule} />
    </View>
  );
}

export const AuthIcons = { AtSign, Lock, User, Mail };
export { Btn };

const st = themed(() => StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 24, maxWidth: 480, width: '100%', alignSelf: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  mark: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  areas: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 28, paddingVertical: 14, paddingHorizontal: 8, borderRadius: 18, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  area: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
  areaIc: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  form: { gap: 12, marginTop: 28 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 50, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.line },
  input: { flex: 1, minWidth: 0, fontFamily: F.r, fontSize: 15, color: C.ink, paddingVertical: 12 },
  or: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
  rule: { flex: 1, height: 1, backgroundColor: C.line },
  demo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 999, backgroundColor: C.accentTint, borderWidth: 1, borderColor: C.accentSoft },
}));
