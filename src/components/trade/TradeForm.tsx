'use client';
import { useState, useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import type { Trade, TradeFormData, TradeStatus } from '@/types';

interface TradeFormProps {
  onSave: (data: TradeFormData) => void;
  onCancel: () => void;
  editTrade?: Trade | null;
  strategies: string[];
  assets: string[];
}

const today = () => {
  const d = new Date();
  return `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}/${d.getFullYear()}`;
};

export default function TradeForm({ onSave, onCancel, editTrade, strategies, assets }: TradeFormProps) {
  const { copRate } = useApp();

  const [form, setForm] = useState<TradeFormData>(
    editTrade
      ? {
          date: editTrade.date,
          asset: editTrade.asset,
          type: editTrade.type,
          strategy: editTrade.strategy,
          entry: String(editTrade.entry),
          sl: String(editTrade.sl),
          tp: String(editTrade.tp),
          lotSize: String(editTrade.lotSize || ''),
          result: String(editTrade.result),
          cop: String(editTrade.cop),
          notes: editTrade.notes,
          status: editTrade.status,
        }
      : {
          date: today(),
          asset: assets[0] || 'XAUUSD',
          type: 'Buy',
          strategy: strategies[0] || 'Spring',
          entry: '',
          sl: '',
          tp: '',
          lotSize: '',
          result: '',
          cop: '',
          notes: '',
          status: 'Win',
        }
  );

  // Auto-calculate COP when USD result changes
  useEffect(() => {
    const usd = parseFloat(form.result);
    if (!isNaN(usd) && form.result !== '') {
      setForm((f) => ({ ...f, cop: String(Math.round(usd * copRate)) }));
    }
  }, [form.result, copRate]);

  const set = (k: keyof TradeFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const inp: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: 'var(--bg4)',
    border: '1px solid var(--border2)',
    borderRadius: 8,
    color: 'var(--txt)',
    fontSize: 13,
    fontFamily: 'var(--mono)',
    outline: 'none',
    transition: 'border-color 0.15s',
  };
  const lbl: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--txt2)',
    marginBottom: 4,
    display: 'block',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
  };
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--gold)');
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border2)');

  const handleSubmit = () => {
    const result = parseFloat(form.result);
    const status: TradeStatus = !isNaN(result) ? (result >= 0 ? 'Win' : 'Loss') : form.status;
    onSave({ ...form, status });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Asset + Strategy */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Asset</label>
          <select value={form.asset} onChange={set('asset')} style={{ ...inp, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
            {assets.map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Strategy</label>
          <select value={form.strategy} onChange={set('strategy')} style={{ ...inp, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
            {strategies.map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Date */}
      <div>
        <label style={lbl}>Date</label>
        <input type="text" value={form.date} onChange={set('date')} placeholder="MM/DD/YYYY" style={inp} onFocus={focus} onBlur={blur} />
      </div>

      {/* Buy / Sell toggle */}
      <div>
        <label style={lbl}>Type</label>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border2)' }}>
          {(['Buy', 'Sell'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, type: t }))}
              style={{
                flex: 1, padding: '9px', border: 'none', fontWeight: 600, fontSize: 13,
                background: form.type === t ? (t === 'Buy' ? 'var(--green)' : 'var(--red)') : 'var(--bg4)',
                color: form.type === t ? '#fff' : 'var(--txt2)',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Entry / SL / TP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        {(['Entry', 'Stop Loss', 'Take Profit'] as const).map((label, idx) => {
          const key = (['entry', 'sl', 'tp'] as const)[idx];
          return (
            <div key={key}>
              <label style={lbl}>{label}</label>
              <input type="number" step="0.01" value={form[key]} onChange={set(key)} placeholder="0.00"
                style={inp} onFocus={focus} onBlur={blur} />
            </div>
          );
        })}
      </div>

      {/* Lot Size */}
      <div>
        <label style={lbl}>Lot Size</label>
        <input type="number" step="0.01" value={form.lotSize} onChange={set('lotSize')} placeholder="0.01"
          style={inp} onFocus={focus} onBlur={blur} />
      </div>

      {/* Result USD / COP */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={lbl}>Result (USD)</label>
          <input
            type="number"
            value={form.result}
            onChange={set('result')}
            placeholder="+0.00"
            style={{ ...inp, color: parseFloat(form.result) >= 0 ? 'var(--green)' : 'var(--red)' }}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
        <div>
          <label style={lbl}>
            COP{' '}
            <span style={{ fontSize: 9, color: 'var(--txt3)', fontFamily: 'var(--mono)', textTransform: 'none' }}>
              @{copRate.toLocaleString()}
            </span>
          </label>
          <input
            type="number"
            value={form.cop}
            onChange={set('cop')}
            placeholder="+0"
            style={{ ...inp, color: parseFloat(form.cop) >= 0 ? 'var(--green)' : 'var(--red)' }}
            onFocus={focus}
            onBlur={blur}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label style={lbl}>Notes</label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={2}
          placeholder="Análisis de la operación..."
          style={{ ...inp, resize: 'none', lineHeight: 1.5 }}
          onFocus={focus}
          onBlur={blur}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          type="button"
          onClick={handleSubmit}
          style={{
            flex: 1, padding: '11px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)',
            color: '#0a0a08', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 2px 12px rgba(201,162,39,0.35)', transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
        >
          {editTrade ? 'Update Trade' : 'Save Trade'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '11px 20px', borderRadius: 8, border: '1px solid var(--border2)',
            background: 'transparent', color: 'var(--txt2)', fontSize: 13, cursor: 'pointer',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg4)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
