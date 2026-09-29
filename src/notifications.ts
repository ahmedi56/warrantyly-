import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { MAX_SCHEDULED, planReminders } from '@/data/reminders';
import type { Product } from '@/data/types';
import { colors } from '@/theme';

/**
 * Local notifications for iOS and Android. Web resolves `notifications.web.ts` instead,
 * so `expo-notifications` (which has no web support) is never loaded in the browser.
 */
export const notificationsSupported = Platform.OS !== 'web';

const CHANNEL_ID = 'reminders';

export async function setupNotifications() {
  if (!notificationsSupported) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Warranty reminders',
      description: 'Alerts before a product warranty expires',
      importance: Notifications.AndroidImportance.HIGH,
      lightColor: colors.primary,
    });
  }
}

export async function hasPermission() {
  if (!notificationsSupported) return false;
  const { granted } = await Notifications.getPermissionsAsync();
  return granted;
}

/** Asks the OS for permission if it hasn't been decided yet. Returns whether we may notify. */
export async function requestPermission() {
  if (!notificationsSupported) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const res = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return res.granted;
}

/**
 * Replaces every scheduled expiry reminder with a fresh plan for `products`, so the
 * schedule always matches edits and deletions. Other notifications (e.g. a test) are kept.
 */
export function syncReminders(products: Product[], enabled: boolean) {
  // Queue syncs so two overlapping runs can't both schedule and leave duplicates.
  syncQueue = syncQueue.then(() => runSync(products, enabled)).catch(() => {});
  return syncQueue;
}

let syncQueue: Promise<void> = Promise.resolve();

async function runSync(products: Product[], enabled: boolean) {
  if (!notificationsSupported) return;

  const pending = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pending
      .filter((n) => n.content.data?.reminder === true)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!enabled || !(await hasPermission())) return;

  const plan = planReminders(products).slice(0, MAX_SCHEDULED);
  await Promise.all(
    plan.map((r) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body: r.body,
          sound: true,
          data: { url: `/product/${r.productId}`, reminder: true },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.date,
          channelId: CHANNEL_ID,
        },
      }),
    ),
  );
}

/** Fires a sample reminder a few seconds from now so the user can see what they look like. */
export async function sendTestReminder(product: Product | undefined) {
  if (!notificationsSupported) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: product ? `${product.name} warranty ends in ${product.reminderDays} days` : 'Warranty reminder',
      body: 'This is how Warrantyly will remind you before coverage ends.',
      sound: true,
      data: product ? { url: `/product/${product.id}` } : {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}

/**
 * Calls `open` with the screen a tapped reminder points to, including the tap that
 * launched the app. Returns an unsubscribe function.
 */
export function onReminderTapped(open: (url: string) => void) {
  const handle = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url === 'string') open(url);
  };
  handle(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
