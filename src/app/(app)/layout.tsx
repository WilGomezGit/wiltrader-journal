'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppProvider, useApp } from '@/context/AppContext';
import Sidebar from '@/components/layout/Sidebar';
import { useFirebaseStatus } from '@/hooks/useFirebaseStatus';

function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut, settings, showCOP, toggleCOP } = useApp();
  const fbConnected = useFirebaseStatus();
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
      <Sidebar onSignOut={signOut} traderName={settings.traderName} strategyText={settings.strategyText} />

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
          {/* Firebase status */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 8,
            border: `1px solid ${fbConnected === null ? 'var(--border2)' : fbConnected ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
            background: fbConnected === null ? 'var(--bg4)' : fbConnected ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
            fontSize: 10, fontWeight: 600, letterSpacing: '0.05em',
            color: fbConnected === null ? 'var(--txt3)' : fbConnected ? '#22c55e' : '#ef4444',
            userSelect: 'none',
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              background: fbConnected === null ? '#666' : fbConnected ? '#22c55e' : '#ef4444',
              boxShadow: fbConnected ? '0 0 6px #22c55e' : 'none',
              animation: fbConnected ? 'pulse 2s ease-in-out infinite' : 'none',
            }} />
            {fbConnected === null ? 'Connecting...' : fbConnected ? 'Firebase Connected' : 'Firebase Offline'}
          </div>

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
