import { usePathname, useRouter } from 'expo-router';
import { Tabs, TabList, TabSlot, TabTrigger } from 'expo-router/ui';
import { Briefcase, Dumbbell, House, ListChecks, LucideIcon, Utensils, Wallet } from '@/components/ico';
import { BottomNavigation } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptic } from '@/components/ui';
import { C, toneOf } from '@/lib/theme';

/* Each tab has its own colour: the icon always shows in it, and the selected tab's pill and label take it too. */
const TABS: { name: string; href: '/' | '/habits' | '/workouts' | '/food' | '/spendwise' | '/tracker'; label: string; icon: LucideIcon; tone: [string, string] }[] = [
  { name: 'index', href: '/', label: 'Home', icon: House, tone: toneOf(1) },
  { name: 'habits', href: '/habits', label: 'Habits', icon: ListChecks, tone: toneOf(0) },
  { name: 'workouts', href: '/workouts', label: 'Workouts', icon: Dumbbell, tone: toneOf(3) },
  { name: 'food', href: '/food', label: 'Food', icon: Utensils, tone: toneOf(4) },
  { name: 'spendwise', href: '/spendwise', label: 'Spend', icon: Wallet, tone: toneOf(2) },
  { name: 'tracker', href: '/tracker', label: 'Tracker', icon: Briefcase, tone: toneOf(5) },
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
        return <t.icon size={22} color={t.tone[1]} strokeWidth={focused ? 2.2 : 1.9} />;
      }}
      getLabelText={({ route }) => route.title}
      activeColor={TABS[index].tone[1]}
      inactiveColor={C.muted}
      activeIndicatorStyle={{ backgroundColor: TABS[index].tone[0] }}
      style={{ backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.line }}
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
