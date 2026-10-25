import { useRouter } from 'expo-router';
import { View } from 'react-native';
import { BackHeader, Btn, Card, Row, Screen, T } from '@/components/ui';
import { HOME_CARDS, homeLayout, moveHomeCard } from '@/lib/planning';
import { useStore } from '@/lib/store';
import { C } from '@/lib/theme';

export default function HomeSettings() {
  const router = useRouter();
  const { profile, setProfile } = useStore();
  const layout = homeLayout(profile.homeLayout);
  return <Screen>
    <BackHeader title="Customize Home" onBack={() => router.back()} />
    <T size={25} w="s">Make room for what matters.</T><T color={C.muted}>Reorder your cards or hide the sections you don’t use. Changes save to your account.</T>
    {layout.order.map((id, index) => <Card key={id} style={{ gap: 12 }}>
      <Row style={{ justifyContent: 'space-between' }}><View style={{ flex: 1 }}><T w="s">{HOME_CARDS.find(([key]) => key === id)?.[1]}</T><T size={12} color={C.muted}>{layout.hidden.includes(id) ? 'Hidden' : `Position ${index + 1}`}</T></View><Btn title={layout.hidden.includes(id) ? 'Show' : 'Hide'} kind="ghost" small onPress={() => setProfile((p) => {
        const current = homeLayout(p.homeLayout);
        return { ...p, homeLayout: { ...current, hidden: current.hidden.includes(id) ? current.hidden.filter((key) => key !== id) : [...current.hidden, id] } };
      })} /></Row>
      <Row gap={8}>{index > 0 && <Btn title="Move up" kind="ghost" small onPress={() => setProfile((p) => ({ ...p, homeLayout: moveHomeCard(homeLayout(p.homeLayout), id, -1) }))} />}{index < layout.order.length - 1 && <Btn title="Move down" kind="ghost" small onPress={() => setProfile((p) => ({ ...p, homeLayout: moveHomeCard(homeLayout(p.homeLayout), id, 1) }))} />}</Row>
    </Card>)}
    <Btn title="Restore default layout" kind="ghost" onPress={() => setProfile((p) => ({ ...p, homeLayout: homeLayout() }))} />
  </Screen>;
}
