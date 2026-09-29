'use client';
import { useState, useEffect } from 'react';
import { subscribeToAccounts, createAccount, updateAccount, deleteAccount, type NewAccountData } from '@/lib/accounts';
import type { Account } from '@/types';

export function useAccounts(userId: string | null) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setAccounts([]); setLoading(false); return; }
    setLoading(true);
    const unsub = subscribeToAccounts(userId, (data) => {
      setAccounts(data);
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  const add = (data: NewAccountData) => userId ? createAccount(userId, data) : Promise.reject('No user');
  const update = (id: string, data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>) => updateAccount(id, data);
  const remove = (id: string) => deleteAccount(id);

  return { accounts, loading, add, update, remove };
}
