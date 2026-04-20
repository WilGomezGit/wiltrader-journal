'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from '@/components/ui/Icon';

interface SidebarProps {
  onSignOut: () => void;
  traderName?: string;
}

const nav = [
  { href: '/dashboard', icon: 'dashboard' as const, label: 'Dashboard' },
  { href: '/journal',   icon: 'journal'   as const, label: 'Journal'   },
  { href: '/analytics', icon: 'analytics' as const, label: 'Analytics' },
  { href: '/settings',  icon: 'settings'  as const, label: 'Settings'  },
];

export default function Sidebar({ onSignOut, traderName = 'WilTrader' }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      background: 'var(--bg2)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      height: '100%',
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid rgba(201,162,39,0.3)',
          flexShrink: 0,
          background: '#0d1018',
        }}>
          <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            fontFamily: "'Dancing Script', cursive",
            background: 'linear-gradient(135deg,#c9a227,#f5d87a,#c9a227)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            lineHeight: 1.1,
          }}>
            WilTrader
          </div>
          <div style={{ fontSize: 10, color: 'var(--txt3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Journal Pro
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {nav.map(({ href, icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--gold2)' : 'var(--txt2)',
                background: active ? 'var(--gold-dim)' : 'transparent',
                border: active ? '1px solid rgba(201,162,39,0.2)' : '1px solid transparent',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'var(--bg3)';
                  e.currentTarget.style.color = 'var(--txt)';
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--txt2)';
                }
              }}
            >
              <Icon name={icon} size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{
          padding: '10px 12px',
          borderRadius: 10,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          marginBottom: 8,
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--txt)' }}>{traderName}</div>
          <div style={{ fontSize: 10, color: 'var(--txt3)', marginTop: 2 }}>Pro Trader</div>
        </div>
        <button
          type="button"
          onClick={onSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid var(--border)',
            background: 'transparent',
            color: 'var(--txt3)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red)'; e.currentTarget.style.borderColor = 'var(--red)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--txt3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <Icon name="logout" size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
