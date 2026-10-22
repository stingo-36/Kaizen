import { useRouter } from 'expo-router';
import { ArrowDownLeft, ChevronLeft, ChevronRight, CreditCard, LogOut, PiggyBank, RefreshCw, ShieldCheck, Wallet } from '@/components/ico';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/header';
import { SPEND_TONE } from '@/components/spend-card';
import { Btn, Card, IconBtn, Input, Row, Screen, SectionTitle, T, Tap, haptic, useToast } from '@/components/ui';
import { shortDay, timeOf, TxnRow } from '@/components/txn-row';
import { inr, monthName, shiftMonth, SPENDWISE_URL, thisMonth } from '@/lib/spend';
import { useSpend } from '@/lib/spend-store';
import { C, PASTEL, SP, themed, TY } from '@/lib/theme';

const host = SPENDWISE_URL.replace(/^https?:\/\//, '');

function Connect({ again }: { again?: boolean }) {
  const { connect, link } = useSpend();
  const toast = useToast();
  const [email, setEmail] = useState(link?.email ?? '');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!email.trim()) return setErr('Enter your SpendWise email');
    if (!password) return setErr('Enter your SpendWise password');
    setBusy(true); setErr('');
    try {
      await connect(SPENDWISE_URL, email, password);
      haptic('success'); toast('SpendWise connected');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Couldn’t connect');
    } finally { setBusy(false); }
  };

  return (
    <Card style={{ gap: 16, padding: SP.pad }}>
      <View style={[st.big, { backgroundColor: SPEND_TONE[0] }]}><Wallet size={24} color={SPEND_TONE[1]} /></View>
      <View style={{ gap: 6 }}>
        <T size={TY.hero} w="b">{again ? 'Sign in to SpendWise again' : 'Connect SpendWise'}</T>
        <T size={TY.body} color={C.muted} style={{ lineHeight: 20 }}>
          {again
            ? 'SpendWise no longer accepts this phone’s key. Sign in once more to keep seeing your spending.'
            : 'Sign in with your SpendWise account. Pulse only reads your spending summary and never changes anything.'}
        </T>
      </View>
      <View style={st.server}>
        <ShieldCheck size={16} color={C.green} />
        <T size={TY.sub} w="s" style={{ flex: 1 }} numberOfLines={1}>{host}</T>
        <View style={st.ro}><T size={11} w="b" color={C.muted}>READ-ONLY</T></View>
      </View>
      <Input label="Email" value={email} onChange={(v) => { setEmail(v); setErr(''); }} placeholder="you@example.com" keyboard="email-address" />
      <Input label="Password" value={password} onChange={(v) => { setPassword(v); setErr(''); }} placeholder="Your SpendWise password" secure />
      {err ? <T size={TY.sub} color={C.danger}>{err}</T> : null}
      <Btn title="Connect" onPress={submit} busy={busy} />
      <T size={TY.cap} color={C.muted}>Your password isn’t saved. Pulse keeps only a read-only key on this phone.</T>
    </Card>
  );
}

/** One of the four summary cards: label, icon and amount. */
function Tile({ icon: Icon, tone, label, value }: { icon: typeof Wallet; tone: [string, string]; label: string; value: string }) {
  return (
    <View style={[st.tile, { backgroundColor: tone[0] }]} accessible accessibilityLabel={`${label}: ${value}`}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T size={10.5} w="s" color={tone[1]} numberOfLines={1} style={{ letterSpacing: 0.8, textTransform: 'uppercase', flex: 1 }}>{label}</T>
        <View style={st.tileIc}><Icon size={15} color={tone[1]} /></View>
      </Row>
      <T size={20} w="b" color={tone[1]} numberOfLines={1} adjustsFontSizeToFit>{value}</T>
    </View>
  );
}

export default function Spending() {
  const router = useRouter();
  const toast = useToast();
  const { status, link, summaries, busy, error, load, disconnect } = useSpend();
  const [month, setMonth] = useState(thisMonth());
  const isNow = month === thisMonth();

  useEffect(() => { if (status === 'on') load(month); }, [status, month, load]);

  const s = summaries[month];
  const spentVsBudget = s ? s.budgetSpent ?? s.totalSpend : 0;
  // Older SpendWise servers don't send these totals; fall back where it makes sense.
  const card = s?.creditCardSpend ?? s?.recent.filter((r) => r.isCreditCard).reduce((a, r) => a + r.amount, 0) ?? 0;
  const balance = s?.moneyIn != null ? s.moneyIn - (s.accountOutflow ?? s.totalSpend) : s?.budget ? s.budget - spentVsBudget : null;

  return (
    <Screen tabs>
      <AppHeader title="SpendWise" subtitle={status === 'on' && s ? `${inr(s.totalSpend)} spent in ${monthName(month)}` : 'Your spending at a glance'}
        right={status === 'on' ? <IconBtn icon={RefreshCw} label="Refresh" onPress={() => load(month)} /> : undefined} />

      {status === 'loading' ? (
        <Row gap={8}><ActivityIndicator color={C.accent} /><T size={TY.body} color={C.muted}>Loading…</T></Row>
      ) : status !== 'on' ? (
        <Connect again={status === 'expired'} />
      ) : (
        <>
          <Row style={st.month}>
            <IconBtn icon={ChevronLeft} size={36} label="Previous month" onPress={() => setMonth(shiftMonth(month, -1))} />
            <T size={TY.item} w="s">{monthName(month, true)}</T>
            <IconBtn icon={ChevronRight} size={36} label="Next month" disabled={isNow} onPress={() => setMonth(shiftMonth(month, 1))} />
          </Row>

          {!s ? (
            busy ? <Row gap={8}><ActivityIndicator color={C.accent} /><T size={TY.body} color={C.muted}>Loading your spending…</T></Row>
              : <T size={TY.body} color={C.muted}>{error || 'No data for this month.'}</T>
          ) : (
            <View style={{ gap: SP.section }}>
              {/* The four cards follow the fixed pastel order: green, amber, blue, purple. */}
              <View style={{ gap: SP.grid }}>
                <Row gap={SP.grid} style={{ alignItems: 'stretch' }}>
                  <Tile icon={Wallet} tone={PASTEL[0]} label="Total spend" value={inr(s.totalSpend)} />
                  <Tile icon={ArrowDownLeft} tone={PASTEL[1]} label="Money in" value={s.moneyIn != null ? inr(s.moneyIn) : '–'} />
                </Row>
                <Row gap={SP.grid} style={{ alignItems: 'stretch' }}>
                  <Tile icon={PiggyBank} tone={PASTEL[2]} label="Balance left" value={balance == null ? '–' : balance < 0 ? `−${inr(-balance)}` : inr(balance)} />
                  <Tile icon={CreditCard} tone={PASTEL[3]} label="Card used" value={inr(card)} />
                </Row>
              </View>

              {s.recent.length > 0 && (
                <Card style={{ paddingVertical: 6, paddingHorizontal: SP.pad }}>
                  <View style={{ paddingTop: 12, paddingBottom: 4 }}><SectionTitle title="Recent transactions" /></View>
                  {s.recent.slice(0, 10).map((r, i) => (
                    <TxnRow key={r.id} first={i === 0} label={r.merchant} amount={r.amount} category={r.category} card={r.isCreditCard}
                      meta={`${shortDay(r.occurredAt)}, ${timeOf(r.occurredAt)}`} />
                  ))}
                  <Tap onPress={() => router.push('/spend/transactions')} style={st.all} accessibilityLabel="View all transactions">
                    <T size={TY.body} w="s" color={C.accent}>View all transactions</T>
                    <ChevronRight size={16} color={C.accent} />
                  </Tap>
                </Card>
              )}

              {busy ? <Row gap={8} style={{ justifyContent: 'center' }}><ActivityIndicator color={C.accent} /><T size={TY.cap} color={C.muted}>Updating…</T></Row>
                : error ? <T size={TY.cap} color={C.danger} center>{error}</T>
                : s.at ? <T size={TY.cap} color={C.muted} center>Updated {new Date(s.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}</T> : null}
            </View>
          )}

          <Tap style={st.row} onPress={async () => { await disconnect(); toast('SpendWise disconnected'); }}>
            <LogOut size={18} color={C.danger} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={TY.body} w="s" color={C.danger}>Disconnect SpendWise</T>
              <T size={TY.cap} color={C.muted} numberOfLines={1}>{link?.email} · {host}</T>
            </View>
          </Tap>
        </>
      )}
    </Screen>
  );
}

const st = themed(() => StyleSheet.create({
  big: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  server: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 14, backgroundColor: C.soft },
  ro: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 99, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
  month: { justifyContent: 'space-between', backgroundColor: C.card, borderRadius: 99, borderWidth: 1, borderColor: C.line, padding: 4 },
  tile: { flex: 1, minWidth: 0, minHeight: 100, borderRadius: 20, padding: 14, justifyContent: 'space-between', gap: 10 },
  tileIc: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
  all: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 14, borderTopWidth: 1, borderTopColor: C.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 20, backgroundColor: C.card, borderWidth: 1, borderColor: C.line },
}));
