import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import type { Habit } from './habits';

const supported = Platform.OS !== 'web';
const HABIT_CHANNEL = 'habits';
const TIMER_CHANNEL = 'timers';

let ready = false;
export async function initNotifications() {
  if (!supported || ready) return;
  ready = true;
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

/** Re-create every habit reminder from scratch. Weekdays in Expo triggers are 1 (Sunday) … 7. */
export async function syncHabitReminders(habits: Habit[]) {
  if (!supported) return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(scheduled.filter((n) => (n.content.data as any)?.kind === 'habit').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  const withReminders = habits.filter((h) => h.type === 'build' && h.reminder);
  if (!withReminders.length) return;
  if (!(await Notifications.getPermissionsAsync()).granted) return;
  for (const h of withReminders) {
    const [hour, minute] = (h.reminder as string).split(':').map(Number);
    const content = { title: h.name, body: h.goal > 1 ? `Goal today: ${h.goal}. Tap to log progress.` : 'Time to check this off.', data: { kind: 'habit', id: h.id } };
    if (h.days.length === 7) {
      await Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: HABIT_CHANNEL } as any });
    } else {
      for (const d of h.days) {
        await Notifications.scheduleNotificationAsync({ content, trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: d + 1, hour, minute, channelId: HABIT_CHANNEL } as any });
      }
    }
  }
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
