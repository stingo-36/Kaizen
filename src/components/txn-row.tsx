import { StyleSheet, View } from 'react-native';

import { categoryStyle } from '@/lib/spend-style';
import { inr } from '@/lib/spend';
import { C, themed, TY } from '@/lib/theme';
import { SpendIcon } from './spend-icon';
import { T } from './ui';

const IST = 'Asia/Kolkata';
export const timeOf = (iso: string) => new Date(iso).toLocaleTimeString('en-IN', { timeZone: IST, hour: '2-digit', minute: '2-digit' });
export const shortDay = (iso: string) => {
  const d = new Date(iso), today = new Date();
  const k = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: IST });
  return k(d) === k(today) ? 'Today' : d.toLocaleDateString('en-IN', { timeZone: IST, day: 'numeric', month: 'short' });
};

/** One transaction, styled like SpendWise: a solid category tile with its glyph, label, meta and signed amount. */
export function TxnRow({ label, amount, category, credit, card, meta, first }: {
  label: string; amount: number; category: string | null; credit?: boolean; card?: boolean; meta: string; first?: boolean;
}) {
  const cs = categoryStyle(category, !credit);
  return (
    <View style={[st.row, !first && st.sep]} accessible accessibilityLabel={`${label}, ${credit ? 'received' : 'spent'} ${inr(amount)}, ${meta}`}>
      <View style={[st.tile, { backgroundColor: category ? cs.solid : C.faint }]}><SpendIcon name={category ? cs.icon : 'other'} size={18} color="#FFFFFF" /></View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T size={TY.item} w="s" numberOfLines={1}>{label}</T>
        <T size={TY.cap} color={C.muted} numberOfLines={1}>
          {meta} · <T size={TY.cap} w="s" color={category ? cs.ink : C.muted}>{category ?? 'Uncategorized'}</T>{card ? ' · Card' : ''}
        </T>
      </View>
      <T size={TY.item} w="b" color={credit ? C.green : C.ink}>{credit ? '+' : '−'}{inr(amount)}</T>
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  sep: { borderTopWidth: 1, borderTopColor: C.line },
  tile: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
}));
