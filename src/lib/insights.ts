import { computeStats, netPnl, sortChronologically, tradeOutcome, type Stats } from '@/lib/analytics';
import { monthKey, toISODate } from '@/lib/dates';
import type { Trade } from '@/types';

/** Minimum trades in a slice before its win rate means anything. */
export const MIN_SAMPLE = 5;

export interface Slice {
  id: string;
  label: string;
  trades: number;
  wins: number;
  losses: number;
  /** % of decided trades (break-even excluded); null when nothing was decided. */
  winRate: number | null;
  pnl: number;
  avgPnl: number;
}

function slice(id: string, label: string, trades: Trade[]): Slice {
  const outcomes = trades.map((t) => tradeOutcome(t));
  const wins = outcomes.filter((o) => o === 'win').length;
  const losses = outcomes.filter((o) => o === 'loss').length;
  const pnl = trades.reduce((s, t) => s + netPnl(t), 0);
  return { id, label, trades: trades.length, wins, losses, winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null, pnl, avgPnl: trades.length ? pnl / trades.length : 0 };
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};

const DURATION_BUCKETS: { id: string; label: string; max: number }[] = [
  { id: 'd1', label: 'Duran menos de 5 min', max: 5 },
  { id: 'd2', label: 'Duran de 5 a 30 min', max: 30 },
  { id: 'd3', label: 'Duran de 30 min a 2 h', max: 120 },
  { id: 'd4', label: 'Duran de 2 h a 1 día', max: 1440 },
  { id: 'd5', label: 'Duran más de 1 día', max: Infinity },
];

export interface BreakEven {
  winRate: number;
  payoff: number; // avg win / avg loss
  /** Payoff needed to break even at the current win rate. */
  neededPayoff: number;
  /** Win rate needed to break even at the current payoff. */
  neededWinRate: number;
  profitable: boolean;
}

export interface WorstDays {
  count: number;
  days: { key: string; pnl: number }[];
  total: number;
  withoutThem: number;
}

export interface MonthRow {
  key: string;
  trades: number;
  pnl: number;
  winRate: number | null;
  avgWin: number;
  avgLoss: number;
  costs: number;
}

export interface EarlyClose {
  /** Winning trades with entry, exit and target recorded. */
  measured: number;
  /** Of those, how many closed clearly short of the take profit. */
  early: number;
  /** Average share of the planned move that was captured on those wins, in %. */
  avgCapture: number;
}

export interface Insights {
  stats: Stats;
  breakEven: BreakEven | null;
  slices: Slice[];
  worstDays: WorstDays | null;
  months: MonthRow[];
  earlyClose: EarlyClose | null;
  plan: { followed: Slice; broke: Slice; unmarked: number } | null;
}

export function buildInsights(trades: Trade[]): Insights {
  const sorted = sortChronologically(trades);
  const stats = computeStats(sorted, {});

  // Break-even: what win rate / payoff the strategy needs, given the other one.
  let breakEven: BreakEven | null = null;
  if (stats.wins > 0 && stats.losses > 0 && stats.avgLoss > 0) {
    const p = stats.winRate / 100;
    const payoff = stats.avgWin / stats.avgLoss;
    breakEven = { winRate: stats.winRate, payoff, neededPayoff: (1 - p) / p, neededWinRate: (1 / (1 + payoff)) * 100, profitable: stats.expectancy > 0 };
  }

  const slices: Slice[] = [];

  // After two consecutive losses.
  const afterTwo: Trade[] = [];
  for (let i = 2; i < sorted.length; i++) if (tradeOutcome(sorted[i - 1]) === 'loss' && tradeOutcome(sorted[i - 2]) === 'loss') afterTwo.push(sorted[i]);
  slices.push(slice('after2', 'Tras dos pérdidas seguidas', afterTwo));

  // First trade of each day vs the rest.
  const seen = new Set<string>();
  const first: Trade[] = [], rest: Trade[] = [];
  for (const t of sorted) {
    const d = toISODate(t.date);
    if (seen.has(d)) rest.push(t); else { seen.add(d); first.push(t); }
  }
  slices.push(slice('first', 'Primera operación del día', first));
  slices.push(slice('rest', 'Resto de operaciones del día', rest));

  // Position size: lots clearly above the usual (median) vs the usual.
  const lots = sorted.map((t) => t.lotSize || 0).filter((l) => l > 0);
  const usual = median(lots);
  if (usual > 0) {
    slices.push(slice('bigLot', 'Con más lote de lo habitual', sorted.filter((t) => (t.lotSize || 0) > usual * 1.25)));
    slices.push(slice('usualLot', 'Con el lote habitual o menos', sorted.filter((t) => (t.lotSize || 0) > 0 && (t.lotSize || 0) <= usual * 1.25)));
  }

  // Time in the market.
  const timed = sorted.filter((t) => typeof t.durationMin === 'number');
  let lo = 0;
  for (const b of DURATION_BUCKETS) {
    slices.push(slice(b.id, b.label, timed.filter((t) => (t.durationMin as number) >= lo && (t.durationMin as number) < b.max)));
    lo = b.max;
  }

  // Plan compliance.
  const marked = sorted.filter((t) => t.followedPlan !== undefined);
  const plan = marked.length
    ? { followed: slice('plan', 'Seguiste el plan', marked.filter((t) => t.followedPlan)), broke: slice('noplan', 'No seguiste el plan', marked.filter((t) => !t.followedPlan)), unmarked: sorted.length - marked.length }
    : null;

  // Worst days: what the result would be without them.
  let worstDays: WorstDays | null = null;
  if (stats.daily.length >= 8) {
    const count = Math.min(4, Math.floor(stats.daily.length / 5));
    const worst = [...stats.daily].sort((a, b) => a.pnl - b.pnl).slice(0, count).filter((d) => d.pnl < 0);
    if (worst.length) {
      const lost = worst.reduce((s, d) => s + d.pnl, 0);
      worstDays = { count: worst.length, days: worst.map((d) => ({ key: d.key, pnl: d.pnl })), total: stats.pnl, withoutThem: stats.pnl - lost };
    }
  }

  // Last three months (including the current one when it has trades).
  const months: MonthRow[] = [];
  const keys = [...new Set(sorted.map((t) => monthKey(toISODate(t.date))).filter(Boolean))].sort().slice(-3);
  for (const key of keys) {
    const ts = sorted.filter((t) => monthKey(toISODate(t.date)) === key);
    const s = computeStats(ts, {});
    months.push({ key, trades: s.totalTrades, pnl: s.pnl, winRate: s.wins + s.losses > 0 ? s.winRate : null, avgWin: s.avgWin, avgLoss: s.avgLoss, costs: s.commissions + s.swaps + s.otherCosts });
  }

  // Closing winners before the take profit.
  let earlyClose: EarlyClose | null = null;
  const captures: number[] = [];
  for (const t of sorted) {
    if (tradeOutcome(t) !== 'win' || !t.entry || !t.tp || !t.exitPrice) continue;
    const planned = Math.abs(t.tp - t.entry);
    if (planned <= 0) continue;
    // Only count moves in the trade's direction.
    const moved = t.type === 'Buy' ? t.exitPrice - t.entry : t.entry - t.exitPrice;
    captures.push(Math.max(moved, 0) / planned);
  }
  if (captures.length >= MIN_SAMPLE) {
    earlyClose = { measured: captures.length, early: captures.filter((c) => c < 0.9).length, avgCapture: (captures.reduce((a, b) => a + b, 0) / captures.length) * 100 };
  }

  return { stats, breakEven, slices, worstDays, months, earlyClose, plan };
}

/** Slices with enough trades, split into what hurts and what helps relative to the overall win rate. */
export function rankSlices(slices: Slice[], overallWinRate: number) {
  const usable = slices.filter((s) => s.trades >= MIN_SAMPLE && s.winRate !== null);
  const worse = usable.filter((s) => (s.winRate as number) <= overallWinRate - 5).sort((a, b) => (a.winRate as number) - (b.winRate as number));
  const better = usable.filter((s) => (s.winRate as number) >= overallWinRate + 5).sort((a, b) => (b.winRate as number) - (a.winRate as number));
  return { worse, better };
}
