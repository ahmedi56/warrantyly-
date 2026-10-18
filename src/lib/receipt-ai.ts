import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { Draft } from '@/data/store';
import { CATEGORIES, type Category } from '@/data/types';
import { isValidISO, WARRANTY_MONTH_CHOICES } from '@/data/validation';
import { toISO } from '@/data/warranty';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

export type ReadResult = { ok: true; fields: Draft; complete: boolean } | { ok: false; message: string };

/** Longest side sent to the reader. Printed receipt text stays sharp at this size and uploads fast. */
const MAX_SIDE = 2000;
const TIMEOUT_MS = 45_000;

const MESSAGES = {
  offline: 'Receipt reading isn’t available right now. Enter the details below, or go back and try a sample receipt.',
  notReceipt: 'That doesn’t look like a receipt. Try another photo, or enter the details yourself.',
  rateLimited: 'Too many receipts were read in a short time. Please try again in a little while.',
  failed: 'We couldn’t read that receipt. Check your connection, or enter the details yourself.',
  partial: 'We found some details but not the product name. Please fill in the rest.',
};

type Raw = {
  is_receipt?: boolean;
  product_name?: string | null;
  brand?: string | null;
  category?: string | null;
  store?: string | null;
  purchase_date?: string | null;
  price?: number | null;
  currency?: string | null;
  warranty_months?: number | null;
};

/** Shrinks the photo and returns it as base64 JPEG. Phone cameras produce files far larger than needed. */
async function prepareImage(uri: string) {
  let image = await ImageManipulator.manipulate(uri).renderAsync();
  if (Math.max(image.width, image.height) > MAX_SIDE) {
    const tall = image.height >= image.width;
    image = await ImageManipulator.manipulate(uri)
      .resize(tall ? { height: MAX_SIDE } : { width: MAX_SIDE })
      .renderAsync();
  }
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  if (!saved.base64) throw new Error('no image data');
  return saved.base64;
}

const text = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);

/** The reader is a model, so every field is checked here before it can reach the form or the database. */
function toFields(raw: Raw): Draft {
  const fields: Draft = {};
  const name = text(raw.product_name, 200);
  if (name) fields.name = name;
  const brand = text(raw.brand, 120);
  if (brand) fields.brand = brand;
  const store = text(raw.store, 120);
  if (store) fields.store = store;
  fields.category = CATEGORIES.includes(raw.category as Category) ? (raw.category as Category) : 'Other';

  const date = text(raw.purchase_date, 10);
  if (date && isValidISO(date) && date <= toISO(new Date())) fields.purchaseDate = date;

  if (typeof raw.price === 'number' && Number.isFinite(raw.price) && raw.price >= 0 && raw.price < 1e10) {
    fields.price = Math.round(raw.price * 100) / 100;
  }
  const currency = text(raw.currency, 3)?.toUpperCase();
  if (currency && /^[A-Z]{3}$/.test(currency)) fields.currency = currency;

  if (typeof raw.warranty_months === 'number' && raw.warranty_months > 0) {
    // The confirm screen offers fixed lengths, so snap to the nearest one.
    fields.warrantyMonths = WARRANTY_MONTH_CHOICES.reduce((a, b) => (Math.abs(b - raw.warranty_months!) < Math.abs(a - raw.warranty_months!) ? b : a));
  }
  return fields;
}

/** Sends a receipt photo to the `extract-receipt` Edge Function and returns the checked details. */
export async function readReceipt(uri: string): Promise<ReadResult> {
  if (!isSupabaseConfigured) return { ok: false, message: MESSAGES.offline };
  try {
    const image = await prepareImage(uri);
    const call = supabase.functions.invoke('extract-receipt', { body: { image, mediaType: 'image/jpeg' } });
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS));
    const { data, error } = await Promise.race([call, timeout]);
    if (error) return { ok: false, message: MESSAGES.failed };

    if (!data?.ok) {
      if (data?.code === 'rate_limited' || data?.code === 'busy') return { ok: false, message: MESSAGES.rateLimited };
      if (data?.code === 'not_configured') return { ok: false, message: MESSAGES.offline };
      return { ok: false, message: MESSAGES.failed };
    }
    const raw = data.data as Raw;
    if (raw.is_receipt === false) return { ok: false, message: MESSAGES.notReceipt };

    const fields = toFields(raw);
    return { ok: true, fields, complete: fields.name != null };
  } catch {
    return { ok: false, message: MESSAGES.failed };
  }
}

export const partialNotice = MESSAGES.partial;
