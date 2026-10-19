'use client';
import { Card, Stat } from '@/components/ui/kit';
import { money, pct, profitFactor, signedMoney, tone } from '@/lib/format';
import type { Stats } from '@/lib/analytics';

/** Big, easy-to-read record of the journal: total trades, wins, losses and the stats derived from them. */
export default function TradeRecord({ stats }: { stats: Stats }) {
  const total = stats.totalTrades;
  const has = total > 0;
  // Bar widths use all trades so break-even trades are visible too.
  const w = (n: number) => (total ? (n / total) * 100 : 0);

  const big = [
    { label: 'Trades', value: total, color: 'var(--gold2)' },
    { label: 'Ganados', value: stats.wins, color: 'var(--green)' },
    { label: 'Perdidos', value: stats.losses, color: 'var(--red)' },
    ...(stats.breakeven > 0 ? [{ label: 'Break-even', value: stats.breakeven, color: 'var(--txt2)' }] : []),
  ];

  const streak = stats.currentStreak;

  return (
    <Card title="Récord de operaciones" subtitle={has ? `${total} trades, ${stats.losses} perdidos y ${stats.wins} ganados` : 'Registra operaciones para ver tus estadísticas'} style={{ flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        {big.map((b) => (
          <div key={b.label} style={{ flex: '1 1 110px', background: 'var(--bg4)', borderRadius: 10, padding: 'var(--sp-4)', textAlign: 'center' }}>
            <div style={{ fontSize: 34, fontWeight: 800, fontFamily: 'var(--mono)', lineHeight: 1.1, color: b.color }}>{b.value}</div>
            <div style={{ fontSize: 11, color: 'var(--txt3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 6 }}>{b.label}</div>
          </div>
        ))}
      </div>

      {has && (
        <div style={{ margin: 'var(--sp-4) 0' }}>
          <div style={{ display: 'flex', height: 12, borderRadius: 12, overflow: 'hidden', background: 'var(--bg4)' }} role="img"
            aria-label={`${stats.wins} ganados, ${stats.losses} perdidos, ${stats.breakeven} break-even`}>
            <div style={{ width: `${w(stats.wins)}%`, background: 'var(--green)' }} />
            <div style={{ width: `${w(stats.breakeven)}%`, background: 'var(--txt3)' }} />
            <div style={{ width: `${w(stats.losses)}%`, background: 'var(--red)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6 }}>
            <span style={{ color: 'var(--green)' }}>Ganados {pct(w(stats.wins))}</span>
            <span style={{ color: 'var(--red)' }}>Perdidos {pct(w(stats.losses))}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 'var(--sp-4)', marginTop: 'var(--sp-4)' }}>
        <Stat label="Tasa de victorias" value={has ? pct(stats.winRate) : '—'} color={has ? tone(stats.winRate - 50) : undefined} />
        <Stat label="P&L neto" value={has ? signedMoney(stats.pnl) : '—'} color={tone(stats.pnl)} />
        <Stat label="Ganancia promedio" value={stats.wins ? signedMoney(stats.avgWin) : '—'} color="var(--green)" />
        <Stat label="Pérdida promedio" value={stats.losses ? `-${money(stats.avgLoss)}` : '—'} color="var(--red)" />
        <Stat label="Ratio G/P" value={stats.payoff === null ? '—' : stats.payoff.toFixed(2)} sub="ganancia prom. / pérdida prom." />
        <Stat label="Factor de ganancia" value={profitFactor(stats.profitFactor, has)} />
        <Stat label="Expectativa" value={has ? signedMoney(stats.expectancy) : '—'} color={tone(stats.expectancy)} sub="por trade" />
        <Stat label="Mejor / peor trade" value={has ? `${signedMoney(stats.bestTrade, 0)} / ${signedMoney(stats.worstTrade, 0)}` : '—'} />
        <Stat label="Mejor racha ganadora" value={`${stats.maxWinStreak} seguidos`} color="var(--green)" />
        <Stat label="Peor racha perdedora" value={`${stats.maxLossStreak} seguidos`} color="var(--red)" />
        <Stat label="Racha actual" value={streak.type ? `${streak.count} ${streak.type === 'win' ? 'ganados' : 'perdidos'}` : '—'} color={streak.type === 'win' ? 'var(--green)' : streak.type === 'loss' ? 'var(--red)' : undefined} />
        <Stat label="Días operados" value={has ? `${stats.daysTraded}` : '—'} sub={has ? `${stats.daysPositive} verdes · ${stats.daysNegative} rojos` : undefined} />
      </div>
    </Card>
  );
}
