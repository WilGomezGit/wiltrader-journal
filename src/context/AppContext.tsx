'use client';
import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useTrades } from '@/hooks/useTrades';
import { migrateLegacyTrades, bulkImportTrades } from '@/lib/trades';
import { getUserSettings, saveUserSettings, DEFAULT_SETTINGS } from '@/lib/settings';
import { computeStats } from '@/lib/stats';
import type { Trade, TradeFormData, UserSettings, Stats, TrmData, Account } from '@/types';
import type { NewAccountData } from '@/lib/accounts';
import type { ImportedTrade } from '@/lib/mtImport';

interface AppContextValue {
  user: ReturnType<typeof useAuth>['user'];
  loading: boolean;
  signIn: ReturnType<typeof useAuth>['signIn'];
  signUp: ReturnType<typeof useAuth>['signUp'];
  signOut: ReturnType<typeof useAuth>['signOut'];
  signInWithGoogle: ReturnType<typeof useAuth>['signInWithGoogle'];
  trades: Trade[];
  tradesLoading: boolean;
  stats: Stats;
  settings: UserSettings;
  showCOP: boolean;
  toggleCOP: () => void;
  copRate: number;
  trmData: TrmData;
  addTrade: (data: TradeFormData) => Promise<void>;
  editTrade: (id: string, data: Partial<TradeFormData>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  deleteAllTrades: () => Promise<void>;
  updateSettings: (s: Partial<UserSettings>) => Promise<void>;
  accounts: Account[];
  accountsLoading: boolean;
  activeAccount: Account | null;
  activeAccountId: string | null;
  switchAccount: (id: string) => void;
  addAccount: (data: NewAccountData) => Promise<string>;
  renameAccount: (id: string, data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  importTrades: (accountId: string, trades: ImportedTrade[], strategy: string) => Promise<number>;
}

const AppContext = createContext<AppContextValue | null>(null);

const EMPTY_STATS: Stats = {
  totalBalance: 20000,
  totalPL: 0, totalPLCOP: 0,
  winRate: 0, totalTrades: 0, wins: 0, losses: 0,
  bestTrade: 0, worstTrade: 0, avgWin: 0, avgLoss: 0,
  profitFactor: 0, maxDrawdown: 0, currentDrawdown: 0,
  expectancy: 0, sharpeRatio: 0, winStreak: 0, lossStreak: 0,
  equityCurve: [20000],
};

const activeAccountKey = (uid: string) => `wiltrader.activeAccount.${uid}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading, signIn, signUp, signOut, signInWithGoogle } = useAuth();
  const { accounts, loading: accountsLoading, add: addAccountFn, update: updateAccountFn, remove: removeAccountFn } = useAccounts(user?.uid ?? null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [showCOP, setShowCOP] = useState(true);
  const [trmData, setTrmData] = useState<TrmData>({ rate: 4200, source: 'fallback' });
  const [activeAccountId, setActiveAccountId] = useState<string | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const migrating = useRef(false);

  useEffect(() => {
    if (!user) return;
    setSettingsLoaded(false);
    getUserSettings(user.uid).then((s) => {
      setSettings(s);
      if (s.email === '' && user.email) {
        setSettings((prev) => ({ ...prev, email: user.email! }));
      }
      setSettingsLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    fetch('/api/trm')
      .then((r) => r.json())
      .then((data: TrmData) => { if (data?.rate) setTrmData(data); })
      .catch(() => {});
  }, []);

  // Auto-create a first account (migrating legacy single-account data) once settings + accounts have loaded.
  useEffect(() => {
    if (!user || accountsLoading || !settingsLoaded || migrating.current) return;
    if (accounts.length > 0) return;
    migrating.current = true;
    (async () => {
      const id = await addAccountFn({
        name: 'Cuenta Principal',
        broker: settings.broker || DEFAULT_SETTINGS.broker,
        baseCurrency: settings.baseCurrency || DEFAULT_SETTINGS.baseCurrency,
        initialBalance: settings.initialBalance ?? DEFAULT_SETTINGS.initialBalance,
      });
      await migrateLegacyTrades(user.uid, id);
      setActiveAccountId(id);
      migrating.current = false;
    })();
  }, [user, accounts.length, accountsLoading, settingsLoaded, settings.broker, settings.baseCurrency, settings.initialBalance, addAccountFn]);

  // Restore / validate the selected account per-user.
  useEffect(() => {
    if (!user || accounts.length === 0) return;
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(activeAccountKey(user.uid)) : null;
    const valid = stored && accounts.some((a) => a.id === stored);
    setActiveAccountId((prev) => {
      if (prev && accounts.some((a) => a.id === prev)) return prev;
      return valid ? stored! : accounts[0].id;
    });
  }, [user, accounts]);

  const switchAccount = (id: string) => {
    setActiveAccountId(id);
    if (user) window.localStorage.setItem(activeAccountKey(user.uid), id);
  };

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null;

  const { trades, loading: tradesLoading, add, update, remove, removeAll } = useTrades(user?.uid ?? null, activeAccountId);

  const stats = trades.length > 0
    ? computeStats(trades, activeAccount?.initialBalance ?? settings.initialBalance)
    : { ...EMPTY_STATS, totalBalance: activeAccount?.initialBalance ?? settings.initialBalance, equityCurve: [activeAccount?.initialBalance ?? settings.initialBalance] };

  const addTrade = async (data: TradeFormData) => { await add(data); };
  const editTrade = async (id: string, data: Partial<TradeFormData>) => { await update(id, data); };
  const deleteTrade = async (id: string) => { await remove(id); };
  const deleteAllTrades = async () => { await removeAll(); };

  const updateSettings = async (s: Partial<UserSettings>) => {
    if (!user) return;
    const merged = { ...settings, ...s };
    setSettings(merged);
    await saveUserSettings(user.uid, merged);
  };

  const addAccount = async (data: NewAccountData) => addAccountFn(data);
  const renameAccount = async (id: string, data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>) => { await updateAccountFn(id, data); };
  const deleteAccount = async (id: string) => {
    await removeAccountFn(id);
    if (activeAccountId === id) {
      const remaining = accounts.filter((a) => a.id !== id);
      if (remaining.length > 0) switchAccount(remaining[0].id);
    }
  };

  const importTrades = async (accountId: string, importedTrades: ImportedTrade[], strategy: string) => {
    if (!user) return 0;
    return bulkImportTrades(user.uid, accountId, importedTrades, { strategy, copRate: trmData.rate });
  };

  return (
    <AppContext.Provider value={{
      user, loading, signIn, signUp, signOut, signInWithGoogle,
      trades, tradesLoading, stats,
      settings, showCOP, toggleCOP: () => setShowCOP((p) => !p),
      copRate: trmData.rate,
      trmData,
      addTrade, editTrade, deleteTrade, deleteAllTrades, updateSettings,
      accounts, accountsLoading, activeAccount, activeAccountId,
      switchAccount, addAccount, renameAccount, deleteAccount, importTrades,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
