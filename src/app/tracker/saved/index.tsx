import { useRouter } from 'expo-router';

import { ResourcesView } from '@/components/resources';
import { Fab } from '@/components/tracker/parts';
import { BackHeader, Screen } from '@/components/ui';
import { goBack } from '@/lib/nav';

/** Saved: WorkNest Resources as cards. + opens the save screen (a link or screenshots). */
export default function Saved() {
  const router = useRouter();
  return (
    <Screen overlay={<Fab label="Save a link or screenshots" onPress={() => router.push('/share')} />} style={{ paddingBottom: 110 }}>
      <BackHeader title="Saved" onBack={() => goBack('/tracker')} />
      <ResourcesView />
    </Screen>
  );
}
