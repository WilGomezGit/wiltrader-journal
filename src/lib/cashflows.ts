import { collection, doc, addDoc, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import type { Cashflow } from '@/types';

const CASHFLOWS_COLLECTION = 'cashflows';

export function subscribeToCashflows(
  userId: string,
  callback: (cashflows: Cashflow[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, CASHFLOWS_COLLECTION), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Cashflow)).sort((a, b) => a.date.localeCompare(b.date))),
    (error) => {
      console.error('subscribeToCashflows failed', error);
      onError?.(error);
    }
  );
}

export async function addCashflow(userId: string, data: { accountId: string; type: Cashflow['type']; amount: number; date: string; note?: string }): Promise<void> {
  await addDoc(collection(db, CASHFLOWS_COLLECTION), {
    userId,
    accountId: data.accountId,
    type: data.type,
    amount: Math.abs(data.amount),
    date: data.date,
    note: data.note ?? '',
    createdAt: Date.now(),
  });
}

export async function deleteCashflow(id: string): Promise<void> {
  await deleteDoc(doc(db, CASHFLOWS_COLLECTION, id));
}
