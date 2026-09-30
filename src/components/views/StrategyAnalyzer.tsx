'use client';
import { useMemo, useState, useId } from 'react';
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';
import { netPnl, outcomeOf, totalCosts } from '@/lib/analytics';
import type { Trade } from '@/types';

type PeriodMode = 'Diario' | 'Semanal' | 'Mensual' | 'Anual';
type LongShort = 'Todos' | 'Compra' | 'Venta';
type WLFilter = 'Todos' | 'Ganadoras' | 'Perdedoras';
type TimeBase = 'Hora de Salida' | 'Hora de Entrada';
type Display = '$' | '%';
type GraphMetric = 'netProfit' | 'drawdown' | 'trades';

interface StrategyAnalyzerProps {
  trades: Trade[];
  initialBalance: number;
}

interface Row {
  label: string;
  count: number;
  netProfit: number;
  cumNetProfit: number;
  grossProfit: number;
  grossLoss: number;
  commission: number;
  cumDrawdown: number;
  winRate: number;
  avgTrade: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  maxWinStreak: number;
  maxLossStreak: number;
  pctOfTrades: number;
}

const net = netPnl;

function bucketFor(date: Date, mode: PeriodMode): { key: string; label: string; sortDate: Date } {
  if (mode === 'Semanal') {
    const d = startOfWeek(date, { weekStartsOn: 1 });
    return { key: format(d, 'RRRR-II'), label: format(d, 'M/d/yy'), sortDate: d };
  }
  if (mode === 'Mensual') {
    const d = startOfMonth(date);
    return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM yyyy'), sortDate: d };
  }
  if (mode === 'Anual') {
    const d = startOfYear(date);
    return { key: format(d, 'yyyy'), label: format(d, 'yyyy'), sortDate: d };
  }
  const d = startOfDay(date);
  return { key: format(d, 'yyyy-MM-dd'), label: format(d, 'M/d/yy'), sortDate: d };
}

const selStyle: React.CSSProperties = {
  padding: '6px 10px', background: 'var(--bg4)', border: '1px solid var(--border2)',
  borderRadius: 6, color: 'var(--txt)', fontSize: 11, outline: 'none', cursor: 'pointer',
  fontFamily: 'var(--mono)',
};

function FilterField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <span style={{ fontSize: 9, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={selStyle}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function AnalyzerChart({ rows, metric }: { rows: Row[]; metric: GraphMetric }) {
  const uid = useId().replace(/:/g, '');
  const W = 900, H = 220;
  const pad = { t: 16, r: 16, b: 34, l: 60 };

  const values = rows.map((r) => metric === 'netProfit' ? r.cumNetProfit : metric === 'drawdown' ? -r.cumDrawdown : r.count);
  const safe = values.length > 0 ? values : [0];
  const minRaw = Math.min(0, ...safe);
  const maxRaw = Math.max(0, ...safe);
  const range = Math.max(maxRaw - minRaw, 1);
  const pad10 = range * 0.1;
  const min = minRaw - pad10;
  const max = maxRaw + pad10;
  const span = max - min || 1;

  const denom = Math.max(1, safe.length - 1);
  const pts = safe.map((v, i) => ({
    x: pad.l + (i * (W - pad.l - pad.r)) / denom,
    y: pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b),
  }));

  const zeroY = pad.t + (1 - (0 - min) / span) * (H - pad.t - pad.b);

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = pts.length > 1
    ? `${linePath} L${pts[pts.length - 1].x},${zeroY} L${pts[0].x},${zeroY} Z`
    : '';

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => min + (span * i) / yTicks);

  const fmtY = (v: number) => {
    if (metric === 'trades') return v.toFixed(0);
    if (metric === 'drawdown') return `${(-v).toFixed(1)}%`;
    return Math.abs(v) >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;
  };

  const labelStep = Math.max(1, Math.ceil(rows.length / 10));

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={`analyzerFillGold-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a227" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#c9a227" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`analyzerFillRed-${uid}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0.04" />
        </linearGradient>
        {/* Splits the area/line into a profit half (above the zero line) and a loss half (below it). */}
        <clipPath id={`clipAbove-${uid}`}><rect x="0" y="0" width={W} height={Math.max(zeroY, 0)} /></clipPath>
        <clipPath id={`clipBelow-${uid}`}><rect x="0" y={zeroY} width={W} height={Math.max(H - zeroY, 0)} /></clipPath>
      </defs>

      {yLabels.map((v, i) => {
        const y = pad.t + (1 - (v - min) / span) * (H - pad.t - pad.b);
        return (
          <g key={i}>
            <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#252528" strokeWidth="1" strokeDasharray="4,6" />
            <text x={pad.l - 8} y={y + 3} fill="#5a5450" fontSize="9" textAnchor="end" fontFamily="JetBrains Mono">{fmtY(v)}</text>
          </g>
        );
      })}

      {areaPath && (
        <>
          <path d={areaPath} fill={`url(#analyzerFillGold-${uid})`} clipPath={`url(#clipAbove-${uid})`} />
          <path d={areaPath} fill={`url(#analyzerFillRed-${uid})`} clipPath={`url(#clipBelow-${uid})`} />
        </>
      )}
      {pts.length > 1 && (
        <>
          <path d={linePath} fill="none" stroke="#c9a227" strokeWidth="1.8" clipPath={`url(#clipAbove-${uid})`} />
          <path d={linePath} fill="none" stroke="#ef4444" strokeWidth="1.8" clipPath={`url(#clipBelow-${uid})`} />
        </>
      )}

      {rows.map((r, i) => (
        i % labelStep === 0 ? (
          <text key={i} x={pts[i].x} y={H - pad.b + 16} fill="#5a5450" fontSize="8.5" textAnchor="middle" fontFamily="JetBrains Mono">
            {r.label}
          </text>
        ) : null
      ))}
    </svg>
  );
}

export default function StrategyAnalyzer({ trades, initialBalance }: StrategyAnalyzerProps) {
  const [period, setPeriod] = useState<PeriodMode>('Diario');
  const [longShort, setLongShort] = useState<LongShort>('Todos');
  const [wl, setWl] = useState<WLFilter>('Todos');
  const [timeBase, setTimeBase] = useState<TimeBase>('Hora de Salida');
  const [display, setDisplay] = useState<Display>('$');
  const [graphMetric, setGraphMetric] = useState<GraphMetric>('netProfit');

  void timeBase; // reserved: entry/exit time base parity — this journal stores a single trade date

  const filtered = useMemo(() => trades.filter((t) => {
    if (longShort === 'Compra' && t.type !== 'Buy') return false;
    if (longShort === 'Venta' && t.type !== 'Sell') return false;
    const n = net(t);
    if (wl === 'Ganadoras' && outcomeOf(n) !== 'win') return false;
    if (wl === 'Perdedoras' && outcomeOf(n) !== 'loss') return false;
    return true;
  }), [trades, longShort, wl]);

  const rows = useMemo<Row[]>(() => {
    const groups = new Map<string, { label: string; sortDate: Date; trades: Trade[] }>();
    for (const t of filtered) {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) continue;
      const { key, label, sortDate } = bucketFor(d, period);
      if (!groups.has(key)) groups.set(key, { label, sortDate, trades: [] });
      groups.get(key)!.trades.push(t);
    }
    const sortedGroups = [...groups.values()].sort((a, b) => a.sortDate.getTime() - b.sortDate.getTime());

    let cumNet = 0;
    let peak = initialBalance;
    let equity = initialBalance;
    const totalCount = filtered.length || 1;

    return sortedGroups.map((g): Row => {
      const nets = g.trades.map(net);
      const wins = nets.filter((n) => outcomeOf(n) === 'win');
      const losses = nets.filter((n) => outcomeOf(n) === 'loss');
      const grossProfit = wins.reduce((s, n) => s + n, 0);
      const grossLoss = losses.reduce((s, n) => s + n, 0);
      const commission = g.trades.reduce((s, t) => s + totalCosts(t), 0);
      const periodNet = nets.reduce((a, n) => a + n, 0);
      cumNet += periodNet;
      equity += periodNet;
      if (equity > peak) peak = equity;
      const cumDrawdown = peak > 0 ? ((peak - equity) / peak) * 100 : 0;

      const chrono = [...g.trades].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let curW = 0, curL = 0, maxW = 0, maxL = 0;
      for (const t of chrono) {
        const o = outcomeOf(net(t));
        if (o === 'win') { curW++; curL = 0; } else if (o === 'loss') { curL++; curW = 0; }
        maxW = Math.max(maxW, curW);
        maxL = Math.max(maxL, curL);
      }

      return {
        label: g.label,
        count: g.trades.length,
        netProfit: periodNet,
        cumNetProfit: cumNet,
        grossProfit,
        grossLoss,
        commission,
        cumDrawdown,
        winRate: wins.length + losses.length ? (wins.length / (wins.length + losses.length)) * 100 : 0,
        avgTrade: periodNet / g.trades.length,
        avgWin: wins.length ? grossProfit / wins.length : 0,
        avgLoss: losses.length ? grossLoss / losses.length : 0,
        largestWin: wins.length ? Math.max(...wins) : 0,
        largestLoss: losses.length ? Math.min(...losses) : 0,
        maxWinStreak: maxW,
        maxLossStreak: maxL,
        pctOfTrades: (g.trades.length / totalCount) * 100,
      };
    });
  }, [filtered, period, initialBalance]);

  const fmtMoney = (v: number) => {
    const value = display === '%' ? (v / initialBalance) * 100 : v;
    const abs = Math.abs(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const text = display === '%' ? `${abs}%` : `$${abs}`;
    return v < 0 ? `(${text})` : text;
  };

  const totalRow = useMemo(() => {
    if (rows.length === 0) return null;
    const last = rows[rows.length - 1];
    return {
      count: filtered.length,
      cumNetProfit: last.cumNetProfit,
      grossProfit: rows.reduce((s, r) => s + r.grossProfit, 0),
      grossLoss: rows.reduce((s, r) => s + r.grossLoss, 0),
      commission: rows.reduce((s, r) => s + r.commission, 0),
      cumDrawdown: Math.max(...rows.map((r) => r.cumDrawdown)),
      winRate: (() => { const w = filtered.filter((t) => outcomeOf(net(t)) === 'win').length; const l = filtered.filter((t) => outcomeOf(net(t)) === 'loss').length; return w + l ? (w / (w + l)) * 100 : 0; })(),
    };
  }, [rows, filtered]);

  const columns: { key: keyof Row; label: string; render: (r: Row) => string; color?: (r: Row) => string }[] = [
    { key: 'count', label: '#', render: (r) => String(r.count) },
    { key: 'cumNetProfit', label: 'Ganancia Neta Acum.', render: (r) => fmtMoney(r.cumNetProfit), color: (r) => r.cumNetProfit >= 0 ? 'var(--green)' : 'var(--red)' },
    { key: 'grossProfit', label: 'Ganancia Bruta', render: (r) => fmtMoney(r.grossProfit), color: () => 'var(--green)' },
    { key: 'grossLoss', label: 'Pérdida Bruta', render: (r) => fmtMoney(r.grossLoss), color: () => 'var(--red)' },
    { key: 'commission', label: 'Comisión', render: (r) => fmtMoney(r.commission) },
    { key: 'cumDrawdown', label: 'Máx. Reducción Acum.', render: (r) => `${r.cumDrawdown.toFixed(2)}%`, color: () => 'var(--red)' },
    { key: 'winRate', label: '% Ganadas', render: (r) => `${r.winRate.toFixed(1)}%` },
    { key: 'avgTrade', label: 'Trade Prom.', render: (r) => fmtMoney(r.avgTrade), color: (r) => r.avgTrade >= 0 ? 'var(--green)' : 'var(--red)' },
    { key: 'avgWin', label: 'Ganancia Prom.', render: (r) => fmtMoney(r.avgWin), color: () => 'var(--green)' },
    { key: 'avgLoss', label: 'Pérdida Prom.', render: (r) => fmtMoney(r.avgLoss), color: () => 'var(--red)' },
    { key: 'largestWin', label: 'Mayor Ganancia', render: (r) => fmtMoney(r.largestWin), color: () => 'var(--green)' },
    { key: 'largestLoss', label: 'Mayor Pérdida', render: (r) => fmtMoney(r.largestLoss), color: () => 'var(--red)' },
    { key: 'maxWinStreak', label: 'Racha Ganadora Máx.', render: (r) => String(r.maxWinStreak) },
    { key: 'maxLossStreak', label: 'Racha Perdedora Máx.', render: (r) => String(r.maxLossStreak) },
    { key: 'pctOfTrades', label: '% Trades', render: (r) => `${r.pctOfTrades.toFixed(1)}%` },
  ];

  const th: React.CSSProperties = {
    padding: '12px 16px', textAlign: 'right', fontSize: 10, fontWeight: 600,
    color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.03em',
    whiteSpace: 'nowrap', borderBottom: '1px solid var(--border2)',
    position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1,
  };
  const td: React.CSSProperties = {
    padding: '11px 16px', textAlign: 'right', fontSize: 12,
    fontFamily: 'var(--mono)', whiteSpace: 'nowrap', color: 'var(--txt)',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', height: '100%', minHeight: 0 }}>
      {/* Filter bar */}
      <div className="fade-up" style={{
        background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)',
        padding: 'var(--sp-4) var(--sp-5)', display: 'flex', gap: 'var(--sp-5)', flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        <FilterField label="Mostrar" value={display === '$' ? 'Análisis $' : 'Análisis %'} options={['Análisis $', 'Análisis %']} onChange={(v) => setDisplay(v.includes('%') ? '%' : '$')} />
        <FilterField label="Período" value={period} options={['Diario', 'Semanal', 'Mensual', 'Anual']} onChange={(v) => setPeriod(v as PeriodMode)} />
        <FilterField label="Compra/Venta" value={longShort} options={['Todos', 'Compra', 'Venta']} onChange={(v) => setLongShort(v as LongShort)} />
        <FilterField label="G/P" value={wl} options={['Todos', 'Ganadoras', 'Perdedoras']} onChange={(v) => setWl(v as WLFilter)} />
        <FilterField label="Base de Tiempo" value={timeBase} options={['Hora de Salida', 'Hora de Entrada']} onChange={(v) => setTimeBase(v as TimeBase)} />
        <div style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--mono)' }}>
          {filtered.length} trades · {rows.length} períodos
        </div>
      </div>

      {/* Table */}
      <div className="fade-up" style={{
        background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)',
        flex: '1 1 auto', minHeight: 140, overflow: 'auto', animationDelay: '60ms',
      }}>
        {rows.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--txt3)', fontSize: 13 }}>
            Sin trades para los filtros seleccionados.
          </div>
        ) : (
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 1100 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: 'left', position: 'sticky', left: 0, background: 'var(--bg3)', zIndex: 2 }}>Período</th>
                {columns.map((c) => <th key={c.key} style={th}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'var(--bg3)' }}>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 600, position: 'sticky', left: 0, background: i % 2 === 0 ? 'var(--bg2)' : 'var(--bg3)' }}>{r.label}</td>
                  {columns.map((c) => (
                    <td key={c.key} style={{ ...td, color: c.color ? c.color(r) : 'var(--txt)' }}>{c.render(r)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
            {totalRow && (
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border2)' }}>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: 'var(--gold2)', position: 'sticky', left: 0, background: 'var(--bg2)' }}>Total</td>
                  <td style={{ ...td, fontWeight: 700 }}>{totalRow.count}</td>
                  <td style={{ ...td, fontWeight: 700, color: totalRow.cumNetProfit >= 0 ? 'var(--green)' : 'var(--red)' }}>{fmtMoney(totalRow.cumNetProfit)}</td>
                  <td style={{ ...td, fontWeight: 700, color: 'var(--green)' }}>{fmtMoney(totalRow.grossProfit)}</td>
                  <td style={{ ...td, fontWeight: 700, color: 'var(--red)' }}>{fmtMoney(totalRow.grossLoss)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmtMoney(totalRow.commission)}</td>
                  <td style={{ ...td, fontWeight: 700, color: 'var(--red)' }}>{totalRow.cumDrawdown.toFixed(2)}%</td>
                  <td style={{ ...td, fontWeight: 700 }}>{totalRow.winRate.toFixed(1)}%</td>
                  <td style={td} colSpan={7} />
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      {/* Graph */}
      <div className="fade-up" style={{
        background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)',
        padding: 'var(--sp-5)', flexShrink: 0, animationDelay: '100ms',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt2)' }}>Gráfico</span>
          <select value={graphMetric} onChange={(e) => setGraphMetric(e.target.value as GraphMetric)} style={selStyle}>
            <option value="netProfit">Ganancia Neta Acumulada</option>
            <option value="drawdown">Reducción Máxima Acumulada</option>
            <option value="trades">Trades por Período</option>
          </select>
        </div>
        <AnalyzerChart rows={rows} metric={graphMetric} />
      </div>
    </div>
  );
}
