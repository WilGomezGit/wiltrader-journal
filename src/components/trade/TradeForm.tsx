'use client';
import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Button, Field, inputStyle } from '@/components/ui/kit';
import { money, signedMoney, tone } from '@/lib/format';
import { fromISODate, todayISO } from '@/lib/dates';
import type { Trade, TradeFormData } from '@/types';

interface TradeFormProps {
  onSave: (data: TradeFormData) => void | Promise<void>;
  onCancel: () => void;
  editTrade?: Trade | null;
  strategies: string[];
  assets: string[];
}

const nowTime = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const str = (n: number | undefined) => (n ? String(n) : '');

export default function TradeForm({ onSave, onCancel, editTrade, strategies, assets }: TradeFormProps) {
  const { copRate, settings, accounts, activeAccounts, scopeAccount } = useApp();
  const emotions = settings.emotions?.length ? settings.emotions : ['😌 Disciplinado', '😰 Ansioso', '😤 Impulsivo', '🧘 Neutral'];

  // Accounts a trade can be assigned to: the active ones, plus the trade's own account when editing.
  const selectable = accounts.filter((a) => a.active || a.id === editTrade?.accountId);
  const defaultAccount = editTrade?.accountId ?? (scopeAccount && scopeAccount.active ? scopeAccount.id : activeAccounts[0]?.id) ?? '';

  const [form, setForm] = useState<TradeFormData>(
    editTrade
      ? {
          accountId: editTrade.accountId,
          date: editTrade.date, time: editTrade.time || '', asset: editTrade.asset, type: editTrade.type, strategy: editTrade.strategy,
          entry: str(editTrade.entry), sl: str(editTrade.sl), tp: str(editTrade.tp), lotSize: str(editTrade.lotSize),
          result: String(editTrade.result), commission: str(editTrade.commission), swap: str(editTrade.swap), otherCosts: str(editTrade.otherCosts),
          riskAmount: str(editTrade.riskAmount), cop: String(editTrade.cop), emotion: editTrade.emotion || '', notes: editTrade.notes,
        }
      : {
          accountId: defaultAccount,
          date: fromISODate(todayISO()), time: nowTime(), asset: assets[0] || 'XAUUSD', type: 'Buy', strategy: strategies[0] || '',
          entry: '', sl: '', tp: '', lotSize: '', result: '', commission: '', swap: '', otherCosts: '', riskAmount: '',
          cop: '', emotion: emotions[0] || '', notes: '',
        }
  );
  const [showMore, setShowMore] = useState(!!editTrade);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const n = (v: string) => parseFloat(v) || 0;
  const gross = n(form.result);
  const costs = n(form.commission) + n(form.swap) + n(form.otherCosts);
  const net = gross - costs;

  useEffect(() => {
    if (form.result !== '' || form.commission !== '' || form.swap !== '' || form.otherCosts !== '') {
      setForm((f) => ({ ...f, cop: String(Math.round(net * copRate)) }));
    }
  }, [net, copRate, form.result, form.commission, form.swap, form.otherCosts]);

  const set = (k: keyof TradeFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.accountId) return setError('Elige la cuenta a la que pertenece la operación.');
    if (form.result.trim() === '' || Number.isNaN(parseFloat(form.result))) return setError('Escribe el resultado bruto de la operación.');
    setError('');
    setSaving(true);
    try { await onSave(form); } finally { setSaving(false); }
  };

  const grid2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' };
  const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' };
  const select: React.CSSProperties = { ...inputStyle, cursor: 'pointer' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <Field label="Cuenta">
        <select value={form.accountId} onChange={set('accountId')} style={select}>
          {selectable.length === 0 && <option value="">Crea una cuenta primero</option>}
          {selectable.map((a) => <option key={a.id} value={a.id}>{a.name}{a.active ? '' : ' (inactiva)'}</option>)}
        </select>
      </Field>

      <div style={grid2}>
        <Field label="Activo">
          <select value={form.asset} onChange={set('asset')} style={select}>{assets.map((a) => <option key={a}>{a}</option>)}</select>
        </Field>
        <Field label="Estrategia">
          <select value={form.strategy} onChange={set('strategy')} style={select}>
            {strategies.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
      </div>

      <div style={grid2}>
        <Field label="Fecha"><input type="text" value={form.date} onChange={set('date')} placeholder="MM/DD/YYYY" style={inputStyle} /></Field>
        <Field label="Hora"><input type="time" value={form.time} onChange={set('time')} style={inputStyle} /></Field>
      </div>

      <Field label="Tipo">
        <div className="seg" style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border2)' }}>
          {(['Buy', 'Sell'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setForm((f) => ({ ...f, type: t }))} style={{
              flex: 1, padding: '10px', border: 'none', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              background: form.type === t ? (t === 'Buy' ? 'var(--green)' : 'var(--red)') : 'var(--bg4)',
              color: form.type === t ? '#fff' : 'var(--txt2)',
            }}>{t === 'Buy' ? 'Compra (Long)' : 'Venta (Short)'}</button>
          ))}
        </div>
      </Field>

      <div style={grid2}>
        <Field label="Resultado bruto"><input type="number" step="0.01" value={form.result} onChange={set('result')} placeholder="0.00" style={{ ...inputStyle, color: form.result === '' ? undefined : tone(gross) }} /></Field>
        <Field label="Comisión"><input type="number" step="0.01" value={form.commission} onChange={set('commission')} placeholder="0.00" style={inputStyle} /></Field>
      </div>

      {(form.result !== '' || costs !== 0) && (
        <div style={{ padding: '12px var(--sp-4)', borderRadius: 8, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--txt2)' }}><span>Bruto</span><span style={{ fontFamily: 'var(--mono)' }}>{signedMoney(gross)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--txt2)' }}><span>− Comisión, swap y otros</span><span style={{ fontFamily: 'var(--mono)' }}>{money(costs)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border)', fontWeight: 700 }}>
            <span>Neto</span><span style={{ fontFamily: 'var(--mono)', color: tone(net) }}>{signedMoney(net)}</span>
          </div>
        </div>
      )}

      <button type="button" onClick={() => setShowMore((v) => !v)} aria-expanded={showMore} style={{
        background: 'none', border: 'none', color: 'var(--gold)', fontSize: 12, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: 0,
      }}>{showMore ? '− Ocultar detalles' : '+ Más detalles (precios, swap, riesgo, notas)'}</button>

      {showMore && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={grid3}>
            <Field label="Entrada"><input type="number" step="any" value={form.entry} onChange={set('entry')} style={inputStyle} /></Field>
            <Field label="SL"><input type="number" step="any" value={form.sl} onChange={set('sl')} style={inputStyle} /></Field>
            <Field label="TP"><input type="number" step="any" value={form.tp} onChange={set('tp')} style={inputStyle} /></Field>
          </div>
          <div style={grid3}>
            <Field label="Lote"><input type="number" step="any" value={form.lotSize} onChange={set('lotSize')} style={inputStyle} /></Field>
            <Field label="Swap"><input type="number" step="0.01" value={form.swap} onChange={set('swap')} style={inputStyle} /></Field>
            <Field label="Otros"><input type="number" step="0.01" value={form.otherCosts} onChange={set('otherCosts')} style={inputStyle} /></Field>
          </div>
          <div style={grid2}>
            <Field label="Riesgo ($)" hint="Para calcular el múltiplo R"><input type="number" step="0.01" value={form.riskAmount} onChange={set('riskAmount')} style={inputStyle} /></Field>
            <Field label="COP" hint={`Neto × ${copRate.toLocaleString('es-CO')}`}><input type="number" value={form.cop} onChange={set('cop')} style={inputStyle} /></Field>
          </div>
          <Field label="Estado emocional">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
              {emotions.map((e) => (
                <button key={e} type="button" onClick={() => setForm((f) => ({ ...f, emotion: e }))} style={{
                  padding: '7px 12px', borderRadius: 8, border: '1px solid', fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
                  borderColor: form.emotion === e ? 'var(--gold)' : 'var(--border2)',
                  background: form.emotion === e ? 'var(--gold-dim)' : 'var(--bg4)',
                  color: form.emotion === e ? 'var(--gold2)' : 'var(--txt2)',
                }}>{e}</button>
              ))}
            </div>
          </Field>
          <Field label="Notas">
            <textarea value={form.notes} onChange={set('notes')} rows={3} placeholder="Análisis de la operación…" style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }} />
          </Field>
        </div>
      )}

      {error && <div role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 12 }}>{error}</div>}

      <div style={{ display: 'flex', gap: 'var(--sp-3)', marginTop: 'var(--sp-1)' }}>
        <Button variant="primary" onClick={submit} disabled={saving} style={{ flex: 1, padding: '12px' }}>{editTrade ? 'Actualizar trade' : 'Guardar trade'}</Button>
        <Button onClick={onCancel} disabled={saving} style={{ padding: '12px 20px' }}>Cancelar</Button>
      </div>
    </div>
  );
}
