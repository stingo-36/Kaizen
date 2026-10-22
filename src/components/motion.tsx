import { Children, Fragment, isValidElement, ReactNode } from 'react';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

/** Fades and lifts each child in, one after another. Fragments are unwrapped so page sections stagger too. */
export function Stagger({ children, step = 45, max = 10 }: { children: ReactNode; step?: number; max?: number }) {
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
    <Animated.View key={key} entering={FadeInDown.duration(340).delay(Math.min(i, max) * step)}>
      {c}
    </Animated.View>
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
