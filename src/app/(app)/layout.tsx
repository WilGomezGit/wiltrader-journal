'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, settings, showCOP, toggleCOP } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/');
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ width: 32, height: 32, border: '3px solid var(--border2)', borderTopColor: 'var(--gold)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar onSignOut={signOut} traderName={settings.traderName} />

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar */}
        <header style={{
          height: 52,
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 20px',
          gap: 12,
          background: 'var(--bg2)',
          flexShrink: 0,
        }}>
          {/* USD / COP toggle */}
          <button
            type="button"
            onClick={toggleCOP}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 12px', borderRadius: 8,
              border: '1px solid var(--border2)',
              background: showCOP ? 'var(--gold-dim)' : 'var(--bg4)',
              color: showCOP ? 'var(--gold)' : 'var(--txt3)',
              fontSize: 11, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.15s', fontFamily: 'var(--mono)',
            }}
          >
            {showCOP ? '🇨🇴 COP' : '🇺🇸 USD'} Toggle
          </button>

          {/* User dot */}
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'linear-gradient(135deg,#c9a227,#f5d87a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#0a0a08',
          }}>
            {(settings.traderName[0] || 'W').toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'hidden', padding: 20 }}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ProtectedLayout>{children}</ProtectedLayout>
    </AppProvider>
  );
}
