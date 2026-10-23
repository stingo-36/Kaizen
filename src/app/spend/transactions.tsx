import { CalendarClock } from '@/components/ico';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Item } from '@/components/motion';
import { timeOf, TxnRow } from '@/components/txn-row';
import { BackHeader, Btn, Segmented, T } from '@/components/ui';
import { goBack } from '@/lib/nav';
import { fetchTransactions, inr, monthName, SpendAuthError, SpendTxn, thisMonth } from '@/lib/spend';
import { useSpend } from '@/lib/spend-store';
import { C, SP, themed, TY } from '@/lib/theme';

const IST = 'Asia/Kolkata';
const PAGE = 50;
const dayKey = (iso: string) => new Date(iso).toLocaleDateString('en-CA', { timeZone: IST });
/** "Today · Wed, 21 Oct 2026", like SpendWise's day headings. */
function dayHeading(iso: string) {
  const now = new Date(), key = dayKey(iso);
  const base = new Date(iso).toLocaleDateString('en-IN', { timeZone: IST, weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  if (key === dayKey(now.toISOString())) return `Today · ${base}`;
  if (key === dayKey(new Date(now.getTime() - 86400000).toISOString())) return `Yesterday · ${base}`;
  return base;
}

const errText = (e: unknown) => e instanceof SpendAuthError ? 'Sign in to SpendWise again from the Spend tab.'
  : /404|not found/i.test((e as Error).message) ? 'This needs the latest SpendWise update. Deploy SpendWise and try again.'
  : (e as Error).message;

/** Every SpendWise transaction, grouped by day (newest first), with each day's net. */
export default function Transactions() {
  const insets = useSafeAreaInsets();
  const { link } = useSpend();
  const [scope, setScope] = useState<'month' | 'all'>('month');
  const [items, setItems] = useState<SpendTxn[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState('');
  const req = useRef(0);

  const load = useCallback(async (next: number) => {
    if (!link) return;
    const n = ++req.current;
    try {
      const r = await fetchTransactions(link, scope === 'month' ? thisMonth() : null, next, PAGE);
      if (n !== req.current) return;
      setErr('');
      setItems((p) => [...p, ...r.items.filter((t) => !p.some((x) => x.id === t.id))]);
      setTotal(r.total); setPage(next);
    } catch (e) {
      if (n !== req.current) return;
      setErr(errText(e));
    } finally { if (n === req.current) setBusy(false); }
  }, [link, scope]);

  // First page whenever the scope changes; later pages come from load() as you scroll.
  useEffect(() => {
    if (!link) return;
    const n = ++req.current;
    fetchTransactions(link, scope === 'month' ? thisMonth() : null, 1, PAGE)
      .then((r) => { if (n === req.current) { setItems(r.items); setTotal(r.total); setPage(1); setErr(''); } })
      .catch((e) => { if (n === req.current) setErr(errText(e)); })
      .finally(() => { if (n === req.current) setBusy(false); });
  }, [link, scope]);

  const sections = useMemo(() => {
    const m = new Map<string, SpendTxn[]>();
    items.forEach((t) => { const k = dayKey(t.occurredAt); if (!m.has(k)) m.set(k, []); m.get(k)!.push(t); });
    return [...m.entries()].map(([key, data]) => ({
      key, data, iso: data[0].occurredAt,
      // Card charges don't move the bank balance (the bill payment does), same as SpendWise.
      net: data.reduce((a, t) => a + (t.isCreditCard ? 0 : (t.direction === 'credit' ? 1 : -1) * t.amount), 0),
    }));
  }, [items]);
  const more = items.length < total;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={st.head}>
        <BackHeader title="Transactions" onBack={() => goBack('/spendwise')} />
        <Segmented options={[['month', monthName(thisMonth())], ['all', 'All time']]} value={scope} onChange={(v) => { setItems([]); setTotal(0); setBusy(true); setErr(''); setScope(v as 'month' | 'all'); }} />
        {total > 0 ? <T size={TY.cap} color={C.muted}>{total} transactions · newest first</T> : null}
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(t) => String(t.id)}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 32, gap: 0 }}
        onEndReached={() => { if (more && !busy && !err) { setBusy(true); load(page + 1); } }}
        onEndReachedThreshold={0.4}
        renderSectionHeader={({ section }) => (
          <View style={st.day}>
            <CalendarClock size={13} color={C.muted} />
            <T size={13} w="s" color={C.muted}>{dayHeading(section.iso)}</T>
            <View style={st.rule} />
            <View style={[st.net, { backgroundColor: section.net >= 0 ? C.accentTint : C.dangerSoft }]}>
              <T size={11} w="b" color={section.net >= 0 ? C.green : C.danger}>{section.net >= 0 ? '+' : '−'}{inr(Math.abs(section.net))}</T>
            </View>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Item delay={Math.min(index, 8) * 35}>
            <View style={[st.cardMid, index === 0 && st.cardTop, index === section.data.length - 1 && st.cardBottom]}>
              <TxnRow first={index === 0} label={item.label} amount={item.amount} category={item.categoryName} credit={item.direction === 'credit'}
                card={item.isCreditCard} meta={timeOf(item.occurredAt)} />
            </View>
          </Item>
        )}
        ListEmptyComponent={busy ? undefined : <T size={TY.body} color={C.muted} center style={{ marginTop: 40 }}>{err || 'No transactions yet.'}</T>}
        ListFooterComponent={
          busy ? <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />
            : err && items.length ? <View style={{ marginTop: 16, gap: 8 }}><T size={TY.sub} color={C.danger} center>{err}</T><Btn title="Try again" kind="ghost" small onPress={() => { setBusy(true); setErr(''); load(page + 1); }} /></View>
            : undefined
        }
      />
    </SafeAreaView>
  );
}

const st = themed(() => StyleSheet.create({
  head: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 4, gap: 12 },
  day: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SP.section, marginBottom: 10, paddingHorizontal: 2 },
  rule: { flex: 1, height: 1, backgroundColor: C.line },
  net: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 99 },
  cardMid: { backgroundColor: C.card, borderLeftWidth: 1, borderRightWidth: 1, borderColor: C.line, paddingHorizontal: 14 },
  cardTop: { borderTopWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingTop: 2 },
  cardBottom: { borderBottomWidth: 1, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, paddingBottom: 2 },
}));
