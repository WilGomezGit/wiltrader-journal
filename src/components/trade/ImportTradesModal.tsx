'use client';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '@/components/ui/Icon';
import { Button, Field, Modal, inputStyle } from '@/components/ui/kit';
import { useApp } from '@/context/AppContext';
import { parseMtReport, type MtImportResult } from '@/lib/mtImport';
import { signedMoney, tone } from '@/lib/format';
import type { AccountKind } from '@/types';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // broker statements are small; reject anything unexpected up front.

type Step = 'upload' | 'preview' | 'importing' | 'done';

export default function ImportTradesModal({ onClose }: { onClose: () => void }) {
  const { accounts, scopeAccount, addAccount, importTrades, updateSettings, settings } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<MtImportResult | null>(null);
  const [destination, setDestination] = useState('__new__');
  const [newKind, setNewKind] = useState<AccountKind>('prop');
  const [strategy, setStrategy] = useState('Importado MT5');
  const [result, setResult] = useState({ imported: 0, skipped: 0 });

  const handleFile = async (file: File) => {
    setError('');
    if (file.size > MAX_FILE_SIZE) return setError('El archivo es demasiado grande (máx. 15MB). Verifica que sea un reporte de historial válido.');
    try {
      const r = await parseMtReport(file);
      setParsed(r);
      setDestination(scopeAccount?.id ?? accounts[0]?.id ?? '__new__');
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    }
  };

  const netTotal = parsed ? parsed.trades.reduce((s, t) => s + t.result - t.commission - t.swap, 0) : 0;
  const first = parsed?.trades[0]?.date, last = parsed?.trades[parsed.trades.length - 1]?.date;

  const handleImport = async () => {
    if (!parsed) return;
    setStep('importing');
    try {
      let accountId = destination;
      if (destination === '__new__') {
        const ending = parsed.accountInfo.endingBalance;
        const estimated = ending !== null ? Math.round((ending - netTotal) * 100) / 100 : 0;
        accountId = await addAccount({
          name: `${parsed.accountInfo.broker} · ${parsed.accountInfo.accountNumber || 'Importada'}`,
          kind: newKind,
          broker: parsed.accountInfo.broker,
          accountNumber: parsed.accountInfo.accountNumber || undefined,
          baseCurrency: parsed.accountInfo.currency,
          initialBalance: estimated > 0 ? estimated : 10000,
          prop: newKind === 'prop' ? { phase: 'Challenge', profitTarget: 0, maxTotalLoss: 0, maxDailyLoss: 0 } : undefined,
        });
      }
      if (!settings.strategies.includes(strategy)) await updateSettings({ strategies: [...settings.strategies, strategy] });
      const r = await importTrades(accountId, parsed.trades, strategy);
      setResult(r);
      setStep('done');
      toast.success(r.imported > 0 ? `${r.imported} trades importados` : 'No había trades nuevos que importar');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error al importar.');
      setStep('preview');
    }
  };

  const errorBox = error && (
    <div role="alert" style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--red)', fontSize: 12 }}>{error}</div>
  );

  return (
    <Modal title="Importar historial" onClose={onClose} width={540}>
      {step === 'upload' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6 }}>
            Sube el reporte de historial de MetaTrader (MT4/MT5) en <strong>.xlsx</strong>. Se leen las posiciones cerradas con su comisión y swap por separado.
            Si importas el mismo archivo otra vez, las operaciones ya existentes se omiten.
          </p>
          <div role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
            style={{ border: '2px dashed var(--border2)', borderRadius: 12, padding: 'var(--sp-6) var(--sp-5)', textAlign: 'center', cursor: 'pointer', color: 'var(--txt3)' }}>
            <Icon name="upload" size={28} color="var(--border2)" />
            <p style={{ marginTop: 'var(--sp-3)', fontSize: 13 }}>Arrastra tu archivo aquí o haz clic para seleccionarlo</p>
            <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
          </div>
          {errorBox}
        </div>
      )}

      {step === 'preview' && parsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
          <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 'var(--sp-4)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)', fontSize: 12 }}>
            <div><span style={{ color: 'var(--txt3)' }}>Cuenta: </span><span style={{ fontFamily: 'var(--mono)' }}>{parsed.accountInfo.accountNumber || '—'}</span></div>
            <div><span style={{ color: 'var(--txt3)' }}>Broker: </span>{parsed.accountInfo.broker}</div>
            <div><span style={{ color: 'var(--txt3)' }}>Moneda: </span>{parsed.accountInfo.currency}</div>
            <div><span style={{ color: 'var(--txt3)' }}>Trades: </span><strong>{parsed.trades.length}</strong></div>
            <div><span style={{ color: 'var(--txt3)' }}>Periodo: </span>{first} → {last}</div>
            <div><span style={{ color: 'var(--txt3)' }}>P&L neto: </span><span style={{ color: tone(netTotal), fontWeight: 700 }}>{signedMoney(netTotal)}</span></div>
          </div>

          <Field label="Importar hacia">
            <select value={destination} onChange={(e) => setDestination(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="__new__">+ Crear cuenta nueva ({parsed.accountInfo.broker})</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </Field>
          {destination === '__new__' && (
            <Field label="Tipo de la cuenta nueva" hint={newKind === 'prop' ? 'Después completa objetivo y límites en Cuentas.' : undefined}>
              <select value={newKind} onChange={(e) => setNewKind(e.target.value as AccountKind)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="prop">Fondeo / Prop Firm</option>
                <option value="personal">Personal</option>
              </select>
            </Field>
          )}
          <Field label="Etiqueta de estrategia para estos trades">
            <input value={strategy} onChange={(e) => setStrategy(e.target.value)} style={inputStyle} />
          </Field>
          {errorBox}
          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <Button onClick={() => setStep('upload')} style={{ flex: 1 }}>Atrás</Button>
            <Button variant="primary" onClick={handleImport} style={{ flex: 2 }}>Importar {parsed.trades.length} trades</Button>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-4)', padding: 'var(--sp-6) 0' }}>
          <span style={{ width: 30, height: 30, border: '3px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ fontSize: 13, color: 'var(--txt2)' }}>Importando trades…</span>
        </div>
      )}

      {step === 'done' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-4)', padding: 'var(--sp-4) 0' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={22} color="var(--green)" />
          </div>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{result.imported} trades importados</span>
          {result.skipped > 0 && <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{result.skipped} ya existían y se omitieron (sin duplicar).</span>}
          <Button variant="primary" onClick={onClose} style={{ width: '100%' }}>Listo</Button>
        </div>
      )}
    </Modal>
  );
}
