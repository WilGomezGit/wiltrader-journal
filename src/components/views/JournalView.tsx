'use client';
import { useMemo, useState } from 'react';
import WeeklySummary from '@/components/views/WeeklySummary';
import JournalTable from '@/components/trade/JournalTable';
import TradeForm from '@/components/trade/TradeForm';
import ImportTradesModal from '@/components/trade/ImportTradesModal';
import Icon from '@/components/ui/Icon';
import { Button, Card, inputStyle } from '@/components/ui/kit';
import { useApp, ALL_ACCOUNTS } from '@/context/AppContext';
import { tradeOutcome, netPnl } from '@/lib/analytics';
import { tradesToCSV, downloadCSV } from '@/lib/export';
import { signedMoney, tone } from '@/lib/format';
import type { Trade, TradeFormData } from '@/types';

interface JournalViewProps {
  trades: Trade[];
  strategies: string[];
  assets: string[];
  onAdd: (data: TradeFormData) => Promise<void>;
  onEdit: (id: string, data: Partial<TradeFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showCOP: boolean;
  copRate?: number;
}

type SideFilter = 'All' | 'Buy' | 'Sell';
type OutcomeFilter = 'All' | 'win' | 'loss' | 'be';

const chip = (active: boolean, color = 'var(--gold)', bg = 'var(--gold-dim)'): React.CSSProperties => ({
  padding: '9px 16px', border: 'none', fontSize: 12, cursor: 'pointer',
  background: active ? bg : 'transparent', color: active ? color : 'var(--txt3)',
});
const segmented: React.CSSProperties = { display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg2)' };

export default function JournalView({ trades, strategies, assets, onAdd, onEdit, onDelete, showCOP, copRate = 4200 }: JournalViewProps) {
  const { accounts, viewAccountId } = useApp();
  const [search, setSearch] = useState('');
  const [side, setSide] = useState<SideFilter>('All');
  const [strategy, setStrategy] = useState('All');
  const [outcome, setOutcome] = useState<OutcomeFilter>('All');
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);
  const [showImport, setShowImport] = useState(false);

  const accountNames = useMemo(() => new Map(accounts.map((a) => [a.id, a.name])), [accounts]);

  const filtered = trades.filter((t) => {
    const q = search.toLowerCase();
    return (
      (t.asset.toLowerCase().includes(q) || t.strategy.toLowerCase().includes(q) || (t.notes || '').toLowerCase().includes(q)) &&
      (side === 'All' || t.type === side) &&
      (strategy === 'All' || t.strategy === strategy) &&
      (outcome === 'All' || tradeOutcome(t) === outcome)
    );
  });

  const totalNet = filtered.reduce((s, t) => s + netPnl(t), 0);

  const handleEdit = (trade: Trade) => { setEditTrade(trade); setShowForm(true); };
  const handleNew = () => { setEditTrade(null); setShowForm(true); };
  const handleDelete = async (trade: Trade) => {
    if (confirm(`¿Eliminar trade ${trade.asset} ${trade.date}?`)) await onDelete(trade.id);
  };

  return (
    <div style={{ display: 'flex', gap: 'var(--sp-5)', height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', minWidth: 0, minHeight: 0, overflowY: 'auto', paddingRight: 'var(--sp-2)' }}>
        <WeeklySummary trades={trades} />

        <div style={{ display: 'flex', gap: 'var(--sp-3)', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Icon name="search" size={14} color="var(--txt3)" />
            </span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar activo, estrategia, notas..."
              style={{ ...inputStyle, padding: '10px 12px 10px 36px', background: 'var(--bg2)', border: '1px solid var(--border)' }} />
          </div>
          <div className="seg" style={segmented} role="group" aria-label="Dirección">
            {(['All', 'Buy', 'Sell'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setSide(f)} style={chip(side === f)}>{f === 'All' ? 'Todos' : f === 'Buy' ? 'Compra' : 'Venta'}</button>
            ))}
          </div>
          <div className="seg" style={segmented} role="group" aria-label="Resultado">
            {(['All', 'win', 'loss', 'be'] as const).map((f) => (
              <button key={f} type="button" onClick={() => setOutcome(f)}
                style={chip(outcome === f, f === 'win' ? 'var(--green)' : f === 'loss' ? 'var(--red)' : 'var(--gold)', f === 'win' ? 'var(--green-dim)' : f === 'loss' ? 'var(--red-dim)' : 'var(--gold-dim)')}>
                {f === 'All' ? 'Todos' : f === 'win' ? 'Ganancia' : f === 'loss' ? 'Pérdida' : 'B/E'}
              </button>
            ))}
          </div>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)} aria-label="Estrategia"
            style={{ ...inputStyle, width: 'auto', padding: '9px 12px', background: 'var(--bg2)', border: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', fontSize: 12, cursor: 'pointer' }}>
            <option value="All">Todas las estrategias</option>
            {strategies.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>

        <Card pad="0" style={{ overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ padding: 'var(--sp-4) var(--sp-5)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-4)' }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{filtered.length} operaciones</span>
              <span style={{ fontSize: 12, color: 'var(--txt3)' }}>
                P&L neto:{' '}<span style={{ color: tone(totalNet), fontFamily: 'var(--mono)', fontWeight: 600 }}>{signedMoney(totalNet)}</span>
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
              <Button onClick={() => downloadCSV(tradesToCSV(filtered, accounts), 'wiltrader-operaciones')}><Icon name="download" size={12} /> Exportar CSV</Button>
              <Button variant="gold" onClick={() => setShowImport(true)}><Icon name="upload" size={12} /> Importar</Button>
              <Button variant="primary" onClick={handleNew}><Icon name="plus" size={12} /> Nuevo trade</Button>
            </div>
          </div>
          <JournalTable trades={filtered} onEdit={handleEdit} onDelete={handleDelete} showCOP={showCOP} copRate={copRate}
            accountNames={viewAccountId === ALL_ACCOUNTS ? accountNames : undefined} />
        </Card>
      </div>

      {showForm && (
        <aside style={{ width: 340, flexShrink: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 'var(--sp-5)', overflowY: 'auto', minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-5)' }}>
            <h2 style={{ fontWeight: 600, fontSize: 15 }}>{editTrade ? 'Editar trade' : 'Nuevo trade'}</h2>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', display: 'flex' }}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <TradeForm key={editTrade?.id ?? 'new'} editTrade={editTrade} strategies={strategies} assets={assets}
            onSave={async (data) => {
              if (editTrade) await onEdit(editTrade.id, data); else await onAdd(data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)} />
        </aside>
      )}

      {showImport && <ImportTradesModal onClose={() => setShowImport(false)} />}
    </div>
  );
}
