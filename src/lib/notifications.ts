import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Habit } from './habits';
import { reminderOccurrences } from './planning';
import { serialTask } from './sync';

const supported = Platform.OS !== 'web';
const HABIT_CHANNEL = 'habits';
const TIMER_CHANNEL = 'timers';

let initialization: Promise<void> | null = null;
export async function initNotifications() {
  if (!supported) return;
  if (initialization) return initialization;
  initialization = initialize().catch((error) => { initialization = null; throw error; });
  return initialization;
}

async function initialize() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    // Android 13+ only shows the permission prompt once a channel exists.
    await Notifications.setNotificationChannelAsync(HABIT_CHANNEL, { name: 'Habit reminders', importance: AndroidImportance.HIGH });
    await Notifications.setNotificationChannelAsync(TIMER_CHANNEL, { name: 'Rest timer', importance: AndroidImportance.MAX });
  }
}

export async function ensurePermission() {
  if (!supported) return false;
  await initNotifications();
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  const res = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowSound: true, allowBadge: false } });
  return res.granted;
}

const runReminderSync = serialTask();
/** Refresh the upcoming two weeks, capped at 60 alerts to leave room for rest timers on iOS. */
export function syncHabitReminders(habits: Habit[]) {
  return runReminderSync(async () => {
    if (!supported) return;
    await initNotifications();
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(scheduled.filter((n) => n.content.data?.kind === 'habit').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    if (!(await Notifications.getPermissionsAsync()).granted) return;
    for (const { habit: h, date } of reminderOccurrences(habits, new Date())) {
      await Notifications.scheduleNotificationAsync({
        content: { title: h.name, body: h.goal > 1 ? `Goal today: ${h.goal}. Tap to log progress.` : 'Time to check this off.', data: { kind: 'habit', id: h.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: HABIT_CHANNEL },
      });
    }
  });
}

/** One-off alert when rest ends, so it fires even with the screen locked. Returns the id to cancel. */
export async function scheduleRestAlert(seconds: number, next: string) {
  if (!supported || seconds < 2) return null;
  if (!(await Notifications.getPermissionsAsync()).granted) return null;
  return Notifications.scheduleNotificationAsync({
    content: { title: 'Rest over', body: `Next set: ${next}`, data: { kind: 'rest' } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.round(seconds), channelId: TIMER_CHANNEL } as any,
  });
}
export async function cancelAlert(id?: string | null) {
  if (!supported || !id) return;
  try { await Notifications.cancelScheduledNotificationAsync(id); } catch {}
}
