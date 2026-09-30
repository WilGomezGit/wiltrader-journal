'use client';
import { useApp } from '@/context/AppContext';
import { useRef, useState } from 'react';
import AccountForm from '@/components/views/AccountForm';
import ImportTradesModal from '@/components/trade/ImportTradesModal';
import DashboardView from '@/components/views/DashboardView';
import { Card, PageHeader } from '@/components/ui/kit';

export default function DashboardPage() {
  const { addAccount, accounts, accountsLoading, trades, stats, scopeBalance, scopeInitialBalance, scopeLabel, scopeAccount, summaries, settings, addTrade, editTrade, showCOP, copRate, trmData } = useApp();
  const [modal, setModal] = useState<'account' | 'import' | null>(null);
  const [file, setFile] = useState<File | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);
  const pick = (f?: File) => { if (f) { setFile(f); setModal('import'); } };
  const propStatus = scopeAccount ? summaries.find((s) => s.account.id === scopeAccount.id)?.prop ?? null : null;
  if (!accountsLoading && accounts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
        <PageHeader title="Panel" subtitle="Estado actual de tu operativa" />
        <Card>
          <div style={{ textAlign: 'center', padding: 'var(--sp-6) 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-4)' }}>
            <p style={{ fontSize: 14, fontWeight: 600 }}>Aún no tienes cuentas</p>
            <p style={{ fontSize: 13, color: 'var(--txt3)', maxWidth: 420 }}>Carga tu historial de MetaTrader en Excel y creamos la cuenta por ti. Todo empieza en cero.</p>
            <div role="button" tabIndex={0} onClick={() => fileRef.current?.click()} onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files[0]); }}
              style={{ width: '100%', maxWidth: 480, border: '2px dashed var(--gold)', borderRadius: 12, padding: 'var(--sp-6) var(--sp-5)', cursor: 'pointer', background: 'var(--gold-dim)' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--gold2)' }}>Cargar historial (Excel)</div>
              <div style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 6 }}>Arrastra el reporte de MetaTrader (.xlsx) aquí o haz clic para elegirlo</div>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </div>
            <button type="button" onClick={() => setModal('account')} style={{ background: 'none', border: 'none', color: 'var(--txt3)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
              o crear una cuenta manualmente
            </button>
          </div>
        </Card>
        {modal === 'account' && <AccountForm onSave={async (d) => { await addAccount(d); }} onClose={() => setModal(null)} />}
        {modal === 'import' && <ImportTradesModal initialFile={file} onClose={() => { setModal(null); setFile(undefined); }} />}
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
