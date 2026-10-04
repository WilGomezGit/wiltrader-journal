import {
  collection, doc, addDoc, updateDoc, deleteDoc, writeBatch,
  query, where, onSnapshot, getDocs, type DocumentReference,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Trade, TradeFormData } from '@/types';
import type { ImportedTrade } from './mtImport';

const TRADES_COLLECTION = 'trades';
const BATCH_LIMIT = 450;

const num = (v: string | undefined) => parseFloat(v ?? '') || 0;

/**
 * Subscribes to every trade of the user (all accounts). Account scoping and ordering happen in memory,
 * so the query needs no composite index and "all accounts" is just the unfiltered list.
 */
export function subscribeToTrades(userId: string, callback: (trades: Trade[]) => void, onError?: (error: Error) => void) {
  const q = query(collection(db, TRADES_COLLECTION), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trade))),
    (error) => {
      console.error('subscribeToTrades failed', error);
      onError?.(error);
    }
  );
}

export async function addTrade(userId: string, data: TradeFormData): Promise<string> {
  if (!data.accountId) throw new Error('Toda operación debe pertenecer a una cuenta.');
  const ref = await addDoc(collection(db, TRADES_COLLECTION), {
    userId,
    accountId: data.accountId,
    date: data.date,
    time: data.time || '',
    asset: data.asset,
    type: data.type,
    strategy: data.strategy,
    entry: num(data.entry),
    sl: num(data.sl),
    tp: num(data.tp),
    lotSize: num(data.lotSize),
    result: num(data.result),
    commission: num(data.commission),
    swap: num(data.swap),
    otherCosts: num(data.otherCosts),
    riskAmount: num(data.riskAmount),
    cop: num(data.cop),
    emotion: data.emotion || '',
    notes: data.notes,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateTrade(tradeId: string, data: Partial<TradeFormData>): Promise<void> {
  const updates: Record<string, unknown> = { updatedAt: Date.now() };
  const text: (keyof TradeFormData)[] = ['accountId', 'date', 'time', 'asset', 'type', 'strategy', 'emotion', 'notes'];
  const numeric: (keyof TradeFormData)[] = ['entry', 'sl', 'tp', 'lotSize', 'result', 'commission', 'swap', 'otherCosts', 'riskAmount', 'cop'];
  for (const k of text) if (data[k] !== undefined) updates[k] = data[k];
  for (const k of numeric) if (data[k] !== undefined) updates[k] = num(data[k] as string);
  await updateDoc(doc(db, TRADES_COLLECTION, tradeId), updates);
}

export async function deleteTrade(tradeId: string): Promise<void> {
  await deleteDoc(doc(db, TRADES_COLLECTION, tradeId));
}

export async function deleteAllTrades(userId: string, accountId: string): Promise<void> {
  const snap = await getDocs(query(collection(db, TRADES_COLLECTION), where('userId', '==', userId), where('accountId', '==', accountId)));
  for (let i = 0; i < snap.docs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + BATCH_LIMIT).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

export const ticketFromNotes = (notes: unknown) => String(notes ?? '').match(/Posición #(\d+)/)?.[1];

export interface ImportResult { imported: number; skipped: number; /** Already-imported trades whose time was converted to Colombian time. */ converted: number }

/**
 * Bulk-imports broker-statement trades. A trade is skipped when the same broker ticket already exists
 * in the destination account (also recognising trades imported before tickets were stored as a field).
 */
export async function bulkImportTrades(
  userId: string,
  accountId: string,
  trades: ImportedTrade[],
  opts: { strategy: string; copRate: number }
): Promise<ImportResult> {
  const existing = await getDocs(query(collection(db, TRADES_COLLECTION), where('userId', '==', userId), where('accountId', '==', accountId)));
  const seen = new Set<string>();
  const unconverted = new Map<string, DocumentReference>(); // imported before times were converted to Colombian time
  existing.docs.forEach((d) => {
    const data = d.data();
    const id = data.externalId || ticketFromNotes(data.notes);
    if (id) seen.add(String(id));
    if (id && !data.serverTime) unconverted.set(String(id), d.ref);
  });

  // Re-importing the same report repairs the times of trades imported earlier in server time.
  const repairs = trades.filter((t) => unconverted.has(t.ticket));
  for (let i = 0; i < repairs.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const t of repairs.slice(i, i + BATCH_LIMIT)) {
      batch.update(unconverted.get(t.ticket) as DocumentReference, {
        externalId: t.ticket, date: t.date, time: t.time, serverDate: t.serverDate, serverTime: t.serverTime, updatedAt: Date.now(),
      });
    }
    await batch.commit();
  }

  const fresh = trades.filter((t) => {
    if (!t.ticket || seen.has(t.ticket)) return false;
    seen.add(t.ticket);
    return true;
  });

  for (let i = 0; i < fresh.length; i += BATCH_LIMIT) {
    const batch = writeBatch(db);
    for (const t of fresh.slice(i, i + BATCH_LIMIT)) {
      batch.set(doc(collection(db, TRADES_COLLECTION)), {
        userId,
        accountId,
        externalId: t.ticket,
        date: t.date,
        time: t.time,
        serverDate: t.serverDate,
        serverTime: t.serverTime,
        asset: t.asset,
        type: t.type,
        strategy: opts.strategy,
        entry: t.entry,
        exitPrice: t.exitPrice,
        sl: t.sl,
        tp: t.tp,
        lotSize: t.lotSize,
        result: t.result,
        commission: t.commission,
        swap: t.swap,
        otherCosts: 0,
        cop: Math.round((t.result - t.commission - t.swap) * opts.copRate),
        emotion: '',
        notes: `Importado desde MetaTrader · Posición #${t.ticket}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
    await batch.commit();
  }
  return { imported: fresh.length, skipped: trades.length - fresh.length, converted: repairs.length };
}

/** One-time migration: assigns any legacy trades (created before multi-account support) to the given account. */
export async function migrateLegacyTrades(userId: string, accountId: string): Promise<number> {
  const snap = await getDocs(query(collection(db, TRADES_COLLECTION), where('userId', '==', userId)));
  const legacy = snap.docs.filter((d) => !d.data().accountId);
  await Promise.all(legacy.map((d) => updateDoc(doc(db, TRADES_COLLECTION, d.id), { accountId })));
  return legacy.length;
}
