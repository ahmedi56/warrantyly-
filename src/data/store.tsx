import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { isSupabaseConfigured, supabase } from '@/lib/supabase';

import { demoProducts, isDemoId } from './demo';
import { deleteAccountRemote, isLocalUri, pullAll, pushOp, sameOp, type FilePatch, type Op } from './sync';
import type { Claim, Product, Settings } from './types';

const STORAGE_KEY = 'warrantyly:v1';
const RETRY_MS = 60_000;

/** Fields captured during the scan → analyze → confirm flow, before the product is saved. */
export type Draft = Partial<Omit<Product, 'id' | 'createdAt'>>;

export type SyncStatus = 'idle' | 'syncing' | 'offline';

type State = {
  ready: boolean;
  products: Product[];
  claims: Claim[];
  settings: Settings;
  draft: Draft | null;
  /** Supabase user id when signed in; null in guest (on-device only) mode. */
  userId: string | null;
  /** Changes not yet confirmed by the server, oldest first. */
  outbox: Op[];
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
};

const defaultSettings: Settings = {
  userName: 'Guest',
  email: '',
  notifications: true,
  language: 'English',
  defaultReminderDays: 14,
  onboarded: false,
};

export const initial: State = {
  ready: false,
  products: demoProducts,
  claims: [],
  settings: defaultSettings,
  draft: null,
  userId: null,
  outbox: [],
  syncStatus: 'idle',
  lastSyncedAt: null,
};

type Action =
  | { type: 'hydrate'; state: Partial<State> }
  | { type: 'addProduct'; product: Product }
  | { type: 'updateProduct'; id: string; patch: Partial<Product> }
  | { type: 'deleteProduct'; id: string }
  | { type: 'addClaim'; claim: Claim }
  | { type: 'updateSettings'; patch: Partial<Settings> }
  | { type: 'setDraft'; draft: Draft | null }
  | { type: 'signedIn'; userId: string; email: string }
  | { type: 'signedOut' }
  | { type: 'opDone'; op: Op; patch?: FilePatch }
  | { type: 'pulled'; products: Product[]; claims: Claim[] }
  | { type: 'syncStatus'; status: SyncStatus }
  | { type: 'reset' };

/** Queue an op when signed in, dropping an identical op that is still waiting. */
function enqueue(state: State, op: Op): Op[] {
  if (!state.userId) return state.outbox;
  return [...state.outbox.filter((o) => !sameOp(o, op)), op];
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Data saved by earlier versions used short ids; the database needs UUIDs. */
function migrateIds(products: Product[], claims: Claim[]) {
  const remap = new Map<string, string>();
  const nextProducts = products.map((p) => {
    if (UUID_RE.test(p.id) || isDemoId(p.id)) return p;
    const id = Crypto.randomUUID();
    remap.set(p.id, id);
    return { ...p, id };
  });
  const nextClaims = claims.map((c) => ({
    ...c,
    id: UUID_RE.test(c.id) ? c.id : Crypto.randomUUID(),
    productId: remap.get(c.productId) ?? c.productId,
  }));
  return { products: nextProducts, claims: nextClaims };
}

/** Exported for tests. */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate': {
      const next = { ...state, ...action.state, ready: true, syncStatus: 'idle' as const };
      return { ...next, ...migrateIds(next.products, next.claims) };
    }
    case 'addProduct':
      return {
        ...state,
        products: [action.product, ...state.products],
        draft: null,
        outbox: enqueue(state, { kind: 'upsertProduct', id: action.product.id }),
      };
    case 'updateProduct':
      return {
        ...state,
        products: state.products.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)),
        outbox: enqueue(state, { kind: 'upsertProduct', id: action.id }),
      };
    case 'deleteProduct': {
      const claimIds = new Set(state.claims.filter((c) => c.productId === action.id).map((c) => c.id));
      // Pending uploads for this product are pointless now; the delete covers them.
      const pruned = state.outbox.filter((o) => !(o.id === action.id || (o.kind === 'upsertClaim' && claimIds.has(o.id))));
      return {
        ...state,
        products: state.products.filter((p) => p.id !== action.id),
        claims: state.claims.filter((c) => c.productId !== action.id),
        outbox: state.userId ? [...pruned, { kind: 'deleteProduct', id: action.id }] : state.outbox,
      };
    }
    case 'addClaim':
      return {
        ...state,
        claims: [action.claim, ...state.claims],
        outbox: enqueue(state, { kind: 'upsertClaim', id: action.claim.id }),
      };
    case 'updateSettings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'setDraft':
      return { ...state, draft: action.draft };
    case 'signedIn': {
      // Keep what the user created as a guest and upload it; demo items stay behind.
      const products = state.products.filter((p) => !isDemoId(p.id));
      const ids = new Set(products.map((p) => p.id));
      const claims = state.claims.filter((c) => ids.has(c.productId));
      const name = action.email.split('@')[0];
      return {
        ...state,
        userId: action.userId,
        products,
        claims,
        outbox: [
          ...products.map((p): Op => ({ kind: 'upsertProduct', id: p.id })),
          ...claims.map((c): Op => ({ kind: 'upsertClaim', id: c.id })),
        ],
        settings: {
          ...state.settings,
          onboarded: true,
          email: action.email,
          userName: name.charAt(0).toUpperCase() + name.slice(1),
        },
      };
    }
    case 'signedOut':
      // Clear the previous user's data from this device.
      return { ...initial, ready: true, settings: { ...defaultSettings, notifications: state.settings.notifications } };
    case 'opDone': {
      const i = state.outbox.findIndex((o) => sameOp(o, action.op));
      const outbox = i === -1 ? state.outbox : [...state.outbox.slice(0, i), ...state.outbox.slice(i + 1)];
      const patch = action.patch;
      const products = patch
        ? state.products.map((p) => (p.id === patch.id ? { ...p, photoPath: patch.photoPath ?? p.photoPath, receiptPath: patch.receiptPath ?? p.receiptPath } : p))
        : state.products;
      return { ...state, outbox, products };
    }
    case 'pulled': {
      // A local change landed while downloading: keep local state, the next sync will reconcile.
      if (state.outbox.length) return state;
      const local = new Map(state.products.map((p) => [p.id, p]));
      // Prefer on-device photo files over signed URLs: they load instantly and work offline.
      const products = action.products.map((p) => {
        const mine = local.get(p.id);
        if (!mine) return p;
        return {
          ...p,
          photoUri: isLocalUri(mine.photoUri) && mine.photoPath === p.photoPath ? mine.photoUri : p.photoUri,
          receiptUri: isLocalUri(mine.receiptUri) && mine.receiptPath === p.receiptPath ? mine.receiptUri : p.receiptUri,
        };
      });
      return { ...state, products, claims: action.claims, syncStatus: 'idle', lastSyncedAt: new Date().toISOString() };
    }
    case 'syncStatus':
      return { ...state, syncStatus: action.status };
    case 'reset':
      // Guest mode only: never wipe a signed-in user's cloud data from a "demo" button.
      if (state.userId) return state;
      return { ...state, products: demoProducts, claims: [] };
  }
}

type Store = State & {
  addProduct: (p: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  addClaim: (productId: string, issue: string) => Claim;
  updateSettings: (patch: Partial<Settings>) => void;
  setDraft: (draft: Draft | null) => void;
  reset: () => void;
  /** Call after a successful Supabase sign-in. */
  signIn: (userId: string, email: string) => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Push pending changes, then download the latest data. */
  syncNow: () => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const latest = useRef(state);
  const running = useRef(false);

  useEffect(() => {
    latest.current = state;
  }, [state]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', state: raw ? JSON.parse(raw) : {} }))
      .catch(() => dispatch({ type: 'hydrate', state: {} }));
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    const { products, claims, settings, userId, outbox, lastSyncedAt } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ products, claims, settings, userId, outbox, lastSyncedAt })).catch(() => {});
  }, [state]);

  /** Sends queued changes in order; stops at the first failure and retries later. Returns true when the queue emptied. */
  const flush = useCallback(async () => {
    const s = latest.current;
    if (!s.userId || !isSupabaseConfigured) return false;
    for (const op of s.outbox) {
      const now = latest.current;
      if (now.userId !== s.userId) return false; // Signed out meanwhile.
      const patch = await pushOp(op, s.userId, now.products, now.claims);
      dispatch({ type: 'opDone', op, patch });
    }
    return true;
  }, []);

  const syncNow = useCallback(async () => {
    if (running.current || !latest.current.userId || !isSupabaseConfigured) return;
    running.current = true;
    dispatch({ type: 'syncStatus', status: 'syncing' });
    try {
      await flush();
      const data = await pullAll();
      dispatch({ type: 'pulled', ...data });
    } catch {
      dispatch({ type: 'syncStatus', status: 'offline' });
    } finally {
      running.current = false;
    }
  }, [flush]);

  // Push new local changes shortly after they happen.
  const pending = state.outbox.length;
  useEffect(() => {
    if (!state.ready || !state.userId || !pending) return;
    const t = setTimeout(() => {
      if (running.current) return;
      running.current = true;
      flush()
        .then(() => dispatch({ type: 'syncStatus', status: 'idle' }))
        .catch(() => dispatch({ type: 'syncStatus', status: 'offline' }))
        .finally(() => {
          running.current = false;
        });
    }, 800);
    return () => clearTimeout(t);
  }, [state.ready, state.userId, pending, flush]);

  // Full sync on launch, when returning to the app, and periodically while changes are stuck.
  useEffect(() => {
    if (!state.ready || !state.userId) return;
    syncNow();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && syncNow());
    const retry = setInterval(() => {
      if (latest.current.outbox.length || latest.current.syncStatus === 'offline') syncNow();
    }, RETRY_MS);
    return () => {
      sub.remove();
      clearInterval(retry);
    };
  }, [state.ready, state.userId, syncNow]);

  // The session can end outside the app's control (e.g. revoked in the dashboard).
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT' && latest.current.userId) dispatch({ type: 'signedOut' });
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const store = useMemo<Store>(
    () => ({
      ...state,
      addProduct: (p) => {
        const product: Product = { ...p, id: Crypto.randomUUID(), createdAt: new Date().toISOString() };
        dispatch({ type: 'addProduct', product });
        return product;
      },
      updateProduct: (id, patch) => dispatch({ type: 'updateProduct', id, patch }),
      deleteProduct: (id) => dispatch({ type: 'deleteProduct', id }),
      addClaim: (productId, issue) => {
        const claim: Claim = { id: Crypto.randomUUID(), productId, issue, createdAt: new Date().toISOString(), status: 'draft' };
        dispatch({ type: 'addClaim', claim });
        return claim;
      },
      updateSettings: (patch) => dispatch({ type: 'updateSettings', patch }),
      setDraft: (draft) => dispatch({ type: 'setDraft', draft }),
      reset: () => dispatch({ type: 'reset' }),
      signIn: (userId, email) => dispatch({ type: 'signedIn', userId, email }),
      signOut: async () => {
        await supabase.auth.signOut().catch(() => {});
        dispatch({ type: 'signedOut' });
      },
      deleteAccount: async () => {
        if (!state.userId) return;
        await deleteAccountRemote(state.userId);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        dispatch({ type: 'signedOut' });
      },
      syncNow,
    }),
    [state, syncNow],
  );

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside <StoreProvider>');
  return ctx;
}

export function useProduct(id: string | undefined) {
  const { products } = useStore();
  return products.find((p) => p.id === id);
}
