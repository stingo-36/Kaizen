import { ComponentRef, ReactNode, useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { C, themed } from '@/lib/theme';
import { Stagger } from './motion';
import { haptic, s as ui, T } from './ui';

export type Page = { key: string; label: string; render: () => ReactNode };

/** Text tabs with an underline under the open one, like WorkNest's own Tracker. */
export function PagerTabs({ labels, index, onChange }: { labels: string[]; index: number; onChange: (i: number) => void }) {
  return (
    <View style={st.tabs} accessibilityRole="tablist">
      {labels.map((l, i) => {
        const on = i === index;
        return (
          <Pressable key={l} onPress={() => { if (!on) { haptic('select'); onChange(i); } }} hitSlop={8} style={[st.tab, on && st.tabOn]}
            accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={l}>
            <T size={14} w={on ? 's' : 'm'} color={on ? C.ink : C.muted} numberOfLines={1}>{l}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A screen split into pages: tap a tab or swipe sideways to move between them.
 * Each page scrolls on its own; pages render the first time they're opened.
 */
export function PagerScreen({ header, pages, tabs, initial = 0, index: ctrl, onIndex }: {
  header?: ReactNode; pages: Page[]; tabs?: boolean; initial?: number; index?: number; onIndex?: (i: number) => void;
}) {
  const insets = useSafeAreaInsets();
  const [w, setW] = useState(0);
  const [own, setOwn] = useState(initial);
  const index = ctrl ?? own;
  const [seen, setSeen] = useState<Set<number>>(() => new Set([index]));
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const settling = useRef(false);

  const set = (i: number) => { setOwn(i); onIndex?.(i); setSeen((p) => (p.has(i) ? p : new Set(p).add(i))); };
  const go = (i: number) => { settling.current = true; set(i); ref.current?.scrollTo({ x: i * w, animated: true }); setTimeout(() => { settling.current = false; }, 400); };

  // Keep the scroll position in step when the index changes from outside or the width changes.
  useEffect(() => { if (w) ref.current?.scrollTo({ x: index * w, animated: false }); }, [w]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ctrl != null && w) ref.current?.scrollTo({ x: ctrl * w, animated: true }); }, [ctrl]); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!w || settling.current) return;
    const i = Math.round(e.nativeEvent.contentOffset.x / w);
    if (i !== index && i >= 0 && i < pages.length) { haptic('select'); set(i); }
  };
  const pad = { paddingBottom: (tabs ? 110 : 32) + insets.bottom };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={st.head}>
        {header}
        {pages.length > 1 && <PagerTabs labels={pages.map((p) => p.label)} index={index} onChange={go} />}
      </View>
      <View style={{ flex: 1 }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        {w > 0 && (
          <ScrollView ref={ref} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32}
            directionalLockEnabled nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {pages.map((p, i) => (
              <ScrollView key={p.key} style={{ width: w }} contentContainerStyle={[ui.screen, { paddingTop: 16 }, pad]} showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled" nestedScrollEnabled>
                {seen.has(i) || i === index ? <Stagger>{p.render()}</Stagger> : null}
              </ScrollView>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const st = themed(() => StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 12, gap: 16 },
  tabs: { flexDirection: 'row', gap: 20, borderBottomWidth: 1, borderBottomColor: C.line },
  tab: { paddingBottom: 9, marginBottom: -1, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabOn: { borderBottomColor: C.ink },
}));
