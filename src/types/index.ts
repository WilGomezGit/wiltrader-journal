export type { Stats } from '@/lib/analytics';

export type TradeType = 'Buy' | 'Sell';
export type TradeStatus = 'Win' | 'Loss' | 'BE';
export type Currency = 'USD' | 'COP' | 'EUR' | 'GBP';

export type AccountKind = 'prop' | 'personal';
export type PropPhase = 'Challenge' | 'Phase 2' | 'Funded' | 'Payout' | 'Otra';

/** Rules that only exist on prop-firm accounts. Personal accounts never carry them. */
export interface PropRules {
  phase: PropPhase;
  profitTarget: number;
  maxTotalLoss: number;
  maxDailyLoss: number;
  deadline?: string;
  notes?: string;
}

export interface Account {
  id: string;
  userId: string;
  name: string;
  kind: AccountKind;
  active: boolean;
  broker: string;
  platform?: string;
  accountNumber?: string;
  baseCurrency: Currency;
  initialBalance: number;
  startDate?: string;
  prop?: PropRules;
  createdAt: number;
}

export interface Cashflow {
  id: string;
  userId: string;
  accountId: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  date: string;
  note?: string;
  createdAt: number;
}

export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  date: string;
  time?: string;
  /** Original broker-server date/time of imported trades (date/time above are Colombian time). */
  serverDate?: string;
  serverTime?: string;
  asset: string;
  type: TradeType;
  strategy: string;
  entry: number;
  exitPrice?: number;
  sl: number;
  tp: number;
  lotSize?: number;
  /** Gross result, before any cost. */
  result: number;
  /** Costs are stored as positive numbers (a cost reduces the net result). */
  commission: number;
  swap?: number;
  otherCosts?: number;
  /** Monetary risk of the trade, when the trader recorded it. */
  riskAmount?: number;
  /** Broker ticket/position id, used to avoid importing the same trade twice. */
  externalId?: string;
  cop: number;
  emotion?: string;
  notes: string;
  /** Legacy persisted value. Never trust it: the outcome is always derived from the net result. */
  status?: TradeStatus;
  screenshot?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TradeFormData {
  accountId?: string;
  date: string;
  time: string;
  asset: string;
  type: TradeType;
  strategy: string;
  entry: string;
  sl: string;
  tp: string;
  lotSize: string;
  result: string;
  commission: string;
  swap: string;
  otherCosts: string;
  riskAmount: string;
  cop: string;
  emotion: string;
  notes: string;
}

export interface UserSettings {
  traderName: string;
  email: string;
  /** Legacy single-account values, only used to seed the first account during migration. */
  initialBalance: number;
  broker: string;
  baseCurrency: Currency;
  timezone: string;
  strategies: string[];
  assets: string[];
  emotions: string[];
  strategyText: string;
}

export interface TrmData {
  rate: number;
  source: 'superfinanciera' | 'fawaz-api' | 'frankfurter' | 'open.er-api' | 'fallback';
  fallback?: boolean;
}
