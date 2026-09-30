'use client';
import { useApp } from '@/context/AppContext';
import DashboardView from '@/components/views/DashboardView';

export default function DashboardPage() {
  const { trades, stats, scopeBalance, scopeInitialBalance, scopeLabel, scopeAccount, summaries, settings, addTrade, editTrade, showCOP, copRate, trmData } = useApp();
  const propStatus = scopeAccount ? summaries.find((s) => s.account.id === scopeAccount.id)?.prop ?? null : null;
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
