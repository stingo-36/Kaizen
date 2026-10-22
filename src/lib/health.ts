/* Health Connect is Android only. This file is used on iOS and the web preview;
   the real implementation lives in health.android.ts (Metro picks it on Android). */
import { emptySummary, HealthStatus, HealthSummary, HealthType } from './health-types';

export const healthStatus = async (): Promise<HealthStatus> => 'unsupported';
export const grantedTypes = async (): Promise<HealthType[]> => [];
export const connectHealth = async (): Promise<HealthType[]> => [];
export const readHealthToday = async (_types: HealthType[]): Promise<HealthSummary> => emptySummary();
export const openHealthSettings = () => {};
