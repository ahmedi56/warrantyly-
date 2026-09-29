import { colors } from '@/theme';

import type { Product } from './types';

const DAY = 86_400_000;

function parseISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toISO(date: Date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}

/** Adds months without overflowing (Jan 31 + 1 month = Feb 28/29, not Mar 3). */
export function addMonths(iso: string, months: number) {
  const start = parseISO(iso);
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(start.getDate(), lastDay));
  return target;
}

export function expiryDate(p: Pick<Product, 'purchaseDate' | 'warrantyMonths'>) {
  return addMonths(p.purchaseDate, p.warrantyMonths);
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function daysLeft(p: Pick<Product, 'purchaseDate' | 'warrantyMonths'>) {
  return Math.round((expiryDate(p).getTime() - startOfToday().getTime()) / DAY);
}

/** Fraction of coverage remaining, 0..1 */
export function coverageLeft(p: Pick<Product, 'purchaseDate' | 'warrantyMonths'>) {
  const total = expiryDate(p).getTime() - parseISO(p.purchaseDate).getTime();
  const left = expiryDate(p).getTime() - startOfToday().getTime();
  return Math.max(0, Math.min(1, left / total));
}

export type WarrantyStatus = 'active' | 'expiring' | 'expired';

export const EXPIRING_WINDOW_DAYS = 30;

export function statusOf(p: Pick<Product, 'purchaseDate' | 'warrantyMonths'>): WarrantyStatus {
  const d = daysLeft(p);
  if (d < 0) return 'expired';
  if (d <= EXPIRING_WINDOW_DAYS) return 'expiring';
  return 'active';
}

export const statusStyle: Record<WarrantyStatus, { label: string; fg: string; bg: string }> = {
  active: { label: 'Active', fg: colors.success, bg: colors.successSoft },
  expiring: { label: 'Expiring soon', fg: colors.warning, bg: colors.warningSoft },
  expired: { label: 'Expired', fg: colors.danger, bg: colors.dangerSoft },
};

export function formatDate(input: string | Date) {
  const date = typeof input === 'string' ? parseISO(input) : input;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function humanizeDays(d: number) {
  if (d < 0) return `Expired ${Math.abs(d)} day${Math.abs(d) === 1 ? '' : 's'} ago`;
  if (d === 0) return 'Expires today';
  if (d < 60) return `Expires in ${d} day${d === 1 ? '' : 's'}`;
  const months = Math.round(d / 30.4);
  return `Expires in ${months} month${months === 1 ? '' : 's'}`;
}

export function formatWarranty(months: number) {
  if (months % 12 === 0) {
    const y = months / 12;
    return `${y} Year${y === 1 ? '' : 's'}`;
  }
  return `${months} Month${months === 1 ? '' : 's'}`;
}

export function formatPrice(p: Pick<Product, 'price' | 'currency'>) {
  if (p.price == null) return '—';
  return `${p.price.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${p.currency}`;
}
