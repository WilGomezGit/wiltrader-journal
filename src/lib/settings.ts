import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { UserSettings } from '@/types';

const DEFAULT_SETTINGS: UserSettings = {
  traderName: 'WilTrader Pro',
  email: '',
  initialBalance: 20000,
  broker: 'MT5 — Live',
  baseCurrency: 'USD',
  timezone: 'America/Bogota',
  strategies: ['Spring', 'LPS', 'Test', 'UTAD', 'Creek', 'JAC'],
  assets: ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD', 'GBPJPY', 'NASDAQ', 'SP500'],
};

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const ref = doc(db, 'users', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return DEFAULT_SETTINGS;
  return { ...DEFAULT_SETTINGS, ...snap.data() } as UserSettings;
}

export async function saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
  const ref = doc(db, 'users', userId);
  await setDoc(ref, settings, { merge: true });
}

export { DEFAULT_SETTINGS };
