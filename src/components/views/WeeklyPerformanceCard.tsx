'use client';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import Icon from '@/components/ui/Icon';
import { computeStats, filterTrades } from '@/lib/analytics';
import { toISODate } from '@/lib/dates';
import type { Trade } from '@/types';

interface WeekStats {
  netProfit: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  bestDay: number;
  worstDay: number;
  avgWin: number;
  avgLoss: number;
  wins: number;
  losses: number;
}

function computeWeekStats(trades: Trade[], start: Date, end: Date): WeekStats {
  const fromIso = toISODate(`${start.getFullYear()}-${start.getMonth() + 1}-${start.getDate()}`);
  const toIso = toISODate(`${end.getFullYear()}-${end.getMonth() + 1}-${end.getDate()}`);
  const s = computeStats(filterTrades(trades, { from: fromIso, to: toIso }), {});
  return {
    netProfit: s.pnl,
    totalTrades: s.totalTrades,
    winRate: s.winRate,
    // The card caps the profit factor at 100 when there are no losses, so the comparison stays numeric.
    profitFactor: s.profitFactor === Infinity ? 100 : s.profitFactor,
    maxDrawdown: s.maxDrawdown.amount,
    bestDay: s.bestDay?.pnl ?? 0,
    worstDay: s.worstDay?.pnl ?? 0,
    avgWin: s.avgWin,
    avgLoss: s.avgLoss,
    wins: s.wins,
    losses: s.losses,
  };
}

type Better = 'higher' | 'lowerMagnitude' | 'neutral';

interface MetricDef {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  format: (v: number) => string;
  better: Better;
}

const metrics: { key: keyof WeekStats; def: MetricDef }[] = [
  { key: 'netProfit',    def: { icon: 'trend_up', label: 'Beneficio Neto',      format: (v) => `${v >= 0 ? '+' : '-'}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, better: 'higher' } },
  { key: 'totalTrades',  def: { icon: 'journal',  label: 'Trades Totales',      format: (v) => String(v), better: 'neutral' } },
  { key: 'winRate',      def: { icon: 'trophy',   label: 'Tasa de Victorias',   format: (v) => `${v.toFixed(2)}%`, better: 'higher' } },
  { key: 'profitFactor', def: { icon: 'layers',   label: 'Factor de Ganancia',  format: (v) => v.toFixed(2), better: 'higher' } },
  { key: 'maxDrawdown',  def: { icon: 'trend_dn', label: 'Reducción Máxima',    format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, better: 'lowerMagnitude' } },
  { key: 'bestDay',      def: { icon: 'trend_up', label: 'El Mejor Día',        format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, better: 'higher' } },
  { key: 'worstDay',     def: { icon: 'trend_dn', label: 'El Peor Día',         format: (v) => `${v >= 0 ? '' : '-'}$${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, better: 'lowerMagnitude' } },
  { key: 'avgWin',       def: { icon: 'trend_up', label: 'Ganancia Promedio',   format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, better: 'higher' } },
  { key: 'avgLoss',      def: { icon: 'trend_dn', label: 'Pérdida Promedio',    format: (v) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, better: 'lowerMagnitude' } },
];

function ChangeBadge({ anterior, actual, better }: { anterior: number; actual: number; better: Better }) {
  if (Math.abs(actual - anterior) < 0.005) {
    return (
      <div style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--bg4)', color: 'var(--txt3)', fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'center', minWidth: 62 }}>
        —
      </div>
    );
  }
  const pct = anterior !== 0 ? ((actual - anterior) / anterior) * 100 : 100;
  let isGood: boolean;
  if (better === 'neutral') isGood = pct >= 0;
  else if (better === 'higher') isGood = actual > anterior;
  else isGood = Math.abs(actual) < Math.abs(anterior);

  const color = better === 'neutral' ? 'var(--txt2)' : (isGood ? 'var(--green)' : 'var(--red)');
  const bg = better === 'neutral' ? 'var(--bg4)' : (isGood ? 'var(--green-dim)' : 'var(--red-dim)');

  return (
    <div style={{ padding: '4px 10px', borderRadius: 6, background: bg, color, fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', textAlign: 'center', minWidth: 62 }}>
      {pct >= 0 ? '+' : ''}{pct.toFixed(0)}%
    </div>
  );
}

interface WeeklyPerformanceCardProps {
  trades: Trade[];
}

export default function WeeklyPerformanceCard({ trades }: WeeklyPerformanceCardProps) {
  const now = new Date();
  const curStart = startOfWeek(now, { weekStartsOn: 1 });
  const curEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
  const prevEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });

  const actual = computeWeekStats(trades, curStart, curEnd);
  const anterior = computeWeekStats(trades, prevStart, prevEnd);

  const netChange = actual.netProfit - anterior.netProfit;
  const trendLabel = Math.abs(netChange) < 0.005 ? 'Estable' : netChange > 0 ? 'Mejorando' : 'Declinante';
  const trendColor = Math.abs(netChange) < 0.005 ? 'var(--txt3)' : netChange > 0 ? 'var(--green)' : 'var(--red)';
  const trendBg = Math.abs(netChange) < 0.005 ? 'var(--bg4)' : netChange > 0 ? 'var(--green-dim)' : 'var(--red-dim)';

  const fmtSigned = (v: number) => `${v >= 0 ? '+$' : '-$'}${Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: 'var(--sp-4) var(--sp-5)', background: netChange < 0 ? 'rgba(239,68,68,0.08)' : netChange > 0 ? 'rgba(34,197,94,0.08)' : 'var(--bg3)',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>Rendimiento General</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: trendBg, color: trendColor, fontSize: 12, fontWeight: 700 }}>
          <Icon name={netChange > 0 ? 'trend_up' : 'trend_dn'} size={13} color={trendColor} />
          {trendLabel}
        </div>
      </div>

      <div style={{ padding: 'var(--sp-2) var(--sp-5)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px 16px', alignItems: 'center', padding: '8px 0', fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
          <span />
          <span style={{ textAlign: 'right' }}>Anterior</span>
          <span style={{ textAlign: 'right' }}>Actual</span>
          <span />
        </div>
        {metrics.map(({ key, def }) => {
          const aVal = anterior[key];
          const cVal = actual[key];
          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px 16px', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--txt2)' }}>
                <Icon name={def.icon} size={13} color="var(--gold)" /> {def.label}
              </div>
              <span style={{ textAlign: 'right', fontSize: 12, color: 'var(--txt3)', fontFamily: 'var(--mono)' }}>{def.format(aVal)}</span>
              <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: 'var(--txt)', fontFamily: 'var(--mono)' }}>{def.format(cVal)}</span>
              <ChangeBadge anterior={aVal} actual={cVal} better={def.better} />
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 'var(--sp-4) var(--sp-5) var(--sp-5)' }}>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>La Semana Pasada</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{anterior.wins} G / {anterior.losses} P</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, color: anterior.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtSigned(anterior.netProfit)}</div>
        </div>
        <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Esta Semana</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{actual.wins} G / {actual.losses} P</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, color: actual.netProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtSigned(actual.netProfit)}</div>
        </div>
      </div>
    </div>
  );
}
