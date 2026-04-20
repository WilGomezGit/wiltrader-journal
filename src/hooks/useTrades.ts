'use client';
import { useState, useEffect } from 'react';
import { subscribeToTrades, addTrade, updateTrade, deleteTrade, deleteAllTrades } from '@/lib/trades';
import type { Trade, TradeFormData } from '@/types';

export function useTrades(userId: string | null) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setTrades([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToTrades(userId, (data) => {
      setTrades(data);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const add = (data: TradeFormData) => userId ? addTrade(userId, data) : Promise.reject('No user');
  const update = (id: string, data: Partial<TradeFormData>) => updateTrade(id, data);
  const remove = (id: string) => deleteTrade(id);
  const removeAll = () => userId ? deleteAllTrades(userId) : Promise.reject('No user');

  return { trades, loading, add, update, remove, removeAll };
}
