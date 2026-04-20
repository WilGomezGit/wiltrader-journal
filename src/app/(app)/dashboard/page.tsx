'use client';
import { useApp } from '@/context/AppContext';
import DashboardView from '@/components/views/DashboardView';

export default function DashboardPage() {
  const { trades, stats, settings, addTrade, editTrade, showCOP, copRate, trmData } = useApp();
  return (
    <div style={{ height: '100%' }}>
      <DashboardView
        trades={trades}
        stats={stats}
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
