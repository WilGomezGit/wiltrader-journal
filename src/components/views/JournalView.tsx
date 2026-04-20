'use client';
import { useState } from 'react';
import JournalTable from '@/components/trade/JournalTable';
import TradeForm from '@/components/trade/TradeForm';
import Icon from '@/components/ui/Icon';
import type { Trade, TradeFormData } from '@/types';

interface JournalViewProps {
  trades: Trade[];
  strategies: string[];
  assets: string[];
  onAdd: (data: TradeFormData) => Promise<void>;
  onEdit: (id: string, data: Partial<TradeFormData>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  showCOP: boolean;
}

export default function JournalView({ trades, strategies, assets, onAdd, onEdit, onDelete, showCOP }: JournalViewProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFT] = useState<'All' | 'Buy' | 'Sell'>('All');
  const [filterStrat, setFS] = useState('All');
  const [filterStatus, setFStatus] = useState<'All' | 'Win' | 'Loss'>('All');
  const [showForm, setShowForm] = useState(false);
  const [editTrade, setEditTrade] = useState<Trade | null>(null);

  const filtered = trades.filter((t) =>
    (t.asset.toLowerCase().includes(search.toLowerCase()) || t.strategy.toLowerCase().includes(search.toLowerCase()) || t.notes.toLowerCase().includes(search.toLowerCase())) &&
    (filterType === 'All' || t.type === filterType) &&
    (filterStrat === 'All' || t.strategy === filterStrat) &&
    (filterStatus === 'All' || t.status === filterStatus)
  );

  const totalPL = filtered.reduce((s, t) => s + t.result, 0);

  const handleEdit = (trade: Trade) => { setEditTrade(trade); setShowForm(true); };
  const handleDelete = async (trade: Trade) => {
    if (confirm(`¿Eliminar trade ${trade.asset} ${trade.date}?`)) await onDelete(trade.id);
  };

  const exportCSV = () => {
    const header = 'Date,Asset,Type,Strategy,Entry,SL,TP,Result(USD),COP,Status,Notes';
    const rows = filtered.map((t) => `${t.date},${t.asset},${t.type},${t.strategy},${t.entry},${t.sl},${t.tp},${t.result},${t.cop},${t.status},"${t.notes}"`);
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `wiltrader-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', gap: 16, height: '100%' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0, overflowY: 'auto' }}>
        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
              <Icon name="search" size={14} color="var(--txt3)" />
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search asset, strategy, notes..."
              style={{
                width: '100%', padding: '9px 12px 9px 34px',
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)',
              }}
            />
          </div>

          {(['All', 'Buy', 'Sell'] as const).map((f) => (
            <button key={f} onClick={() => setFT(f)} style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: filterType === f ? 'var(--gold-dim)' : 'var(--bg2)',
              color: filterType === f ? 'var(--gold)' : 'var(--txt3)',
              fontSize: 12, cursor: 'pointer',
            }}>{f}</button>
          ))}

          {(['All', 'Win', 'Loss'] as const).map((f) => (
            <button key={f} onClick={() => setFStatus(f)} style={{
              padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
              background: filterStatus === f ? (f === 'Win' ? 'var(--green-dim)' : f === 'Loss' ? 'var(--red-dim)' : 'var(--gold-dim)') : 'var(--bg2)',
              color: filterStatus === f ? (f === 'Win' ? 'var(--green)' : f === 'Loss' ? 'var(--red)' : 'var(--gold)') : 'var(--txt3)',
              fontSize: 12, cursor: 'pointer',
            }}>{f}</button>
          ))}

          <select
            value={filterStrat}
            onChange={(e) => setFS(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--txt2)', fontSize: 12, cursor: 'pointer', outline: 'none' }}
          >
            <option value="All">All Strategies</option>
            {strategies.map((s) => <option key={s}>{s}</option>)}
          </select>

          <button onClick={exportCSV} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--txt3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="download" size={12} /> CSV
          </button>

        </div>

        {/* Table */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{filtered.length} operaciones</span>
            <span style={{ fontSize: 12, color: 'var(--txt3)' }}>
              P/L Total:{' '}
              <span style={{ color: totalPL >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)', fontWeight: 600 }}>
                {totalPL >= 0 ? '+' : ''}${totalPL.toLocaleString()}
              </span>
            </span>
          </div>
          <JournalTable trades={filtered} onEdit={handleEdit} onDelete={handleDelete} showCOP={showCOP} />
        </div>
      </div>

      {/* Side Form */}
      {showForm && (
        <div style={{ width: 300, flexShrink: 0, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{editTrade ? 'Edit Trade' : 'New Trade'}</span>
            <button type="button" onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer' }}>
              <Icon name="close" size={16} />
            </button>
          </div>
          <TradeForm
            editTrade={editTrade}
            strategies={strategies}
            assets={assets}
            onSave={async (data) => {
              if (editTrade) await onEdit(editTrade.id, data);
              else await onAdd(data);
              setShowForm(false);
            }}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
}
