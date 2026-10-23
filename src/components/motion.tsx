import { useIsFocused } from 'expo-router';
import { Children, createContext, Fragment, isValidElement, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import Animated, { Easing, FadeIn, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

/* Tabs stay mounted, so mount-time entering animations played only on the first visit.
   Instead each screen counts its visits, and animations restart whenever the count changes. */
const Visit = createContext(0);
/** Goes up every time the surrounding screen (or pager page) comes into view. */
export const useVisit = () => useContext(Visit);

/** Bumps the visit count each time this screen gains focus. */
export function FocusReplay({ children }: { children: ReactNode }) {
  const focused = useIsFocused();
  const [visit, setVisit] = useState(focused ? 1 : 0);
  const was = useRef(focused);
  useEffect(() => {
    if (focused && !was.current) setVisit((n) => n + 1);
    was.current = focused;
  }, [focused]);
  return <Visit.Provider value={visit}>{children}</Visit.Provider>;
}

/** Adds `extra` to the surrounding visit count, e.g. for a pager page opened again. */
export const VisitBump = ({ extra, children }: { extra: number; children: ReactNode }) => (
  <Visit.Provider value={useVisit() + extra}>{children}</Visit.Provider>
);

/** Fades, lifts and settles its child in after `delay`, again on every visit. */
function Rise({ children, delay, lift = 18 }: { children: ReactNode; delay: number; lift?: number }) {
  const visit = useVisit();
  const p = useSharedValue(0);
  // Keep the first delay, so a sibling appearing above doesn't replay this one.
  const [wait] = useState(delay);
  useEffect(() => {
    p.value = 0;
    p.value = withDelay(wait, withTiming(1, { duration: 460, easing: Easing.out(Easing.exp) }));
  }, [visit, wait, p]);
  // Drop the transform once settled, like an entering animation would.
  const style = useAnimatedStyle(() => (p.value < 1
    ? { opacity: Math.min(1, p.value * 1.6), transform: [{ translateY: (1 - p.value) * lift }, { scale: 0.97 + 0.03 * p.value }] }
    : { opacity: 1, transform: [] }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

/** Fades and lifts each child in, one after another. Fragments are unwrapped so page sections stagger too. */
export function Stagger({ children, step = 60, max = 10, lift, base = 0 }: { children: ReactNode; step?: number; max?: number; lift?: number; base?: number }) {
  // Keys are prefixed with the fragment's own key: two fragments both have children ".0", ".1"…,
  // and duplicate keys make React drop or duplicate views (overlapping text).
  const flat: { key: string; node: ReactNode }[] = [];
  Children.toArray(children).forEach((c, i) => {
    const k = isValidElement(c) && c.key != null ? String(c.key) : `${i}`;
    if (isValidElement<{ children?: ReactNode }>(c) && c.type === Fragment) {
      Children.toArray(c.props.children).forEach((cc, j) => flat.push({ key: `${k}/${isValidElement(cc) && cc.key != null ? cc.key : j}`, node: cc }));
    } else flat.push({ key: k, node: c });
  });
  return flat.map(({ key, node: c }, i) => (
    <Rise key={key} delay={base + Math.min(i, max) * step} lift={lift}>
      {c}
    </Rise>
  ));
}

/** List row that animates in, out and when its neighbours move. */
export function Item({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <Animated.View entering={FadeIn.duration(250).delay(delay)} exiting={FadeOut.duration(200)} layout={LinearTransition.springify().damping(18)}>
      {children}
    </Animated.View>
  );
}
