'use client';
import { useApp } from '@/context/AppContext';
import { useState } from 'react';
import AccountForm from '@/components/views/AccountForm';
import ImportTradesModal from '@/components/trade/ImportTradesModal';
import { Button } from '@/components/ui/kit';
import DashboardView from '@/components/views/DashboardView';
import { Card, PageHeader } from '@/components/ui/kit';

export default function DashboardPage() {
  const { addAccount, accounts, accountsLoading, trades, stats, scopeBalance, scopeInitialBalance, scopeLabel, scopeAccount, summaries, settings, addTrade, editTrade, showCOP, copRate, trmData } = useApp();
  const [modal, setModal] = useState<'account' | 'import' | null>(null);
  const propStatus = scopeAccount ? summaries.find((s) => s.account.id === scopeAccount.id)?.prop ?? null : null;
  if (!accountsLoading && accounts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        <PageHeader title="Panel" subtitle="Estado actual de tu operativa" />
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--sp-6) 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Aún no tienes cuentas</p>
            <p style={{ fontSize: 13, color: 'var(--txt3)', maxWidth: 420 }}>Crea una cuenta (de fondeo o personal) o importa tu historial de MetaTrader en Excel para empezar. Todo empieza en cero.</p>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button variant="primary" onClick={() => setModal('account')}>Crear mi primera cuenta</Button>
              <Button onClick={() => setModal('import')}>Importar historial (Excel)</Button>
            </div>
          </div>
        </Card>
        {modal === 'account' && <AccountForm onSave={async (d) => { await addAccount(d); }} onClose={() => setModal(null)} />}
        {modal === 'import' && <ImportTradesModal onClose={() => setModal(null)} />}
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
