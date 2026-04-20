import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, serverTimestamp, Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import type { Trade, TradeFormData, TradeStatus } from '@/types';

const TRADES_COLLECTION = 'trades';

export function subscribeToTrades(userId: string, callback: (trades: Trade[]) => void) {
  const q = query(
    collection(db, TRADES_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    const trades = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Trade));
    callback(trades);
  });
}

export async function addTrade(userId: string, data: TradeFormData): Promise<string> {
  const result = parseFloat(data.result);
  const ref = await addDoc(collection(db, TRADES_COLLECTION), {
    userId,
    date: data.date,
    asset: data.asset,
    type: data.type,
    strategy: data.strategy,
    entry: parseFloat(data.entry) || 0,
    sl: parseFloat(data.sl) || 0,
    tp: parseFloat(data.tp) || 0,
    lotSize: parseFloat(data.lotSize) || 0,
    result,
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
