'use client';
import { useState, useEffect } from 'react';
import { subscribeToCashflows } from '@/lib/cashflows';
import type { Cashflow } from '@/types';

export function useCashflows(userId: string | null) {
  const [cashflows, setCashflows] = useState<Cashflow[]>([]);

  useEffect(() => {
    if (!userId) { setCashflows([]); return; }
    return subscribeToCashflows(userId, setCashflows);
  }, [userId]);

  return cashflows;
}
