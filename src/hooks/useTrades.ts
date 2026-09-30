'use client';
import { useState, useEffect } from 'react';
import { subscribeToTrades } from '@/lib/trades';
import type { Trade } from '@/types';

/** Every trade of the user, across all accounts. Scoping is done in AppContext. */
export function useTrades(userId: string | null) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) { setTrades([]); setLoading(false); setError(null); return; }
    setLoading(true);
    setError(null);
    return subscribeToTrades(
      userId,
      (data) => { setTrades(data); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
  }, [userId]);

  return { trades, loading, error };
}
