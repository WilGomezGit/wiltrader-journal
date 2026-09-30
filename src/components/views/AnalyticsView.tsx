'use client';
import { useMemo, useState } from 'react';
import BarChart from '@/components/charts/BarChart';
import CumulativeChart, { type ChartPoint } from '@/components/charts/CumulativeChart';
import { Card, PageHeader } from '@/components/ui/kit';
import { computeStats, netPnl, type Stats } from '@/lib/analytics';
import { money, pct, profitFactor, shortDate, signedMoney, tone } from '@/lib/format';
import type { Trade } from '@/types';

interface AnalyticsViewProps {
  trades: Trade[];
  stats: Stats;
  strategies: string[];
  assets: string[];
}

const COLORS = ['#c9a227', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#f97316', '#06b6d4', '#84cc16'];
const empty = <div style={{ color: 'var(--txt3)', fontSize: 12, textAlign: 'center', padding: 'var(--sp-6) 0' }}>Sin datos aún</div>;
const compact = (v: number) => `${v < 0 ? '-' : '+'}$${Math.abs(v) >= 1000 ? `${(Math.abs(v) / 1000).toFixed(1)}k` : Math.abs(v).toFixed(0)}`;

export default function AnalyticsView({ trades, stats, strategies, assets }: AnalyticsViewProps) {
  const [curveMode, setCurveMode] = useState<'day' | 'trade'>('day');

  // Cumulative net P&L starting at 0, so the curve is gold while in profit and red while in loss.
  const curve = useMemo<ChartPoint[]>(() => {
    if (stats.totalTrades === 0) return [];
    if (curveMode === 'trade') {
      return stats.equity.map((p, i) => ({ label: i === 0 ? 'Inicio' : shortDate(p.date), value: p.balance - stats.initialBalance }));
    }
    let cum = 0;
    return [{ label: 'Inicio', value: 0 }, ...stats.daily.map((d) => { cum += d.pnl; return { label: shortDate(d.key), value: cum }; })];
  }, [stats, curveMode]);

  const byStrategy = [...new Set([...strategies, ...trades.map((t) => t.strategy)])]
    .map((s) => ({ s, st: trades.filter((t) => t.strategy === s) }))
    .filter((x) => x.st.length > 0)
    .map(({ s, st }) => ({ s, count: st.length, pnl: st.reduce((a, t) => a + netPnl(t), 0) }));

  const byAsset = [...new Set([...assets, ...trades.map((t) => t.asset)])]
    .map((a) => ({ a, count: trades.filter((t) => t.asset === a).length }))
    .filter((x) => x.count > 0)
    .sort((x, y) => y.count - x.count);
  const totalAsset = byAsset.reduce((s, x) => s + x.count, 0) || 1;

  // Real P&L by hour of the trade's recorded time. Trades without a time are left out, never guessed.
  const timed = trades.filter((t) => /^\d{1,2}:\d{2}/.test(t.time || ''));
  const byHour = [...new Set(timed.map((t) => parseInt((t.time as string).split(':')[0], 10)))]
    .sort((a, b) => a - b)
    .map((h) => {
      const hourTrades = timed.filter((t) => parseInt((t.time as string).split(':')[0], 10) === h);
      return { h: `${String(h).padStart(2, '0')}:00`, pnl: computeStats(hourTrades).pnl, count: hourTrades.length };
    });
  const bestHour = byHour.length ? byHour.reduce((a, b) => (b.pnl > a.pnl ? b : a)) : null;

  const has = stats.totalTrades > 0;
  const summary = [
    { label: 'P&L neto', val: signedMoney(stats.pnl), color: tone(stats.pnl) },
    { label: 'P&L bruto', val: signedMoney(stats.pnlGross), color: tone(stats.pnlGross) },
    { label: 'Mejor racha', val: `${stats.maxWinStreak} trades`, color: 'var(--green)' },
    { label: 'Peor racha', val: `${stats.maxLossStreak} trades`, color: 'var(--red)' },
    { label: 'Reducción máxima', val: has ? `${pct(stats.maxDrawdown.pct, 2)} · ${money(stats.maxDrawdown.amount)}` : '—', color: 'var(--red)' },
    { label: 'Factor de ganancia', val: profitFactor(stats.profitFactor, has), color: 'var(--gold2)' },
    { label: 'Expectativa por trade', val: has ? signedMoney(stats.expectancy) : '—', color: tone(stats.expectancy) },
    { label: 'Consistencia', val: stats.consistency === null ? '—' : pct(stats.consistency, 0), color: 'var(--gold2)' },
  ];

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 'var(--sp-2)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', paddingBottom: 'var(--sp-5)' }}>
        <PageHeader title="Analítica" subtitle="Cómo rinde cada estrategia, hora y activo (P&L neto)" />
        <Card title="Curva de equity" subtitle="P&L neto acumulado · dorado en ganancia, rojo en pérdida" style={{ flexShrink: 0 }}
          actions={
            <div role="group" aria-label="Agrupar curva" style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
              {([['day', 'Por día'], ['trade', 'Por operación']] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setCurveMode(k)} style={{
                  padding: '7px 14px', border: 'none', fontSize: 12, cursor: 'pointer',
                  background: curveMode === k ? 'var(--gold-dim)' : 'transparent', color: curveMode === k ? 'var(--gold)' : 'var(--txt3)',
                }}>{label}</button>
              ))}
            </div>
          }>
          <CumulativeChart points={curve} emptyText="Registra operaciones para ver tu curva" />
        </Card>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 'var(--sp-5)' }}>
          <Card title="Rendimiento por estrategia">
            {byStrategy.length > 0 ? (
              <>
                <BarChart data={byStrategy.map((x) => Math.round(x.pnl))} labels={byStrategy.map((x) => x.s)} format={compact}
                  colors={byStrategy.map((x) => (x.pnl >= 0 ? 'var(--green)' : 'var(--red)'))} />
                <div style={{ marginTop: 'var(--sp-4)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {byStrategy.map((x) => (
                    <div key={x.s} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--txt2)' }}>
                      <span>{x.s}</span>
                      <span style={{ fontFamily: 'var(--mono)' }}>{x.count} trades · <span style={{ color: tone(x.pnl) }}>{signedMoney(x.pnl)}</span></span>
                    </div>
                  ))}
                </div>
              </>
            ) : empty}
          </Card>

          <Card title="P&L por hora de cierre" subtitle={timed.length < trades.length ? `${trades.length - timed.length} trades sin hora registrada no se incluyen` : undefined}>
            {byHour.length > 0 ? (
              <>
                <BarChart data={byHour.map((x) => Math.round(x.pnl))} labels={byHour.map((x) => x.h)} format={compact}
                  colors={byHour.map((x) => (x.pnl >= 0 ? 'var(--green)' : 'var(--red)'))} />
                {bestHour && byHour.length > 1 && (
                  <div style={{ marginTop: 'var(--sp-4)', padding: '12px var(--sp-4)', background: 'var(--bg3)', borderRadius: 8, fontSize: 12, color: 'var(--txt2)' }}>
                    Tu mejor hora de cierre es <span style={{ color: 'var(--gold)' }}>{bestHour.h}</span>: {signedMoney(bestHour.pnl)} en {bestHour.count} trades.
                  </div>
                )}
              </>
            ) : empty}
          </Card>

          <Card title="Activos más operados">
            {byAsset.length > 0 ? (
              <div style={{ display: 'flex', gap: 'var(--sp-6)', alignItems: 'center', flexWrap: 'wrap' }}>
                <svg width={140} height={140} viewBox="0 0 120 120" role="img" aria-label="Distribución por activo">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="var(--bg4)" strokeWidth="18" />
                  {(() => {
                    let off = 0;
                    const circ = 2 * Math.PI * 50;
                    return byAsset.map((a, i) => {
                      const dash = (a.count / totalAsset) * circ;
                      const el = <circle key={a.a} cx="60" cy="60" r="50" fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth="18" strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={-off} transform="rotate(-90 60 60)" />;
                      off += dash;
                      return el;
                    });
                  })()}
                  <text x="60" y="56" textAnchor="middle" fill="var(--gold2)" fontSize="14" fontWeight="700" fontFamily="JetBrains Mono">{totalAsset}</text>
                  <text x="60" y="70" textAnchor="middle" fill="var(--txt3)" fontSize="9">trades</text>
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', flex: 1, minWidth: 160 }}>
                  {byAsset.map((a, i) => (
                    <div key={a.a} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--txt2)' }}>{a.a}</span>
                      <span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 600 }}>{a.count}</span>
                      <span style={{ fontSize: 11, color: 'var(--txt3)', minWidth: 36, textAlign: 'right' }}>{Math.round((a.count / totalAsset) * 100)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : empty}
          </Card>

          <Card title="Resumen del período">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
              {summary.map((s) => (
                <div key={s.label} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 'var(--sp-4)' }}>
                  <div style={{ fontSize: 10, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 'var(--sp-2)' }}>{s.label}</div>
                  <div style={{ fontSize: 15, fontFamily: 'var(--mono)', fontWeight: 700, color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
