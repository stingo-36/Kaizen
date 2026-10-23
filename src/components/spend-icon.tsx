import { ReactNode } from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

/* SpendWise's own category glyphs (stroke icons on a 24 grid), so Kaizen shows the same icon per category. */
const PATHS: Record<string, ReactNode> = {
  food: (<><Path d="M4 3v7a3 3 0 0 0 3 3 3 3 0 0 0 3-3V3" /> <Path d="M7 3v10M7 13v8" /> <Path d="M17 3c-1.7 1.4-2.5 3.4-2.5 5.5S15.3 12.6 17 14v7" /></>),
  emi: (<><Rect x="3" y="4" width="18" height="16" rx="2.5" /> <Path d="M7 9h4M7 13h2M7 17h6" /> <Path d="M17 9v8" /></>),
  sip: (<><Path d="M3 17 9 11l4 4 8-8" /> <Path d="M15 7h6v6" /></>),
  transport: (<><Path d="M5 17h14" /> <Path d="M3 13h18l-1.6-4.7A2 2 0 0 0 17.5 7h-11a2 2 0 0 0-1.9 1.3L3 13Z" /> <Circle cx="7.5" cy="16.5" r="1.6" /> <Circle cx="16.5" cy="16.5" r="1.6" /></>),
  shopping: (<><Path d="M5 8h14l-1.2 11a2 2 0 0 1-2 1.8H8.2a2 2 0 0 1-2-1.8L5 8Z" /> <Path d="M9 8V6a3 3 0 0 1 6 0v2" /></>),
  house: (<><Path d="m3 10 9-7 9 7" /> <Path d="M5 9v11h14V9" /> <Path d="M10 20v-6h4v6" /></>),
  bills: (<><Path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21V3l-2 1.2L13 3l-2 1.2L9 3 7 4.2 5 3Z" /> <Path d="M9 8h5M9 12h5M9 16h3" /></>),
  health: (<><Path d="M12 20.5S3.5 15 3.5 9.2A4.7 4.7 0 0 1 12 6.6a4.7 4.7 0 0 1 8.5 2.6c0 5.8-8.5 11.3-8.5 11.3Z" /></>),
  other: (<><Circle cx="12" cy="12" r="9" /> <Circle cx="12" cy="12" r="1" /> <Circle cx="7" cy="12" r="1" /> <Circle cx="17" cy="12" r="1" /></>),
  transfers: (<><Path d="m7 4-4 4 4 4" /> <Path d="M3 8h13" /> <Path d="m17 12 4 4-4 4" /> <Path d="M21 16H8" /></>),
  salary: (<><Rect x="2" y="6" width="20" height="12" rx="2.5" /> <Circle cx="12" cy="12" r="2.6" /> <Path d="M6 12h.01M18 12h.01" /></>),
  bonus: (<><Rect x="3" y="9" width="18" height="12" rx="2" /> <Path d="M12 9v12M3 14h18" /> <Path d="M12 9C10 9 7.5 8.4 7.5 6.2A2.2 2.2 0 0 1 12 6a2.2 2.2 0 0 1 4.5.2C16.5 8.4 14 9 12 9Z" /></>),
  extra: (<><Path d="m12 3 2.6 5.6 6.1.8-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 9.4l6.1-.8L12 3Z" /></>),
  refund: (<><Path d="M3 12a9 9 0 1 0 3-6.7" /> <Path d="M3 4v5h5" /></>),
  calendar: (<><Rect x="3" y="5" width="18" height="16" rx="2.5" /> <Path d="M3 10h18M8 3v4M16 3v4" /></>),
};

/** Stroke and fill are set on the root and inherited by every shape. */
export function SpendIcon({ name, size = 18, color }: { name: string; size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      {PATHS[name] ?? PATHS.other}
    </Svg>
  );
}
