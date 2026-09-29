import type { Product } from './types';
import { toISO } from './warranty';

/** Purchase date `months` months and `days` days before today, so demo data never goes stale. */
function ago(months: number, days = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - months);
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(new Date().getDate(), lastDay) - days);
  return toISO(d);
}

const now = new Date().toISOString();

export const demoProducts: Product[] = [
  {
    id: 'demo-1',
    name: 'BrewMaster Pro',
    brand: 'BrewMaster',
    model: 'BM-450',
    category: 'Home Appliances',
    store: 'ElectroTech Sousse',
    purchaseDate: ago(24, -25),
    warrantyMonths: 24,
    price: 699,
    currency: 'TND',
    serial: 'BM2024TUN5567',
    reminderDays: 14,
    createdAt: now,
  },
  {
    id: 'demo-2',
    name: 'Galaxy S24',
    brand: 'Samsung',
    category: 'Phones',
    store: 'Orange Store Tunis',
    purchaseDate: ago(8),
    warrantyMonths: 24,
    price: 3299,
    currency: 'TND',
    serial: 'R5CX21ABCD',
    reminderDays: 30,
    createdAt: now,
  },
  {
    id: 'demo-3',
    name: 'ThinkPad X1 Carbon',
    brand: 'Lenovo',
    category: 'Computers',
    store: 'Mytek',
    purchaseDate: ago(14),
    warrantyMonths: 36,
    price: 5899,
    currency: 'TND',
    reminderDays: 30,
    createdAt: now,
  },
  {
    id: 'demo-4',
    name: 'WH-1000XM5',
    brand: 'Sony',
    category: 'Audio',
    store: 'Fnac',
    purchaseDate: ago(25),
    warrantyMonths: 24,
    price: 1149,
    currency: 'TND',
    reminderDays: 7,
    createdAt: now,
  },
  {
    id: 'demo-5',
    name: 'Air Fryer XL',
    brand: 'Philips',
    category: 'Home Appliances',
    store: 'Carrefour',
    purchaseDate: ago(3),
    warrantyMonths: 24,
    price: 459,
    currency: 'TND',
    reminderDays: 14,
    createdAt: now,
  },
  {
    id: 'demo-6',
    name: 'OLED 55" C3',
    brand: 'LG',
    category: 'Electronics',
    store: 'Batam',
    purchaseDate: ago(11),
    warrantyMonths: 24,
    price: 4290,
    currency: 'TND',
    reminderDays: 30,
    createdAt: now,
  },
];

/** What the (simulated) AI extraction returns for a scanned receipt. */
export const mockExtraction = {
  name: 'BrewMaster Pro',
  brand: 'BrewMaster',
  category: 'Home Appliances' as const,
  store: 'ElectroTech Sousse',
  purchaseDate: toISO(new Date()),
  warrantyMonths: 24,
  price: 699,
  currency: 'TND',
};

/** Demo items (current `demo-` ids and the short `p1` ids of earlier versions) are never uploaded. */
export const isDemoId = (id: string) => id.startsWith('demo-') || /^p\d+$/.test(id);
