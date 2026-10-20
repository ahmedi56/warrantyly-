import type { ReminderPrefs } from '@/data/reminders';
import type { Product } from '@/data/types';

/**
 * Web version of `notifications.ts`. Browsers can't schedule local notifications and
 * `expo-notifications` has no web support, so reminders are phone-only and these are no-ops.
 */
export const notificationsSupported = false;

export async function setupNotifications() {}

export async function hasPermission() {
  return false;
}

export async function requestPermission() {
  return false;
}

export async function syncReminders(_products: Product[], _enabled: boolean, _prefs?: ReminderPrefs) {}

export async function sendTestReminder(_product: Product | undefined, _prefs?: ReminderPrefs) {}

export function onReminderTapped(_open: (url: string) => void, _tell?: (message: string) => void) {
  return () => {};
}
