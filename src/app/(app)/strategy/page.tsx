'use client';
import { useApp } from '@/context/AppContext';
import StrategyView from '@/components/views/StrategyView';

export default function StrategyPage() {
  const { settings, updateSettings } = useApp();
  return (
    <div style={{ height: '100%' }}>
      <StrategyView
        strategyText={settings.strategyText ?? ''}
        onSave={(text) => updateSettings({ strategyText: text })}
      />
    </div>
  );
}
