'use client';
import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import { parseMtReport, type MtImportResult } from '@/lib/mtImport';
import type { Account } from '@/types';

interface ImportTradesModalProps {
  onClose: () => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export default function ImportTradesModal({ onClose }: ImportTradesModalProps) {
  const { accounts, activeAccountId, addAccount, importTrades, updateSettings, settings } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<MtImportResult | null>(null);
  const [destination, setDestination] = useState<string>('__new__');
  const [strategy, setStrategy] = useState('Importado MT5');
  const [importedCount, setImportedCount] = useState(0);

  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB — broker statements are small; reject oversized/unexpected files up front.

  const handleFile = async (file: File) => {
    setError('');
    if (file.size > MAX_FILE_SIZE) {
      setError('El archivo es demasiado grande (máx. 15MB). Verifica que sea un reporte de historial válido.');
      return;
    }
    try {
      const result = await parseMtReport(file);
      setParsed(result);
      setDestination(accounts.length > 0 ? (activeAccountId ?? '__new__') : '__new__');
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    }
  };

  const netTotal = parsed ? parsed.trades.reduce((s, t) => s + (t.result - t.commission), 0) : 0;
  const dates = parsed ? parsed.trades.map((t) => t.date) : [];
  const firstDate = dates[0];
  const lastDate = dates[dates.length - 1];

  const handleImport = async () => {
    if (!parsed) return;
    setStep('importing');
    try {
      let accountId = destination;
      if (destination === '__new__') {
        const estimatedInitial = parsed.accountInfo.endingBalance !== null
          ? Math.round((parsed.accountInfo.endingBalance - netTotal) * 100) / 100
          : 10000;
        accountId = await addAccount({
          name: `${parsed.accountInfo.broker} · ${parsed.accountInfo.accountNumber || 'Importada'}`,
          broker: parsed.accountInfo.broker,
          baseCurrency: parsed.accountInfo.currency,
          initialBalance: estimatedInitial > 0 ? estimatedInitial : 10000,
        });
      }
      if (!settings.strategies.includes(strategy)) {
        await updateSettings({ strategies: [...settings.strategies, strategy] });
      }
      const count = await importTrades(accountId, parsed.trades, strategy);
      setImportedCount(count);
      setStep('done');
      toast.success(`${count} trades importados correctamente`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ocurrió un error al importar.');
      setStep('preview');
    }
  };

  const btnPrimary: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 8, border: 'none',
    background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)',
    color: '#0a0a08', fontWeight: 700, fontSize: 13, cursor: 'pointer',
  };
  const btnGhost: React.CSSProperties = {
    padding: '10px 20px', borderRadius: 8, border: '1px solid var(--border2)',
    background: 'transparent', color: 'var(--txt2)', fontSize: 13, cursor: 'pointer',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div className="fade-up" style={{
        background: 'var(--bg2)', border: '1px solid var(--border2)',
        borderRadius: 'var(--radius)', padding: '28px', width: 520, maxWidth: '92vw',
        boxShadow: '0 40px 80px rgba(0,0,0,0.7)', maxHeight: '86vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'var(--gold-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="upload" size={16} color="var(--gold)" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700 }}>Importar Historial</span>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer' }}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {step === 'upload' && (
          <>
            <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6, marginBottom: 18 }}>
              Sube el reporte de historial exportado desde MetaTrader (MT4/MT5) en formato <strong>.xlsx</strong> ("Historial de la cuenta" → Exportar a Excel). Se detectarán automáticamente tus posiciones cerradas, comisiones y swaps.
            </p>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); }}
              style={{
                border: '2px dashed var(--border2)', borderRadius: 12, padding: '36px 20px',
                textAlign: 'center', cursor: 'pointer', color: 'var(--txt3)',
              }}
            >
              <Icon name="upload" size={28} color="var(--border2)" />
              <p style={{ marginTop: 10, fontSize: 13 }}>Arrastra tu archivo .xlsx aquí o haz clic para seleccionarlo</p>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>
            {error && <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--red)', fontSize: 12 }}>{error}</div>}
          </>
        )}

        {step === 'preview' && parsed && (
          <>
            <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 8 }}>Detectado en el archivo</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
                <div><span style={{ color: 'var(--txt3)' }}>Cuenta: </span><span style={{ fontFamily: 'var(--mono)' }}>{parsed.accountInfo.accountNumber || '—'}</span></div>
                <div><span style={{ color: 'var(--txt3)' }}>Broker: </span>{parsed.accountInfo.broker}</div>
                <div><span style={{ color: 'var(--txt3)' }}>Moneda: </span>{parsed.accountInfo.currency}</div>
                <div><span style={{ color: 'var(--txt3)' }}>Trades: </span><strong>{parsed.trades.length}</strong></div>
                <div><span style={{ color: 'var(--txt3)' }}>Periodo: </span>{firstDate} → {lastDate}</div>
                <div><span style={{ color: 'var(--txt3)' }}>P/L Neto: </span><span style={{ color: netTotal >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{netTotal >= 0 ? '+' : ''}${netTotal.toFixed(2)}</span></div>
              </div>
            </div>

            <label style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Importar hacia</label>
            <select
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', marginBottom: 14, cursor: 'pointer' }}
            >
              <option value="__new__">+ Crear nueva cuenta ({parsed.accountInfo.broker})</option>
              {accounts.map((a: Account) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>

            <label style={{ fontSize: 11, color: 'var(--txt2)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: 6 }}>Etiqueta de estrategia para estos trades</label>
            <input
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', marginBottom: 18, fontFamily: 'var(--mono)' }}
            />

            {error && <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: 'var(--red)', fontSize: 12 }}>{error}</div>}

            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" onClick={() => setStep('upload')} style={{ ...btnGhost, flex: 1 }}>Atrás</button>
              <button type="button" onClick={handleImport} style={{ ...btnPrimary, flex: 1 }}>Importar {parsed.trades.length} Trades</button>
            </div>
          </>
        )}

        {step === 'importing' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '30px 0' }}>
            <span style={{ width: 30, height: 30, border: '3px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
            <span style={{ fontSize: 13, color: 'var(--txt2)' }}>Importando trades a Firestore…</span>
          </div>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '20px 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={22} color="var(--green)" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{importedCount} trades importados con éxito</span>
            <button type="button" onClick={onClose} style={{ ...btnPrimary, width: '100%' }}>Ver mis métricas</button>
          </div>
        )}
      </div>
    </div>
  );
}
