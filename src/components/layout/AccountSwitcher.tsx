'use client';
import { useState, useRef, useEffect } from 'react';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import type { Account } from '@/types';

const currencies: Account['baseCurrency'][] = ['USD', 'COP', 'EUR', 'GBP'];

export default function AccountSwitcher() {
  const { accounts, activeAccount, switchAccount, addAccount } = useApp();
  const [open, setOpen] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [name, setName] = useState('');
  const [broker, setBroker] = useState('MT5 — Live');
  const [currency, setCurrency] = useState<Account['baseCurrency']>('USD');
  const [balance, setBalance] = useState('20000');
  const [creating, setCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setShowNew(false); }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await addAccount({ name: name.trim(), broker, baseCurrency: currency, initialBalance: parseFloat(balance) || 0 });
    setCreating(false);
    setShowNew(false);
    setName(''); setBroker('MT5 — Live'); setCurrency('USD'); setBalance('20000');
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 10px 5px 12px', borderRadius: 8,
          border: '1px solid var(--border2)',
          background: 'var(--bg4)', color: 'var(--txt)',
          fontSize: 12, fontWeight: 600, cursor: 'pointer',
          fontFamily: 'var(--mono)', minWidth: 150,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }}>
          {activeAccount?.name ?? 'Sin cuenta'}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fade-in" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 280,
          background: 'var(--bg2)', border: '1px solid var(--border2)',
          borderRadius: 'var(--radius-sm)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
          zIndex: 200, overflow: 'hidden',
        }}>
          <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--txt3)' }}>
            Mis Cuentas
          </div>
          <div style={{ maxHeight: 260, overflowY: 'auto' }}>
            {accounts.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => { switchAccount(a.id); setOpen(false); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: 10, padding: '10px 14px', border: 'none',
                  background: a.id === activeAccount?.id ? 'var(--gold-dim)' : 'transparent',
                  color: a.id === activeAccount?.id ? 'var(--gold2)' : 'var(--txt)',
                  fontSize: 13, cursor: 'pointer', textAlign: 'left', transition: 'background 0.12s',
                }}
                onMouseEnter={(e) => { if (a.id !== activeAccount?.id) e.currentTarget.style.background = 'var(--bg3)'; }}
                onMouseLeave={(e) => { if (a.id !== activeAccount?.id) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600 }}>{a.name}</span>
                  <span style={{ fontSize: 10, color: 'var(--txt3)' }}>{a.broker} · {a.baseCurrency}</span>
                </div>
                {a.id === activeAccount?.id && <Icon name="check" size={14} color="var(--gold)" />}
              </button>
            ))}
          </div>

          {showNew ? (
            <div style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (p.ej. Cuenta Fondeada)"
                style={{ padding: '8px 10px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--txt)', fontSize: 12, outline: 'none' }} />
              <input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="Broker"
                style={{ padding: '8px 10px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--txt)', fontSize: 12, outline: 'none' }} />
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={currency} onChange={(e) => setCurrency(e.target.value as Account['baseCurrency'])}
                  style={{ flex: 1, padding: '8px 10px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--txt)', fontSize: 12, outline: 'none' }}>
                  {currencies.map((c) => <option key={c}>{c}</option>)}
                </select>
                <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="Balance inicial"
                  style={{ flex: 1, padding: '8px 10px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--txt)', fontSize: 12, outline: 'none', fontFamily: 'var(--mono)' }} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                <button type="button" onClick={() => setShowNew(false)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt2)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                <button type="button" onClick={handleCreate} disabled={creating || !name.trim()} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)', color: '#0a0a08', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: creating || !name.trim() ? 0.6 : 1 }}>
                  {creating ? '...' : 'Crear'}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowNew(true)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '11px 14px', border: 'none', borderTop: '1px solid var(--border)',
                background: 'transparent', color: 'var(--gold)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--gold-dim)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <Icon name="plus" size={13} /> Nueva Cuenta
            </button>
          )}
        </div>
      )}
    </div>
  );
}
