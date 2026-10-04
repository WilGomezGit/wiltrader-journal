'use client';
import type { CSSProperties, ReactNode, ButtonHTMLAttributes } from 'react';
import Icon from './Icon';

export const inputStyle: CSSProperties = {
  width: '100%', padding: '10px 12px', background: 'var(--bg4)', border: '1px solid var(--border2)',
  borderRadius: 8, color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none',
};

export function Card({ title, subtitle, actions, children, style, pad = 'var(--sp-5)' }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; style?: CSSProperties; pad?: string;
}) {
  return (
    <section style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: pad, ...style }}>
      {(title || actions) && (
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-4)', padding: pad === 'var(--sp-5)' ? 0 : '0 var(--sp-5)' }}>
          <div>
            {title && <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--gold2)' }}>{title}</h2>}
            {subtitle && <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 'var(--sp-1)' }}>{subtitle}</p>}
          </div>
          {actions && <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, lineHeight: 1.2, color: 'var(--gold2)' }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: 'var(--txt3)', marginTop: 'var(--sp-1)' }}>{subtitle}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

export function Field({ label, hint, children, style }: { label: string; hint?: ReactNode; children: ReactNode; style?: CSSProperties }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <span style={{ fontSize: 11, color: 'var(--txt2)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{hint}</span>}
    </label>
  );
}

type Variant = 'primary' | 'ghost' | 'gold' | 'danger';
export function Button({ variant = 'ghost', style, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const base: CSSProperties = {
    padding: '9px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: rest.disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, whiteSpace: 'nowrap',
    opacity: rest.disabled ? 0.6 : 1,
  };
  const variants: Record<Variant, CSSProperties> = {
    primary: { border: 'none', background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)', color: '#0a0a08', fontWeight: 700 },
    gold: { border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', color: 'var(--gold)' },
    ghost: { border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt2)' },
    danger: { border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.08)', color: 'var(--red)' },
  };
  return <button type="button" {...rest} style={{ ...base, ...variants[variant], ...style }}>{children}</button>;
}

export function Badge({ children, color = 'var(--txt2)', bg = 'var(--bg4)' }: { children: ReactNode; color?: string; bg?: string }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600, color, background: bg, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  );
}

export function ProgressBar({ value, color = 'var(--gold)', height = 8 }: { value: number; color?: string; height?: number }) {
  const v = Math.min(Math.max(value, 0), 100);
  return (
    <div style={{ height, borderRadius: height, background: 'var(--bg4)', overflow: 'hidden' }} role="progressbar" aria-valuenow={Math.round(v)} aria-valuemin={0} aria-valuemax={100}>
      <div style={{ width: `${v}%`, height: '100%', background: color, borderRadius: height, transition: 'width 0.4s ease' }} />
    </div>
  );
}

export function Modal({ title, onClose, children, width = 560 }: { title: string; onClose: () => void; children: ReactNode; width?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'var(--sp-4)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 'var(--radius)', width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 40px 80px rgba(0,0,0,0.7)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-5) var(--sp-5) var(--sp-4)' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }}>{title}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', display: 'flex' }}>
            <Icon name="close" size={18} />
          </button>
        </div>
        <div style={{ padding: '0 var(--sp-5) var(--sp-5)' }}>{children}</div>
      </div>
    </div>
  );
}

export function Stat({ label, value, color, sub }: { label: string; value: ReactNode; color?: string; sub?: ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
      <span style={{ fontSize: 11, color: 'var(--txt3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 18, fontWeight: 700, fontFamily: 'var(--mono)', color: color ?? 'var(--gold2)' }}>{value}</span>
      {sub && <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{sub}</span>}
    </div>
  );
}
