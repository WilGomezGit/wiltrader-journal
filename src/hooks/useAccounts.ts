'use client';
import { useState, useEffect } from 'react';
import { subscribeToAccounts, createAccount, updateAccount, deleteAccountCascade, type NewAccountData, type AccountPatch } from '@/lib/accounts';
import type { Account } from '@/types';

export function useAccounts(userId: string | null) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) { setAccounts([]); setLoading(false); setError(null); return; }
    setLoading(true);
    setError(null);
    return subscribeToAccounts(
      userId,
      (data) => { setAccounts(data); setLoading(false); },
      (err) => { setError(err); setLoading(false); }
    );
  }, [userId]);

  const add = (data: NewAccountData) => userId ? createAccount(userId, data) : Promise.reject('No user');
  const update = (id: string, data: AccountPatch) => updateAccount(id, data);
  const remove = (id: string) => userId ? deleteAccountCascade(userId, id) : Promise.reject('No user');

  return { accounts, loading, error, add, update, remove };
}
