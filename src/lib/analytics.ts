import type { Account, Cashflow, Trade } from '@/types';
import { monthKey, tradeTimestamp, toISODate, weekStartISO, weekdayOf } from './dates';

/**
 * Single source of truth for every number shown in the journal.
 * Everything is derived from the raw trades on each call; nothing computed is ever persisted.
 *
 * Conventions
 *  - Costs (commission, swap, otherCosts) are positive numbers that reduce the result.
 *  - net = gross - commission - swap - otherCosts.
 *  - A trade is break-even when |pnl| < BE_EPSILON. Break-even trades are excluded from win rate.
 */

export type Basis = 'net' | 'gross';
export type Outcome = 'win' | 'loss' | 'be';

export const BE_EPSILON = 0.005;

export const grossPnl = (t: Trade): number => t.result || 0;
export const totalCosts = (t: Trade): number => (t.commission || 0) + (t.swap || 0) + (t.otherCosts || 0);
export const netPnl = (t: Trade): number => grossPnl(t) - totalCosts(t);
export const pnlOf = (t: Trade, basis: Basis = 'net'): number => (basis === 'net' ? netPnl(t) : grossPnl(t));

export function outcomeOf(pnl: number): Outcome {
  if (pnl > BE_EPSILON) return 'win';
  if (pnl < -BE_EPSILON) return 'loss';
  return 'be';
}

export const tradeOutcome = (t: Trade, basis: Basis = 'net'): Outcome => outcomeOf(pnlOf(t, basis));

/**
 * R multiple of a trade, only when it can be computed from real data:
 *  1. the trader recorded a monetary risk, or
 *  2. the value of one price unit can be derived from the trade itself (gross result / price move).
 * Returns null otherwise. Never guessed.
 */
export function rMultiple(t: Trade, basis: Basis = 'net'): number | null {
  let risk = t.riskAmount && t.riskAmount > 0 ? t.riskAmount : null;
  if (risk === null && t.exitPrice && t.sl && t.entry) {
    const move = Math.abs(t.exitPrice - t.entry);
    const slDistance = Math.abs(t.entry - t.sl);
    if (move > 0 && slDistance > 0 && t.result !== 0) {
      risk = (Math.abs(t.result) / move) * slDistance;
    }
  }
  if (!risk) return null;
  return pnlOf(t, basis) / risk;
}

export interface PeriodResult { key: string; pnl: number; trades: number }
export interface EquityPoint { date: string; balance: number }
export interface Extreme { key: string; pnl: number }

export interface Stats {
  basis: Basis;
  initialBalance: number;

  totalTrades: number;
  wins: number;
  losses: number;
  breakeven: number;
  /** wins / (wins + losses), in %. Break-even trades are excluded. */
  winRate: number;
  lossRate: number;
  beRate: number;

  /** Waterfall: gross - commissions - swaps - other = net. */
  pnlGross: number;
  commissions: number;
  swaps: number;
  otherCosts: number;
  pnlNet: number;
  /** P&L on the selected basis. */
  pnl: number;

  /** Sum of winning / losing trades on the selected basis (loss as a positive number). */
  grossProfit: number;
  grossLoss: number;
  profitFactor: number;
  expectancy: number;
  avgWin: number;
  avgLoss: number;
  /** avgWin / avgLoss, null when there are no losses. */
  payoff: number | null;
  bestTrade: number;
  worstTrade: number;

  bestDay: Extreme | null;
  worstDay: Extreme | null;
  bestWeek: Extreme | null;
  worstWeek: Extreme | null;
  bestMonth: Extreme | null;
  worstMonth: Extreme | null;
  avgWinningDay: number;
  avgLosingDay: number;

  daysTraded: number;
  daysPositive: number;
  daysNegative: number;
  daysBreakeven: number;

  maxWinStreak: number;
  maxLossStreak: number;
  currentStreak: { type: 'win' | 'loss' | null; count: number };

  maxDrawdown: { amount: number; pct: number };
  currentDrawdown: { amount: number; pct: number };
  /** Gain (in %) needed from the current balance to get back to the peak. */
  recoveryNeededPct: number;
  /** pnl / initial balance, in %. null when there is no initial balance. */
  roi: number | null;
  /** Best day / total profit, in %. null when total profit is not positive. */
  consistency: number | null;

  r: { count: number; avg: number | null; total: number };

  equity: EquityPoint[];
  daily: PeriodResult[];
  weekly: PeriodResult[];
  monthly: PeriodResult[];
}

function groupPeriods(trades: Trade[], basis: Basis, keyOf: (iso: string) => string): PeriodResult[] {
  const map = new Map<string, PeriodResult>();
  for (const t of trades) {
    const iso = toISODate(t.date);
    if (!iso) continue;
    const key = keyOf(iso);
    const cur = map.get(key) ?? { key, pnl: 0, trades: 0 };
    cur.pnl += pnlOf(t, basis);
    cur.trades += 1;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

function extremes(periods: PeriodResult[]): { best: Extreme | null; worst: Extreme | null } {
  if (periods.length === 0) return { best: null, worst: null };
  let best = periods[0], worst = periods[0];
  for (const p of periods) {
    if (p.pnl > best.pnl) best = p;
    if (p.pnl < worst.pnl) worst = p;
  }
  return { best: { key: best.key, pnl: best.pnl }, worst: { key: worst.key, pnl: worst.pnl } };
}

export function sortChronologically(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => tradeTimestamp(a) - tradeTimestamp(b) || (a.createdAt ?? 0) - (b.createdAt ?? 0));
}

export function computeStats(trades: Trade[], opts: { initialBalance?: number; basis?: Basis } = {}): Stats {
  const basis = opts.basis ?? 'net';
  const initialBalance = opts.initialBalance ?? 0;
  const sorted = sortChronologically(trades);

  let wins = 0, losses = 0, breakeven = 0;
  let grossProfit = 0, grossLoss = 0;
  let pnlGrossTotal = 0, commissions = 0, swaps = 0, other = 0;
  let best = 0, worst = 0;
  let curType: 'win' | 'loss' | null = null, curCount = 0, maxWin = 0, maxLoss = 0;
  let rTotal = 0, rCount = 0;

  let balance = initialBalance, peak = initialBalance, maxDD = 0, maxDDPct = 0;
  const equity: EquityPoint[] = [];
  if (sorted.length > 0) {
    equity.push({ date: toISODate(sorted[0].date), balance: initialBalance });
  }

  sorted.forEach((t, i) => {
    const pnl = pnlOf(t, basis);
    pnlGrossTotal += grossPnl(t);
    commissions += t.commission || 0;
    swaps += t.swap || 0;
    other += t.otherCosts || 0;

    const o = outcomeOf(pnl);
    if (o === 'win') { wins++; grossProfit += pnl; }
    else if (o === 'loss') { losses++; grossLoss += -pnl; }
    else breakeven++;

    if (i === 0) { best = pnl; worst = pnl; }
    else { best = Math.max(best, pnl); worst = Math.min(worst, pnl); }

    if (o !== 'be') {
      if (curType === o) curCount++; else { curType = o; curCount = 1; }
      if (o === 'win') maxWin = Math.max(maxWin, curCount); else maxLoss = Math.max(maxLoss, curCount);
    }

    const r = rMultiple(t, basis);
    if (r !== null) { rTotal += r; rCount++; }

    balance += pnl;
    if (balance > peak) peak = balance;
    const dd = peak - balance;
    if (dd > maxDD) { maxDD = dd; maxDDPct = peak > 0 ? (dd / peak) * 100 : 0; }
    equity.push({ date: toISODate(t.date), balance });
  });

  const decisive = wins + losses;
  const total = sorted.length;
  const pnl = grossProfit - grossLoss;
  const currentDD = peak - balance;
  const currentDDPct = peak > 0 ? (currentDD / peak) * 100 : 0;

  const daily = groupPeriods(sorted, basis, (iso) => iso);
  const weekly = groupPeriods(sorted, basis, weekStartISO);
  const monthly = groupPeriods(sorted, basis, monthKey);
  const dayX = extremes(daily), weekX = extremes(weekly), monthX = extremes(monthly);

  const posDays = daily.filter((d) => outcomeOf(d.pnl) === 'win');
  const negDays = daily.filter((d) => outcomeOf(d.pnl) === 'loss');
  const totalPositive = grossProfit - grossLoss;

  return {
    basis,
    initialBalance,
    totalTrades: total,
    wins, losses, breakeven,
    winRate: decisive ? (wins / decisive) * 100 : 0,
    lossRate: decisive ? (losses / decisive) * 100 : 0,
    beRate: total ? (breakeven / total) * 100 : 0,

    pnlGross: pnlGrossTotal,
    commissions, swaps, otherCosts: other,
    pnlNet: pnlGrossTotal - commissions - swaps - other,
    pnl,

    grossProfit, grossLoss,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : (grossProfit > 0 ? Infinity : 0),
    expectancy: total ? pnl / total : 0,
    avgWin: wins ? grossProfit / wins : 0,
    avgLoss: losses ? grossLoss / losses : 0,
    payoff: losses && wins ? (grossProfit / wins) / (grossLoss / losses) : null,
    bestTrade: total ? best : 0,
    worstTrade: total ? worst : 0,

    bestDay: dayX.best, worstDay: dayX.worst,
    bestWeek: weekX.best, worstWeek: weekX.worst,
    bestMonth: monthX.best, worstMonth: monthX.worst,
    avgWinningDay: posDays.length ? posDays.reduce((s, d) => s + d.pnl, 0) / posDays.length : 0,
    avgLosingDay: negDays.length ? negDays.reduce((s, d) => s + d.pnl, 0) / negDays.length : 0,

    daysTraded: daily.length,
    daysPositive: posDays.length,
    daysNegative: negDays.length,
    daysBreakeven: daily.length - posDays.length - negDays.length,

    maxWinStreak: maxWin,
    maxLossStreak: maxLoss,
    currentStreak: { type: curType, count: curCount },

    maxDrawdown: { amount: maxDD, pct: maxDDPct },
    currentDrawdown: { amount: currentDD, pct: currentDDPct },
    recoveryNeededPct: currentDD > 0 && balance > 0 ? (currentDD / balance) * 100 : 0,
    roi: initialBalance > 0 ? (pnl / initialBalance) * 100 : null,
    consistency: totalPositive > 0 && dayX.best ? (Math.max(dayX.best.pnl, 0) / totalPositive) * 100 : null,

    r: { count: rCount, avg: rCount ? rTotal / rCount : null, total: rTotal },

    equity, daily, weekly, monthly,
  };
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

export function cashflowTotals(cashflows: Cashflow[]) {
  let deposits = 0, withdrawals = 0;
  for (const c of cashflows) {
    if (c.type === 'deposit') deposits += c.amount; else withdrawals += c.amount;
  }
  return { deposits, withdrawals };
}

export interface PropStatus {
  phase: string;
  target: number;
  profit: number;
  remaining: number;
  /** Raw progress in %, not clamped (can exceed 100). */
  progressPct: number;
  targetReached: boolean;
  balance: number;
  maxLossFloor: number | null;
  distanceToMaxLoss: number | null;
  maxLossUsedPct: number | null;
  dailyPnlToday: number;
  dailyLossRemaining: number | null;
  dailyLossUsedPct: number | null;
  worstDay: Extreme | null;
  breachedMaxLoss: boolean;
  breachedDaily: boolean;
  daysLeft: number | null;
}

/**
 * Prop-firm status. It only ever looks at the trades of the account it is given, so a personal
 * account can never affect another account's target, daily loss or max loss.
 * Limits are measured on closed trades; floating P&L is not known to the journal.
 */
export function computePropStatus(account: Account, trades: Trade[], todayIso: string): PropStatus | null {
  if (account.kind !== 'prop' || !account.prop) return null;
  const p = account.prop;
  const stats = computeStats(trades, { initialBalance: account.initialBalance, basis: 'net' });
  const profit = stats.pnl;
  const balance = account.initialBalance + profit;

  const floor = p.maxTotalLoss > 0 ? account.initialBalance - p.maxTotalLoss : null;
  const distance = floor !== null ? balance - floor : null;
  const todayPnl = stats.daily.find((d) => d.key === todayIso)?.pnl ?? 0;
  const worstDay = stats.worstDay;

  let daysLeft: number | null = null;
  if (p.deadline) {
    const a = new Date(`${todayIso}T00:00:00Z`).getTime();
    const b = new Date(`${toISODate(p.deadline) || p.deadline}T00:00:00Z`).getTime();
    if (!Number.isNaN(b)) daysLeft = Math.round((b - a) / 86400000);
  }

  return {
    phase: p.phase,
    target: p.profitTarget,
    profit,
    remaining: Math.max(p.profitTarget - profit, 0),
    progressPct: p.profitTarget > 0 ? (profit / p.profitTarget) * 100 : 0,
    targetReached: p.profitTarget > 0 && profit >= p.profitTarget,
    balance,
    maxLossFloor: floor,
    distanceToMaxLoss: distance,
    maxLossUsedPct: p.maxTotalLoss > 0 ? Math.min(Math.max(((account.initialBalance - balance) / p.maxTotalLoss) * 100, 0), 100) : null,
    dailyPnlToday: todayPnl,
    dailyLossRemaining: p.maxDailyLoss > 0 ? p.maxDailyLoss + Math.min(todayPnl, 0) : null,
    dailyLossUsedPct: p.maxDailyLoss > 0 ? Math.min(Math.max((-todayPnl / p.maxDailyLoss) * 100, 0), 100) : null,
    worstDay,
    breachedMaxLoss: floor !== null && balance <= floor,
    breachedDaily: p.maxDailyLoss > 0 && stats.daily.some((d) => d.pnl <= -p.maxDailyLoss),
    daysLeft,
  };
}

export interface AccountSummary {
  account: Account;
  stats: Stats;
  deposits: number;
  withdrawals: number;
  /** initial + deposits - withdrawals */
  netCapital: number;
  /** netCapital + net P&L. */
  balance: number;
  prop: PropStatus | null;
}

export function summarizeAccount(account: Account, allTrades: Trade[], allCashflows: Cashflow[], todayIso: string, basis: Basis = 'net'): AccountSummary {
  const trades = allTrades.filter((t) => t.accountId === account.id);
  const { deposits, withdrawals } = cashflowTotals(allCashflows.filter((c) => c.accountId === account.id));
  const stats = computeStats(trades, { initialBalance: account.initialBalance, basis });
  const netCapital = account.initialBalance + deposits - withdrawals;
  return {
    account, stats, deposits, withdrawals, netCapital,
    balance: netCapital + stats.pnl,
    prop: computePropStatus(account, trades, todayIso),
  };
}

export interface ConsolidatedSummary {
  stats: Stats;
  accounts: AccountSummary[];
  totalCapital: number;
  totalBalance: number;
}

/** Combines several accounts. Per-account numbers are untouched; only totals are added up. */
export function consolidate(accounts: Account[], trades: Trade[], cashflows: Cashflow[], todayIso: string, basis: Basis = 'net'): ConsolidatedSummary {
  const summaries = accounts.map((a) => summarizeAccount(a, trades, cashflows, todayIso, basis));
  const ids = new Set(accounts.map((a) => a.id));
  const initial = accounts.reduce((s, a) => s + a.initialBalance, 0);
  const stats = computeStats(trades.filter((t) => ids.has(t.accountId)), { initialBalance: initial, basis });
  return {
    stats,
    accounts: summaries,
    totalCapital: summaries.reduce((s, x) => s + x.netCapital, 0),
    totalBalance: summaries.reduce((s, x) => s + x.balance, 0),
  };
}

/* ------------------------------------------------------------------ */
/* Filters                                                             */
/* ------------------------------------------------------------------ */

export interface TradeFilters {
  accountIds?: string[];
  from?: string;
  to?: string;
  asset?: string;
  side?: 'Buy' | 'Sell';
  strategy?: string;
  outcome?: Outcome;
  weekday?: number;
}

export function filterTrades(trades: Trade[], f: TradeFilters, basis: Basis = 'net'): Trade[] {
  return trades.filter((t) => {
    if (f.accountIds && !f.accountIds.includes(t.accountId)) return false;
    const iso = toISODate(t.date);
    if (f.from && (!iso || iso < f.from)) return false;
    if (f.to && (!iso || iso > f.to)) return false;
    if (f.asset && t.asset !== f.asset) return false;
    if (f.side && t.type !== f.side) return false;
    if (f.strategy && t.strategy !== f.strategy) return false;
    if (f.outcome && tradeOutcome(t, basis) !== f.outcome) return false;
    if (f.weekday !== undefined && (!iso || weekdayOf(iso) !== f.weekday)) return false;
    return true;
  });
}
