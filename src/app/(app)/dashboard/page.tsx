'use client';
import { useApp } from '@/context/AppContext';
import Link from 'next/link';
import DashboardView from '@/components/views/DashboardView';
import { Card, PageHeader } from '@/components/ui/kit';

export default function DashboardPage() {
  const { accounts, accountsLoading, trades, stats, scopeBalance, scopeInitialBalance, scopeLabel, scopeAccount, summaries, settings, addTrade, editTrade, showCOP, copRate, trmData } = useApp();
  const propStatus = scopeAccount ? summaries.find((s) => s.account.id === scopeAccount.id)?.prop ?? null : null;
  if (!accountsLoading && accounts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        <PageHeader title="Panel" subtitle="Estado actual de tu operativa" />
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--sp-6) 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Aún no tienes cuentas</p>
            <p style={{ fontSize: 13, color: 'var(--txt3)', maxWidth: 420 }}>Crea una cuenta (de fondeo o personal) para empezar a registrar operaciones. Todo empieza en cero.</p>
            <Link href="/accounts" style={{ padding: '10px 20px', borderRadius: 8, background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)', color: '#0a0a08', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Crear mi primera cuenta</Link>
          </div>
        </Card>
      </div>
    );
  }
  return (
    <div style={{ height: '100%' }}>
      <DashboardView
        trades={trades}
        stats={stats}
        balance={scopeBalance}
        initialBalance={scopeInitialBalance}
        scopeLabel={scopeLabel}
        prop={scopeAccount && propStatus ? { account: scopeAccount, status: propStatus } : null}
        strategies={settings.strategies}
        assets={settings.assets}
        onAddTrade={addTrade}
        onEditTrade={editTrade}
        showCOP={showCOP}
        copRate={copRate}
        trmData={trmData}
      />
    </div>
  );
}
