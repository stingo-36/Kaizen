import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { CheckSquare, ExternalLink, Instagram, Star } from '@/components/ico';
import { host, Md, sourceOf } from '@/components/resources';
import { AddSheet } from '@/components/tracker/add-sheet';
import { Empty } from '@/components/tracker/parts';
import { BackHeader, Btn, haptic, IconBtn, Row, Screen, T, useToast } from '@/components/ui';
import { goBack } from '@/lib/nav';
import { C, PASTEL, themed } from '@/lib/theme';
import { dayName } from '@/lib/worknest';
import { useWorkNest } from '@/lib/worknest-store';

/** One saved resource: its list with tappable links, tags, and Open link / Make a to-do. */
export default function SavedItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const toast = useToast();
  const { resources, starRes } = useWorkNest();
  const [todo, setTodo] = useState(false);
  const r = resources.find((x) => x.id === id);

  if (!r) {
    return (
      <Screen>
        <BackHeader title="Saved" onBack={() => goBack('/tracker/saved')} />
        <Empty title="Not found" text="It may have been deleted on WorkNest." />
      </Screen>
    );
  }
  const { icon: Icon, tone } = sourceOf(r);
  const insta = Icon === Instagram;
  const star = () => {
    haptic('select');
    starRes(r.id, !r.favorite).catch((e) => toast(e instanceof Error ? e.message : 'Couldn’t update it'));
  };

  return (
    <Screen footer={(
      <Row gap={10}>
        {r.url ? <Btn title={insta ? 'Open reel' : 'Open link'} icon={insta ? Instagram : ExternalLink} kind="ghost" small style={{ flex: 1 }} onPress={() => Linking.openURL(r.url!).catch(() => {})} /> : null}
        <Btn title="Make a to-do" icon={CheckSquare} small style={{ flex: 1 }} onPress={() => setTodo(true)} />
      </Row>
    )}>
      <BackHeader title="Saved" onBack={() => goBack('/tracker/saved')}
        right={<IconBtn icon={Star} label={r.favorite ? 'Unstar' : 'Star'} onPress={star} />} />
      <View style={{ gap: 10 }}>
        <Row gap={8}>
          <View style={[st.src, { backgroundColor: tone[0] }]}><Icon size={15} color={tone[1]} /></View>
          <T size={12} w="s" color={C.muted} style={{ flex: 1 }} numberOfLines={1}>
            {[r.type, r.url ? host(r.url) : null, `saved ${dayName(r.createdAt.slice(0, 10)).toLowerCase()}`].filter(Boolean).join(' · ')}
          </T>
          {r.favorite ? <View style={st.starred}><Star size={11} color={PASTEL[1][1]} weight="fill" /><T size={11} w="s" color={PASTEL[1][1]}>Starred</T></View> : null}
        </Row>
        <T size={20} w="b" style={{ lineHeight: 26 }}>{r.title}</T>
      </View>
      {r.description ? <Md text={r.description} size={14} /> : <T size={13} color={C.muted}>No description.</T>}
      {r.tags.length ? (
        <Row gap={6} style={{ flexWrap: 'wrap' }}>
          {r.tags.map((t) => <View key={t} style={st.tag}><T size={11.5} w="m" color={C.muted}>#{t}</T></View>)}
        </Row>
      ) : null}
      <T size={11} color={C.faint}>Edit or delete it on WorkNest’s Resources page.</T>
      <AddSheet open={todo} mode="work" initial={`Try: ${r.title}`} onClose={() => setTodo(false)} />
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  src: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  starred: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, backgroundColor: PASTEL[1][0] },
  tag: { paddingVertical: 4, paddingHorizontal: 9, borderRadius: 99, backgroundColor: C.soft },
}));
