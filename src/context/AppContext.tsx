'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTrades } from '@/hooks/useTrades';
import { getUserSettings, saveUserSettings, DEFAULT_SETTINGS } from '@/lib/settings';
import { computeStats } from '@/lib/stats';
import type { Trade, TradeFormData, UserSettings, Stats } from '@/types';

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
  addTrade: (data: TradeFormData) => Promise<void>;
  editTrade: (id: string, data: Partial<TradeFormData>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  updateSettings: (s: Partial<UserSettings>) => Promise<void>;
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

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading, signIn, signUp, signOut, signInWithGoogle } = useAuth();
  const { trades, loading: tradesLoading, add, update, remove } = useTrades(user?.uid ?? null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [showCOP, setShowCOP] = useState(true);
  const [copRate, setCopRate] = useState(4200);

  useEffect(() => {
    if (!user) return;
    getUserSettings(user.uid).then((s) => {
      setSettings(s);
      if (s.email === '' && user.email) {
        setSettings((prev) => ({ ...prev, email: user.email! }));
      }
    });
  }, [user]);

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => r.json())
      .then((data) => {
        if (data?.rates?.COP) setCopRate(Math.round(data.rates.COP));
      })
      .catch(() => {});
  }, []);

  const stats = trades.length > 0
    ? computeStats(trades, settings.initialBalance)
    : { ...EMPTY_STATS, totalBalance: settings.initialBalance, equityCurve: [settings.initialBalance] };

  const addTrade = async (data: TradeFormData) => { await add(data); };
  const editTrade = async (id: string, data: Partial<TradeFormData>) => { await update(id, data); };
  const deleteTrade = async (id: string) => { await remove(id); };

  const updateSettings = async (s: Partial<UserSettings>) => {
    if (!user) return;
    const merged = { ...settings, ...s };
    setSettings(merged);
    await saveUserSettings(user.uid, merged);
  };

  return (
    <AppContext.Provider value={{
      user, loading, signIn, signUp, signOut, signInWithGoogle,
      trades, tradesLoading, stats,
      settings, showCOP, toggleCOP: () => setShowCOP((p) => !p),
      copRate,
      addTrade, editTrade, deleteTrade, updateSettings,
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
