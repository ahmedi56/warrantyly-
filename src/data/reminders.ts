import type { Product } from './types';
import { expiryDate, formatDate } from './warranty';

/** Reminders fire at this local hour on their day. */
export const REMINDER_HOUR = 9;

/** iOS keeps at most 64 pending local notifications per app; stay under it. */
export const MAX_SCHEDULED = 60;

export type PlannedReminder = {
  productId: string;
  kind: 'before' | 'expiry';
  date: Date;
  title: string;
  body: string;
};

function atReminderHour(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), REMINDER_HOUR, 0, 0, 0);
}

/**
 * Every upcoming reminder for these products, soonest first:
 * one `reminderDays` before expiry, and one on the expiry day itself.
 * Reminders whose time has already passed are left out.
 */
export function planReminders(products: Product[], now = new Date()): PlannedReminder[] {
  const plan: PlannedReminder[] = [];

  for (const p of products) {
    const expiry = expiryDate(p);
    const expiryAt = atReminderHour(expiry);
    const until = formatDate(expiry);

    if (p.reminderDays > 0) {
      const before = new Date(expiry);
      before.setDate(before.getDate() - p.reminderDays);
      const beforeAt = atReminderHour(before);
      if (beforeAt > now) {
        plan.push({
          productId: p.id,
          kind: 'before',
          date: beforeAt,
          title: `${p.name} warranty ends in ${p.reminderDays} day${p.reminderDays === 1 ? '' : 's'}`,
          body: `Coverage ends ${until}. Check it now while you can still make a claim.`,
        });
      }
    }

    if (expiryAt > now) {
      plan.push({
        productId: p.id,
        kind: 'expiry',
        date: expiryAt,
        title: `${p.name} warranty ends today`,
        body: 'Last day to claim a repair or replacement under warranty.',
      });
    }
  }

  return plan.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** The next reminder for one product, if any. */
export function nextReminderFor(product: Product, now = new Date()) {
  return planReminders([product], now)[0];
}
