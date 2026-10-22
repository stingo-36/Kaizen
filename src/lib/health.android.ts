import type * as HCModule from 'react-native-health-connect';

import { emptySummary, HEALTH_TYPES, HealthStatus, HealthSummary, HealthType } from './health-types';

/* Loaded on first use: Expo Go has no Health Connect module, and importing it up front would crash the app there. */
let mod: typeof HCModule | null | undefined;
const hc = () => {
  if (mod === undefined) { try { mod = require('react-native-health-connect'); } catch { mod = null; } } // eslint-disable-line @typescript-eslint/no-require-imports
  return mod;
};

let ready = false;
const init = async () => { if (!ready) ready = !!(await hc()?.initialize()); return ready; };

export async function healthStatus(): Promise<HealthStatus> {
  const m = hc();
  if (!m) return 'unsupported';
  try {
    const s = await m.getSdkStatus();
    if (s === m.SdkAvailabilityStatus.SDK_UNAVAILABLE) return 'not-installed';
    if (s === m.SdkAvailabilityStatus.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED) return 'update-required';
    return (await init()) ? 'ready' : 'not-installed';
  } catch { return 'not-installed'; }
}

const onlyOurs = (list: { accessType: string; recordType: string }[]) =>
  HEALTH_TYPES.filter((t) => list.some((p) => p.accessType === 'read' && p.recordType === t));

export async function grantedTypes(): Promise<HealthType[]> {
  if (!hc() || !(await init())) return [];
  return onlyOurs(await hc()!.getGrantedPermissions());
}

/** Opens the Health Connect permission screen for exactly the seven types Pulse shows. */
export async function connectHealth(): Promise<HealthType[]> {
  if (!hc() || !(await init())) return [];
  return onlyOurs(await hc()!.requestPermission(HEALTH_TYPES.map((recordType) => ({ accessType: 'read' as const, recordType }))));
}

export const openHealthSettings = () => hc()?.openHealthConnectSettings();

const between = (start: Date, end: Date) => ({ operator: 'between' as const, startTime: start.toISOString(), endTime: end.toISOString() });
const startOfDay = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysAgo = (n: number) => new Date(Date.now() - n * 864e5);
const safe = async <T,>(fn: () => Promise<T>): Promise<T | null> => { try { return await fn(); } catch { return null; } };

/** Today's numbers for every granted type. Types without permission stay null. */
export async function readHealthToday(types: HealthType[]): Promise<HealthSummary> {
  const out = emptySummary();
  const m = hc();
  if (!m || !(await init())) return out;
  const { aggregateRecord, readRecords } = m;
  const has = (t: HealthType) => types.includes(t);
  const now = new Date(), sod = startOfDay(), today = between(sod, now);
  // Last night: sessions that ended after 6 pm yesterday.
  const evening = new Date(sod.getTime() - 6 * 3600e3);

  await Promise.all([
    has('Steps') && safe(async () => { out.steps = Math.round((await aggregateRecord({ recordType: 'Steps', timeRangeFilter: today })).COUNT_TOTAL || 0); }),
    has('TotalCaloriesBurned') && safe(async () => {
      out.kcal = Math.round((await aggregateRecord({ recordType: 'TotalCaloriesBurned', timeRangeFilter: today })).ENERGY_TOTAL?.inKilocalories || 0);
    }),
    has('SleepSession') && safe(async () => {
      const { records } = await readRecords('SleepSession', { timeRangeFilter: between(evening, now) });
      const ms = records.reduce((a, r) => {
        // Skip awake stages (1 = awake, 3 = out of bed, 7 = awake in bed) when the tracker reports stages.
        const awake = (r.stages ?? []).filter((s) => s.stage === 1 || s.stage === 3 || s.stage === 7).reduce((b, s) => b + (Date.parse(s.endTime) - Date.parse(s.startTime)), 0);
        return a + (Date.parse(r.endTime) - Date.parse(r.startTime)) - awake;
      }, 0);
      out.sleepMin = records.length ? Math.round(ms / 60000) : 0;
    }),
    has('ExerciseSession') && safe(async () => {
      const { records } = await readRecords('ExerciseSession', { timeRangeFilter: between(daysAgo(7), now), ascendingOrder: false });
      const todays = records.filter((r) => Date.parse(r.startTime) >= sod.getTime());
      out.exercise = {
        count: todays.length,
        minutes: Math.round(todays.reduce((a, r) => a + (Date.parse(r.endTime) - Date.parse(r.startTime)), 0) / 60000),
        last: records[0] ? records[0].title || 'Workout' : null,
      };
    }),
    has('HeartRate') && safe(async () => {
      const a = await aggregateRecord({ recordType: 'HeartRate', timeRangeFilter: today });
      out.hr = a.MEASUREMENTS_COUNT ? { avg: Math.round(a.BPM_AVG), min: Math.round(a.BPM_MIN), max: Math.round(a.BPM_MAX) } : null;
    }),
    has('RestingHeartRate') && safe(async () => {
      const { records } = await readRecords('RestingHeartRate', { timeRangeFilter: between(daysAgo(7), now), ascendingOrder: false, pageSize: 1 });
      out.restingHr = records[0] ? Math.round(records[0].beatsPerMinute) : null;
    }),
    has('Weight') && safe(async () => {
      const { records } = await readRecords('Weight', { timeRangeFilter: between(daysAgo(90), now), ascendingOrder: false, pageSize: 1 });
      out.weightKg = records[0] ? +records[0].weight.inKilograms.toFixed(1) : null;
    }),
  ]);
  out.at = Date.now();
  return out;
}
