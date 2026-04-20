import type { Trade, Stats } from '@/types';

const net = (t: Trade) => t.result - (t.commission || 0);

export function computeStats(trades: Trade[], initialBalance: number): Stats {
  const sorted = [...trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const wins   = trades.filter((t) => net(t) >= 0);
  const losses = trades.filter((t) => net(t) < 0);

  const totalPL      = trades.reduce((s, t) => s + net(t), 0);
  const totalPLCOP   = trades.reduce((s, t) => s + t.cop, 0);
  const totalBalance = initialBalance + totalPL;
  const winRate      = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const avgWin  = wins.length   > 0 ? wins.reduce((s, t)   => s + net(t), 0) / wins.length   : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + net(t), 0) / losses.length) : 0;

  const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : 0;
  const bestTrade    = trades.length > 0 ? Math.max(...trades.map(net)) : 0;
  const worstTrade   = trades.length > 0 ? Math.min(...trades.map(net)) : 0;

  const winRate100  = winRate / 100;
  const lossRate100 = 1 - winRate100;
  const expectancy  = trades.length > 0 ? (winRate100 * avgWin) - (lossRate100 * avgLoss) : 0;

  // Equity curve using net result
  let equity = initialBalance;
  const equityCurve = [equity, ...sorted.map((t) => {
    equity += net(t);
    return equity;
  })];

  // Drawdown
  let peak = initialBalance, maxDD = 0;
  for (const val of equityCurve) {
    if (val > peak) peak = val;
    const dd = ((peak - val) / peak) * 100;
    if (dd > maxDD) maxDD = dd;
  }
  const currentDD = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

  // Streaks (based on net)
  let winStreak = 0, lossStreak = 0, curW = 0, curL = 0;
  for (const t of sorted) {
    if (net(t) >= 0) { curW++; curL = 0; if (curW > winStreak) winStreak = curW; }
    else             { curL++; curW = 0; if (curL > lossStreak) lossStreak = curL; }
  }

  // Sharpe (simplified, based on net)
  const returns   = sorted.map((t) => net(t) / initialBalance);
  const avgReturn = returns.length > 0 ? returns.reduce((s, r) => s + r, 0) / returns.length : 0;
  const variance  = returns.length > 1
    ? returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    : 0;
  const sharpeRatio = variance > 0 ? (avgReturn / Math.sqrt(variance)) * Math.sqrt(252) : 0;

  return {
    totalBalance, totalPL, totalPLCOP,
    winRate, totalTrades: trades.length,
    wins: wins.length, losses: losses.length,
    bestTrade, worstTrade, avgWin, avgLoss,
    profitFactor, maxDrawdown: maxDD, currentDrawdown: currentDD,
    expectancy, sharpeRatio, winStreak, lossStreak, equityCurve,
  };
}
