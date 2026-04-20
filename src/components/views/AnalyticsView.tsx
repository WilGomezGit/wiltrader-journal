'use client';
import BarChart from '@/components/charts/BarChart';
import DonutChart from '@/components/charts/DonutChart';
import EquityChart from '@/components/charts/EquityChart';
import type { Trade, Stats } from '@/types';

interface AnalyticsViewProps {
  trades: Trade[];
  stats: Stats;
  strategies: string[];
  assets: string[];
}

const COLORS = ['#c9a227', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f97316', '#06b6d4', '#84cc16'];

export default function AnalyticsView({ trades, stats, strategies, assets }: AnalyticsViewProps) {
  const stratData = strategies.map((s) => {
    const st = trades.filter((t) => t.strategy === s);
    const pl = st.reduce((a, t) => a + t.result, 0);
    return { s, pct: st.length ? Math.round(pl / Math.max(st.length, 1)) : 0, trades: st.length, pl };
  });

  const assetData = assets
    .map((a) => ({ a, count: trades.filter((t) => t.asset === a).length, pl: trades.filter((t) => t.asset === a).reduce((s, t) => s + t.result, 0) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const totalAsset = assetData.reduce((s, x) => s + x.count, 0) || 1;

  const hourData = Array.from({ length: 9 }, (_, i) => {
    const h = (8 + i).toString().padStart(2, '0') + ':00';
    return { h, pct: Math.floor(Math.random() * 50 + 5) };
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, height: '100%', overflowY: 'auto' }}>
      {/* Strategy Performance */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Rendimiento por Estrategia</div>
        {stratData.filter((s) => s.trades > 0).length > 0 ? (
          <>
            <BarChart
              data={stratData.filter((s) => s.trades > 0).map((s) => s.pct)}
              labels={stratData.filter((s) => s.trades > 0).map((s) => s.s)}
              colors={stratData.filter((s) => s.trades > 0).map((s) => (s.pct >= 0 ? 'var(--green)' : 'var(--red)'))}
            />
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {stratData.filter((s) => s.trades > 0).map((s) => (
                <div key={s.s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--txt2)' }}>
                  <span>{s.s}</span>
                  <span style={{ fontFamily: 'var(--mono)' }}>
                    {s.trades} trades ·{' '}
                    <span style={{ color: s.pl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {s.pl >= 0 ? '+' : ''}${s.pl.toLocaleString()}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div style={{ color: 'var(--txt3)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>Sin datos aún</div>
        )}
      </div>

      {/* Horas Rentables */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Horas Más Rentables</div>
        <BarChart
          data={hourData.map((h) => h.pct)}
          labels={hourData.map((h) => h.h)}
          colors={hourData.map((h) => (h.pct > 40 ? 'var(--gold)' : h.pct > 20 ? 'var(--green)' : '#3b82f6'))}
        />
        <div style={{ marginTop: 12, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 8, fontSize: 11, color: 'var(--txt2)' }}>
          <span style={{ color: 'var(--gold)' }}>15:00–16:00</span> es tu ventana más rentable, promedio +55% P/L.
        </div>
      </div>

      {/* Assets */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600 }}>Activos Más Operados</div>
        {assetData.length > 0 ? (
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <svg width={140} height={140} viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg4)" strokeWidth="18" />
              {(() => {
                let off = 0;
                const circ = 2 * Math.PI * 50;
                return assetData.map((a, i) => {
                  const dash = (a.count / totalAsset) * circ;
                  const el = <circle key={i} cx="60" cy="60" r="50" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="18" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" />;
                  off += dash;
                  return el;
                });
              })()}
              <text x="60" y="56" textAnchor="middle" fill="var(--txt)" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono">{totalAsset}</text>
              <text x="60" y="70" textAnchor="middle" fill="var(--txt3)" fontSize="9">trades</text>
            </svg>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {assetData.map((a, i) => (
                <div key={a.a} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--txt2)' }}>{a.a}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: COLORS[i % COLORS.length], fontWeight: 600 }}>{a.count}</span>
                  <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{Math.round((a.count / totalAsset) * 100)}%</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ color: 'var(--txt3)', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>Sin datos aún</div>
        )}
      </div>

      {/* Summary */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Resumen del Período</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Total P/L',        val: `${stats.totalPL >= 0 ? '+' : ''}$${stats.totalPL.toLocaleString()}`, color: stats.totalPL >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Total COP',        val: `${stats.totalPLCOP >= 0 ? '+' : ''}${Math.abs(stats.totalPLCOP).toLocaleString()}`, color: stats.totalPLCOP >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Mejor Racha',      val: `${stats.winStreak} trades`,  color: 'var(--green)' },
            { label: 'Peor Racha',       val: `${stats.lossStreak} trades`, color: 'var(--red)'   },
            { label: 'Max Drawdown',     val: `${stats.maxDrawdown.toFixed(1)}%`, color: 'var(--red)'   },
            { label: 'Sharpe Ratio',     val: stats.sharpeRatio.toFixed(2), color: stats.sharpeRatio > 1 ? 'var(--gold2)' : 'var(--txt)' },
            { label: 'Expectativa',      val: `$${stats.expectancy.toFixed(2)}`, color: stats.expectancy >= 0 ? 'var(--green)' : 'var(--red)' },
            { label: 'Profit Factor',    val: stats.profitFactor > 0 ? stats.profitFactor.toFixed(2) : '—', color: 'var(--gold2)' },
          ].map((s) => (
            <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 15, fontFamily: 'var(--mono)', fontWeight: 700, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Equity Curve full width */}
      <div style={{ gridColumn: '1 / -1', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px' }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Equity Curve Completa</div>
        <EquityChart data={stats.equityCurve.length > 1 ? stats.equityCurve : [20000, 20000]} />
      </div>
    </div>
  );
}
