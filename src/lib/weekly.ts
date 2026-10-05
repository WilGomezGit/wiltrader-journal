import { netPnl, tradeOutcome } from '@/lib/analytics';
import { toISODate, weekStartISO } from '@/lib/dates';
import type { Trade } from '@/types';

const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface WeekDay {
  iso: string;
  name: string;
  /** Net result of the day, null when there were no trades. */
  pnl: number | null;
  trades: number;
  /** Still to come (after today). */
  upcoming: boolean;
}

export interface WeekSummary {
  start: string; // Monday
  end: string; // Sunday
  days: WeekDay[];
  pnl: number;
  trades: number;
  wins: number;
  losses: number;
  /** Trade-level win rate, break-evens excluded; null with no decided trades. */
  winRate: number | null;
  winDays: number;
  lossDays: number;
  breakevenDays: number;
  /** Days without trades that already passed (today still counts as open). */
  noTradeDays: number;
}

const addDays = (iso: string, n: number) => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
};

/**
 * One summary per calendar week (Monday to Sunday) that has trades, plus the current week, oldest first.
 * Everything is derived from the trades on each call, so weeks accumulate by themselves as trades are added.
 * Saturday and Sunday are only listed when they have trades.
 */
export function summarizeWeeks(trades: Trade[], todayIso: string): WeekSummary[] {
  const byWeek = new Map<string, Trade[]>();
  for (const t of trades) {
    const iso = toISODate(t.date);
    if (!iso) continue;
    const k = weekStartISO(iso);
    byWeek.set(k, [...(byWeek.get(k) ?? []), t]);
  }
  const currentWeek = weekStartISO(todayIso);
  if (!byWeek.has(currentWeek)) byWeek.set(currentWeek, []);

  return [...byWeek.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([start, weekTrades]) => {
    const days: WeekDay[] = DAY_NAMES.map((name, i) => {
      const iso = addDays(start, i);
      const dayTrades = weekTrades.filter((t) => toISODate(t.date) === iso);
      return { iso, name, trades: dayTrades.length, pnl: dayTrades.length ? dayTrades.reduce((s, t) => s + netPnl(t), 0) : null, upcoming: iso > todayIso };
    }).filter((d, i) => i < 5 || d.trades > 0);

    const outcomes = weekTrades.map((t) => tradeOutcome(t));
    const wins = outcomes.filter((o) => o === 'win').length;
    const losses = outcomes.filter((o) => o === 'loss').length;
    const dayOutcome = (d: WeekDay) => (d.pnl === null ? null : d.pnl > 0.005 ? 'win' : d.pnl < -0.005 ? 'loss' : 'be');
    return {
      start,
      end: addDays(start, 6),
      days,
      pnl: weekTrades.reduce((s, t) => s + netPnl(t), 0),
      trades: weekTrades.length,
      wins,
      losses,
      winRate: wins + losses > 0 ? (wins / (wins + losses)) * 100 : null,
      winDays: days.filter((d) => dayOutcome(d) === 'win').length,
      lossDays: days.filter((d) => dayOutcome(d) === 'loss').length,
      breakevenDays: days.filter((d) => dayOutcome(d) === 'be').length,
      noTradeDays: days.filter((d) => d.pnl === null && d.iso < todayIso).length,
    };
  });
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** "3 días ganadores, 2 perdedores y 1 sin trades". */
export function weekSentence(w: WeekSummary): string {
  const parts = [plural(w.winDays, 'día ganador', 'días ganadores'), plural(w.lossDays, 'perdedor', 'perdedores')];
  if (w.breakevenDays > 0) parts.push(`${w.breakevenDays} en equilibrio`);
  if (w.noTradeDays > 0) parts.push(`${w.noTradeDays} sin trades`);
  return parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`;
}
