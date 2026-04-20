'use client';
import { useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import EquityChart from '@/components/charts/EquityChart';
import DonutChart from '@/components/charts/DonutChart';
import JournalTable from '@/components/trade/JournalTable';
import TradeForm from '@/components/trade/TradeForm';
import Icon from '@/components/ui/Icon';
import type { Trade, TradeFormData, Stats } from '@/types';

interface DashboardViewProps {
  trades: Trade[];
  stats: Stats;
  strategies: string[];
  assets: string[];
  onAddTrade: (data: TradeFormData) => Promise<void>;
  onEditTrade: (id: string, data: Partial<TradeFormData>) => Promise<void>;
  showCOP: boolean;
}

export default function DashboardView({ trades, stats, strategies, assets, onAddTrade, onEditTrade, showCOP }: DashboardViewProps) {
  const [showForm, setShowForm] = useState(false);

  const spark = stats.equityCurve.slice(-10);
  const plSpark = trades.slice(-10).map((t) => t.result);
  const ddSpark = [5, 6, 8, 7.5, 7, 8.5, 9, 8, 7.5, stats.currentDrawdown];

  const fmtUSD = (n: number) => (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtCOP = (n: number) => (n >= 0 ? '+ COP ' : '- COP ') + Math.abs(n).toLocaleString('es-CO');

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16, minWidth: 0, overflowY: 'auto', paddingRight: 4 }}>
        {/* Metric Cards */}
        <div style={{ display: 'flex', gap: 12 }}>
          <MetricCard
            label="Account Balance"
            value={`$${stats.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            sub={showCOP ? `COP ${Math.abs(stats.totalBalance * 4100).toLocaleString('es-CO')}` : undefined}
            trend={stats.totalPL >= 0 ? 3.2 : -3.2}
            spark={spark}
            sparkColor="var(--gold)"
            highlight
            delay={0}
          />
          <MetricCard
            label="Profit / Loss"
            value={fmtUSD(stats.totalPL)}
            sub={showCOP ? fmtCOP(stats.totalPLCOP) : undefined}
            spark={plSpark}
            sparkColor={stats.totalPL >= 0 ? 'var(--green)' : 'var(--red)'}
            delay={60}
          />
          <MetricCard
            label="Win Rate"
            value={`${stats.winRate.toFixed(1)}%`}
            sub2={`${stats.wins} wins / ${stats.totalTrades} trades`}
            trend={stats.winRate > 50 ? 4.1 : -2.3}
            delay={120}
          />
          <MetricCard
            label="Drawdown"
            value={`${stats.currentDrawdown.toFixed(1)}%`}
            spark={ddSpark}
            sparkColor="var(--red)"
            sub2={`Max: ${stats.maxDrawdown.toFixed(1)}%`}
            delay={180}
          />
        </div>

        {/* Equity Chart */}
        <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 20px 12px', animationDelay: '200ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Equity Curve</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {['1W', '1M', '3M', '1Y'].map((p) => (
                <button key={p} style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 11,
                  border: '1px solid var(--border)',
                  background: p === '1M' ? 'var(--gold-dim)' : 'transparent',
                  color: p === '1M' ? 'var(--gold)' : 'var(--txt3)', cursor: 'pointer',
                }}>{p}</button>
              ))}
            </div>
          </div>
          <EquityChart data={stats.equityCurve.length > 1 ? stats.equityCurve : [20000, 20000]} />
        </div>

        {/* Journal Preview */}
        <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '18px 20px', animationDelay: '300ms' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Trading Journal</span>
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--txt3)', fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="filter" size={12} /> Filter
              </button>
              <button onClick={() => setShowForm(true)} style={{ padding: '5px 12px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#0a0a08', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="plus" size={12} /> New Trade
              </button>
            </div>
          </div>
          <JournalTable trades={trades} compact showCOP={showCOP} />
        </div>
      </div>

      {/* Right Panel */}
      <div style={{ width: 300, flexShrink: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', overflowY: 'auto' }}>
        {showForm ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Add New Trade</span>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer' }}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <TradeForm
              strategies={strategies}
              assets={assets}
              onSave={async (data) => { await onAddTrade(data); setShowForm(false); }}
              onCancel={() => setShowForm(false)}
            />
          </>
        ) : (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Quick Stats</span>
              <button onClick={() => setShowForm(true)} style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#0a0a08', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon name="plus" size={12} /> New Trade
              </button>
            </div>

            {[
              { label: 'Best Trade',    val: `+$${stats.bestTrade.toLocaleString()}`,                       color: 'var(--green)' },
              { label: 'Worst Trade',   val: `-$${Math.abs(stats.worstTrade).toLocaleString()}`,            color: 'var(--red)'   },
              { label: 'Avg Win',       val: `+$${stats.avgWin.toFixed(2)}`,                               color: 'var(--green)' },
              { label: 'Avg Loss',      val: `-$${stats.avgLoss.toFixed(2)}`,                              color: 'var(--red)'   },
              { label: 'Profit Factor', val: stats.profitFactor > 0 ? stats.profitFactor.toFixed(2) : '—', color: 'var(--gold2)' },
              { label: 'Total Trades',  val: String(stats.totalTrades),                                    color: 'var(--txt)'   },
              { label: 'Expectancy',    val: `$${stats.expectancy.toFixed(2)}`,                            color: stats.expectancy >= 0 ? 'var(--green)' : 'var(--red)' },
            ].map((s, i) => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)', animation: `rowIn 0.3s ease ${i * 50}ms both` }}>
                <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{s.label}</span>
                <span style={{ fontSize: 14, fontFamily: 'var(--mono)', fontWeight: 600, color: s.color }}>{s.val}</span>
              </div>
            ))}

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 8 }}>
              <DonutChart segments={[
                { value: stats.winRate, color: 'var(--green)' },
                { value: 100 - stats.winRate, color: 'var(--red)' },
              ]} />
              <div style={{ display: 'flex', gap: 16 }}>
                {[['Win', stats.winRate, 'var(--green)'], ['Loss', 100 - stats.winRate, 'var(--red)']].map(([l, v, c]) => (
                  <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: String(c) }} />
                    <span style={{ color: 'var(--txt2)' }}>{l} {Number(v).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
