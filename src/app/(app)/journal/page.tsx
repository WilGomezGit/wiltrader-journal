'use client';
import { useApp } from '@/context/AppContext';
import JournalView from '@/components/views/JournalView';

export default function JournalPage() {
  const { trades, settings, addTrade, editTrade, deleteTrade, showCOP, copRate } = useApp();
  return (
    <div style={{ height: '100%' }}>
      <JournalView
        trades={trades}
        strategies={settings.strategies}
        assets={settings.assets}
        onAdd={addTrade}
        onEdit={editTrade}
        onDelete={deleteTrade}
        showCOP={showCOP}
        copRate={copRate}
      />
    </div>
  );
}
