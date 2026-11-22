'use client';
import { useApp } from '@/context/AppContext';
import InformesView from '@/components/views/InformesView';

export default function InformesPage() {
  const { trades, scopeLabel } = useApp();
  return (
    <div style={{ height: '100%' }}>
      <InformesView trades={trades} scopeLabel={scopeLabel} />
    </div>
  );
}
