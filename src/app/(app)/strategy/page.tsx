'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import StrategyView from '@/components/views/StrategyView';
import StrategyAnalyzer from '@/components/views/StrategyAnalyzer';
import Icon from '@/components/ui/Icon';

type Tab = 'plan' | 'analyzer';

export default function StrategyPage() {
  const { settings, updateSettings, trades, scopeInitialBalance } = useApp();
  const [tab, setTab] = useState<Tab>('analyzer');

  const tabBtn = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
    fontSize: 12, fontWeight: 600,
    border: active ? '1px solid var(--gold-border)' : '1px solid transparent',
    background: active ? 'var(--gold-dim)' : 'transparent',
    color: active ? 'var(--gold)' : 'var(--txt3)',
    transition: 'all 0.15s',
  });

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <button type="button" style={tabBtn(tab === 'analyzer')} onClick={() => setTab('analyzer')}>
          <Icon name="analytics" size={13} /> Analizador de Estrategia
        </button>
        <button type="button" style={tabBtn(tab === 'plan')} onClick={() => setTab('plan')}>
          <Icon name="strategy" size={13} /> Mi Plan
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0 }}>
        {tab === 'analyzer' ? (
          <StrategyAnalyzer trades={trades} initialBalance={scopeInitialBalance} />
        ) : (
          <StrategyView
            strategyText={settings.strategyText ?? ''}
            onSave={(text) => updateSettings({ strategyText: text })}
          />
        )}
      </div>
    </div>
  );
}
