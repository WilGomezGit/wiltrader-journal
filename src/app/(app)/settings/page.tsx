'use client';
import { useApp } from '@/context/AppContext';
import SettingsView from '@/components/views/SettingsView';

export default function SettingsPage() {
  const { settings, updateSettings } = useApp();
  return (
    <div style={{ height: '100%' }}>
      <SettingsView settings={settings} onSave={updateSettings} />
    </div>
  );
}
