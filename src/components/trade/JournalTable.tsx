'use client';
import Icon from '@/components/ui/Icon';
import { netPnl, totalCosts, tradeOutcome } from '@/lib/analytics';
import { money, signedMoney, tone } from '@/lib/format';
import type { Trade } from '@/types';

interface JournalTableProps {
  trades: Trade[];
  compact?: boolean;
  onEdit?: (trade: Trade) => void;
  onDelete?: (trade: Trade) => void;
  showCOP?: boolean;
  copRate?: number;
  /** When provided, an "Cuenta" column is shown (used while viewing all accounts). */
  accountNames?: Map<string, string>;
}

const OUTCOME = {
  win: { label: 'Ganancia', color: 'var(--green)', bg: 'var(--green-dim)' },
  loss: { label: 'Pérdida', color: 'var(--red)', bg: 'var(--red-dim)' },
  be: { label: 'Break-even', color: 'var(--gold)', bg: 'var(--gold-dim)' },
} as const;

export default function JournalTable({ trades, compact, onEdit, onDelete, showCOP = true, copRate = 4200, accountNames }: JournalTableProps) {
  const rows = compact ? trades.slice(0, 6) : trades;

  const th: React.CSSProperties = {
    padding: '12px 12px', textAlign: 'left', fontSize: 11, color: 'var(--txt3)', fontWeight: 500,
    letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap',
  };
  const td: React.CSSProperties = { padding: '14px 12px', fontSize: 13, fontFamily: 'var(--mono)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', color: 'var(--gold2)' };

  if (rows.length === 0) {
    return <div style={{ padding: 'var(--sp-6)', textAlign: 'center', color: 'var(--txt3)', fontSize: 13 }}>Aún no hay trades. Agrega tu primer trade para comenzar.</div>;
  }

  const headers = ['Fecha', 'Hora', ...(accountNames ? ['Cuenta'] : []), 'Activo', 'Tipo', 'Estrategia', 'Bruto', 'Costos', 'Neto',
    ...(showCOP ? ['COP'] : []), 'Emoción', 'Resultado', ...(!compact ? [''] : [])];

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{headers.map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((t, i) => {
            const net = netPnl(t);
            const costs = totalCosts(t);
            const cop = t.cop !== 0 ? t.cop : Math.round(net * copRate);
            const o = OUTCOME[tradeOutcome(t)];
            return (
              <tr key={t.id} style={{ transition: 'background 0.15s', animation: `rowIn 0.3s ease ${Math.min(i, 12) * 30}ms both` }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg3)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                <td style={{ ...td, color: 'var(--txt2)' }}>{t.date}</td>
                <td style={{ ...td, color: 'var(--txt3)', fontSize: 12 }}>{t.time || '—'}</td>
                {accountNames && <td style={{ ...td, fontFamily: 'Inter, sans-serif', fontSize: 12, color: 'var(--txt2)' }}>{accountNames.get(t.accountId) ?? '—'}</td>}
                <td style={{ ...td, color: 'var(--gold2)', fontWeight: 600 }}>{t.asset}</td>
                <td style={td}>
                  <span style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: t.type === 'Buy' ? 'var(--green-dim)' : 'var(--red-dim)', color: t.type === 'Buy' ? 'var(--green)' : 'var(--red)' }}>
                    {t.type === 'Buy' ? 'Compra' : 'Venta'}
                  </span>
                </td>
                <td style={td}>
                  <span style={{ padding: '3px 9px', borderRadius: 4, fontSize: 11, color: 'var(--gold)', background: 'var(--gold-dim)' }}>{t.strategy || '—'}</span>
                </td>
                <td style={{ ...td, color: tone(t.result) }}>{signedMoney(t.result)}</td>
                <td style={{ ...td, color: costs > 0 ? 'var(--red)' : 'var(--txt3)', fontSize: 12 }}>{costs > 0 ? `-${money(costs)}` : '—'}</td>
                <td style={{ ...td, color: tone(net), fontWeight: 600 }}>{signedMoney(net)}</td>
                {showCOP && <td style={{ ...td, color: tone(cop), fontSize: 12 }}>{cop >= 0 ? '+' : '-'} COP {Math.abs(cop).toLocaleString('es-CO')}</td>}
                <td style={{ ...td, fontSize: 12 }}>{t.emotion || '—'}</td>
                <td style={td}><span style={{ padding: '4px 10px', borderRadius: 4, fontSize: 11, background: o.bg, color: o.color }}>{o.label}</span></td>
                {!compact && (
                  <td style={{ ...td, position: 'sticky', right: 0, background: 'var(--bg2)', boxShadow: '-8px 0 8px -8px rgba(0,0,0,0.6)' }}>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                      <button type="button" onClick={() => onEdit?.(t)} aria-label="Editar trade" title="Editar" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt2)', cursor: 'pointer', display: 'flex' }}>
                        <Icon name="edit" size={11} />
                      </button>
                      {onDelete && (
                        <button type="button" onClick={() => onDelete(t)} aria-label="Eliminar trade" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt3)', cursor: 'pointer', display: 'flex' }}>
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
