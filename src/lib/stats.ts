import type { Trade, Stats } from '@/types';

export function computeStats(trades: Trade[], initialBalance: number): Stats {
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const wins = trades.filter((t) => t.status === 'Win');
  const losses = trades.filter((t) => t.status === 'Loss');

  const totalPL = trades.reduce((s, t) => s + t.result, 0);
  const totalPLCOP = trades.reduce((s, t) => s + t.cop, 0);
  const totalBalance = initialBalance + totalPL;
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.result, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + t.result, 0) / losses.length) : 0;
  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;

  const bestTrade = trades.length > 0 ? Math.max(...trades.map((t) => t.result)) : 0;
  const worstTrade = trades.length > 0 ? Math.min(...trades.map((t) => t.result)) : 0;
  const expectancy = trades.length > 0 ? totalPL / trades.length : 0;

  // Equity curve
  let equity = initialBalance;
  const equityCurve = [equity, ...sorted.map((t) => {
    equity += t.result;
    return equity;
  })];

  // Drawdown
  let peak = initialBalance;
  let maxDD = 0;
  for (const val of equityCurve) {
    if (val > peak) peak = val;
    const dd = ((peak - val) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  const currentDD = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

  // Streaks
  let winStreak = 0, lossStreak = 0, curW = 0, curL = 0;
  for (const t of sorted) {
    if (t.status === 'Win') { curW++; curL = 0; if (curW > winStreak) winStreak = curW; }
    else { curL++; curW = 0; if (curL > lossStreak) lossStreak = curL; }
  }

  // Sharpe (simplified)
  const returns = sorted.map((t) => t.result / initialBalance);
  const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance = returns.length > 1
    ? returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    : 0;
  const sharpeRatio = variance > 0 ? (avgReturn / Math.sqrt(variance)) * Math.sqrt(252) : 0;

  return {
    totalBalance,
    totalPL,
    totalPLCOP,
    winRate,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    bestTrade,
    worstTrade,
    avgWin,
    avgLoss,
    profitFactor,
    maxDrawdown: maxDD,
    currentDrawdown: currentDD,
    expectancy,
    sharpeRatio,
    winStreak,
    lossStreak,
    equityCurve,
  };
}
