'use client';
import { useState } from 'react';
import { Button, Field, Modal, inputStyle } from '@/components/ui/kit';
import type { Account, AccountKind, Currency, PropPhase } from '@/types';
import type { NewAccountData } from '@/lib/accounts';
import { money } from '@/lib/format';

const PHASES: PropPhase[] = ['Challenge', 'Phase 2', 'Funded', 'Payout', 'Otra'];
const PHASE_LABEL: Record<PropPhase, string> = { Challenge: 'Challenge / Fase 1', 'Phase 2': 'Fase 2', Funded: 'Fondeada', Payout: 'Payout', Otra: 'Otra' };
export const phaseLabel = (p: PropPhase) => PHASE_LABEL[p] ?? p;

interface AccountFormProps {
  account?: Account;
  onSave: (data: NewAccountData) => Promise<void>;
  onClose: () => void;
}

export default function AccountForm({ account, onSave, onClose }: AccountFormProps) {
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? 'prop');
  const [name, setName] = useState(account?.name ?? '');
  const [broker, setBroker] = useState(account?.broker ?? '');
  const [platform, setPlatform] = useState(account?.platform ?? '');
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? '');
  const [currency, setCurrency] = useState<Currency>(account?.baseCurrency ?? 'USD');
  const [balance, setBalance] = useState(String(account?.initialBalance ?? ''));
  const [startDate, setStartDate] = useState(account?.startDate ?? '');
  const [phase, setPhase] = useState<PropPhase>(account?.prop?.phase ?? 'Challenge');
  const [target, setTarget] = useState(String(account?.prop?.profitTarget ?? ''));
  const [maxLoss, setMaxLoss] = useState(String(account?.prop?.maxTotalLoss ?? ''));
  const [maxDaily, setMaxDaily] = useState(String(account?.prop?.maxDailyLoss ?? ''));
  const [deadline, setDeadline] = useState(account?.prop?.deadline ?? '');
  const [notes, setNotes] = useState(account?.prop?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const initial = parseFloat(balance) || 0;
  const pctOf = (v: string) => (initial > 0 && parseFloat(v) > 0 ? `${((parseFloat(v) / initial) * 100).toFixed(2)}% del balance` : undefined);

  const submit = async () => {
    if (!name.trim()) return setError('Escribe un nombre para la cuenta.');
    if (!(initial > 0)) return setError('El balance inicial debe ser mayor que 0.');
    setSaving(true);
    setError('');
    try {
      await onSave({
        name: name.trim(),
        kind,
        broker: broker.trim(),
        platform: platform.trim() || undefined,
        accountNumber: accountNumber.trim() || undefined,
        baseCurrency: currency,
        initialBalance: initial,
        startDate: startDate || undefined,
        prop: kind === 'prop' ? {
          phase,
          profitTarget: parseFloat(target) || 0,
          maxTotalLoss: parseFloat(maxLoss) || 0,
          maxDailyLoss: parseFloat(maxDaily) || 0,
          deadline: deadline || undefined,
          notes: notes.trim() || undefined,
        } : undefined,
      });
      onClose();
    } catch {
      setError('No se pudo guardar la cuenta. Intenta de nuevo.');
      setSaving(false);
    }
  };

  const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' };

  return (
    <Modal title={account ? 'Editar cuenta' : 'Nueva cuenta'} onClose={onClose} width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border2)' }}>
          {(['prop', 'personal'] as const).map((k) => (
            <button key={k} type="button" onClick={() => setKind(k)} style={{
              flex: 1, padding: '10px', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              background: kind === k ? 'var(--gold-dim)' : 'var(--bg4)', color: kind === k ? 'var(--gold)' : 'var(--txt3)',
            }}>{k === 'prop' ? 'Fondeo / Prop Firm' : 'Personal'}</button>
          ))}
        </div>

        <div style={grid}>
          <Field label="Nombre de la cuenta"><input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder={kind === 'prop' ? 'FundingPips 5K' : 'IC Markets Personal'} /></Field>
          <Field label={kind === 'prop' ? 'Prop Firm' : 'Broker'}><input style={inputStyle} value={broker} onChange={(e) => setBroker(e.target.value)} placeholder={kind === 'prop' ? 'FundingPips' : 'IC Markets'} /></Field>
          <Field label="Plataforma"><input style={inputStyle} value={platform} onChange={(e) => setPlatform(e.target.value)} placeholder="MT5" /></Field>
          <Field label="Identificador (opcional)"><input style={inputStyle} value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="20461849" /></Field>
          <Field label={kind === 'prop' ? 'Tamaño / balance inicial' : 'Balance inicial'}><input style={inputStyle} type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="5000" /></Field>
          <Field label="Moneda">
            <select style={{ ...inputStyle, cursor: 'pointer' }} value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>
              {(['USD', 'COP', 'EUR', 'GBP'] as const).map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Fecha de inicio"><input style={inputStyle} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></Field>
          {kind === 'prop' && (
            <Field label="Fase">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={phase} onChange={(e) => setPhase(e.target.value as PropPhase)}>
                {PHASES.map((p) => <option key={p} value={p}>{phaseLabel(p)}</option>)}
              </select>
            </Field>
          )}
        </div>

        {kind === 'prop' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)', padding: 'var(--sp-4)', background: 'var(--bg3)', borderRadius: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gold2)' }}>Reglas de fondeo ({currency})</div>
            <div style={grid}>
              <Field label="Objetivo de beneficio" hint={pctOf(target)}><input style={inputStyle} type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="500" /></Field>
              <Field label="Fecha límite (opcional)"><input style={inputStyle} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></Field>
              <Field label="Pérdida máxima total" hint={pctOf(maxLoss)}><input style={inputStyle} type="number" value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)} placeholder="500" /></Field>
              <Field label="Pérdida máxima diaria" hint={pctOf(maxDaily)}><input style={inputStyle} type="number" value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} placeholder="250" /></Field>
            </div>
            <Field label="Reglas adicionales (opcional)">
              <textarea style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: mínimo 4 días operados, sin operar en noticias…" />
            </Field>
            <p style={{ fontSize: 11, color: 'var(--txt3)' }}>
              Los límites se miden sobre operaciones cerradas: el piso de pérdida total es {initial > 0 && parseFloat(maxLoss) > 0 ? money(initial - parseFloat(maxLoss), 0) : 'balance inicial − pérdida máxima'}.
            </p>
          </div>
        )}

        {error && <div role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 12 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end', position: 'sticky', bottom: 0, background: 'var(--bg2)', padding: 'var(--sp-3) 0 var(--sp-1)' }}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button variant="primary" onClick={submit} disabled={saving}>{saving ? 'Guardando…' : 'Guardar cuenta'}</Button>
        </div>
      </div>
    </Modal>
  );
}
