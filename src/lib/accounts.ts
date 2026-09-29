import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Account } from '@/types';

const ACCOUNTS_COLLECTION = 'accounts';

export type NewAccountData = {
  name: string;
  broker: string;
  baseCurrency: Account['baseCurrency'];
  initialBalance: number;
};

export function subscribeToAccounts(
  userId: string,
  callback: (accounts: Account[]) => void,
  onError?: (error: Error) => void
) {
  // No orderBy here on purpose: combining it with the equality filter above would
  // require a manual composite index in Firestore. Sorting client-side avoids that.
  const q = query(
    collection(db, ACCOUNTS_COLLECTION),
    where('userId', '==', userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const accounts = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Account))
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
  const ref = await addDoc(collection(db, ACCOUNTS_COLLECTION), {
    userId,
    name: data.name,
    broker: data.broker,
    baseCurrency: data.baseCurrency,
    initialBalance: data.initialBalance,
    createdAt: Date.now(),
  });
  return ref.id;
}

export async function updateAccount(accountId: string, data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
  await updateDoc(doc(db, ACCOUNTS_COLLECTION, accountId), data);
}

export async function deleteAccount(accountId: string): Promise<void> {
  await deleteDoc(doc(db, ACCOUNTS_COLLECTION, accountId));
}
