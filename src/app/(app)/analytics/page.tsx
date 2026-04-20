'use client';
import { useApp } from '@/context/AppContext';
import AnalyticsView from '@/components/views/AnalyticsView';

export default function AnalyticsPage() {
  const { trades, stats, settings } = useApp();
  return (
    <div style={{ height: '100%' }}>
      <AnalyticsView
        trades={trades}
        stats={stats}
        strategies={settings.strategies}
        assets={settings.assets}
      />
    </div>
  );
}
