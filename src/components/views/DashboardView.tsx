'use client';
import { useState } from 'react';
import MetricCard from '@/components/ui/MetricCard';
import EquityChart from '@/components/charts/EquityChart';
import DonutChart from '@/components/charts/DonutChart';
import JournalTable from '@/components/trade/JournalTable';
import TradeForm from '@/components/trade/TradeForm';
import ImportTradesModal from '@/components/trade/ImportTradesModal';
import WeeklyPerformanceCard from '@/components/views/WeeklyPerformanceCard';
import TradeRecord from '@/components/ui/TradeRecord';
import PropProgress from '@/components/ui/PropProgress';
import Icon from '@/components/ui/Icon';
import { Button, Card, PageHeader } from '@/components/ui/kit';
import { money, pct, profitFactor, shortDate, signedMoney, tone } from '@/lib/format';
import { cashflowTotals } from '@/lib/analytics';
import type { PropStatus, Stats } from '@/lib/analytics';
import type { Account, Cashflow, Trade, TradeFormData, TrmData } from '@/types';

interface DashboardViewProps {
  trades: Trade[];
  stats: Stats;
  /** Current balance of the accounts in scope (initial capital + cash flows + net P&L). */
  balance: number;
  initialBalance: number;
  scopeLabel: string;
  /** Only present when a single prop account is in scope. */
  prop?: { account: Account; status: PropStatus } | null;
  strategies: string[];
  assets: string[];
  onAddTrade: (data: TradeFormData) => Promise<void>;
  onEditTrade: (id: string, data: Partial<TradeFormData>) => Promise<void>;
  showCOP: boolean;
  copRate?: number;
  trmData?: TrmData;
  /** Deposits and withdrawals of the accounts in scope. */
  cashflows?: Cashflow[];
  accountNames?: Map<string, string>;
}

export default function DashboardView({ trades, stats, balance, initialBalance, scopeLabel, prop, strategies, assets, onAddTrade, showCOP, copRate = 4200, trmData, cashflows = [], accountNames }: DashboardViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const has = stats.totalTrades > 0;
  const flowTotals = cashflowTotals(cashflows);

  const equity = stats.equity.map((p) => p.balance);
  const equityData = equity.length > 1 ? equity : [initialBalance, initialBalance];
  const spark = equity.slice(-12);
  const plSpark = stats.daily.slice(-12).map((d) => d.pnl);
  let peak = initialBalance;
  const ddSpark = equity.slice(-12).map((b) => { peak = Math.max(peak, b); return peak - b; });

  return (
    <div style={{ display: 'flex', gap: 'var(--sp-5)', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', minWidth: 0, minHeight: 0, overflowY: 'auto', paddingRight: 'var(--sp-2)' }}>
        <PageHeader title="Panel" subtitle={`${scopeLabel} · estado actual de tu operativa`} />

        {trmData?.fallback && (
          <div className="fade-in" style={{ padding: '10px var(--sp-4)', borderRadius: 8, background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.25)', fontSize: 12, color: 'var(--gold2)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <Icon name="trend_up" size={12} color="var(--gold)" />
            TRM desde {trmData.source} · ${copRate.toLocaleString('es-CO')} COP/USD. No se pudo consultar wilkinsonpc.com.co
          </div>
        )}

        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <MetricCard label="Balance" value={money(balance)} highlight delay={0} spark={spark} sparkColor="var(--gold)"
            sub={showCOP ? `COP ${Math.round(balance * copRate).toLocaleString('es-CO')}` : undefined}
            sub2={cashflows.length ? `Depósitos ${money(flowTotals.deposits)} · retiros ${money(flowTotals.withdrawals)}` : has ? undefined : 'Capital inicial · aún sin operaciones'} />
          <MetricCard label="P&L neto" value={signedMoney(stats.pnl)} valueColor={tone(stats.pnl)} delay={60} spark={plSpark} sparkColor={tone(stats.pnl)}
            sub2={`Bruto ${signedMoney(stats.pnlGross)} · costos ${money(stats.commissions + stats.swaps + stats.otherCosts)}`} />
          <MetricCard label="Tasa de victorias" value={has ? pct(stats.winRate) : '—'} delay={120}
            sub2={`${stats.wins} G · ${stats.losses} P · ${stats.breakeven} B/E`} />
          <MetricCard label="Drawdown actual" value={has ? pct(stats.currentDrawdown.pct, 2) : '—'} valueColor={has && stats.currentDrawdown.pct > 0 ? 'var(--red)' : undefined} delay={180} spark={ddSpark} sparkColor="var(--red)"
            sub2={`Máximo: ${pct(stats.maxDrawdown.pct, 2)} (${money(stats.maxDrawdown.amount)})`} />
        </div>

        <TradeRecord trades={trades} />

        {cashflows.length > 0 && (
          <Card title="Depósitos y retiros" subtitle="No cuentan como ganancia ni pérdida: el balance los refleja, las estadísticas no" style={{ flexShrink: 0 }}>
            {[...cashflows].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                <span style={{ color: 'var(--txt2)' }}>
                  {shortDate(c.date)} · {c.type === 'deposit' ? 'Depósito' : 'Retiro'}
                  {accountNames && accountNames.size > 1 ? ` · ${accountNames.get(c.accountId) ?? ''}` : ''}
                  {c.note ? <span style={{ color: 'var(--txt3)' }}> · {c.note}</span> : null}
                </span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: c.type === 'deposit' ? 'var(--green)' : 'var(--red)' }}>{c.type === 'deposit' ? '+' : '-'}{money(c.amount)}</span>
              </div>
            ))}
          </Card>
        )}

        {prop && (
          <Card title={`Fondeo · ${prop.account.name}`} subtitle="Se calcula solo con las operaciones de esta cuenta">
            <PropProgress account={prop.account} status={prop.status} />
          </Card>
        )}

        <WeeklyPerformanceCard trades={trades} />

        <Card title="Últimas operaciones" pad="var(--sp-5) 0 var(--sp-2)" actions={<div style={{ display: 'flex', gap: 'var(--sp-2)' }}><Button variant="gold" onClick={() => setShowImport(true)}><Icon name="upload" size={12} /> Importar Excel</Button><Button variant="primary" onClick={() => setShowForm(true)}><Icon name="plus" size={12} /> Nuevo trade</Button></div>}
          style={{ flexShrink: 0 }}>
          <JournalTable trades={trades} compact showCOP={showCOP} copRate={copRate} />
        </Card>

        <Card title="Curva de equity" subtitle="Capital inicial + P&L neto acumulado (sin depósitos ni retiros)" style={{ flexShrink: 0 }}>
          {has ? <EquityChart data={equityData} /> : (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt3)', fontSize: 13 }}>Registra tu primera operación para ver la curva</div>
          )}
        </Card>
      </div>

      <aside style={{ width: 320, flexShrink: 0, background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: 'var(--sp-5)', overflowY: 'auto', minHeight: 0 }}>
        {showForm ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-5)' }}>
              <h2 style={{ fontWeight: 600, fontSize: 15 }}>Nuevo trade</h2>
              <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', display: 'flex' }}>
                <Icon name="close" size={16} />
              </button>
            </div>
            <TradeForm strategies={strategies} assets={assets}
              onSave={async (data) => { await onAddTrade(data); setShowForm(false); }}
              onCancel={() => setShowForm(false)} />
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
            <h2 style={{ fontWeight: 600, fontSize: 15, color: 'var(--gold2)' }}>Resumen rápido</h2>
            <div>
              {[
                { label: 'Operaciones', val: String(stats.totalTrades), c: 'var(--gold2)' },
                { label: 'Mejor trade', val: has ? signedMoney(stats.bestTrade) : '—', c: 'var(--green)' },
                { label: 'Peor trade', val: has ? signedMoney(stats.worstTrade) : '—', c: 'var(--red)' },
                { label: 'Ganancia promedio', val: stats.wins ? signedMoney(stats.avgWin) : '—', c: 'var(--green)' },
                { label: 'Pérdida promedio', val: stats.losses ? `-${money(stats.avgLoss)}` : '—', c: 'var(--red)' },
                { label: 'Factor de ganancia', val: profitFactor(stats.profitFactor, has), c: 'var(--gold2)' },
                { label: 'Expectativa', val: has ? signedMoney(stats.expectancy) : '—', c: tone(stats.expectancy) },
              ].map((s) => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontFamily: 'var(--mono)', fontWeight: 600, color: s.c }}>{s.val}</span>
                </div>
              ))}
            </div>
            {stats.wins + stats.losses > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-4)' }}>
                <DonutChart segments={[{ value: stats.winRate, color: 'var(--green)' }, { value: stats.lossRate, color: 'var(--red)' }]} />
                <div style={{ display: 'flex', gap: 'var(--sp-5)' }}>
                  {[['Ganancia', stats.winRate, 'var(--green)'], ['Pérdida', stats.lossRate, 'var(--red)']].map(([l, v, c]) => (
                    <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: String(c) }} />
                      <span style={{ color: 'var(--txt2)' }}>{l} {Number(v).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </aside>
      {showImport && <ImportTradesModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
