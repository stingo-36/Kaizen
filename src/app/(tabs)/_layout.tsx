import { TabList, Tabs, TabSlot, TabTrigger, TabTriggerSlotProps } from 'expo-router/ui';
import { Briefcase, Dumbbell, House, ListChecks, LucideIcon, Utensils, Wallet } from '@/components/ico';
import { ComponentRef, Ref, useEffect } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic, T } from '@/components/ui';
import { C, themed } from '@/lib/theme';

const TABS: { name: string; href: '/' | '/habits' | '/workouts' | '/food' | '/spendwise' | '/tracker'; label: string; icon: LucideIcon }[] = [
  { name: 'index', href: '/', label: 'Home', icon: House },
  { name: 'habits', href: '/habits', label: 'Habits', icon: ListChecks },
  { name: 'workouts', href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { name: 'food', href: '/food', label: 'Food', icon: Utensils },
  { name: 'spendwise', href: '/spendwise', label: 'Spend', icon: Wallet },
  { name: 'tracker', href: '/tracker', label: 'Tracker', icon: Briefcase },
];

/* Every tab has the same width, so the bar never changes size; only the highlight moves.
   Tabs are 64pt wide, narrower on small phones so all six fit with a margin either side. */
const MAX_SLOT = 64, PAD = 6;
const EASE = { duration: 260, easing: Easing.out(Easing.cubic) };

type BtnProps = Omit<TabTriggerSlotProps, 'ref'> & { ref?: Ref<ComponentRef<typeof Pressable>>; label: string; icon: LucideIcon; onFocus: () => void; width: number };

/** One tab: icon over a small label. The colour change fades with the sliding highlight. */
function TabButton({ ref, isFocused, label, icon: Icon, onFocus, onPress, width, ...rest }: BtnProps) {
  useEffect(() => { if (isFocused) onFocus(); }, [isFocused, onFocus]);
  const on = useSharedValue(isFocused ? 1 : 0);
  useEffect(() => { on.value = withTiming(isFocused ? 1 : 0, EASE); }, [isFocused, on]);
  const lift = useAnimatedStyle(() => ({ transform: [{ translateY: -1.5 * on.value }] }));
  const color = isFocused ? C.barOnInk : C.barInk;
  return (
    <Pressable ref={ref} {...rest} onPress={(e) => { if (!isFocused) haptic('select'); onPress?.(e); }} accessibilityRole="tab" accessibilityLabel={label}
      accessibilityState={{ selected: !!isFocused }} style={[st.btn, { width }]}>
      <Animated.View style={[{ alignItems: 'center', gap: 2 }, lift]}>
        <Icon size={20} color={color} strokeWidth={isFocused ? 2.2 : 1.9} />
        <T size={10} w="s" color={color} numberOfLines={1} style={{ lineHeight: 12 }}>{label}</T>
      </Animated.View>
    </Pressable>
  );
}

function FloatingBar() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const SLOT = Math.min(MAX_SLOT, Math.floor((width - 24 - PAD * 2) / TABS.length));
  const x = useSharedValue(-1);
  const ind = useAnimatedStyle(() => ({ opacity: x.value < 0 ? 0 : 1, transform: [{ translateX: Math.max(0, x.value) }] }));
  const focus = (i: number) => { x.value = x.value < 0 ? i * SLOT : withTiming(i * SLOT, EASE); };
  return (
    <View pointerEvents="box-none" style={[st.wrap, { bottom: insets.bottom + 12 }]}>
      <View style={[st.bar, { width: SLOT * TABS.length + PAD * 2 }]}>
        <Animated.View style={[st.ind, { width: SLOT }, ind]} />
        {TABS.map((t, i) => (
          <TabTrigger key={t.name} name={t.name} asChild>
            <TabButton label={t.label} icon={t.icon} width={SLOT} onFocus={() => focus(i)} />
          </TabTrigger>
        ))}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={{ display: 'none' }}>
        {TABS.map((t) => <TabTrigger key={t.name} name={t.name} href={t.href} />)}
      </TabList>
      <FloatingBar />
    </Tabs>
  );
}

const st = themed(() => StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', padding: PAD, borderRadius: 999, backgroundColor: C.bar },
  ind: { position: 'absolute', left: PAD, top: PAD, height: 52, borderRadius: 999, backgroundColor: C.barOn },
  btn: { height: 52, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
}));
