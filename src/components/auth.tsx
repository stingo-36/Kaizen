import { AtSign, Eye, EyeOff, Lock, LucideIcon, Mail, Sparkles, User } from '@/components/ico';
import { ComponentRef, ReactNode, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, F, R, themed } from '@/lib/theme';
import { useKeyboardHeight } from '@/lib/useKeyboard';
import { FocusReplay, Stagger } from './motion';
import { pi } from './paper-icons';
import { Btn, T } from './ui';

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

/** Quiet wordmark and editorial welcome, matching the Cobalt Studio preview. */
function Hero({ compact }: { compact: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[st.hero, { paddingTop: insets.top + 30 }]}>
      <View style={st.mark}><T size={36} w="s" color={C.white}>k.</T></View>
      <T size={12} w="s" color={C.muted} style={{ letterSpacing: 2 }}>KAIZEN</T>
      {!compact && <View style={{ gap: 10, alignItems: 'center', paddingTop: 8 }}>
        <T size={32} w="s" center>A little better.{`\n`}Every day.</T>
        <T size={14} color={C.muted} center>Your life, finding its rhythm.</T>
      </View>}
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
                <T size={24} w="s">{login ? 'Welcome back.' : 'Make room for better.'}</T>
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
      style={{ borderRadius: R.btn }} contentStyle={{ minHeight: 52 }} labelStyle={{ fontFamily: F.s, fontSize: 15, color: C.ink, marginVertical: 0 }}>
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
  hero: { alignItems: 'center', gap: 12, paddingHorizontal: 24, paddingBottom: 22, maxWidth: 480, width: '100%', alignSelf: 'center' },
  mark: { width: 64, height: 64, borderRadius: 20, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  page: { gap: 14, paddingHorizontal: 24, paddingTop: 12, maxWidth: 480, width: '100%', alignSelf: 'center' },
  or: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 2 },
  rule: { flex: 1, height: 1, backgroundColor: C.line },
}));
