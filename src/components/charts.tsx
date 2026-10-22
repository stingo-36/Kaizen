import { useState } from 'react';
import { LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { C, F } from '@/lib/theme';
import { T } from './ui';

const useWidth = () => {
  const [w, setW] = useState(0);
  return [w, (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))] as const;
};

/** Percent bar chart (0–100) with value labels; the highlighted bar is solid accent. */
export function BarChart({ values, labels, highlight, height = 150, max = 100, suffix = '%' }: { values: (number | null)[]; labels: string[]; highlight?: number; height?: number; max?: number; suffix?: string }) {
  const top100 = Math.max(1, max);
  const [w, onLayout] = useWidth();
  const top = 18, bottom = 22, left = 30, plot = height - top - bottom;
  const slot = w > left ? (w - left) / values.length : 0, bw = Math.min(30, slot * 0.62);
  return (
    <View onLayout={onLayout} style={{ height }} accessibilityRole="image" accessibilityLabel={values.map((v, i) => `${labels[i]} ${v ?? 0}${suffix}`).join(', ')}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {[0, 0.5, 1].map((f) => {
            const g = Math.round(top100 * f), y = top + plot * (1 - f);
            return [<Line key={`l${g}`} x1={left} x2={w} y1={y} y2={y} stroke={C.line} strokeWidth={1} />,
              <SvgText key={`t${g}`} x={0} y={y + 4} fontSize={11} fontFamily={F.s} fill={C.muted}>{`${g}${suffix === '%' ? '%' : ''}`}</SvgText>];
          })}
          {values.map((v, i) => {
            const val = v ?? 0, h = Math.max(4, (val / top100) * plot), x = left + slot * i + (slot - bw) / 2, y = top + plot - h;
            return [
              <Rect key={`b${i}`} x={x} y={y} width={bw} height={h} rx={7} fill={i === highlight ? C.accent : C.accentSoft} />,
              v != null ? <SvgText key={`v${i}`} x={x + bw / 2} y={y - 5} fontSize={10} fontFamily={F.s} fill={C.muted} textAnchor="middle">{`${val}${suffix === '%' ? '%' : ''}`}</SvgText> : null,
              <SvgText key={`x${i}`} x={x + bw / 2} y={height - 5} fontSize={11} fontFamily={F.s} fill={C.muted} textAnchor="middle">{labels[i]}</SvgText>,
            ];
          })}
        </Svg>
      )}
    </View>
  );
}

/** Smooth-ish area line chart; nulls are skipped. */
export function LineChart({ values, labels, height = 150, unit = '', min, max }: { values: (number | null)[]; labels: string[]; height?: number; unit?: string; min?: number; max?: number }) {
  const [w, onLayout] = useWidth();
  const pts = values.map((v, i) => ({ v, i })).filter((p) => p.v != null) as { v: number; i: number }[];
  const lo = min ?? Math.min(...pts.map((p) => p.v)), hi = max ?? Math.max(...pts.map((p) => p.v));
  const pad = min != null ? 0 : Math.max(1, (hi - lo) * 0.25);
  const y0 = lo - pad, y1 = hi + pad;
  const top = 10, bottom = 22, left = 34, plot = height - top - bottom;
  const X = (i: number) => left + ((w - left - 8) * i) / Math.max(1, values.length - 1);
  const Y = (v: number) => top + plot * (1 - (v - y0) / Math.max(1e-6, y1 - y0));
  const path = pts.map((p, k) => `${k ? 'L' : 'M'}${X(p.i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(' ');
  const area = pts.length ? `${path} L${X(pts[pts.length - 1].i)} ${top + plot} L${X(pts[0].i)} ${top + plot} Z` : '';
  const ticks = min != null && max != null ? [min, (min + max) / 2, max] : [y0 + (y1 - y0) * 0.15, (y0 + y1) / 2, y1 - (y1 - y0) * 0.15];
  const last = pts[pts.length - 1];
  const step = Math.max(1, Math.ceil(labels.length / 4));
  if (!pts.length) return <T size={13} color={C.muted}>No data yet</T>;
  return (
    <View onLayout={onLayout} style={{ height }} accessibilityRole="image" accessibilityLabel={`Trend, latest ${last.v}${unit}`}>
      {w > 0 && (
        <Svg width={w} height={height}>
          <Defs><LinearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><Stop offset="0" stopColor={C.accent} stopOpacity={0.35} /><Stop offset="1" stopColor={C.accent} stopOpacity={0} /></LinearGradient></Defs>
          {ticks.map((t, i) => [<Line key={`g${i}`} x1={left} x2={w} y1={Y(t)} y2={Y(t)} stroke={C.line} />,
            <SvgText key={`t${i}`} x={0} y={Y(t) + 4} fontSize={11} fontFamily={F.s} fill={C.muted}>{`${Math.round(t)}${unit === '%' ? '%' : ''}`}</SvgText>])}
          <Path d={area} fill="url(#ga)" />
          <Path d={path} stroke={C.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <Circle cx={X(last.i)} cy={Y(last.v)} r={4.5} fill={C.accent} />
          {labels.map((l, i) => (i % step === 0 && (i === labels.length - 1 || labels.length - 1 - i >= step || i === 0) ? (
            <SvgText key={`x${i}`} x={X(i)} y={height - 5} fontSize={11} fontFamily={F.s} fill={C.muted} textAnchor={i === 0 ? 'start' : i === labels.length - 1 ? 'end' : 'middle'}>{l}</SvgText>
          ) : null))}
        </Svg>
      )}
    </View>
  );
}
