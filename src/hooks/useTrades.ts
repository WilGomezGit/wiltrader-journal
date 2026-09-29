'use client';
import { useState, useEffect } from 'react';
import { subscribeToTrades, addTrade, updateTrade, deleteTrade, deleteAllTrades } from '@/lib/trades';
import type { Trade, TradeFormData } from '@/types';

export function useTrades(userId: string | null, accountId: string | null) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId || !accountId) { setTrades([]); setLoading(false); setError(null); return; }
    setLoading(true);
    setError(null);
    const unsub = subscribeToTrades(
      userId,
      accountId,
      (data) => {
        setTrades(data);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );
    return unsub;
  }, [userId, accountId]);

  const add = (data: TradeFormData) => (userId && accountId) ? addTrade(userId, accountId, data) : Promise.reject('No account selected');
  const update = (id: string, data: Partial<TradeFormData>) => updateTrade(id, data);
  const remove = (id: string) => deleteTrade(id);
  const removeAll = () => (userId && accountId) ? deleteAllTrades(userId, accountId) : Promise.reject('No account selected');

  return { trades, loading, error, add, update, remove, removeAll };
}
