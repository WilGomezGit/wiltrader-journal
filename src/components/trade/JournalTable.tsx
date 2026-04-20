'use client';
import Icon from '@/components/ui/Icon';
import type { Trade } from '@/types';

interface JournalTableProps {
  trades: Trade[];
  compact?: boolean;
  onEdit?: (trade: Trade) => void;
  onDelete?: (trade: Trade) => void;
  showCOP?: boolean;
  copRate?: number;
}

export default function JournalTable({ trades, compact, onEdit, onDelete, showCOP = true, copRate = 4200 }: JournalTableProps) {
  const rows = compact ? trades.slice(0, 6) : trades;

  const th: React.CSSProperties = {
    padding: '10px 14px', textAlign: 'left', fontSize: 11,
    color: 'var(--txt3)', fontWeight: 500, letterSpacing: '0.06em',
    textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = {
    padding: '11px 14px', fontSize: 13, fontFamily: 'var(--mono)',
    borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  };

  const computedCOP = (t: Trade) => {
    const val = t.cop !== 0 ? t.cop : Math.round(t.result * copRate);
    return val;
  };

  if (rows.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>
        No trades yet. Add your first trade to get started.
      </div>
    );
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['Date', 'Time', 'Asset', 'Type', 'Strategy', 'P/L (USD)',
              ...(showCOP ? ['COP'] : []),
              'Emotion', 'Status'].map((h) => (
              <th key={h} style={th}>{h}</th>
            ))}
            {!compact && <th style={th}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
            const cop = computedCOP(t);
            return (
              <tr key={t.id} style={{ transition: 'background 0.15s', animation: `rowIn 0.3s ease ${i * 40}ms both` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <td style={{ ...td, color: 'var(--txt2)' }}>{t.date}</td>
                <td style={{ ...td, color: 'var(--txt3)', fontSize: 11 }}>{t.time || '—'}</td>
                <td style={{ ...td, color: 'var(--gold2)', fontWeight: 600 }}>{t.asset}</td>
                <td style={td}>
                  <span style={{
                    padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: t.type === 'Buy' ? 'var(--green-dim)' : 'var(--red-dim)',
                    color: t.type === 'Buy' ? 'var(--green)' : 'var(--red)',
                    border: `1px solid ${t.type === 'Buy' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  }}>{t.type}</span>
                </td>
                <td style={{ ...td, color: 'var(--gold)' }}>
                  <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 11, background: 'var(--gold-dim)', border: '1px solid rgba(201,162,39,0.2)' }}>
                    {t.strategy}
                  </span>
                </td>
                <td style={{ ...td, color: t.result >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                  {t.result >= 0 ? '+$' : '-$'}{Math.abs(t.result).toLocaleString()}
                </td>
                {showCOP && (
                  <td style={{ ...td, color: cop >= 0 ? 'var(--green)' : 'var(--red)', fontSize: 12 }}>
                    {cop >= 0 ? '+ ' : '- '}COP {Math.abs(cop).toLocaleString('es-CO')}
                  </td>
                )}
                <td style={{ ...td, fontSize: 12 }}>{t.emotion || '—'}</td>
                <td style={td}>
                  <span style={{
                    padding: '2px 8px', borderRadius: 4, fontSize: 11,
                    background: t.status === 'Win' ? 'var(--green-dim)' : t.status === 'BE' ? 'var(--gold-dim)' : 'var(--red-dim)',
                    color: t.status === 'Win' ? 'var(--green)' : t.status === 'BE' ? 'var(--gold)' : 'var(--red)',
                  }}>{t.status}</span>
                </td>
                {!compact && (
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => onEdit?.(t)} style={{
                        padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border2)',
                        background: 'transparent', color: 'var(--txt2)', fontSize: 11, cursor: 'pointer',
                        transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: 4,
                      }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.color = 'var(--gold)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--txt2)'; }}
                      >
                        <Icon name="edit" size={11} /> Edit
                      </button>
                      {onDelete && (
                        <button type="button" onClick={() => onDelete(t)} style={{
                          padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border2)',
                          background: 'transparent', color: 'var(--txt3)', fontSize: 11, cursor: 'pointer', transition: 'all 0.15s',
                        }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.color = 'var(--red)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--txt3)'; }}
                        >
                          <Icon name="trash" size={11} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
