'use client';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import Icon from '@/components/ui/Icon';
import { Button, Field, Modal, inputStyle } from '@/components/ui/kit';
import { useApp } from '@/context/AppContext';
import { parseMtReport, type MtImportResult } from '@/lib/mtImport';
import { signedMoney, tone } from '@/lib/format';
import type { AccountKind, PropPhase } from '@/types';
import { PROP_PRESETS, presetAmounts, presetById } from '@/lib/propPresets';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // broker statements are small; reject anything unexpected up front.

// Prop firms show up as the "company" in the MT report, so the account type can be guessed from it.
const PROP_FIRMS = /funding ?pips|ftmo|the5ers|e8|funded ?next|apex|topstep|myforexfunds|alpha ?capital|blueberry ?funded|fundednext|goat ?funded|fxify|the ?funded ?trader|prop|funded|funding/i;

type Step = 'upload' | 'preview' | 'importing' | 'done';

export default function ImportTradesModal({ onClose, initialFile }: { onClose: () => void; initialFile?: File }) {
  const { accounts, scopeAccount, addAccount, importTrades, updateSettings, settings } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [error, setError] = useState('');
  const [parsed, setParsed] = useState<MtImportResult | null>(null);
  const [destination, setDestination] = useState('__new__');
  const [newKind, setNewKind] = useState<AccountKind | null>(null);
  const [preset, setPreset] = useState('');
  const [guessed, setGuessed] = useState(false);
  const [target, setTarget] = useState('');
  const [maxLoss, setMaxLoss] = useState('');
  const [maxDaily, setMaxDaily] = useState('');
  const [strategy, setStrategy] = useState('Importado MT5');
  const [result, setResult] = useState({ imported: 0, skipped: 0 });

  const estimateInitial = (r: MtImportResult) => {
    const net = r.trades.reduce((a, t) => a + t.result - t.commission - t.swap, 0);
    return r.accountInfo.endingBalance !== null ? Math.round((r.accountInfo.endingBalance - net) * 100) / 100 : 0;
  };
  const applyPreset = (id: string, initial: number) => {
    setPreset(id);
    const p = presetById(id);
    if (!p) return;
    const a = presetAmounts(p, initial);
    setTarget(a.target); setMaxLoss(a.maxLoss); setMaxDaily(a.maxDaily);
  };

  const handleFile = async (file: File) => {
    setError('');
    if (file.size > MAX_FILE_SIZE) return setError('El archivo es demasiado grande (máx. 15MB). Verifica que sea un reporte de historial válido.');
    try {
      const r = await parseMtReport(file);
      setParsed(r);
      setDestination(scopeAccount?.id ?? accounts[0]?.id ?? '__new__');
      setNewKind(PROP_FIRMS.test(r.accountInfo.broker) ? 'prop' : null);
      setGuessed(PROP_FIRMS.test(r.accountInfo.broker));
      if (/funding ?pips/i.test(r.accountInfo.broker)) applyPreset('fp-flex-1', estimateInitial(r)); else applyPreset('', 0);
      setStep('preview');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer el archivo.');
    }
  };

  useEffect(() => { if (initialFile) handleFile(initialFile); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const netTotal = parsed ? parsed.trades.reduce((s, t) => s + t.result - t.commission - t.swap, 0) : 0;
  const first = parsed?.trades[0]?.date, last = parsed?.trades[parsed.trades.length - 1]?.date;

  const [verdict, setVerdict] = useState<{ tone: 'ok' | 'warn' | 'info'; text: string } | null>(null);

  // Did this history pass the challenge? Judged on closed trades only: target reached without touching a loss limit.
  const evaluate = (trades: MtImportResult['trades'], initial: number, tgt: number, totalLim: number, dailyLim: number) => {
    let cum = 0, floorHit = false;
    const byDay = new Map<string, number>();
    for (const t of trades) {
      const net = t.result - t.commission - t.swap;
      cum += net;
      if (totalLim > 0 && cum <= -totalLim) floorHit = true;
      byDay.set(t.date, (byDay.get(t.date) ?? 0) + net);
    }
    const dailyHit = dailyLim > 0 && [...byDay.values()].some((v) => v <= -dailyLim);
    if (floorHit) return { tone: 'warn' as const, text: `Se superó la pérdida máxima total (${signedMoney(-totalLim)}). La prueba no se aprobó.` };
    if (dailyHit) return { tone: 'warn' as const, text: `Hubo un día que superó la pérdida máxima diaria (${signedMoney(-dailyLim)}). La prueba no se aprobó.` };
    if (tgt > 0 && cum >= tgt) return { tone: 'ok' as const, text: `¡Prueba superada! Beneficio neto ${signedMoney(cum)} frente a un objetivo de ${signedMoney(tgt)}.` };
    if (tgt > 0) return { tone: 'info' as const, text: `Aún no se alcanza el objetivo: ${signedMoney(cum)} de ${signedMoney(tgt)}. Faltan ${signedMoney(tgt - cum)}.` };
    return null;
  };

  const handleImport = async () => {
    if (!parsed) return;
    if (destination === '__new__' && !newKind) return setError('Indica si es una prueba de fondeo o una cuenta personal.');
    setError('');
    setStep('importing');
    try {
      let accountId = destination;
      if (destination === '__new__') {
        const ending = parsed.accountInfo.endingBalance;
        const estimated = ending !== null ? Math.round((ending - netTotal) * 100) / 100 : 0;
        accountId = await addAccount({
          name: `${parsed.accountInfo.broker} · ${parsed.accountInfo.accountNumber || 'Importada'}`,
          kind: newKind ?? 'personal',
          broker: parsed.accountInfo.broker,
          accountNumber: parsed.accountInfo.accountNumber || undefined,
          baseCurrency: parsed.accountInfo.currency,
          initialBalance: estimated > 0 ? estimated : 10000,
          prop: newKind === 'prop' ? { phase: (presetById(preset)?.phase ?? 'Challenge') as PropPhase, profitTarget: parseFloat(target) || 0, maxTotalLoss: parseFloat(maxLoss) || 0, maxDailyLoss: parseFloat(maxDaily) || 0 } : undefined,
        });
      }
      if (!settings.strategies.includes(strategy)) await updateSettings({ strategies: [...settings.strategies, strategy] });
      const r = await importTrades(accountId, parsed.trades, strategy);
      setResult(r);
      if (destination === '__new__' && newKind === 'prop') {
        const ending = parsed.accountInfo.endingBalance;
        const initial = ending !== null ? Math.round((ending - netTotal) * 100) / 100 : 0;
        setVerdict(evaluate(parsed.trades, initial, parseFloat(target) || 0, parseFloat(maxLoss) || 0, parseFloat(maxDaily) || 0));
      } else {
        const acc = accounts.find((a) => a.id === accountId);
        if (acc?.kind === 'prop' && acc.prop) setVerdict(evaluate(parsed.trades, acc.initialBalance, acc.prop.profitTarget, acc.prop.maxTotalLoss, acc.prop.maxDailyLoss));
      }
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
            <Field label="¿Es una prueba de fondeo?" hint={guessed && newKind === 'prop' ? `Detectado por el nombre de la empresa del reporte (${parsed.accountInfo.broker}). Cámbialo si no es así.` : undefined}>
              <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border2)' }}>
                {([['prop', 'Sí, fondeo'], ['personal', 'No, personal']] as const).map(([k, label]) => (
                  <button key={k} type="button" onClick={() => { setNewKind(k); setGuessed(false); }} style={{
                    flex: 1, padding: '10px', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    background: newKind === k ? 'var(--gold-dim)' : 'var(--bg4)', color: newKind === k ? 'var(--gold)' : 'var(--txt3)',
                  }}>{label}</button>
                ))}
              </div>
            </Field>
          )}
          {destination === '__new__' && newKind === 'prop' && (
            <>
            <Field label="Plantilla de reglas" hint="Rellena objetivo y límites según el programa. Puedes ajustar los valores.">
              <select value={preset} onChange={(e) => applyPreset(e.target.value, parsed ? estimateInitial(parsed) : 0)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Manual</option>
                {PROP_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
              <Field label="Objetivo de beneficio"><input style={inputStyle} type="number" value={target} onChange={(e) => setTarget(e.target.value)} placeholder="500" /></Field>
              <Field label="Pérdida máx. total"><input style={inputStyle} type="number" value={maxLoss} onChange={(e) => setMaxLoss(e.target.value)} placeholder="500" /></Field>
              <Field label="Pérdida máx. diaria"><input style={inputStyle} type="number" value={maxDaily} onChange={(e) => setMaxDaily(e.target.value)} placeholder="250" /></Field>
            </div>
            </>
          )}
          <Field label="Etiqueta de estrategia para estos trades">
            <input value={strategy} onChange={(e) => setStrategy(e.target.value)} style={inputStyle} />
          </Field>
          {errorBox}
          <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
            <Button onClick={() => setStep('upload')} style={{ flex: 1 }}>Atrás</Button>
            <Button variant="primary" onClick={handleImport} disabled={destination === '__new__' && !newKind} style={{ flex: 2 }}>Importar {parsed.trades.length} trades</Button>
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
          {verdict && (
            <div role="status" style={{
              width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 13, lineHeight: 1.5, textAlign: 'center',
              background: verdict.tone === 'ok' ? 'var(--green-dim)' : verdict.tone === 'warn' ? 'rgba(239,68,68,0.1)' : 'var(--bg3)',
              border: `1px solid ${verdict.tone === 'ok' ? 'rgba(34,197,94,0.35)' : verdict.tone === 'warn' ? 'rgba(239,68,68,0.3)' : 'var(--border2)'}`,
              color: verdict.tone === 'ok' ? 'var(--green)' : verdict.tone === 'warn' ? 'var(--red)' : 'var(--txt2)',
            }}>{verdict.text}</div>
          )}
          {result.skipped > 0 && <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{result.skipped} ya existían y se omitieron (sin duplicar).</span>}
          <Button variant="primary" onClick={onClose} style={{ width: '100%' }}>Listo</Button>
        </div>
      )}
    </Modal>
  );
}
