'use client';
import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { useApp } from '@/context/AppContext';
import ImportTradesModal from '@/components/trade/ImportTradesModal';
import type { UserSettings, Trade, Account } from '@/types';

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

function AccountRow({ account, isActive, canDelete, onRename, onDelete, onActivate }: {
  account: Account;
  isActive: boolean;
  canDelete: boolean;
  onRename: (data: Partial<Omit<Account, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  onDelete: () => Promise<void>;
  onActivate: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(account.name);
  const [broker, setBroker] = useState(account.broker);
  const [currency, setCurrency] = useState<Account['baseCurrency']>(account.baseCurrency);
  const [balance, setBalance] = useState(String(account.initialBalance));
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const inp: React.CSSProperties = { padding: '7px 10px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--txt)', fontSize: 12, outline: 'none', fontFamily: 'var(--mono)' };

  const save = async () => {
    setSaving(true);
    await onRename({ name: name.trim() || account.name, broker, baseCurrency: currency, initialBalance: parseFloat(balance) || 0 });
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ padding: '14px', background: 'var(--bg3)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" style={inp} />
        <input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="Broker" style={inp} />
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={currency} onChange={(e) => setCurrency(e.target.value as Account['baseCurrency'])} style={{ ...inp, flex: 1, cursor: 'pointer' }}>
            {(['USD', 'COP', 'EUR', 'GBP'] as const).map((c) => <option key={c}>{c}</option>)}
          </select>
          <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="Balance inicial" style={{ ...inp, flex: 1 }} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={() => setEditing(false)} style={{ flex: 1, padding: '7px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt2)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
          <button type="button" onClick={save} disabled={saving} style={{ flex: 1, padding: '7px', borderRadius: 6, border: 'none', background: 'var(--gold)', color: '#0a0a08', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>{saving ? '...' : 'Guardar'}</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
      padding: '12px 14px', background: 'var(--bg3)', borderRadius: 10,
      border: isActive ? '1px solid var(--gold-border)' : '1px solid transparent',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: isActive ? 'var(--gold)' : 'var(--border2)', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{account.name}</div>
          <div style={{ fontSize: 11, color: 'var(--txt3)', fontFamily: 'var(--mono)' }}>
            {account.broker} · {account.baseCurrency} · Balance inicial ${account.initialBalance.toLocaleString()}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {!isActive && (
          <button type="button" onClick={onActivate} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', color: 'var(--gold)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
            Activar
          </button>
        )}
        <button type="button" onClick={() => setEditing(true)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt2)', cursor: 'pointer', display: 'flex' }}>
          <Icon name="edit" size={13} />
        </button>
        {canDelete && (
          confirming ? (
            <button type="button" onClick={onDelete} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)', color: 'var(--red)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              ¿Confirmar?
            </button>
          ) : (
            <button type="button" onClick={() => setConfirming(true)} onBlur={() => setConfirming(false)} style={{ padding: '6px 8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt3)', cursor: 'pointer', display: 'flex' }}>
              <Icon name="trash" size={13} />
            </button>
          )
        )}
      </div>
    </div>
  );
}

function AccountsManager() {
  const { accounts, activeAccountId, switchAccount, addAccount, renameAccount, deleteAccount } = useApp();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [broker, setBroker] = useState('MT5 — Live');
  const [currency, setCurrency] = useState<Account['baseCurrency']>('USD');
  const [balance, setBalance] = useState('20000');
  const [creating, setCreating] = useState(false);

  const inp: React.CSSProperties = { padding: '8px 10px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 6, color: 'var(--txt)', fontSize: 12, outline: 'none', fontFamily: 'var(--mono)' };

  const create = async () => {
    if (!name.trim()) return;
    setCreating(true);
    await addAccount({ name: name.trim(), broker, baseCurrency: currency, initialBalance: parseFloat(balance) || 0 });
    setCreating(false); setAdding(false);
    setName(''); setBroker('MT5 — Live'); setCurrency('USD'); setBalance('20000');
  };

  return (
    <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '20ms' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="trophy" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Cuentas</span>
        </div>
        {!adding && (
          <button type="button" onClick={() => setAdding(true)} style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--gold-border)', background: 'var(--gold-dim)', color: 'var(--gold)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Icon name="plus" size={12} /> Nueva Cuenta
          </button>
        )}
      </div>
      <p style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>Administra tus cuentas de trading. Cada cuenta tiene su propio balance, broker y trades independientes.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {accounts.map((a) => (
          <AccountRow
            key={a.id}
            account={a}
            isActive={a.id === activeAccountId}
            canDelete={accounts.length > 1}
            onActivate={() => switchAccount(a.id)}
            onRename={(data) => renameAccount(a.id, data)}
            onDelete={() => deleteAccount(a.id)}
          />
        ))}
      </div>

      {adding && (
        <div style={{ marginTop: 12, padding: 14, background: 'var(--bg3)', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre (p.ej. Cuenta Fondeada)" style={inp} />
          <input value={broker} onChange={(e) => setBroker(e.target.value)} placeholder="Broker" style={inp} />
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={currency} onChange={(e) => setCurrency(e.target.value as Account['baseCurrency'])} style={{ ...inp, flex: 1, cursor: 'pointer' }}>
              {(['USD', 'COP', 'EUR', 'GBP'] as const).map((c) => <option key={c}>{c}</option>)}
            </select>
            <input type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="Balance inicial" style={{ ...inp, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setAdding(false)} style={{ flex: 1, padding: '8px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt2)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            <button type="button" onClick={create} disabled={creating || !name.trim()} style={{ flex: 1, padding: '8px', borderRadius: 6, border: 'none', background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)', color: '#0a0a08', fontWeight: 700, fontSize: 12, cursor: 'pointer', opacity: creating || !name.trim() ? 0.6 : 1 }}>
              {creating ? '...' : 'Crear Cuenta'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface SettingsViewProps {
  settings: UserSettings;
  onSave: (s: Partial<UserSettings>) => Promise<void>;
}

function exportCSV(trades: Trade[]) {
  const headers = ['Date', 'Time', 'Asset', 'Type', 'Strategy', 'Entry', 'SL', 'TP', 'Lot Size', 'Result USD', 'COP', 'Emotion', 'Status', 'Notes'];
  const rows = trades.map((t) => [
    t.date, t.time || '', t.asset, t.type, t.strategy,
    t.entry, t.sl, t.tp, t.lotSize || '',
    t.result, t.cop, t.emotion || '', t.status,
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wiltrader-backup-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SettingsView({ settings, onSave }: SettingsViewProps) {
  const { trades, deleteAllTrades } = useApp();
  const [local, setLocal] = useState<UserSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

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
      {/* Profile */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Icon name="trophy" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Perfil</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Nombre del Trader</label>
            <input
              type="text"
              value={local.traderName}
              onChange={(e) => setLocal((prev) => ({ ...prev, traderName: e.target.value }))}
              style={inp}
              onFocus={focus}
              onBlur={blur}
            />
          </div>
        </div>
      </div>

      {/* Accounts */}
      <AccountsManager />

      {/* Import history */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '40ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="upload" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Importar Historial</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>
          Sube el reporte de historial (.xlsx) exportado desde MetaTrader (MT4/MT5) para importar automáticamente tus operaciones, comisiones y swaps a una cuenta nueva o existente.
        </p>
        <button
          type="button"
          onClick={() => setShowImportModal(true)}
          style={{
            padding: '9px 20px', borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--gold-border)', background: 'var(--gold-dim)',
            color: 'var(--gold)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          <Icon name="upload" size={14} /> Importar desde Excel
        </button>
      </div>

      {/* Preferences */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '60ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Icon name="settings" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Preferencias</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <label style={lbl}>Zona Horaria</label>
            <select value={local.timezone} onChange={(e) => setLocal((p) => ({ ...p, timezone: e.target.value }))} style={{ ...inp, cursor: 'pointer' }} onFocus={focus} onBlur={blur}>
              {['America/Bogota', 'America/New_York', 'Europe/London', 'Asia/Tokyo'].map((z) => <option key={z}>{z}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Strategies */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '120ms' }}>
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
      <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '160ms' }}>
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

      {/* Emotions */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '180ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ fontSize: 16 }}>🧠</span>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Estados Emocionales</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>Emociones disponibles al registrar un trade. Puedes personalizar con emojis.</p>
        <TagListEditor
          items={local.emotions ?? []}
          onAdd={(v) => setLocal((p) => ({ ...p, emotions: [...(p.emotions ?? []), v] }))}
          onRemove={(v) => setLocal((p) => ({ ...p, emotions: (p.emotions ?? []).filter((e) => e !== v) }))}
          placeholder="Ej: 😎 Enfocado"
          accentColor="var(--gold)"
        />
      </div>

      {/* Strategy Text */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '210ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="layers" size={16} color="var(--gold)" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>Mi Estrategia</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>Describe tu estrategia principal. Se guarda en Firestore y puedes editarla cuando quieras.</p>
        <textarea
          value={local.strategyText ?? ''}
          onChange={(e) => setLocal((p) => ({ ...p, strategyText: e.target.value }))}
          rows={8}
          placeholder="Describe tu plan de trading: criterios de entrada, gestión de riesgo, marcos temporales, reglas de salida..."
          style={{ width: '100%', padding: '12px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 'var(--radius-sm)', color: 'var(--txt)', fontSize: 13, lineHeight: 1.6, resize: 'vertical', outline: 'none', fontFamily: 'Inter, sans-serif', transition: 'border-color 0.15s' }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--gold)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border2)')}
        />
      </div>

      {/* Danger Zone */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '220ms' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="trash" size={16} color="var(--red)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--red)' }}>Zona de Peligro</span>
        </div>
        <p style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 16 }}>
          Borra permanentemente todos los trades de la cuenta activa. Se descargará un CSV de respaldo antes de eliminar.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteModal(true)}
          style={{
            padding: '9px 20px', borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(239,68,68,0.4)',
            background: 'rgba(239,68,68,0.08)', color: 'var(--red)',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.18)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; }}
        >
          <Icon name="trash" size={14} /> Borrar todos los trades
        </button>
      </div>

      {/* Firebase status */}
      <div className="fade-up" style={{ background: 'var(--bg2)', border: 'var(--card-border)', borderRadius: 'var(--radius)', padding: '22px', animationDelay: '200ms' }}>
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

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="fade-up" style={{
            background: 'var(--bg2)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 'var(--radius)', padding: '32px', width: 420, maxWidth: '90vw',
            boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="trash" size={18} color="var(--red)" />
              </div>
              <span style={{ fontSize: 16, fontWeight: 700 }}>¿Borrar todos los trades?</span>
            </div>

            <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6, marginBottom: 8 }}>
              Esta acción es <strong style={{ color: 'var(--red)' }}>permanente e irreversible</strong>. Se eliminarán los <strong>{trades.length} trades</strong> de Firestore.
            </p>
            <p style={{ fontSize: 13, color: 'var(--txt3)', marginBottom: 24 }}>
              Si confirmas, se descargará automáticamente un archivo CSV con todos tus datos antes de borrar.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{
                  flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border2)', background: 'transparent',
                  color: 'var(--txt2)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}
              >
                No, cancelar
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  exportCSV(trades);
                  await new Promise((r) => setTimeout(r, 800));
                  await deleteAllTrades();
                  setDeleting(false);
                  setShowDeleteModal(false);
                }}
                style={{
                  flex: 1, padding: '11px', borderRadius: 'var(--radius-sm)',
                  border: 'none', background: deleting ? 'rgba(239,68,68,0.4)' : 'var(--red)',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {deleting ? (
                  <><span style={{ width: 14, height: 14, border: '2px solid #fff', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} /> Borrando...</>
                ) : (
                  <><Icon name="trash" size={14} /> Sí, descargar y borrar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showImportModal && <ImportTradesModal onClose={() => setShowImportModal(false)} />}
    </div>
  );
}
