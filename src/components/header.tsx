import { useRouter } from 'expo-router';
import { ReactNode } from 'react';

import { PASTEL } from '@/lib/habits';
import { useStore } from '@/lib/store';
import { Sparkles } from './ico';
import { haptic, TabHeader, Tap } from './ui';

/** Opens the AI coach. Lives in every tab header so it's one tap away without taking a tab. */
function CoachBtn() {
  const router = useRouter();
  return (
    <Tap onPress={() => { haptic('select'); router.push('/coach'); }} scale={0.9} accessibilityLabel="Ask your coach"
      style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: PASTEL[3][0], alignItems: 'center', justifyContent: 'center' }}>
      <Sparkles size={19} color={PASTEL[3][1]} strokeWidth={2} />
    </Tap>
  );
}

/** Tab header wired to the signed-in user: the avatar opens Profile from any tab. */
export function AppHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  const router = useRouter();
  const { profile, user } = useStore();
  const name = profile.name || user?.name || '?';
  return <TabHeader title={title} subtitle={subtitle} right={<>{right}<CoachBtn /></>} initial={name[0].toUpperCase()} onAvatar={() => router.push('/profile')} />;
}
