export type TradeType = 'Buy' | 'Sell';
export type TradeStatus = 'Win' | 'Loss' | 'BE';

export interface Trade {
  id: string;
  userId: string;
  date: string;
  time?: string;
  asset: string;
  type: TradeType;
  strategy: string;
  entry: number;
  sl: number;
  tp: number;
  lotSize?: number;
  result: number;
  commission: number;
  cop: number;
  emotion?: string;
  notes: string;
  status: TradeStatus;
  screenshot?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TradeFormData {
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
  cop: string;
  emotion: string;
  notes: string;
  status: TradeStatus;
}

export interface UserSettings {
  traderName: string;
  email: string;
  initialBalance: number;
  broker: string;
  baseCurrency: 'USD' | 'COP' | 'EUR' | 'GBP';
  timezone: string;
  strategies: string[];
  assets: string[];
  emotions: string[];
  strategyText: string;
}

export interface Stats {
  totalBalance: number;
  totalPL: number;
  totalPLCOP: number;
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  bestTrade: number;
  worstTrade: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  maxDrawdown: number;
  currentDrawdown: number;
  expectancy: number;
  sharpeRatio: number;
  winStreak: number;
  lossStreak: number;
  equityCurve: number[];
}

export interface TrmData {
  rate: number;
  source: 'superfinanciera' | 'fawaz-api' | 'frankfurter' | 'open.er-api' | 'fallback';
  fallback?: boolean;
}
