import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { DEFAULT_PREFS, MAX_SCHEDULED, planReminders, snoozeDate, SNOOZE_DAYS, type ReminderPrefs } from '@/data/reminders';
import type { Product } from '@/data/types';
import { formatDate } from '@/data/warranty';
import { colors } from '@/theme';

/**
 * Local notifications for iOS and Android. Web resolves `notifications.web.ts` instead,
 * so `expo-notifications` (which has no web support) is never loaded in the browser.
 */
export const notificationsSupported = Platform.OS !== 'web';

const CHANNEL_ID = 'reminders';
/** Identifiers can't contain ":" or "-" (see the expo-notifications docs). */
const CATEGORY_ID = 'warrantyreminder';
const ACTION_CLAIM = 'claim';
const ACTION_SNOOZE = 'snooze';

/** What each reminder carries so a button press can act without opening the store first. */
type ReminderData = {
  url: string;
  reminder?: true;
  snooze?: true;
  productId: string;
  productName: string;
  /** YYYY-MM-DD */
  expiry: string;
  hour: number;
};

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

  // Both buttons open the app: a button that only runs in the background is not reliable once the app has been closed.
  await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
    { identifier: ACTION_CLAIM, buttonTitle: 'Start a claim', options: { opensAppToForeground: true } },
    { identifier: ACTION_SNOOZE, buttonTitle: `Remind me in ${SNOOZE_DAYS} days`, options: { opensAppToForeground: true } },
  ]);
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
 * schedule always matches edits and deletions. Other notifications (e.g. a test) are kept,
 * and so are "remind me later" snoozes, unless their product has been deleted.
 */
export function syncReminders(products: Product[], enabled: boolean, prefs: ReminderPrefs = DEFAULT_PREFS) {
  // Queue syncs so two overlapping runs can't both schedule and leave duplicates.
  syncQueue = syncQueue.then(() => runSync(products, enabled, prefs)).catch(() => {});
  return syncQueue;
}

let syncQueue: Promise<void> = Promise.resolve();

async function runSync(products: Product[], enabled: boolean, prefs: ReminderPrefs) {
  if (!notificationsSupported) return;

  const pending = await Notifications.getAllScheduledNotificationsAsync();
  const ids = new Set(products.map((p) => p.id));
  await Promise.all(
    pending
      .filter((n) => {
        const data = n.content.data as Partial<ReminderData> | undefined;
        if (data?.reminder === true) return true;
        // A snooze for a product that no longer exists (or with reminders off) would open a missing page.
        return data?.snooze === true && (!enabled || !ids.has(String(data.productId)));
      })
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  if (!enabled || !(await hasPermission())) return;

  const plan = planReminders(products, new Date(), prefs).slice(0, MAX_SCHEDULED);
  await Promise.all(
    plan.map((r) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: r.title,
          body: r.body,
          sound: true,
          categoryIdentifier: CATEGORY_ID,
          data: { url: `/product/${r.productId}`, reminder: true, productId: r.productId, productName: r.productName, expiry: r.expiry, hour: prefs.hour } satisfies ReminderData,
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

/** Fires a sample reminder a few seconds from now so the user can see what they look like, buttons included. */
export async function sendTestReminder(product: Product | undefined, prefs: ReminderPrefs = DEFAULT_PREFS) {
  if (!notificationsSupported) return;
  const next = product ? planReminders([product], new Date(), prefs)[0] : undefined;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: product ? `${product.name} warranty ends in ${product.reminderDays} days` : 'Warranty reminder',
      body: 'This is how Warrantyly will remind you before coverage ends.',
      sound: true,
      categoryIdentifier: CATEGORY_ID,
      data: product
        ? ({ url: `/product/${product.id}`, productId: product.id, productName: product.name, expiry: next?.expiry ?? '', hour: prefs.hour } satisfies ReminderData)
        : {},
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: CHANNEL_ID,
    },
  });
}

/** Schedules the "remind me later" notification. Returns the message to show the person. */
async function snooze(data: Partial<ReminderData>) {
  const when = data.expiry ? snoozeDate(data.expiry, data.hour ?? DEFAULT_PREFS.hour) : null;
  if (!when || !data.productId || !data.productName || !data.expiry) {
    return 'This warranty ends before then, so we’ll remind you on its last day.';
  }
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${data.productName} warranty reminder`,
      body: `Coverage ends ${formatDate(data.expiry)}. Check it now while you can still make a claim.`,
      sound: true,
      categoryIdentifier: CATEGORY_ID,
      data: { url: `/product/${data.productId}`, snooze: true, productId: data.productId, productName: data.productName, expiry: data.expiry, hour: data.hour ?? DEFAULT_PREFS.hour } satisfies ReminderData,
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL_ID },
  });
  return `We’ll remind you again on ${formatDate(when)}.`;
}

/**
 * Handles taps on a reminder and its buttons, including the one that launched the app.
 * `open` gets the screen to show; `tell` gets a short message when a button needs one.
 * Returns an unsubscribe function.
 */
export function onReminderTapped(open: (url: string) => void, tell?: (message: string) => void) {
  const handled = new Set<string>();

  const handle = async (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    // The launching response can be delivered twice (once from each source below).
    const key = `${response.notification.request.identifier}:${response.actionIdentifier}`;
    if (handled.has(key)) return;
    handled.add(key);

    const data = response.notification.request.content.data as Partial<ReminderData> | undefined;
    const url = typeof data?.url === 'string' ? data.url : undefined;

    if (response.actionIdentifier === ACTION_CLAIM && data?.productId) {
      open(`/claim/${data.productId}`);
    } else if (response.actionIdentifier === ACTION_SNOOZE) {
      const message = await snooze(data ?? {}).catch(() => 'We couldn’t set that reminder. Please try again from the product page.');
      if (url) open(url);
      tell?.(message);
    } else if (url) {
      open(url);
    }
    Notifications.clearLastNotificationResponseAsync?.().catch(() => {});
  };

  handle(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener((r) => void handle(r));
  return () => sub.remove();
}
