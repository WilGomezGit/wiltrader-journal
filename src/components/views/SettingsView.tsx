'use client';
import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { Button, Card, Field, Modal, PageHeader, inputStyle } from '@/components/ui/kit';
import { useApp } from '@/context/AppContext';
import { downloadCSV, tradesToCSV } from '@/lib/export';
import type { UserSettings } from '@/types';

function TagListEditor({ items, onAdd, onRemove, placeholder }: { items: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder: string }) {
  const [val, setVal] = useState('');
  const add = () => {
    const v = val.trim();
    if (v && !items.includes(v)) { onAdd(v); setVal(''); }
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
        {items.map((item) => (
          <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', padding: '6px 12px', background: 'var(--bg4)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }}>
            {item}
            <button type="button" onClick={() => onRemove(item)} aria-label={`Quitar ${item}`} style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', padding: 0, display: 'flex' }}>
              <Icon name="close" size={12} />
            </button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
        <input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={placeholder} style={inputStyle} />
        <Button variant="gold" onClick={add} aria-label="Agregar"><Icon name="plus" size={14} /></Button>
      </div>
    </div>
  );
}

interface SettingsViewProps {
  settings: UserSettings;
  onSave: (s: Partial<UserSettings>) => Promise<void>;
}

export default function SettingsView({ settings, onSave }: SettingsViewProps) {
  const { allTrades, accounts, scopeAccount, deleteAllTrades } = useApp();
  const [local, setLocal] = useState<UserSettings>(settings);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dangerAccount, setDangerAccount] = useState(scopeAccount?.id ?? accounts[0]?.id ?? '');
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const target = accounts.find((a) => a.id === dangerAccount);
  const targetTrades = allTrades.filter((t) => t.accountId === dangerAccount);

  const handleSave = async () => {
    setSaving(true);
    await onSave(local);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 'var(--sp-2)' }}>
      <div style={{ maxWidth: 760, display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', paddingBottom: 'var(--sp-5)' }}>
        <PageHeader title="Ajustes" subtitle="Preferencias y listas que usa el formulario de operaciones. Las cuentas se administran en Cuentas." />

        <Card title="Perfil y preferencias">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
            <Field label="Nombre del trader"><input style={inputStyle} value={local.traderName} onChange={(e) => setLocal((p) => ({ ...p, traderName: e.target.value }))} /></Field>
            <Field label="Zona horaria">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={local.timezone} onChange={(e) => setLocal((p) => ({ ...p, timezone: e.target.value }))}>
                {['America/Bogota', 'America/New_York', 'Europe/London', 'Asia/Tokyo'].map((z) => <option key={z}>{z}</option>)}
              </select>
            </Field>
          </div>
        </Card>

        <Card title="Estrategias" subtitle="Escribe y pulsa Enter para agregar; × para quitar.">
          <TagListEditor items={local.strategies} placeholder="Nueva estrategia (p.ej. Spring)…"
            onAdd={(v) => setLocal((p) => ({ ...p, strategies: [...p.strategies, v] }))}
            onRemove={(v) => setLocal((p) => ({ ...p, strategies: p.strategies.filter((s) => s !== v) }))} />
        </Card>

        <Card title="Activos operados">
          <TagListEditor items={local.assets} placeholder="Nuevo activo (p.ej. US500)…"
            onAdd={(v) => setLocal((p) => ({ ...p, assets: [...p.assets, v] }))}
            onRemove={(v) => setLocal((p) => ({ ...p, assets: p.assets.filter((a) => a !== v) }))} />
        </Card>

        <Card title="Estados emocionales" subtitle="Disponibles al registrar un trade; puedes usar emojis.">
          <TagListEditor items={local.emotions ?? []} placeholder="Ej: 😎 Enfocado"
            onAdd={(v) => setLocal((p) => ({ ...p, emotions: [...(p.emotions ?? []), v] }))}
            onRemove={(v) => setLocal((p) => ({ ...p, emotions: (p.emotions ?? []).filter((e) => e !== v) }))} />
        </Card>

        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 'var(--sp-4)' }}>
          {saved && <span className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--green)' }}><Icon name="check" size={14} color="var(--green)" /> Cambios guardados</span>}
          <Button variant="primary" onClick={handleSave} disabled={saving} style={{ padding: '11px 28px', fontSize: 13 }}>{saving ? 'Guardando…' : 'Guardar cambios'}</Button>
        </div>

        <Card title="Respaldo" subtitle="Descarga todas tus operaciones de todas las cuentas en un CSV.">
          <Button onClick={() => downloadCSV(tradesToCSV(allTrades, accounts), 'wiltrader-respaldo')}><Icon name="download" size={13} /> Descargar respaldo completo</Button>
        </Card>

        <Card title="Zona de peligro" style={{ borderColor: 'rgba(239,68,68,0.25)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <p style={{ fontSize: 12, color: 'var(--txt3)' }}>Borra todas las operaciones de una cuenta (la cuenta se conserva). Se descarga un CSV de respaldo antes de eliminar.</p>
            <Field label="Cuenta">
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={dangerAccount} onChange={(e) => setDangerAccount(e.target.value)}>
                {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
            <div><Button variant="danger" disabled={!target || targetTrades.length === 0} onClick={() => setShowDelete(true)}><Icon name="trash" size={13} /> Borrar {targetTrades.length} trades</Button></div>
          </div>
        </Card>
      </div>

      {showDelete && target && (
        <Modal title="¿Borrar todos los trades?" onClose={() => !deleting && setShowDelete(false)} width={440}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
            <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6 }}>
              Se eliminarán de forma <strong style={{ color: 'var(--red)' }}>permanente</strong> los <strong>{targetTrades.length} trades</strong> de <strong>{target.name}</strong>. Antes se descargará un CSV de respaldo.
            </p>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
              <Button onClick={() => setShowDelete(false)} disabled={deleting}>Cancelar</Button>
              <Button variant="danger" disabled={deleting} onClick={async () => {
                setDeleting(true);
                downloadCSV(tradesToCSV(targetTrades, accounts), 'wiltrader-respaldo-antes-de-borrar');
                await new Promise((r) => setTimeout(r, 800));
                await deleteAllTrades(target.id);
                setDeleting(false);
                setShowDelete(false);
              }}>{deleting ? 'Borrando…' : 'Sí, descargar y borrar'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
