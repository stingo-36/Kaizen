import {
  Bed, Bike, BookOpen, Brain, CandyOff, CigaretteOff, Droplet, Dumbbell, Footprints, Heart, LucideIcon, Moon,
  PenLine, PersonStanding, PhoneOff, Pill, Salad, Sun, WineOff,
} from '@/components/ico';

import { ICONS } from '@/lib/habits';

const MAP: Record<(typeof ICONS)[number], LucideIcon> = {
  footprints: Footprints, 'person-standing': PersonStanding, droplet: Droplet, 'book-open': BookOpen, moon: Moon, heart: Heart,
  dumbbell: Dumbbell, salad: Salad, brain: Brain, bike: Bike, pill: Pill, 'pen-line': PenLine,
  'cigarette-off': CigaretteOff, 'phone-off': PhoneOff, 'wine-off': WineOff, 'candy-off': CandyOff, bed: Bed, sun: Sun,
};

/** Icon for a habit's icon index. */
export function HabitIcon({ index, size = 20, color }: { index: number; size?: number; color: string }) {
  const Cmp = MAP[ICONS[index] ?? 'footprints'] ?? Footprints;
  return <Cmp size={size} color={color} strokeWidth={1.8} />;
}
