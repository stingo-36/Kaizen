import { ReactNode, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Swipeable, { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CalendarDays, Check, ChevronLeft, ChevronRight, Plus, RefreshCw, Star } from '@/components/ico';
import { haptic, Row, T, Tap } from '@/components/ui';
import { C, F, PASTEL, themed } from '@/lib/theme';
import { addDays, dayKey, dayName } from '@/lib/worknest';

/* Shared pieces for the Tracker pages. One quiet type scale for every page: rows read at 14, details at 12,
   section labels at 11, so lists stay calm without looking oversized. */
export const TK = { title: 14, line: 19, meta: 12, metaLine: 16, label: 11 };

/* ---------- point-wise text ---------- */
/** A line written as a point: "* milk", "*milk", "- milk", "• milk", or numbered: "1. milk", "2) eggs". */
const POINT = /^\s*(?:[*•]\s*|-\s+|\d{1,2}[.)]\s+)(?=\S)/;
const NUMBER = /^\s*(\d{1,2})[.)]\s+/;
export const isPointy = (text: string) => text.split('\n').some((l) => POINT.test(l));

/** Text where lines starting with * (or - / •) show as bullet points and "1." lines as a numbered list; other lines stay plain. */
export function Points({ text, size = TK.title, w = 'm', color = C.ink, lineHeight = TK.line, max, done }: {
  text: string; size?: number; w?: 'r' | 'm' | 's'; color?: string; lineHeight?: number; max?: number; done?: boolean;
}) {
  const strike = done ? { textDecorationLine: 'line-through' as const } : null;
  if (!isPointy(text)) return <T size={size} w={w} color={color} numberOfLines={max} style={[{ lineHeight }, strike]}>{text}</T>;
  const lines = text.split('\n').filter((l) => l.trim()).slice(0, max);
  return (
    <View style={{ gap: 3 }}>
      {lines.map((l, i) => POINT.test(l) ? (
        <Row key={i} gap={7} style={{ alignItems: 'flex-start' }}>
          {NUMBER.test(l)
            ? <T size={size} w="s" color={color} style={{ lineHeight, minWidth: size }}>{NUMBER.exec(l)![1]}.</T>
            : <View style={[st.point, { backgroundColor: color, marginTop: lineHeight / 2 - 2 }]} />}
          <T size={size} w={w} color={color} style={[{ flex: 1, lineHeight }, strike]}>{l.replace(POINT, '')}</T>
        </Row>
      ) : <T key={i} size={size} w={w} color={color} style={[{ lineHeight }, strike]}>{l.trim()}</T>)}
    </View>
  );
}

/** Typing Enter after a point starts the next one (numbered lists count up); Enter on an empty point ends the list. */
export function continuePoints(prev: string, next: string) {
  if (next.length !== prev.length + 1 || !next.endsWith('\n')) return next;
  const last = prev.split('\n').pop() ?? '';
  if (!/^\s*(?:[*•-]|\d{1,2}[.)])/.test(last)) return next;
  if (!POINT.test(last)) return prev.slice(0, prev.length - last.length);
  const n = NUMBER.exec(last);
  return n ? `${next}${Number(n[1]) + 1}. ` : `${next}* `;
}

/* ---------- layout ---------- */
/** A small label above a group, with an optional count or action on the right. */
export function Section({ title, count, action, onAction, tone }: { title: string; count?: number; action?: string; onAction?: () => void; tone?: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingHorizontal: 4, marginBottom: -6 }}>
      <T size={14} w="s" color={tone ?? C.ink}>
        {title}{count != null ? <T size={TK.label} w="s" color={C.faint}>{`  ${count}`}</T> : null}
      </T>
      {action ? <Pressable onPress={onAction} hitSlop={10}><T size={12} w="s" color={C.accent}>{action}</T></Pressable> : null}
    </Row>
  );
}

/** White card that holds rows; rows carry their own padding so swipe actions show edge to edge. */
export const ListCard = ({ children }: { children: ReactNode }) => <View style={st.card}>{children}</View>;

export const Empty = ({ title, text }: { title: string; text?: string }) => (
  <View style={st.empty}>
    <T size={14} w="s" center>{title}</T>
    {text ? <T size={12.5} color={C.muted} center style={{ lineHeight: 18 }}>{text}</T> : null}
  </View>
);

/** The round + in the corner of a Tracker page. */
export function Fab({ label, onPress }: { label: string; onPress: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <Tap onPress={() => { haptic('light'); onPress(); }} scale={0.92} accessibilityLabel={label} style={[st.fab, { bottom: insets.bottom + 20 }]}>
      <Plus size={22} color={C.white} strokeWidth={2.4} />
    </Tap>
  );
}

/* ---------- rows ---------- */
export function CheckDot({ done, onPress, label, color = C.field }: { done: boolean; onPress: () => void; label: string; color?: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="checkbox" accessibilityState={{ checked: done }} accessibilityLabel={label}
      style={[st.dot, { borderColor: color }, done && { backgroundColor: C.green, borderColor: C.green }]}>
      {done ? <Check size={11} color={C.white} /> : null}
    </Pressable>
  );
}

/** Swipe a row right to tick it off (or reopen it), as an alternative to its circle. */
export function SwipeToggle({ done, onToggle, children }: { done: boolean; onToggle: () => void; children: ReactNode }) {
  const ref = useRef<SwipeableMethods>(null);
  return (
    <Swipeable ref={ref} friction={1.4} leftThreshold={72} overshootLeft={false} dragOffsetFromLeft={12}
      onSwipeableWillOpen={() => { onToggle(); setTimeout(() => ref.current?.close(), 180); }}
      renderLeftActions={() => (
        <View style={[st.swipe, { backgroundColor: done ? C.soft : C.green }]}>
          {done ? <RefreshCw size={15} color={C.ink} /> : <Check size={16} color={C.white} />}
          <T size={12} w="s" color={done ? C.ink : C.white}>{done ? 'Reopen' : 'Done'}</T>
        </View>
      )}>
      {children}
    </Swipeable>
  );
}

/**
 * One row in a Tracker list. `lead` sits on the left (a tick circle or an avatar), `meta` under the title,
 * `onToggle` adds swipe-to-complete, `onPress` opens the entry.
 */
export function EntryRow({ title, done, first, lead, meta, metaTone, sub, pinned, onToggle, onPress }: {
  title: string; done?: boolean; first?: boolean; lead?: ReactNode; meta?: string; metaTone?: string; sub?: string; pinned?: boolean;
  onToggle?: () => void; onPress?: () => void;
}) {
  const row = (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={({ pressed }) => [st.row, !first && st.rule, pressed && { backgroundColor: C.soft }]}>
      {lead}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <Points text={title} color={done ? C.muted : C.ink} done={done} max={6} />
        {sub ? <T size={TK.meta} color={C.muted} numberOfLines={2} style={{ lineHeight: TK.metaLine }}>{sub}</T> : null}
        {meta ? <T size={TK.meta} w="m" color={metaTone ?? C.muted} numberOfLines={1}>{meta}</T> : null}
      </View>
      {pinned ? <Star size={13} color={PASTEL[1][1]} weight="fill" style={{ marginTop: 3 }} /> : null}
    </Pressable>
  );
  return onToggle ? <SwipeToggle done={!!done} onToggle={onToggle}>{row}</SwipeToggle> : row;
}

/** Round initials, coloured by the name so the same person keeps the same colour. */
export function Avatar({ name, size = 34 }: { name: string; size?: number }) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const text = (words.length > 1 ? words[0][0] + words[1][0] : name.slice(0, 2)).toUpperCase();
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [bg, ink] = PASTEL[h % PASTEL.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <T size={size * 0.36} w="s" color={ink}>{text}</T>
    </View>
  );
}

/* ---------- inputs ---------- */
/** A choice chip; `on` fills it. */
export function Chip({ label, on, onPress, icon }: { label: string; on?: boolean; onPress: () => void; icon?: ReactNode }) {
  return (
    <Pressable onPress={() => { haptic('select'); onPress(); }} accessibilityRole="button" accessibilityState={{ selected: !!on }}
      style={[st.chip, on && { backgroundColor: C.accent, borderColor: C.accent }]}>
      {icon}
      <T size={12.5} w="s" color={on ? C.white : C.ink}>{label}</T>
    </Pressable>
  );
}

/** Label above a form field, like WorkNest's own forms. */
export const FieldLabel = ({ children, hint }: { children: ReactNode; hint?: string }) => (
  <Row style={{ justifyContent: 'space-between' }}>
    <T size={12} w="s" color={C.muted}>{children}</T>
    {hint ? <T size={11} color={C.faint}>{hint}</T> : null}
  </Row>
);

/** Plain multi-line box that keeps * and 1. lists going. */
export function TextArea({ value, onChange, placeholder, minHeight = 72, autoFocus, tone }: {
  value: string; onChange: (v: string) => void; placeholder: string; minHeight?: number; autoFocus?: boolean; tone?: [string, string];
}) {
  return (
    <TextInput value={value} onChangeText={(v) => onChange(continuePoints(value, v))} placeholder={placeholder} multiline autoFocus={autoFocus}
      placeholderTextColor={tone ? tone[1] : C.faint} accessibilityLabel={placeholder}
      style={[st.area, { minHeight }, tone && { backgroundColor: tone[0], borderColor: 'transparent', color: tone[1] }]} />
  );
}

/** A one-line box, styled like the rest of the Tracker's fields. */
export function LineInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder: string; autoFocus?: boolean }) {
  return (
    <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={C.faint} autoFocus={autoFocus}
      accessibilityLabel={placeholder} style={st.line} />
  );
}

/** Star toggle row: starred entries stay at the top in WorkNest. */
export function StarToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => { haptic('select'); onChange(!value); }} accessibilityRole="switch" accessibilityState={{ checked: value }}
      style={[st.chip, { alignSelf: 'flex-start' }, value && { backgroundColor: PASTEL[1][0], borderColor: PASTEL[1][0] }]}>
      <Star size={14} color={value ? PASTEL[1][1] : C.muted} weight={value ? 'fill' : 'bold'} />
      <T size={12.5} w="s" color={value ? PASTEL[1][1] : C.ink}>{value ? 'Starred' : 'Star it'}</T>
    </Pressable>
  );
}

/* ---------- dates ---------- */
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const parse = (key: string) => { const [y, m, d] = key.split('-').map(Number); return new Date(y, m - 1, d); };

/** A month grid to pick any day, like WorkNest's date panel. Works without a native date picker. */
export function Calendar({ value, onPick }: { value: string | null; onPick: (d: string) => void }) {
  const start = parse(value ?? dayKey());
  const [month, setMonth] = useState(new Date(start.getFullYear(), start.getMonth(), 1));
  const today = dayKey();
  const lead = (month.getDay() + 6) % 7;
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => dayKey(new Date(month.getFullYear(), month.getMonth(), i + 1)))];
  const shift = (n: number) => setMonth(new Date(month.getFullYear(), month.getMonth() + n, 1));
  return (
    <View style={st.cal}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Previous month"><ChevronLeft size={18} color={C.ink} /></Pressable>
        <T size={13} w="s">{month.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</T>
        <Pressable onPress={() => shift(1)} hitSlop={10} accessibilityLabel="Next month"><ChevronRight size={18} color={C.ink} /></Pressable>
      </Row>
      <View style={st.calGrid}>
        {WEEK.map((d, i) => <View key={`h${i}`} style={st.calCell}><T size={11} w="s" color={C.faint}>{d}</T></View>)}
        {cells.map((d, i) => (
          <View key={d ?? `e${i}`} style={st.calCell}>
            {d ? (
              <Pressable onPress={() => { haptic('select'); onPick(d); }} accessibilityRole="button" accessibilityLabel={dayName(d)}
                style={[st.calDay, d === today && { borderWidth: 1, borderColor: C.accent }, d === value && { backgroundColor: C.accent }]}>
                <T size={12.5} w={d === value ? 's' : 'r'} color={d === value ? C.white : C.ink}>{Number(d.slice(8))}</T>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * Due date / reminder / note date: quick chips, plus "Pick a date" for any day. `allowNone` adds "No date".
 * `past` offers Yesterday instead of Tomorrow (a note's date is usually now or earlier).
 */
export function DateChoice({ value, onChange, allowNone, past }: { value: string | null; onChange: (d: string | null) => void; allowNone?: boolean; past?: boolean }) {
  const today = dayKey();
  const quick = past ? [today, addDays(today, -1)] : [today, addDays(today, 1), addDays(today, 7)];
  const [picking, setPicking] = useState(false);
  const custom = value && !quick.includes(value);
  return (
    <View style={{ gap: 8 }}>
      <View style={st.chips}>
        {quick.map((d, i) => <Chip key={d} label={i === 2 ? 'Next week' : dayName(d)} on={value === d} onPress={() => { onChange(d); setPicking(false); }} />)}
        {allowNone ? <Chip label="No date" on={!value} onPress={() => { onChange(null); setPicking(false); }} /> : null}
        <Chip label={custom ? dayName(value) : 'Pick a date'} on={!!custom || picking} onPress={() => setPicking((p) => !p)} icon={<CalendarDays size={13} color={custom || picking ? C.white : C.ink} />} />
      </View>
      {picking ? <Calendar value={value} onPick={(d) => { onChange(d); setPicking(false); }} /> : null}
    </View>
  );
}

const st = themed(() => StyleSheet.create({
  card: { backgroundColor: C.card, borderRadius: 16, overflow: 'hidden' },
  // Rows carry the card's side padding and background, so the swipe action shows behind them edge to edge.
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13, paddingHorizontal: 14, backgroundColor: C.card },
  rule: { borderTopWidth: 1, borderTopColor: C.line },
  swipe: { width: 110, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 16 },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  point: { width: 4, height: 4, borderRadius: 2, opacity: 0.7 },
  empty: { gap: 6, paddingVertical: 28, paddingHorizontal: 20, borderRadius: 16, backgroundColor: C.card, alignItems: 'center' },
  fab: { position: 'absolute', right: 20, width: 54, height: 54, borderRadius: 27, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 99, borderWidth: 1, borderColor: C.field, backgroundColor: C.card },
  area: { borderRadius: 14, borderWidth: 1.5, borderColor: C.field, backgroundColor: C.card, paddingHorizontal: 12, paddingVertical: 10, fontFamily: F.r, fontSize: 14, lineHeight: 20, color: C.ink, textAlignVertical: 'top' },
  line: { minHeight: 46, borderRadius: 14, borderWidth: 1.5, borderColor: C.field, backgroundColor: C.card, paddingHorizontal: 12, fontFamily: F.r, fontSize: 14, color: C.ink },
  cal: { gap: 8, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  calCell: { width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center' },
  calDay: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
}));
