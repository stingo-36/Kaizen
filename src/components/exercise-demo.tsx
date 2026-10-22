import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

import { C, themed } from '@/lib/theme';
import { Dumbbell, Pause, Play } from './ico';
import { T, Tap } from './ui';

const HOLD = 650, FADE = 550;
const ease = Easing.inOut(Easing.cubic);

/**
 * Loops the start and end photos as a smooth crossfade so the movement reads like a short clip.
 * Both photos are downloaded first, and the fade runs on the UI thread, so it never stutters or flashes blank.
 */
export function ExerciseDemo({ img, img2, style, label = true }: { img: string | null; img2: string | null; style?: StyleProp<ViewStyle>; label?: boolean }) {
  // Loaded and failed photos by URL, so switching exercises never mixes up the counts.
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [bad, setBad] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState(true);
  const ready = !!img && !!loaded[img] && (!img2 || !!loaded[img2]);
  const failed = (!!img && !!bad[img]) || (!!img2 && !!bad[img2]);
  const t = useSharedValue(0);

  // Warm the cache for both frames up front.
  useEffect(() => {
    const urls = [img, img2].filter(Boolean) as string[];
    if (urls.length) Image.prefetch(urls, 'memory-disk').catch(() => {});
  }, [img, img2]);

  useEffect(() => {
    if (!ready || !img2 || !playing) { cancelAnimation(t); return; }
    t.value = withRepeat(withSequence(
      withDelay(HOLD, withTiming(1, { duration: FADE, easing: ease })),
      withDelay(HOLD, withTiming(0, { duration: FADE, easing: ease })),
    ), -1);
    return () => cancelAnimation(t);
  }, [ready, img2, playing, t]);

  const second = useAnimatedStyle(() => ({ opacity: t.value }));
  const startTag = useAnimatedStyle(() => ({ opacity: 1 - t.value }));
  const endTag = useAnimatedStyle(() => ({ opacity: t.value }));

  if (!img) return null;
  const onLoad = (u: string) => () => setLoaded((p) => (p[u] ? p : { ...p, [u]: true }));
  const onError = (u: string) => () => setBad((p) => ({ ...p, [u]: true }));
  return (
    <View style={[st.wrap, style]} accessibilityRole="image" accessibilityLabel="Exercise demo">
      <Image source={img} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" onLoad={onLoad(img)} onError={onError(img)} />
      {img2 ? (
        <Animated.View style={[StyleSheet.absoluteFill, second]}>
          <Image source={img2} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" onLoad={onLoad(img2)} onError={onError(img2)} />
        </Animated.View>
      ) : null}
      {failed ? (
        <View style={[StyleSheet.absoluteFill, st.center]}><Dumbbell size={26} color={C.faint} /><T size={12} color={C.muted}>Couldn’t load the demo</T></View>
      ) : !ready ? (
        <View style={[StyleSheet.absoluteFill, st.center, { backgroundColor: C.soft }]}><ActivityIndicator color={C.accent} /></View>
      ) : null}
      {label && img2 && ready && !failed ? (
        <>
          <View style={st.tag}>
            <Animated.View style={startTag}><T size={11} w="s" color={C.white}>Start</T></Animated.View>
            <Animated.View style={[StyleSheet.absoluteFill, st.center, endTag]}><T size={11} w="s" color={C.white}>Finish</T></Animated.View>
          </View>
          <Tap onPress={() => setPlaying(!playing)} scale={0.9} style={st.play} accessibilityLabel={playing ? 'Pause demo' : 'Play demo'}>
            {playing ? <Pause size={14} color={C.white} /> : <Play size={14} color={C.white} />}
          </Tap>
        </>
      ) : null}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  wrap: { width: '100%', aspectRatio: 1.5, borderRadius: 16, overflow: 'hidden', backgroundColor: C.soft },
  center: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  tag: { position: 'absolute', left: 10, bottom: 10, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 99, backgroundColor: 'rgba(20,20,20,0.55)' },
  play: { position: 'absolute', right: 10, bottom: 10, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,20,20,0.55)' },
}));
