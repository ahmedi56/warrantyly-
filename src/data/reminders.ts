import type { Product } from './types';
import { expiryDate, formatDate, toISO } from './warranty';

/** iOS keeps at most 64 pending local notifications per app; stay under it. */
export const MAX_SCHEDULED = 60;

/** When someone chooses "Remind me in 3 days" on a reminder. */
export const SNOOZE_DAYS = 3;

/** After the first reminder, these "days before expiry" follow, so a warranty is never missed by one notice. */
export const FOLLOW_UP_DAYS = [7, 1];

export type ReminderPrefs = {
  /** Local hour (0-23) reminders arrive at. */
  hour: number;
  /** Also remind 7 days and 1 day before expiry (only those that come after the first reminder). */
  followUps: boolean;
};

export const DEFAULT_PREFS: ReminderPrefs = { hour: 9, followUps: true };

/** "9:00 AM". Written out by hand so it reads the same on every phone and in the web build. */
export function formatHour(hour: number) {
  return `${hour % 12 || 12}:00 ${hour < 12 ? 'AM' : 'PM'}`;
}

/** Times a reminder can arrive. Reminders only ever fire at this time, so there is no night-time ping to silence. */
export const REMINDER_HOUR_OPTIONS = [8, 9, 12, 18, 20].map((h) => ({ label: formatHour(h), value: h }));

export type PlannedReminder = {
  productId: string;
  productName: string;
  kind: 'before' | 'expiry';
  /** Days before expiry (0 on the expiry day). */
  daysBefore: number;
  date: Date;
  /** Expiry date as YYYY-MM-DD, so "Remind me later" can be scheduled from the notification alone. */
  expiry: string;
  title: string;
  body: string;
};

/** A calendar day at the chosen local hour. */
export function atHour(d: Date, hour: number) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, 0, 0, 0);
}

/** The days before expiry a product is reminded on: its own setting first, then the follow-ups that come after it. */
export function reminderDaysFor(reminderDays: number, followUps: boolean) {
  if (reminderDays <= 0) return [];
  return [reminderDays, ...(followUps ? FOLLOW_UP_DAYS.filter((d) => d < reminderDays) : [])];
}

/**
 * Every upcoming reminder for these products, soonest first: the product's own "N days before"
 * reminder, the 7 and 1 day follow-ups that come after it, and one on the expiry day.
 * Reminders whose time has already passed are left out.
 */
export function planReminders(products: Product[], now = new Date(), prefs: ReminderPrefs = DEFAULT_PREFS): PlannedReminder[] {
  const plan: PlannedReminder[] = [];

  for (const p of products) {
    const expiry = expiryDate(p);
    const until = formatDate(expiry);
    const base = { productId: p.id, productName: p.name, expiry: toISO(expiry) };

    for (const days of reminderDaysFor(p.reminderDays, prefs.followUps)) {
      const day = new Date(expiry);
      day.setDate(day.getDate() - days);
      const at = atHour(day, prefs.hour);
      if (at <= now) continue;
      plan.push({
        ...base,
        kind: 'before',
        daysBefore: days,
        date: at,
        title: days === 1 ? `${p.name} warranty ends tomorrow` : `${p.name} warranty ends in ${days} days`,
        body: `Coverage ends ${until}. Check it now while you can still make a claim.`,
      });
    }

    const expiryAt = atHour(expiry, prefs.hour);
    if (expiryAt > now) {
      plan.push({
        ...base,
        kind: 'expiry',
        daysBefore: 0,
        date: expiryAt,
        title: `${p.name} warranty ends today`,
        body: 'Last day to claim a repair or replacement under warranty.',
      });
    }
  }

  return plan.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** The next reminder for one product, if any. */
export function nextReminderFor(product: Product, now = new Date(), prefs: ReminderPrefs = DEFAULT_PREFS) {
  return planReminders([product], now, prefs)[0];
}

/**
 * When "Remind me in 3 days" should fire, or `null` when the warranty ends first
 * (the expiry-day reminder is already scheduled, so a snooze would add nothing).
 */
export function snoozeDate(expiry: string, hour: number, now = new Date()) {
  const [y, m, d] = expiry.split('-').map(Number);
  const target = atHour(new Date(now.getFullYear(), now.getMonth(), now.getDate() + SNOOZE_DAYS), hour);
  const expiryAt = atHour(new Date(y, m - 1, d), hour);
  return target < expiryAt ? target : null;
}

/** Choices for "remind me N days before expiry", shared by Profile (default) and each product. */
export const REMINDER_OPTIONS = [60, 30, 14, 7, 3, 1].map((n) => ({
  label: `${n} day${n === 1 ? '' : 's'} before expiry`,
  value: n,
}));
