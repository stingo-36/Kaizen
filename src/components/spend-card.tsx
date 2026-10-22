import { useRouter } from 'expo-router';
import { ChevronRight, Wallet } from '@/components/ico';
import { StyleSheet, View } from 'react-native';

import { PASTEL } from '@/lib/habits';
import { inr, monthName, thisMonth } from '@/lib/spend';
import { useSpend } from '@/lib/spend-store';
import { C, themed } from '@/lib/theme';
import { Bar, LinkRow, Row, T, Tap } from './ui';

export const SPEND_TONE = PASTEL[3];

/** Home card: this month's SpendWise spend, budget bar and today's spend. */
export function SpendCard() {
  const router = useRouter();
  const { status, summaries } = useSpend();
  const open = () => router.navigate('/spendwise');

  if (status === 'loading') return null;
  if (status === 'off') return <LinkRow icon={Wallet} tone={SPEND_TONE} title="Connect SpendWise" sub="See this month’s spending here" onPress={open} />;
  if (status === 'expired') return <LinkRow icon={Wallet} tone={SPEND_TONE} title="Reconnect SpendWise" sub="Sign in again to see your spending" onPress={open} />;

  const m = thisMonth(), s = summaries[m];
  const pct = s?.budget ? (s.budgetSpent ?? s.totalSpend) / s.budget : 0;
  return (
    <Tap onPress={open} style={st.card} accessibilityLabel={s ? `Spent ${inr(s.totalSpend)} in ${monthName(m)}. Open spending` : 'Open spending'}>
      <Row>
        <View style={[st.ic, { backgroundColor: SPEND_TONE[0] }]}><Wallet size={19} color={SPEND_TONE[1]} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <T size={12} color={C.muted}>Spent in {monthName(m)}</T>
          <T size={22} w="b" numberOfLines={1}>{s ? inr(s.totalSpend) : '–'}</T>
        </View>
        <ChevronRight size={18} color={C.faint} />
      </Row>
      {s ? (
        <>
          {s.budget ? (
            <View style={{ gap: 6 }}>
              <Bar value={pct} color={pct > 1 ? C.danger : C.accent} height={7} />
              <Row style={{ justifyContent: 'space-between' }}>
                <T size={12} color={pct > 1 ? C.danger : C.muted}>{Math.round(pct * 100)}% of {inr(s.budget)} budget</T>
                {s.todaySpend > 0 ? <T size={12} w="s" color={C.green}>{inr(s.todaySpend)} today</T> : null}
              </Row>
            </View>
          ) : s.todaySpend > 0 ? <T size={12} w="s" color={C.green}>{inr(s.todaySpend)} today</T> : null}
        </>
      ) : null}
    </Tap>
  );
}

const st = themed(() => StyleSheet.create({
  card: { gap: 12, padding: 14, borderRadius: 22, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  ic: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
}));
