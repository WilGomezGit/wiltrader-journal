'use client';
import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import type { UserSettings } from '@/types';

interface TagListEditorProps {
  items: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder: string;
  accentColor?: string;
}

function TagListEditor({ items, onAdd, onRemove, placeholder, accentColor = 'var(--gold)' }: TagListEditorProps) {
  const [val, setVal] = useState('');
  const add = () => {
    const v = val.trim();
    if (v && !items.includes(v)) { onAdd(v); setVal(''); }
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {items.map((item) => (
          <div key={item} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
            background: 'var(--bg4)', border: `1px solid ${accentColor}44`,
            borderRadius: 8, fontSize: 12, color: 'var(--txt)',
            animation: 'tagPop 0.25s cubic-bezier(.22,.68,0,1.2) both',
          }}>
            <span>{item}</span>
            <button
              type="button"
              onClick={() => onRemove(item)}
              style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', padding: 0, display: 'flex', lineHeight: 1, transition: 'color 0.15s' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--red)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--txt3)')}
            >
              <Icon name="close" size={12} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder={placeholder}
          style={{ flex: 1, padding: '8px 12px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, outline: 'none', fontFamily: 'var(--mono)' }}
          onFocus={(e) => (e.target.style.borderColor = accentColor)}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
        />
        <button
          type="button"
          onClick={add}
          style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${accentColor}`, background: `${accentColor}22`, color: accentColor, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = `${accentColor}44`)}
          onMouseLeave={(e) => (e.currentTarget.style.background = `${accentColor}22`)}
        >
          <Icon name="plus" size={14} />
        </button>
      </div>
    </div>
  );
}

interface SettingsViewProps {
  settings: UserSettings;
  onSave: (s: Partial<UserSettings>) => Promise<void>;
}

export default function SettingsView({ settings, onSave }: SettingsViewProps) {
  const [local, setLocal] = useState<UserSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, color: 'var(--txt)', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none' };
  const lbl: React.CSSProperties = { fontSize: 11, color: 'var(--txt2)', marginBottom: 4, display: 'block', letterSpacing: '0.04em', textTransform: 'uppercase' };
  const focus = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--gold)');
  const blur = (e: React.FocusEvent<HTMLElement>) => ((e.target as HTMLElement).style.borderColor = 'var(--border2)');

  const handleSave = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto', height: '100%', paddingBottom: 20 }}>
      {/* Account */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Icon name="trophy" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Cuenta</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {[
            ['Nombre del Trader', 'traderName', 'text'],
            ['Balance Inicial (USD)', 'initialBalance', 'number'],
            ['Cuenta Broker', 'broker', 'text'],
          ].map(([label, key, type]) => (
            <div key={String(key)}>
              <label style={lbl}>{label}</label>
              <input
                type={type}
                value={String(local[key as keyof UserSettings])}
                onChange={(e) => setLocal((prev) => ({ ...prev, [key]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
                style={inp}
                onFocus={focus}
                onBlur={blur}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Preferences */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px', animationDelay: '60ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Icon name="settings" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Preferencias</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Moneda Base</label>
            <select value={local.baseCurrency} onChange={(e) => setLocal((p) => ({ ...p, baseCurrency: e.target.value as any }))} style={{ ...inp, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
              {['USD', 'COP', 'EUR', 'GBP'].map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>Zona Horaria</label>
            <select value={local.timezone} onChange={(e) => setLocal((p) => ({ ...p, timezone: e.target.value }))} style={{ ...inp, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
              {['America/Bogota', 'America/New_York', 'Europe/London', 'Asia/Tokyo'].map((z) => <option key={z}>{z}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Strategies */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px', animationDelay: '120ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="layers" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Estrategias</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>Gestiona las estrategias disponibles. Pulsa × para eliminar, escribe y Enter para agregar.</p>
        <TagListEditor
          items={local.strategies}
          onAdd={(v) => setLocal((p) => ({ ...p, strategies: [...p.strategies, v] }))}
          onRemove={(v) => setLocal((p) => ({ ...p, strategies: p.strategies.filter((s) => s !== v) }))}
          placeholder="Nueva estrategia (p.ej. Creek)…"
        />
      </div>

      {/* Assets */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px', animationDelay: '160ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="tag" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Activos Operados</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>Agrega o elimina los activos que operas.</p>
        <TagListEditor
          items={local.assets}
          onAdd={(v) => setLocal((p) => ({ ...p, assets: [...p.assets, v] }))}
          onRemove={(v) => setLocal((p) => ({ ...p, assets: p.assets.filter((a) => a !== v) }))}
          placeholder="Nuevo activo (p.ej. ETHUSDT)…"
          accentColor="var(--green)"
        />
      </div>

      {/* Firebase status */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px', animationDelay: '200ms' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Firebase</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--txt2)', marginBottom: 16 }}>
          <span style={{ width: 8, height: 8, background: 'var(--green)', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          Conectado — Firestore + Auth activos
        </div>
      </div>

      {/* Save */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        {saved && (
          <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--green)' }}>
            <Icon name="check" size={14} color="var(--green)" /> Cambios guardados
          </div>
        )}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '10px 28px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)',
            color: '#0a0a08', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.15s', opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>
    </div>
  );
}
