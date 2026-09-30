'use client';
import { addDays, differenceInCalendarDays, format, startOfWeek, subWeeks } from 'date-fns';
import { es } from 'date-fns/locale';
import Icon from '@/components/ui/Icon';
import { computeStats, filterTrades } from '@/lib/analytics';
import { toISODate } from '@/lib/dates';
import type { Trade } from '@/types';

/** Every value is null when it does not exist for the period (no trades, no losing trade...), never an invented 0. */
interface WeekStats {
  netProfit: number | null;
  totalTrades: number;
  winRate: number | null;
  profitFactor: number | null; // Infinity = no losses
  maxDrawdown: number | null;
  bestDay: number | null;
  worstDay: number | null; // only when there really was a losing day
  avgWin: number | null;
  avgLoss: number | null;
  wins: number;
  losses: number;
}

const iso = (d: Date) => toISODate(`${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`);

function computeWeekStats(trades: Trade[], start: Date, end: Date): WeekStats {
  const s = computeStats(filterTrades(trades, { from: iso(start), to: iso(end) }), {});
  const has = s.totalTrades > 0;
  return {
    netProfit: has ? s.pnl : null,
    totalTrades: s.totalTrades,
    winRate: s.wins + s.losses > 0 ? s.winRate : null,
    profitFactor: has && s.wins + s.losses > 0 ? s.profitFactor : null,
    maxDrawdown: has ? s.maxDrawdown.amount : null,
    bestDay: s.bestDay?.pnl ?? null,
    worstDay: s.worstDay && s.worstDay.pnl < 0 ? s.worstDay.pnl : null,
    avgWin: s.wins > 0 ? s.avgWin : null,
    avgLoss: s.losses > 0 ? s.avgLoss : null,
    wins: s.wins,
    losses: s.losses,
  };
}

type Better = 'higher' | 'lowerMagnitude' | 'neutral';
type Delta = 'pct' | 'pts';

interface MetricDef {
  icon: Parameters<typeof Icon>[0]['name'];
  label: string;
  format: (v: number) => string;
  better: Better;
  delta?: Delta;
}

const usd = (v: number) => `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const signedUsd = (v: number) => `${v >= 0 ? '+' : '-'}${usd(Math.abs(v))}`;

const metrics: { key: keyof WeekStats; def: MetricDef }[] = [
  { key: 'netProfit',    def: { icon: 'trend_up', label: 'Beneficio Neto',     format: signedUsd, better: 'higher' } },
  { key: 'totalTrades',  def: { icon: 'journal',  label: 'Trades Totales',     format: (v) => String(v), better: 'neutral' } },
  { key: 'winRate',      def: { icon: 'trophy',   label: 'Tasa de Victorias',  format: (v) => `${v.toFixed(2)}%`, better: 'higher', delta: 'pts' } },
  { key: 'profitFactor', def: { icon: 'layers',   label: 'Factor de Ganancia', format: (v) => (v === Infinity ? '∞' : v.toFixed(2)), better: 'higher' } },
  { key: 'maxDrawdown',  def: { icon: 'trend_dn', label: 'Reducción Máxima',   format: usd, better: 'lowerMagnitude' } },
  { key: 'bestDay',      def: { icon: 'trend_up', label: 'El Mejor Día',       format: signedUsd, better: 'higher' } },
  { key: 'worstDay',     def: { icon: 'trend_dn', label: 'El Peor Día',        format: signedUsd, better: 'lowerMagnitude' } },
  { key: 'avgWin',       def: { icon: 'trend_up', label: 'Ganancia Promedio',  format: usd, better: 'higher' } },
  { key: 'avgLoss',      def: { icon: 'trend_dn', label: 'Pérdida Promedio',   format: usd, better: 'lowerMagnitude' } },
];

/** Money figures read by sign: gains green, losses red, zero neutral. Counts and ratios keep the gold accent. */
const SIGNED: Partial<Record<keyof WeekStats, 'sign' | 'gain' | 'loss'>> = {
  netProfit: 'sign', bestDay: 'sign', worstDay: 'sign', avgWin: 'gain', avgLoss: 'loss', maxDrawdown: 'loss',
};
function valueColor(key: keyof WeekStats, v: number | null, fallback: string): string {
  const kind = SIGNED[key];
  if (v === null || !kind) return fallback;
  if (v === 0) return 'var(--txt3)';
  if (kind === 'gain') return 'var(--green)';
  if (kind === 'loss') return 'var(--red)';
  return v > 0 ? 'var(--green)' : 'var(--red)';
}

const badgeBase: React.CSSProperties = { padding: '4px 10px', borderRadius: 6, fontSize: 12, fontFamily: 'var(--mono)', textAlign: 'center', minWidth: 72 };
const dash = <div style={{ ...badgeBase, background: 'var(--bg4)', color: 'var(--txt3)' }}>—</div>;

function ChangeBadge({ anterior, actual, better, delta = 'pct' }: { anterior: number | null; actual: number | null; better: Better; delta?: Delta }) {
  // Nothing to compare (missing side, no-loss infinity, or a zero base for a percentage): show a dash, never a made-up number.
  if (anterior === null || actual === null || !Number.isFinite(anterior) || !Number.isFinite(actual)) return dash;
  if (Math.abs(actual - anterior) < 0.005) return dash;

  let change: number;
  let isGood: boolean;
  if (delta === 'pts') {
    change = actual - anterior;
  } else {
    // Magnitudes for loss-type metrics so "worse" always reads as a rise; |base| keeps the sign right when the base is negative.
    const a = better === 'lowerMagnitude' ? Math.abs(anterior) : anterior;
    const c = better === 'lowerMagnitude' ? Math.abs(actual) : actual;
    if (a === 0) return dash;
    change = ((c - a) / Math.abs(a)) * 100;
  }
  if (better === 'neutral') isGood = true;
  else if (better === 'higher') isGood = actual > anterior;
  else isGood = Math.abs(actual) < Math.abs(anterior);

  const neutral = better === 'neutral';
  const color = neutral ? 'var(--txt2)' : isGood ? 'var(--green)' : 'var(--red)';
  const bg = neutral ? 'var(--bg4)' : isGood ? 'var(--green-dim)' : 'var(--red-dim)';
  return (
    <div style={{ ...badgeBase, background: bg, color, fontWeight: 700 }}>
      {change >= 0 ? '+' : ''}{change.toFixed(0)}{delta === 'pts' ? ' pts' : '%'}
    </div>
  );
}

interface WeeklyPerformanceCardProps {
  trades: Trade[];
}

export default function WeeklyPerformanceCard({ trades }: WeeklyPerformanceCardProps) {
  const today = new Date();
  const weekOf = (d: Date) => startOfWeek(d, { weekStartsOn: 1 });

  // Current week = this calendar week; if it has no trades yet, the last week that does (so a loaded history is never ignored).
  const datedTrades = trades.map((t) => toISODate(t.date)).filter(Boolean).sort();
  const thisWeekHasTrades = trades.some((t) => { const d = toISODate(t.date); return d >= iso(weekOf(today)) && d <= iso(addDays(weekOf(today), 6)); });
  const lastIso = datedTrades[datedTrades.length - 1];
  const anchor = thisWeekHasTrades || !lastIso ? today : new Date(`${lastIso}T00:00:00`);
  const curStart = weekOf(anchor);
  const inProgress = thisWeekHasTrades || !lastIso;

  // Fair comparison: a week still in progress is compared with the same elapsed days of the previous week.
  const elapsed = inProgress ? Math.min(differenceInCalendarDays(today, curStart), 6) : 6;
  const curEnd = addDays(curStart, elapsed);
  const prevStart = subWeeks(curStart, 1);
  const prevEnd = addDays(prevStart, elapsed);

  const actual = computeWeekStats(trades, curStart, curEnd);
  const anterior = computeWeekStats(trades, prevStart, prevEnd);

  const range = (a: Date, b: Date) => `${format(a, 'd MMM', { locale: es })} – ${format(b, 'd MMM', { locale: es })}`;
  const comparable = actual.netProfit !== null && anterior.netProfit !== null;
  const netChange = comparable ? (actual.netProfit as number) - (anterior.netProfit as number) : 0;
  const same = !comparable || Math.abs(netChange) < 0.005;
  // Lower than last week is not a loss: it only turns red when the current week is itself negative.
  const up = !same && netChange > 0;
  const negative = (actual.netProfit ?? 0) < 0;
  const trendLabel = !comparable ? 'Sin datos para comparar' : same ? 'Igual que la semana anterior' : up ? 'Por encima de la semana anterior' : 'Por debajo de la semana anterior';
  const trendColor = !comparable || same ? 'var(--txt3)' : up ? 'var(--green)' : negative ? 'var(--red)' : 'var(--gold2)';
  const trendBg = !comparable || same ? 'var(--bg4)' : up ? 'var(--green-dim)' : negative ? 'var(--red-dim)' : 'var(--gold-dim)';

  const fmtSigned = (v: number | null) => (v === null ? '—' : signedUsd(v));
  const tone = (v: number | null) => (v === null || v === 0 ? 'var(--txt3)' : v > 0 ? 'var(--green)' : 'var(--red)');
  const partial = elapsed < 6;

  return (
    <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
        padding: 'var(--sp-4) var(--sp-5)', background: 'var(--bg3)', borderBottom: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold2)' }}>Rendimiento General</div>
          <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
            Semana {range(curStart, curEnd)} vs {range(prevStart, prevEnd)}{partial ? ' · mismos días de la semana, para comparar en igualdad' : ''}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: trendBg, color: trendColor, fontSize: 12, fontWeight: 700 }}>
          {comparable && !same && <Icon name={up ? 'trend_up' : 'trend_dn'} size={13} color={trendColor} />}
          {trendLabel}
        </div>
      </div>

      <div style={{ padding: 'var(--sp-2) var(--sp-5)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px 16px', alignItems: 'center', padding: '8px 0', fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid var(--border)' }}>
          <span />
          <span style={{ textAlign: 'right' }}>Semana anterior</span>
          <span style={{ textAlign: 'right' }}>{inProgress ? 'Esta semana' : 'Última semana'}</span>
          <span style={{ minWidth: 72, textAlign: 'center' }}>Cambio</span>
        </div>
        {metrics.map(({ key, def }) => {
          const aVal = anterior[key] as number | null;
          const cVal = actual[key] as number | null;
          const show = (v: number | null) => (v === null ? '—' : def.format(v));
          return (
            <div key={key} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px 16px', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--txt2)' }}>
                <Icon name={def.icon} size={13} color="var(--gold)" /> {def.label}
              </div>
              <span style={{ textAlign: 'right', fontSize: 12, opacity: 0.75, color: valueColor(key, aVal, 'var(--txt3)'), fontFamily: 'var(--mono)' }}>{show(aVal)}</span>
              <span style={{ textAlign: 'right', fontSize: 13, fontWeight: 600, color: valueColor(key, cVal, 'var(--gold2)'), fontFamily: 'var(--mono)' }}>{show(cVal)}</span>
              <ChangeBadge anterior={aVal} actual={cVal} better={def.better} delta={def.delta} />
            </div>
          );
        })}
        <p style={{ fontSize: 11, color: 'var(--txt3)', padding: 'var(--sp-3) 0 0', lineHeight: 1.5 }}>
          «—» significa que no hay dato en ese período (por ejemplo, sin operaciones perdedoras no existe «peor día» ni «pérdida promedio»).
          Factor de ganancia «∞»: ganancias sin ninguna pérdida. Todo en P&L neto (después de comisiones y swap).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, padding: 'var(--sp-4) var(--sp-5) var(--sp-5)' }}>
        <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Semana anterior · {range(prevStart, prevEnd)}</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--gold2)' }}>{anterior.wins} G / {anterior.losses} P</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, color: tone(anterior.netProfit) }}>{fmtSigned(anterior.netProfit)}</div>
        </div>
        <div style={{ background: 'var(--gold-dim)', border: '1px solid var(--gold-border)', borderRadius: 10, padding: '12px 16px' }}>
          <div style={{ fontSize: 10, color: 'var(--gold2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{inProgress ? 'Esta semana' : 'Última semana con trades'} · {range(curStart, curEnd)}</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--gold2)' }}>{actual.wins} G / {actual.losses} P</div>
          <div style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, color: tone(actual.netProfit) }}>{fmtSigned(actual.netProfit)}</div>
        </div>
      </div>
    </div>
  );
}
