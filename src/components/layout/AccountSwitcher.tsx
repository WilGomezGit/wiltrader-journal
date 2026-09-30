'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/ui/Icon';
import { useApp, ALL_ACCOUNTS } from '@/context/AppContext';

export default function AccountSwitcher() {
  const { activeAccounts, viewAccountId, setViewAccount, scopeLabel, scopeAccount } = useApp();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const choose = (id: string) => { setViewAccount(id); setOpen(false); };
  const row = (selected: boolean): React.CSSProperties => ({
    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)',
    padding: '12px var(--sp-4)', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13,
    background: selected ? 'var(--gold-dim)' : 'transparent', color: selected ? 'var(--gold2)' : 'var(--txt)',
  });

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="listbox" aria-expanded={open} style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '7px 12px', borderRadius: 8,
        border: '1px solid var(--border2)', background: 'var(--bg4)', color: 'var(--txt)',
        fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--mono)', minWidth: 170,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: viewAccountId === ALL_ACCOUNTS ? 'var(--green)' : 'var(--gold)', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>{scopeLabel}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="fade-in" role="listbox" style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 300, background: 'var(--bg2)',
          border: '1px solid var(--border2)', borderRadius: 10, boxShadow: '0 20px 50px rgba(0,0,0,0.6)', zIndex: 200, overflow: 'hidden',
        }}>
          <button type="button" role="option" aria-selected={viewAccountId === ALL_ACCOUNTS} onClick={() => choose(ALL_ACCOUNTS)} style={row(viewAccountId === ALL_ACCOUNTS)}>
            <div>
              <div style={{ fontWeight: 600 }}>Todas las cuentas</div>
              <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{activeAccounts.length} activas · datos combinados</div>
            </div>
            {viewAccountId === ALL_ACCOUNTS && <Icon name="check" size={14} color="var(--gold)" />}
          </button>
          <div style={{ height: 1, background: 'var(--border)' }} />
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {activeAccounts.map((a) => (
              <button key={a.id} type="button" role="option" aria-selected={a.id === viewAccountId} onClick={() => choose(a.id)} style={row(a.id === viewAccountId)}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>{a.kind === 'prop' ? 'Fondeo' : 'Personal'} · {a.broker || 'Sin broker'} · {a.baseCurrency}</div>
                </div>
                {a.id === viewAccountId && <Icon name="check" size={14} color="var(--gold)" />}
              </button>
            ))}
            {scopeAccount && !scopeAccount.active && (
              <div style={{ padding: '10px var(--sp-4)', fontSize: 11, color: 'var(--txt3)' }}>Estás viendo una cuenta inactiva: {scopeAccount.name}</div>
            )}
          </div>
          <Link href="/accounts" onClick={() => setOpen(false)} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '12px var(--sp-4)', borderTop: '1px solid var(--border)',
            color: 'var(--gold)', fontSize: 12, fontWeight: 600, textDecoration: 'none',
          }}>
            <Icon name="settings" size={13} /> Administrar cuentas
          </Link>
        </div>
      )}
    </div>
  );
}
