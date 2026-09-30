'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '@/hooks/useAuth';
import { useAccounts } from '@/hooks/useAccounts';
import { useTrades } from '@/hooks/useTrades';
import { useCashflows } from '@/hooks/useCashflows';
import { addTrade as addTradeDoc, updateTrade, deleteTrade as deleteTradeDoc, deleteAllTrades as deleteAllTradesDocs, migrateLegacyTrades, bulkImportTrades, type ImportResult } from '@/lib/trades';
import { addCashflow as addCashflowDoc, deleteCashflow } from '@/lib/cashflows';
import { getUserSettings, saveUserSettings, DEFAULT_SETTINGS } from '@/lib/settings';
import { consolidate, summarizeAccount, type AccountSummary, type Basis, type ConsolidatedSummary, type Stats } from '@/lib/analytics';
import { todayISO, tradeTimestamp } from '@/lib/dates';
import type { Trade, TradeFormData, UserSettings, TrmData, Account, Cashflow } from '@/types';
import type { NewAccountData, AccountPatch } from '@/lib/accounts';
import type { ImportedTrade } from '@/lib/mtImport';

export const ALL_ACCOUNTS = 'all';

interface AppContextValue {
  user: ReturnType<typeof useAuth>['user'];
  loading: boolean;
  signIn: ReturnType<typeof useAuth>['signIn'];
  signUp: ReturnType<typeof useAuth>['signUp'];
  signOut: ReturnType<typeof useAuth>['signOut'];
  signInWithGoogle: ReturnType<typeof useAuth>['signInWithGoogle'];

  accounts: Account[];
  activeAccounts: Account[];
  accountsLoading: boolean;
  /** 'all' or an account id. Decides which accounts every screen is looking at. */
  viewAccountId: string;
  setViewAccount: (id: string) => void;
  scopeAccounts: Account[];
  scopeLabel: string;
  /** The single account in scope, or null when viewing all accounts. */
  scopeAccount: Account | null;

  allTrades: Trade[];
  /** Trades of the accounts in scope, newest first. */
  trades: Trade[];
  tradesLoading: boolean;
  cashflows: Cashflow[];

  basis: Basis;
  setBasis: (b: Basis) => void;
  stats: Stats;
  consolidated: ConsolidatedSummary;
  scopeInitialBalance: number;
  scopeBalance: number;
  /** One summary per account (including inactive ones), each computed only from its own trades. */
  summaries: AccountSummary[];

  settings: UserSettings;
  updateSettings: (s: Partial<UserSettings>) => Promise<void>;
  showCOP: boolean;
  toggleCOP: () => void;
  copRate: number;
  trmData: TrmData;

  addTrade: (data: TradeFormData) => Promise<void>;
  editTrade: (id: string, data: Partial<TradeFormData>) => Promise<void>;
  deleteTrade: (id: string) => Promise<void>;
  deleteAllTrades: (accountId: string) => Promise<void>;
  importTrades: (accountId: string, trades: ImportedTrade[], strategy: string) => Promise<ImportResult>;

  addAccount: (data: NewAccountData) => Promise<string>;
  updateAccount: (id: string, data: AccountPatch) => Promise<void>;
  deleteAccount: (id: string) => Promise<void>;
  addCashflow: (data: { accountId: string; type: Cashflow['type']; amount: number; date: string; note?: string }) => Promise<void>;
  removeCashflow: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

const viewKey = (uid: string) => `wiltrader.view.${uid}`;
const legacyViewKey = (uid: string) => `wiltrader.activeAccount.${uid}`;

export function AppProvider({ children }: { children: ReactNode }) {
  const { user, loading, signIn, signUp, signOut, signInWithGoogle } = useAuth();
  const uid = user?.uid ?? null;
  const { accounts, loading: accountsLoading, error: accountsError, add: addAccountFn, update: updateAccountFn, remove: removeAccountFn } = useAccounts(uid);
  const { trades: allTrades, loading: tradesLoading, error: tradesError } = useTrades(uid);
  const cashflows = useCashflows(uid);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [showCOP, setShowCOP] = useState(true);
  const [trmData, setTrmData] = useState<TrmData>({ rate: 4200, source: 'fallback' });
  const [viewAccountId, setViewAccountId] = useState<string>(ALL_ACCOUNTS);
  const [basis, setBasis] = useState<Basis>('net');
  const migrating = useRef(false);
  const restoredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setSettingsLoaded(false);
    getUserSettings(user.uid).then((s) => {
      setSettings(s.email === '' && user.email ? { ...s, email: user.email } : s);
      setSettingsLoaded(true);
    });
  }, [user]);

  useEffect(() => {
    fetch('/api/trm')
      .then((r) => r.json())
      .then((data: TrmData) => { if (data?.rate) setTrmData(data); })
      .catch(() => {});
  }, []);

  // One-time migration of data created before multi-account support: it only runs when there are
  // trades that belong to no account. Having no accounts and no data (a new user, or someone who
  // deleted everything) must stay empty instead of inventing an account with the old balance.
  const hasLegacyTrades = allTrades.some((t) => !t.accountId);
  useEffect(() => {
    if (!user || accountsLoading || tradesLoading || !settingsLoaded || migrating.current) return;
    if (accounts.length > 0 || !hasLegacyTrades) return;
    migrating.current = true;
    (async () => {
      try {
        const id = await addAccountFn({
          name: 'Cuenta Principal',
          kind: 'personal',
          broker: settings.broker || DEFAULT_SETTINGS.broker,
          baseCurrency: settings.baseCurrency || DEFAULT_SETTINGS.baseCurrency,
          initialBalance: settings.initialBalance ?? DEFAULT_SETTINGS.initialBalance,
        });
        await migrateLegacyTrades(user.uid, id);
        setViewAccountId(id);
      } finally {
        migrating.current = false;
      }
    })();
  }, [user, accounts.length, accountsLoading, tradesLoading, hasLegacyTrades, settingsLoaded, settings.broker, settings.baseCurrency, settings.initialBalance, addAccountFn]);

  // Restore the selected scope once per user, then only repair it if the chosen account disappears.
  useEffect(() => {
    if (!uid || accounts.length === 0) return;
    const valid = (id: string) => id === ALL_ACCOUNTS || accounts.some((a) => a.id === id);
    const fallback = (accounts.find((a) => a.active) ?? accounts[0]).id;
    if (restoredFor.current !== uid) {
      restoredFor.current = uid;
      const stored = window.localStorage.getItem(viewKey(uid)) ?? window.localStorage.getItem(legacyViewKey(uid));
      setViewAccountId(stored && valid(stored) ? stored : fallback);
    } else if (!valid(viewAccountId)) {
      setViewAccountId(fallback);
    }
  }, [uid, accounts, viewAccountId]);

  const setViewAccount = (id: string) => {
    setViewAccountId(id);
    if (uid) window.localStorage.setItem(viewKey(uid), id);
  };

  useEffect(() => {
    if (accountsError) toast.error('No se pudieron cargar tus cuentas.', { id: 'accounts-error', duration: 8000 });
  }, [accountsError]);
  useEffect(() => {
    if (tradesError) toast.error('No se pudieron cargar tus trades.', { id: 'trades-error', duration: 8000 });
  }, [tradesError]);

  const today = todayISO();
  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts]);
  const scopeAccounts = useMemo(
    () => (viewAccountId === ALL_ACCOUNTS ? activeAccounts : accounts.filter((a) => a.id === viewAccountId)),
    [viewAccountId, accounts, activeAccounts]
  );
  const scopeAccount = viewAccountId === ALL_ACCOUNTS ? null : (accounts.find((a) => a.id === viewAccountId) ?? null);

  const trades = useMemo(() => {
    const ids = new Set(scopeAccounts.map((a) => a.id));
    return allTrades
      .filter((t) => ids.has(t.accountId))
      .sort((a, b) => tradeTimestamp(b) - tradeTimestamp(a) || b.createdAt - a.createdAt);
  }, [allTrades, scopeAccounts]);

  const consolidated = useMemo(
    () => consolidate(scopeAccounts, allTrades, cashflows, today, basis),
    [scopeAccounts, allTrades, cashflows, today, basis]
  );
  const summaries = useMemo(
    () => accounts.map((a) => summarizeAccount(a, allTrades, cashflows, today, basis)),
    [accounts, allTrades, cashflows, today, basis]
  );

  const scopeLabel = accounts.length === 0 ? 'Sin cuentas' : viewAccountId === ALL_ACCOUNTS ? 'Todas las cuentas' : (scopeAccount?.name ?? 'Sin cuenta');

  const addAccount = (data: NewAccountData) => addAccountFn(data);
  const updateAccount = (id: string, data: AccountPatch) => updateAccountFn(id, data);
  const deleteAccount = async (id: string) => {
    await removeAccountFn(id);
    if (viewAccountId === id) setViewAccount(ALL_ACCOUNTS);
  };

  const updateSettings = async (s: Partial<UserSettings>) => {
    if (!user) return;
    const merged = { ...settings, ...s };
    setSettings(merged);
    await saveUserSettings(user.uid, merged);
  };

  const value: AppContextValue = {
    user, loading, signIn, signUp, signOut, signInWithGoogle,
    accounts, activeAccounts, accountsLoading,
    viewAccountId, setViewAccount, scopeAccounts, scopeLabel, scopeAccount,
    allTrades, trades, tradesLoading, cashflows,
    basis, setBasis,
    stats: consolidated.stats,
    consolidated,
    scopeInitialBalance: scopeAccounts.reduce((s, a) => s + a.initialBalance, 0),
    scopeBalance: consolidated.totalBalance,
    summaries,
    settings, updateSettings,
    showCOP, toggleCOP: () => setShowCOP((p) => !p),
    copRate: trmData.rate, trmData,
    addTrade: async (data) => { if (user) await addTradeDoc(user.uid, data); },
    editTrade: (id, data) => updateTrade(id, data),
    deleteTrade: (id) => deleteTradeDoc(id),
    deleteAllTrades: async (accountId) => { if (user) await deleteAllTradesDocs(user.uid, accountId); },
    importTrades: async (accountId, imported, strategy) =>
      user ? bulkImportTrades(user.uid, accountId, imported, { strategy, copRate: trmData.rate }) : { imported: 0, skipped: 0 },
    addAccount, updateAccount, deleteAccount,
    addCashflow: async (data) => { if (user) await addCashflowDoc(user.uid, data); },
    removeCashflow: (id) => deleteCashflow(id),
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
