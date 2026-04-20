'use client';
import { useState } from 'react';
import Icon from '@/components/ui/Icon';

interface StrategyViewProps {
  strategyText: string;
  onSave: (text: string) => Promise<void>;
}

export default function StrategyView({ strategyText, onSave }: StrategyViewProps) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(strategyText);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(text);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCancel = () => {
    setText(strategyText);
    setEditing(false);
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 860 }}>

      {/* Header */}
      <div className="fade-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Icon name="strategy" size={20} color="var(--gold)" />
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--txt)', lineHeight: 1 }}>Mi Estrategia</h1>
            <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 4 }}>Plan de trading personal — guardado en Firestore</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saved && (
            <div className="fade-in" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--green)' }}>
              <Icon name="check" size={13} color="var(--green)" /> Guardado
            </div>
          )}
          {editing ? (
            <>
              <button onClick={handleCancel} style={{
                padding: '8px 16px', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border2)', background: 'transparent',
                color: 'var(--txt2)', fontSize: 12, cursor: 'pointer',
              }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving} style={{
                padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: 'none',
                background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)',
                color: '#0a0a08', fontWeight: 700, fontSize: 12, cursor: 'pointer',
                opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {saving ? (
                  <span style={{ width: 12, height: 12, border: '2px solid #0a0a08', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                ) : <Icon name="check" size={13} />}
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)} style={{
              padding: '8px 16px', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--gold-border)',
              background: 'var(--gold-dim)', color: 'var(--gold)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s',
            }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(201,162,39,0.25)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'var(--gold-dim)')}
            >
              <Icon name="edit" size={13} /> Editar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="fade-up" style={{
        flex: 1, background: 'var(--bg2)', border: 'var(--card-border)',
        borderRadius: 'var(--radius)', overflow: 'hidden',
        animationDelay: '80ms',
      }}>
        {editing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoFocus
            placeholder="Describe tu plan de trading: criterios de entrada, gestión de riesgo, marcos temporales, reglas de salida, psicología..."
            style={{
              width: '100%', height: '100%', padding: '24px',
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--txt)', fontSize: 14, lineHeight: 1.8,
              resize: 'none', fontFamily: 'Inter, sans-serif',
            }}
          />
        ) : text ? (
          <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontSize: 14, lineHeight: 1.8, color: 'var(--txt)',
              fontFamily: 'Inter, sans-serif',
            }}>
              {text}
            </pre>
          </div>
        ) : (
          <div style={{
            height: '100%', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 12,
            color: 'var(--txt3)',
          }}>
            <Icon name="strategy" size={40} color="var(--border2)" />
            <p style={{ fontSize: 14 }}>Aún no tienes una estrategia escrita.</p>
            <button onClick={() => setEditing(true)} style={{
              padding: '10px 22px', borderRadius: 'var(--radius-sm)', border: 'none',
              background: 'linear-gradient(135deg,#b8880a,#d4a500,#e8c45a)',
              color: '#0a0a08', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}>
              Escribir mi estrategia
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
