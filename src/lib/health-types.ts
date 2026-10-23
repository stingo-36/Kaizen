/** The seven Health Connect data types Kaizen reads. Each needs its own permission, so only these are requested. */
export const HEALTH_TYPES = ['Steps', 'SleepSession', 'TotalCaloriesBurned', 'ExerciseSession', 'HeartRate', 'RestingHeartRate', 'Weight'] as const;
export type HealthType = (typeof HEALTH_TYPES)[number];

export const HEALTH_LABEL: Record<HealthType, string> = {
  Steps: 'Steps', SleepSession: 'Sleep', TotalCaloriesBurned: 'Calories', ExerciseSession: 'Exercise sessions',
  HeartRate: 'Heart rate', RestingHeartRate: 'Resting heart rate', Weight: 'Weight',
};

export type HealthStatus = 'unsupported' | 'not-installed' | 'update-required' | 'ready';

export type HealthSummary = {
  steps: number | null;
  /** Minutes asleep in the night that ended today. */
  sleepMin: number | null;
  kcal: number | null;
  exercise: { count: number; minutes: number; last: string | null } | null;
  hr: { avg: number; min: number; max: number } | null;
  restingHr: number | null;
  weightKg: number | null;
  at: number;
};

export const emptySummary = (): HealthSummary => ({ steps: null, sleepMin: null, kcal: null, exercise: null, hr: null, restingHr: null, weightKg: null, at: 0 });
