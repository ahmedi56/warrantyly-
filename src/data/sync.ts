import { RECEIPTS_BUCKET, supabase } from '@/lib/supabase';

import type { Category, Claim, Product } from './types';

/**
 * Pending change waiting to reach Supabase. Only ids are queued: when the op is sent,
 * the product/claim is read from the latest local state, so rapid edits collapse
 * into one upload of the newest version. Every op is idempotent, so retries are safe.
 */
export type Op =
  | { kind: 'upsertProduct'; id: string }
  | { kind: 'deleteProduct'; id: string }
  | { kind: 'upsertClaim'; id: string };

export const sameOp = (a: Op, b: Op) => a.kind === b.kind && a.id === b.id;

/** Values written back to the local product after its files were uploaded. */
export type FilePatch = { id: string; photoPath?: string; receiptPath?: string };

type ProductRow = {
  id: string;
  user_id: string;
  name: string;
  brand: string;
  model: string | null;
  category: string;
  store: string;
  purchase_date: string;
  warranty_months: number;
  price: number | null;
  currency: string;
  serial: string | null;
  photo_path: string | null;
  receipt_path: string | null;
  reminder_days: number;
  created_at: string;
  updated_at: string;
};

type ClaimRow = {
  id: string;
  user_id: string;
  product_id: string;
  issue: string;
  status: Claim['status'];
  created_at: string;
};

const SIGNED_URL_SECONDS = 60 * 60 * 24 * 7;

/** A file that only exists on this device and still has to be uploaded. */
export const isLocalUri = (uri?: string) => !!uri && /^(file|content|ph|blob|data|assets-library):/.test(uri);

function toProductRow(p: Product, userId: string): ProductRow {
  return {
    id: p.id,
    user_id: userId,
    name: p.name,
    brand: p.brand,
    model: p.model ?? null,
    category: p.category,
    store: p.store,
    purchase_date: p.purchaseDate,
    warranty_months: p.warrantyMonths,
    price: p.price ?? null,
    currency: p.currency,
    serial: p.serial ?? null,
    photo_path: p.photoPath ?? null,
    receipt_path: p.receiptPath ?? null,
    reminder_days: p.reminderDays,
    created_at: p.createdAt,
    updated_at: new Date().toISOString(),
  };
}

function fromProductRow(r: ProductRow, urls: Map<string, string>): Product {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    model: r.model ?? undefined,
    category: r.category as Category,
    store: r.store,
    purchaseDate: r.purchase_date,
    warrantyMonths: r.warranty_months,
    price: r.price == null ? undefined : Number(r.price),
    currency: r.currency,
    serial: r.serial ?? undefined,
    photoPath: r.photo_path ?? undefined,
    receiptPath: r.receipt_path ?? undefined,
    photoUri: r.photo_path ? urls.get(r.photo_path) : undefined,
    receiptUri: r.receipt_path ? urls.get(r.receipt_path) : undefined,
    reminderDays: r.reminder_days,
    createdAt: r.created_at,
  };
}

async function uploadFile(localUri: string, path: string) {
  const res = await fetch(localUri);
  const body = await res.arrayBuffer();
  const contentType = res.headers.get('content-type') || (path.endsWith('.png') ? 'image/png' : 'image/jpeg');
  const { error } = await supabase.storage.from(RECEIPTS_BUCKET).upload(path, body, { contentType, upsert: true });
  if (error) throw error;
}

/** Uploads any photo/receipt that only exists on this device. */
async function uploadProductFiles(p: Product, userId: string): Promise<FilePatch | undefined> {
  const patch: FilePatch = { id: p.id };
  const base = `${userId}/${p.id}`;

  if (isLocalUri(p.photoUri) && !p.photoPath) {
    patch.photoPath = `${base}/photo.jpg`;
    await uploadFile(p.photoUri!, patch.photoPath);
  }
  if (isLocalUri(p.receiptUri) && !p.receiptPath) {
    // The scanner uses one picture for both; don't upload it twice.
    if (p.receiptUri === p.photoUri && (patch.photoPath || p.photoPath)) {
      patch.receiptPath = patch.photoPath ?? p.photoPath;
    } else {
      patch.receiptPath = `${base}/receipt.jpg`;
      await uploadFile(p.receiptUri!, patch.receiptPath);
    }
  }
  return patch.photoPath || patch.receiptPath ? patch : undefined;
}

async function removeFolder(prefix: string) {
  const bucket = supabase.storage.from(RECEIPTS_BUCKET);
  const { data, error } = await bucket.list(prefix, { limit: 1000 });
  if (error) throw error;
  const paths = (data ?? []).filter((f) => f.id).map((f) => `${prefix}/${f.name}`);
  if (paths.length) {
    const { error: rmError } = await bucket.remove(paths);
    if (rmError) throw rmError;
  }
}

/** Sends one queued change. Returns file paths to store locally, if files were uploaded. */
export async function pushOp(op: Op, userId: string, products: Product[], claims: Claim[]): Promise<FilePatch | undefined> {
  switch (op.kind) {
    case 'upsertProduct': {
      const p = products.find((x) => x.id === op.id);
      if (!p) return; // Deleted since it was queued; the delete op handles it.
      const patch = await uploadProductFiles(p, userId);
      const { error } = await supabase.from('products').upsert(toProductRow({ ...p, ...patch }, userId));
      if (error) throw error;
      return patch;
    }
    case 'upsertClaim': {
      const c = claims.find((x) => x.id === op.id);
      if (!c) return;
      const row: ClaimRow = { id: c.id, user_id: userId, product_id: c.productId, issue: c.issue, status: c.status, created_at: c.createdAt };
      const { error } = await supabase.from('claims').upsert(row);
      if (error) throw error;
      return;
    }
    case 'deleteProduct': {
      await removeFolder(`${userId}/${op.id}`);
      // Claims go with it through ON DELETE CASCADE.
      const { error } = await supabase.from('products').delete().eq('id', op.id);
      if (error) throw error;
      return;
    }
  }
}

/** Downloads everything the signed-in user owns. RLS limits the rows to theirs. */
export async function pullAll(): Promise<{ products: Product[]; claims: Claim[] }> {
  const [productsRes, claimsRes] = await Promise.all([
    supabase.from('products').select('*').order('created_at', { ascending: false }),
    supabase.from('claims').select('*').order('created_at', { ascending: false }),
  ]);
  if (productsRes.error) throw productsRes.error;
  if (claimsRes.error) throw claimsRes.error;

  const rows = productsRes.data as ProductRow[];
  const paths = [...new Set(rows.flatMap((r) => [r.photo_path, r.receipt_path]).filter((x): x is string => !!x))];
  const urls = new Map<string, string>();
  if (paths.length) {
    const { data, error } = await supabase.storage.from(RECEIPTS_BUCKET).createSignedUrls(paths, SIGNED_URL_SECONDS);
    if (error) throw error;
    for (const d of data ?? []) if (d.path && d.signedUrl) urls.set(d.path, d.signedUrl);
  }

  return {
    products: rows.map((r) => fromProductRow(r, urls)),
    claims: (claimsRes.data as ClaimRow[]).map((r) => ({
      id: r.id,
      productId: r.product_id,
      issue: r.issue,
      status: r.status,
      createdAt: r.created_at,
    })),
  };
}

/** Removes every file, then the account itself (products and claims cascade). */
export async function deleteAccountRemote(userId: string) {
  const bucket = supabase.storage.from(RECEIPTS_BUCKET);
  const { data: folders, error } = await bucket.list(userId, { limit: 1000 });
  if (error) throw error;
  for (const f of folders ?? []) {
    if (f.id) await bucket.remove([`${userId}/${f.name}`]);
    else await removeFolder(`${userId}/${f.name}`);
  }
  const { error: rpcError } = await supabase.rpc('delete_account');
  if (rpcError) throw rpcError;
}
