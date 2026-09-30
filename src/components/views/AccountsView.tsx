'use client';
import { useState } from 'react';
import Icon from '@/components/ui/Icon';
import { Badge, Button, Card, Field, Modal, PageHeader, Stat, inputStyle } from '@/components/ui/kit';
import AccountForm, { phaseLabel } from '@/components/views/AccountForm';
import PropProgress from '@/components/ui/PropProgress';
import { money, pct, profitFactor, signedMoney, tone } from '@/lib/format';
import { todayISO } from '@/lib/dates';
import type { AccountSummary, ConsolidatedSummary } from '@/lib/analytics';
import type { Account, Cashflow } from '@/types';
import type { NewAccountData, AccountPatch } from '@/lib/accounts';

interface AccountsViewProps {
  summaries: AccountSummary[];
  /** Totals of the active accounts only. */
  consolidated: ConsolidatedSummary;
  cashflows: Cashflow[];
  viewAccountId: string;
  onView: (id: string) => void;
  onCreate: (data: NewAccountData) => Promise<unknown>;
  onUpdate: (id: string, data: AccountPatch) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onAddCashflow: (data: { accountId: string; type: Cashflow['type']; amount: number; date: string; note?: string }) => Promise<void>;
  onRemoveCashflow: (id: string) => Promise<void>;
}

const grid = (min: number): React.CSSProperties => ({ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`, gap: 'var(--sp-5)' });

function CashflowModal({ account, type, onSave, onClose }: {
  account: Account; type: Cashflow['type']; onSave: (amount: number, date: string, note: string) => Promise<void>; onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const valid = parseFloat(amount) > 0;
  return (
    <Modal title={`${type === 'deposit' ? 'Registrar depósito' : 'Registrar retiro'} · ${account.name}`} onClose={onClose} width={420}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
        <Field label={`Monto (${account.baseCurrency})`}><input style={inputStyle} type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus /></Field>
        <Field label="Fecha"><input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Nota (opcional)"><input style={inputStyle} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!valid || saving} onClick={async () => { setSaving(true); await onSave(parseFloat(amount), date, note); onClose(); }}>Guardar</Button>
        </div>
      </div>
    </Modal>
  );
}

function AccountCard({ s, cashflows, isView, onView, onEdit, onToggle, onDelete, onCashflow, onRemoveCashflow }: {
  s: AccountSummary; cashflows: Cashflow[]; isView: boolean;
  onView: () => void; onEdit: () => void; onToggle: () => void; onDelete: () => void;
  onCashflow: (type: Cashflow['type']) => void; onRemoveCashflow: (id: string) => void;
}) {
  const { account: a, stats, prop } = s;
  const hasTrades = stats.totalTrades > 0;
  return (
    <Card style={{ opacity: a.active ? 1 : 0.65, borderColor: isView ? 'var(--gold)' : undefined }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-4)', flexWrap: 'wrap', marginBottom: 'var(--sp-5)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--gold2)' }}>{a.name}</h2>
            <Badge color={a.kind === 'prop' ? 'var(--gold2)' : 'var(--txt2)'} bg={a.kind === 'prop' ? 'var(--gold-dim)' : 'var(--bg4)'}>{a.kind === 'prop' ? 'Fondeo' : 'Personal'}</Badge>
            {a.prop && <Badge>{phaseLabel(a.prop.phase)}</Badge>}
            {!a.active && <Badge color="var(--txt3)">Inactiva</Badge>}
          </div>
          <p style={{ fontSize: 12, color: 'var(--txt3)', marginTop: 'var(--sp-2)' }}>
            {[a.broker, a.platform, a.accountNumber && `#${a.accountNumber}`, a.baseCurrency].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Button variant={isView ? 'gold' : 'ghost'} onClick={onView}>{isView ? 'Viendo' : 'Ver cuenta'}</Button>
          <Button onClick={onEdit}><Icon name="edit" size={12} /> Editar</Button>
          <Button onClick={onToggle}>{a.active ? 'Desactivar' : 'Activar'}</Button>
          <Button variant="danger" onClick={onDelete} aria-label={`Eliminar ${a.name}`}><Icon name="trash" size={12} /></Button>
        </div>
      </div>

      <div style={grid(130)}>
        <Stat label="Balance" value={money(s.balance)} />
        <Stat label="P&L neto" value={signedMoney(stats.pnl)} color={tone(stats.pnl)} />
        <Stat label="Tasa de victorias" value={hasTrades ? pct(stats.winRate) : '—'} />
        <Stat label="Factor de ganancia" value={profitFactor(stats.profitFactor, hasTrades)} />
        <Stat label="Reducción máx." value={hasTrades ? pct(stats.maxDrawdown.pct, 2) : '—'} color={stats.maxDrawdown.amount > 0 ? 'var(--red)' : undefined} />
        <Stat label="Operaciones" value={stats.totalTrades} />
      </div>

      {prop && a.prop && (
        <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--border)' }}>
          <PropProgress account={a} status={prop} />
        </div>
      )}

      {a.kind === 'personal' && (
        <div style={{ marginTop: 'var(--sp-5)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          <div style={grid(130)}>
            <Stat label="Capital neto" value={money(s.netCapital)} sub="inicial + depósitos − retiros" />
            <Stat label="Depósitos" value={money(s.deposits)} />
            <Stat label="Retiros" value={money(s.withdrawals)} />
            <Stat label="ROI" value={stats.roi === null ? '—' : pct(stats.roi, 2)} color={stats.roi === null ? undefined : tone(stats.roi)} sub="sobre balance inicial" />
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <Button variant="gold" onClick={() => onCashflow('deposit')}><Icon name="plus" size={12} /> Depósito</Button>
            <Button onClick={() => onCashflow('withdrawal')}>Retiro</Button>
          </div>
          {cashflows.length > 0 && (
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {cashflows.slice(-5).reverse().map((c) => (
                <li key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: 'var(--txt2)', padding: '8px 12px', background: 'var(--bg3)', borderRadius: 8 }}>
                  <span>{c.date} · {c.type === 'deposit' ? 'Depósito' : 'Retiro'}{c.note ? ` · ${c.note}` : ''}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <span style={{ fontFamily: 'var(--mono)', color: c.type === 'deposit' ? 'var(--green)' : 'var(--red)' }}>{c.type === 'deposit' ? '+' : '-'}{money(c.amount)}</span>
                    <button type="button" onClick={() => onRemoveCashflow(c.id)} aria-label="Eliminar movimiento" style={{ background: 'none', border: 'none', color: 'var(--txt3)', cursor: 'pointer', display: 'flex' }}><Icon name="close" size={12} /></button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

export default function AccountsView({ summaries, consolidated, cashflows, viewAccountId, onView, onCreate, onUpdate, onDelete, onAddCashflow, onRemoveCashflow }: AccountsViewProps) {
  const [editing, setEditing] = useState<Account | 'new' | null>(null);
  const [deleting, setDeleting] = useState<AccountSummary | null>(null);
  const [cashflow, setCashflow] = useState<{ account: Account; type: Cashflow['type'] } | null>(null);
  const [busy, setBusy] = useState(false);

  const active = summaries.filter((s) => s.account.active);
  const th: React.CSSProperties = { padding: '10px 14px', textAlign: 'right', fontSize: 11, color: 'var(--txt3)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { padding: '12px 14px', textAlign: 'right', fontSize: 13, fontFamily: 'var(--mono)', whiteSpace: 'nowrap', color: 'var(--gold2)' };
  const cs = consolidated.stats;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', paddingBottom: 'var(--sp-5)' }}>
      <PageHeader title="Cuentas" subtitle="Cada cuenta tiene sus propias operaciones y reglas; nunca se mezclan."
        actions={<Button variant="primary" onClick={() => setEditing('new')}><Icon name="plus" size={13} /> Nueva cuenta</Button>} />

      {summaries.length === 0 && (
        <Card><p style={{ fontSize: 13, color: 'var(--txt3)', textAlign: 'center', padding: 'var(--sp-5) 0' }}>Aún no tienes cuentas. Crea la primera para empezar a registrar operaciones.</p></Card>
      )}

      {active.length > 1 && (
        <Card title="Comparación de cuentas activas" subtitle="La fila Total suma las cuentas activas sin alterar los datos de cada una." pad="var(--sp-5) 0 var(--sp-2)">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
              <thead><tr>
                <th style={{ ...th, textAlign: 'left', paddingLeft: 'var(--sp-5)' }}>Cuenta</th>
                <th style={th}>Balance</th><th style={th}>P&L neto</th><th style={th}>Victorias</th><th style={th}>F. ganancia</th><th style={th}>Red. máx.</th>
                <th style={{ ...th, paddingRight: 'var(--sp-5)' }}>Ops.</th>
              </tr></thead>
              <tbody>
                {active.map((s) => (
                  <tr key={s.account.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...td, textAlign: 'left', paddingLeft: 'var(--sp-5)', fontFamily: 'Inter, sans-serif', fontWeight: 600 }}>{s.account.name}</td>
                    <td style={td}>{money(s.balance)}</td>
                    <td style={{ ...td, color: tone(s.stats.pnl) }}>{signedMoney(s.stats.pnl)}</td>
                    <td style={td}>{s.stats.totalTrades ? pct(s.stats.winRate) : '—'}</td>
                    <td style={td}>{profitFactor(s.stats.profitFactor, s.stats.totalTrades > 0)}</td>
                    <td style={{ ...td, color: s.stats.maxDrawdown.amount > 0 ? 'var(--red)' : undefined }}>{s.stats.totalTrades ? pct(s.stats.maxDrawdown.pct, 2) : '—'}</td>
                    <td style={{ ...td, paddingRight: 'var(--sp-5)' }}>{s.stats.totalTrades}</td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg3)' }}>
                  <td style={{ ...td, textAlign: 'left', paddingLeft: 'var(--sp-5)', fontFamily: 'Inter, sans-serif', fontWeight: 700, color: 'var(--gold2)' }}>Total</td>
                  <td style={{ ...td, fontWeight: 700 }}>{money(consolidated.totalBalance)}</td>
                  <td style={{ ...td, fontWeight: 700, color: tone(cs.pnl) }}>{signedMoney(cs.pnl)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{cs.totalTrades ? pct(cs.winRate) : '—'}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{profitFactor(cs.profitFactor, cs.totalTrades > 0)}</td>
                  <td style={{ ...td, fontWeight: 700, color: cs.maxDrawdown.amount > 0 ? 'var(--red)' : undefined }}>{cs.totalTrades ? pct(cs.maxDrawdown.pct, 2) : '—'}</td>
                  <td style={{ ...td, fontWeight: 700, paddingRight: 'var(--sp-5)' }}>{cs.totalTrades}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {summaries.map((s) => (
        <AccountCard key={s.account.id} s={s} isView={viewAccountId === s.account.id}
          cashflows={cashflows.filter((c) => c.accountId === s.account.id)}
          onView={() => onView(s.account.id)}
          onEdit={() => setEditing(s.account)}
          onToggle={() => onUpdate(s.account.id, { active: !s.account.active })}
          onDelete={() => setDeleting(s)}
          onCashflow={(type) => setCashflow({ account: s.account, type })}
          onRemoveCashflow={onRemoveCashflow} />
      ))}

      {editing && (
        <AccountForm account={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)}
          onSave={async (data) => { if (editing === 'new') await onCreate(data); else await onUpdate(editing.id, data); }} />
      )}

      {cashflow && (
        <CashflowModal account={cashflow.account} type={cashflow.type} onClose={() => setCashflow(null)}
          onSave={(amount, date, note) => onAddCashflow({ accountId: cashflow.account.id, type: cashflow.type, amount, date, note })} />
      )}

      {deleting && (
        <Modal title="¿Eliminar cuenta?" onClose={() => setDeleting(null)} width={460}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <p style={{ fontSize: 13, color: 'var(--txt2)', lineHeight: 1.6 }}>
              Se eliminará <strong>{deleting.account.name}</strong> junto con sus <strong>{deleting.stats.totalTrades} operaciones</strong> y sus depósitos/retiros. Esta acción es <strong style={{ color: 'var(--red)' }}>permanente</strong>.
              Si solo quieres dejar de verla, usa «Desactivar».
            </p>
            <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
              <Button onClick={() => setDeleting(null)} disabled={busy}>Cancelar</Button>
              <Button variant="danger" disabled={busy} onClick={async () => { setBusy(true); await onDelete(deleting.account.id); setBusy(false); setDeleting(null); }}>
                {busy ? 'Eliminando…' : 'Sí, eliminar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
