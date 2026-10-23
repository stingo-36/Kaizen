import { ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Eye, EyeOff, LucideIcon, Minus, Plus, Search, X } from './ico';

/* Paper asks for icons by Material name (its built-in checks, close and back buttons).
   The app has no vector-icon font, so those names map onto Kaizen's own icon set. */
const BY_NAME: Record<string, LucideIcon> = {
  check: Check, close: X, 'arrow-left': ArrowLeft, 'chevron-left': ChevronLeft, 'chevron-right': ChevronRight,
  'chevron-down': ChevronDown, 'chevron-up': ChevronUp, 'menu-down': ChevronDown, 'menu-up': ChevronUp,
  eye: Eye, 'eye-off': EyeOff, magnify: Search, plus: Plus, minus: Minus,
};

/** Passed to PaperProvider as `settings.icon`. */
export function PaperIcon({ name, size, color }: { name: unknown; size: number; color?: string }) {
  const I = BY_NAME[String(name)];
  return I ? <I size={size} color={color} /> : null;
}

/** Turns a Kaizen icon into the render function Paper's `icon` props accept. */
export const pi = (I: LucideIcon, strokeWidth?: number) =>
  function Icon({ size, color }: { size: number; color: string }) { return <I size={size} color={color} strokeWidth={strokeWidth} />; };
