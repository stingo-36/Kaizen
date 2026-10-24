import { usePathname, useRouter } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { Briefcase, Dumbbell, House, ListChecks, LucideIcon, Utensils, Wallet } from '@/components/ico';
import { BottomNavigation } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/ui';
import { C } from '@/lib/theme';

/* One cobalt active state keeps all six sections part of the same app. */
const TABS: { name: string; href: '/' | '/habits' | '/workouts' | '/food' | '/spendwise' | '/tracker'; label: string; icon: LucideIcon }[] = [
  { name: 'index', href: '/', label: 'Home', icon: House },
  { name: 'habits', href: '/habits', label: 'Habits', icon: ListChecks },
  { name: 'workouts', href: '/workouts', label: 'Workouts', icon: Dumbbell },
  { name: 'food', href: '/food', label: 'Food', icon: Utensils },
  { name: 'spendwise', href: '/spendwise', label: 'Spend', icon: Wallet },
  { name: 'tracker', href: '/tracker', label: 'Tracker', icon: Briefcase },
];
const ROUTES = TABS.map((t) => ({ key: t.name, title: t.label }));

/** Material 3 navigation bar from React Native Paper, driven by the router's current path. */
function NavBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const path = usePathname();
  const index = Math.max(0, TABS.findIndex((t) => (t.href === '/' ? path === '/' : path.startsWith(t.href))));
  return (
    <BottomNavigation.Bar
      navigationState={{ index, routes: ROUTES }}
      safeAreaInsets={{ bottom: insets.bottom }}
      onTabPress={({ route }) => {
        const t = TABS.find((x) => x.name === route.key);
        if (!t) return;
        if (t.name !== TABS[index].name) haptic('select');
        router.navigate(t.href);
      }}
      renderIcon={({ route, focused }) => {
        const t = TABS.find((x) => x.name === route.key) ?? TABS[0];
        return <t.icon size={22} color={focused ? C.white : C.muted} strokeWidth={focused ? 2.2 : 1.9} />;
      }}
      getLabelText={({ route }) => route.title}
      activeColor={C.accent}
      inactiveColor={C.muted}
      activeIndicatorStyle={{ backgroundColor: C.accent }}
      style={{ width: '100%', maxWidth: 560, alignSelf: 'center', backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={{ display: 'none' }}>
        {TABS.map((t) => <TabTrigger key={t.name} name={t.name} href={t.href} />)}
      </TabList>
      <NavBar />
    </Tabs>
  );
}
