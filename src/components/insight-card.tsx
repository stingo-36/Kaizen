import { CalendarClock, HeartPulse, Sparkles, ThumbsUp, TrendingUp } from '@/components/ico';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useFood } from '@/lib/food-store';
import { useHealth } from '@/lib/health-store';
import { PASTEL } from '@/lib/habits';
import { useInsight } from '@/lib/insights';
import { useStore } from '@/lib/store';
import { C, themed } from '@/lib/theme';
import { Card, Row, T } from './ui';

/** "Your week" review and a tip for tomorrow. `compact` shows only the tomorrow tip. */
export function InsightCard({ compact }: { compact?: boolean }) {
  const { user, habits, workout: W, profile } = useStore();
  const { food } = useFood();
  const { data: health } = useHealth();
  const { insight: x, loading } = useInsight(user?.id ?? null, habits, W, profile, food, health);
  if (!x && !loading) return null;

  const tomorrow = x?.tomorrow ? (
    <View style={[st.tomorrow, { backgroundColor: PASTEL[2][0] }]}>
      <Row gap={6}>
        {x.fromTracker ? <HeartPulse size={15} color={PASTEL[2][1]} /> : <CalendarClock size={15} color={PASTEL[2][1]} />}
        <T size={12} w="s" color={PASTEL[2][1]}>{x.fromTracker ? 'Tomorrow · from your Google Fit data' : 'Tomorrow'}</T>
      </Row>
      <T size={14} w="m" color={PASTEL[2][1]} style={{ lineHeight: 20 }}>{x.tomorrow}</T>
    </View>
  ) : null;

  if (compact) return tomorrow;
  return (
    <Card style={{ gap: 12 }}>
      <Row gap={8}><Sparkles size={16} color={C.accent} /><T size={15} w="s">Your week</T></Row>
      {loading && !x ? <Row gap={8}><ActivityIndicator size="small" color={C.accent} /><T size={13} color={C.muted}>Looking at your workouts, habits and food…</T></Row> : null}
      {x?.summary ? <T size={14} style={{ lineHeight: 20 }}>{x.summary}</T> : null}
      {x?.wins.map((w) => <Row key={w} gap={8} style={{ alignItems: 'flex-start' }}><ThumbsUp size={14} color={C.green} style={{ marginTop: 3 }} /><T size={13} color={C.muted} style={{ flex: 1, lineHeight: 19 }}>{w}</T></Row>)}
      {x?.improve.map((w) => <Row key={w} gap={8} style={{ alignItems: 'flex-start' }}><TrendingUp size={14} color={C.accent} style={{ marginTop: 3 }} /><T size={13} color={C.muted} style={{ flex: 1, lineHeight: 19 }}>{w}</T></Row>)}
      {tomorrow}
    </Card>
  );
}

const st = themed(() => StyleSheet.create({
  tomorrow: { borderRadius: 16, padding: 12, gap: 6 },
}));
