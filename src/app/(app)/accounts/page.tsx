'use client';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import AccountsView from '@/components/views/AccountsView';

export default function AccountsPage() {
  const { summaries, consolidated, cashflows, viewAccountId, setViewAccount, addAccount, updateAccount, deleteAccount, addCashflow, removeCashflow } = useApp();
  const router = useRouter();
  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 'var(--sp-2)' }}>
      <AccountsView
        summaries={summaries}
        consolidated={consolidated}
        cashflows={cashflows}
        viewAccountId={viewAccountId}
        onView={(id) => { setViewAccount(id); router.push('/dashboard'); }}
        onCreate={addAccount}
        onUpdate={updateAccount}
        onDelete={deleteAccount}
        onAddCashflow={addCashflow}
        onRemoveCashflow={removeCashflow}
      />
    </div>
  );
}
