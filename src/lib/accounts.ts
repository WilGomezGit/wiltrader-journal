import {
  collection, doc, addDoc, updateDoc, deleteDoc, writeBatch,
  query, where, onSnapshot, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Account, AccountKind, Currency, PropRules } from '@/types';

const ACCOUNTS_COLLECTION = 'accounts';
const BATCH_LIMIT = 450;

export type NewAccountData = {
  name: string;
  kind: AccountKind;
  broker: string;
  platform?: string;
  accountNumber?: string;
  baseCurrency: Currency;
  initialBalance: number;
  startDate?: string;
  prop?: PropRules;
};

export type AccountPatch = Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>;

/** Firestore rejects `undefined`; drop it (recursively) before writing. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) out[k] = clean(v);
    }
    return out as T;
  }
  return value;
}

/** Accounts created before account types existed become active personal accounts. */
export function normalizeAccount(id: string, data: Record<string, unknown>): Account {
  const a = data as Partial<Account>;
  return {
    ...(a as Account),
    id,
    kind: a.kind === 'prop' ? 'prop' : 'personal',
    active: a.active !== false,
  };
}

export function subscribeToAccounts(
  userId: string,
  callback: (accounts: Account[]) => void,
  onError?: (error: Error) => void
) {
  // No orderBy on purpose: equality + orderBy on another field needs a manual composite index.
  const q = query(collection(db, ACCOUNTS_COLLECTION), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const accounts = snap.docs
        .map((d) => normalizeAccount(d.id, d.data()))
        .sort((a, b) => a.createdAt - b.createdAt);
      callback(accounts);
    },
    (error) => {
      console.error('subscribeToAccounts failed', error);
      onError?.(error);
    }
  );
}

export async function createAccount(userId: string, data: NewAccountData): Promise<string> {
  const ref = await addDoc(collection(db, ACCOUNTS_COLLECTION), clean({
    userId,
    ...data,
    // Personal accounts never carry prop-firm rules.
    prop: data.kind === 'prop' ? data.prop : undefined,
    active: true,
    createdAt: Date.now(),
  }));
  return ref.id;
}

export async function updateAccount(accountId: string, data: AccountPatch): Promise<void> {
  const patch: AccountPatch = { ...data };
  if (patch.kind === 'personal') patch.prop = undefined;
  const { prop, ...rest } = patch;
  const payload: Record<string, unknown> = clean(rest);
  if ('prop' in patch) payload.prop = prop === undefined ? null : clean(prop);
  await updateDoc(doc(db, ACCOUNTS_COLLECTION, accountId), payload);
}

/** Deletes the account together with its trades and cash flows, so nothing is left orphaned. */
export async function deleteAccountCascade(userId: string, accountId: string): Promise<void> {
  for (const col of ['trades', 'cashflows']) {
    const snap = await getDocs(query(collection(db, col), where('userId', '==', userId), where('accountId', '==', accountId)));
    for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
  await deleteDoc(doc(db, ACCOUNTS_COLLECTION, accountId));
}
