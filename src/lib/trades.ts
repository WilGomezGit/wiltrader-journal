import {
  collection, doc, addDoc, updateDoc, deleteDoc, writeBatch,
  query, where, onSnapshot, getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Trade, TradeFormData, TradeStatus } from '@/types';
import type { ImportedTrade } from './mtImport';

const TRADES_COLLECTION = 'trades';
const BATCH_LIMIT = 450;

export function subscribeToTrades(
  userId: string,
  accountId: string,
  callback: (trades: Trade[]) => void,
  onError?: (error: Error) => void
) {
  // No orderBy here on purpose: combining it with these equality filters would
  // require a manual composite index in Firestore. Sorting client-side avoids that.
  const q = query(
    collection(db, TRADES_COLLECTION),
    where('userId', '==', userId),
    where('accountId', '==', accountId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const trades = snap.docs
        .map((d) => ({ id: d.id, ...d.data() } as Trade))
        .sort((a, b) => b.createdAt - a.createdAt);
      callback(trades);
    },
    (error) => {
      console.error('subscribeToTrades failed', error);
      onError?.(error);
    }
  );
}

export async function addTrade(userId: string, accountId: string, data: TradeFormData): Promise<string> {
  const result = parseFloat(data.result);
  const ref = await addDoc(collection(db, TRADES_COLLECTION), {
    userId,
    accountId,
    date: data.date,
    asset: data.asset,
    type: data.type,
    strategy: data.strategy,
    entry: parseFloat(data.entry) || 0,
    sl: parseFloat(data.sl) || 0,
    tp: parseFloat(data.tp) || 0,
    lotSize: parseFloat(data.lotSize) || 0,
    result,
    commission: parseFloat(data.commission) || 0,
    cop: parseFloat(data.cop) || 0,
    time: data.time || '',
    emotion: data.emotion || '',
    notes: data.notes,
    status: (data.status || (result >= 0 ? 'Win' : 'Loss')) as TradeStatus,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateTrade(tradeId: string, data: Partial<TradeFormData>): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  if (data.date !== undefined) updates.date = data.date;
  if (data.asset !== undefined) updates.asset = data.asset;
  if (data.type !== undefined) updates.type = data.type;
  if (data.strategy !== undefined) updates.strategy = data.strategy;
  if (data.entry !== undefined) updates.entry = parseFloat(data.entry) || 0;
  if (data.sl !== undefined) updates.sl = parseFloat(data.sl) || 0;
  if (data.tp !== undefined) updates.tp = parseFloat(data.tp) || 0;
  if (data.lotSize !== undefined) updates.lotSize = parseFloat(data.lotSize) || 0;
  if (data.result !== undefined) {
    const result = parseFloat(data.result);
    updates.result = result;
    updates.status = data.status || (result >= 0 ? 'Win' : 'Loss');
  }
  if (data.commission !== undefined) updates.commission = parseFloat(data.commission) || 0;
  if (data.cop !== undefined) updates.cop = parseFloat(data.cop) || 0;
  if (data.time !== undefined) updates.time = data.time;
  if (data.emotion !== undefined) updates.emotion = data.emotion;
  if (data.notes !== undefined) updates.notes = data.notes;
  if (data.status !== undefined) updates.status = data.status;
  await updateDoc(doc(db, TRADES_COLLECTION, tradeId), updates);
}

export async function deleteTrade(tradeId: string): Promise<void> {
  await deleteDoc(doc(db, TRADES_COLLECTION, tradeId));
}

export async function deleteAllTrades(userId: string, accountId: string): Promise<void> {
  const q = query(
    collection(db, TRADES_COLLECTION),
    where('userId', '==', userId),
    where('accountId', '==', accountId)
  );
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => deleteDoc(doc(db, TRADES_COLLECTION, d.id))));
}

/** Bulk-imports parsed broker-statement trades (e.g. from a MetaTrader report) using batched writes. */
export async function bulkImportTrades(
  userId: string,
  accountId: string,
  trades: ImportedTrade[],
  opts: { strategy: string; copRate: number }
): Promise<number> {
  let written = 0;
  for (let i = 0; i < trades.length; i += BATCH_LIMIT) {
    const chunk = trades.slice(i, i + BATCH_LIMIT);
    const batch = writeBatch(db);
    for (const t of chunk) {
      const ref = doc(collection(db, TRADES_COLLECTION));
      batch.set(ref, {
        userId,
        accountId,
        date: t.date,
        time: t.time,
        asset: t.asset,
        type: t.type,
        strategy: opts.strategy,
        entry: t.entry,
        sl: t.sl,
        tp: t.tp,
        lotSize: t.lotSize,
        result: t.result,
        commission: t.commission,
        cop: Math.round((t.result - t.commission) * opts.copRate),
        emotion: '',
        notes: `Importado desde MetaTrader · Posición #${t.ticket}`,
        status: t.status,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    await batch.commit();
    written += chunk.length;
  }
  return written;
}

/** One-time migration: assigns any legacy trades (created before multi-account support) to the given account. */
export async function migrateLegacyTrades(userId: string, accountId: string): Promise<number> {
  const q = query(collection(db, TRADES_COLLECTION), where('userId', '==', userId));
  const snap = await getDocs(q);
  const legacy = snap.docs.filter((d) => !d.data().accountId);
  await Promise.all(legacy.map((d) => updateDoc(doc(db, TRADES_COLLECTION, d.id), { accountId })));
  return legacy.length;
}
