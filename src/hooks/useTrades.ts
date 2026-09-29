'use client';
import { useState, useEffect } from 'react';
import { subscribeToTrades, addTrade, updateTrade, deleteTrade, deleteAllTrades } from '@/lib/trades';
import type { Trade, TradeFormData } from '@/types';

export function useTrades(userId: string | null, accountId: string | null) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !accountId) { setTrades([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToTrades(userId, accountId, (data) => {
      setTrades(data);
      setLoading(false);
    });
    return unsub;
  }, [userId, accountId]);

  const add = (data: TradeFormData) => (userId && accountId) ? addTrade(userId, accountId, data) : Promise.reject('No account selected');
  const update = (id: string, data: Partial<TradeFormData>) => updateTrade(id, data);
  const remove = (id: string) => deleteTrade(id);
  const removeAll = () => (userId && accountId) ? deleteAllTrades(userId, accountId) : Promise.reject('No account selected');

  return { trades, loading, add, update, remove, removeAll };
}
