'use client';
import { ProgressBar } from '@/components/ui/kit';
import { money, signedMoney } from '@/lib/format';
import type { PropStatus } from '@/lib/analytics';
import type { Account } from '@/types';

function LimitBar({ label, remaining, usedPct, detail }: { label: string; remaining: number | null; usedPct: number | null; detail: string }) {
  if (remaining === null || usedPct === null) return null;
  const color = usedPct >= 80 ? 'var(--red)' : usedPct >= 50 ? 'var(--gold)' : 'var(--green)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
        <span style={{ color: 'var(--txt2)' }}>{label}</span>
        <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: 'var(--gold2)' }}>{money(remaining)} <span style={{ color: 'var(--txt3)', fontWeight: 400 }}>disponibles</span></span>
      </div>
      <ProgressBar value={usedPct} color={color} height={6} />
      <span style={{ fontSize: 11, color: 'var(--txt3)' }}>{detail}</span>
    </div>
  );
}

/** Profit target progress and distance to the daily / total loss limits of ONE prop account. */
export default function PropProgress({ account, status }: { account: Account; status: PropStatus }) {
  const rules = account.prop;
  if (!rules) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }}>
      {rules.profitTarget > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            <span style={{ fontSize: 11, color: 'var(--txt3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Progreso</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700 }}>
              <span style={{ color: status.profit > 0 ? 'var(--green)' : status.profit < 0 ? 'var(--red)' : 'var(--txt3)' }}>{money(status.profit)}</span> <span style={{ color: 'var(--gold2)' }}>/ {money(status.target)}</span> <span style={{ color: 'var(--gold2)' }}>· {Math.max(status.progressPct, 0).toFixed(0)}%</span>
            </span>
          </div>
          <ProgressBar value={status.progressPct} color={status.targetReached ? 'var(--green)' : 'var(--gold)'} height={10} />
          <span style={{ fontSize: 12, color: 'var(--txt3)' }}>
            {status.targetReached ? '¡Objetivo alcanzado!' : `Faltan ${money(status.remaining)} (${Math.max(100 - status.progressPct, 0).toFixed(0)}% restante)`}
            {status.daysLeft !== null && ` · ${status.daysLeft >= 0 ? `${status.daysLeft} días para la fecha límite` : 'fecha límite vencida'}`}
          </span>
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 'var(--sp-5)' }}>
        <LimitBar label="Pérdida diaria" remaining={status.dailyLossRemaining} usedPct={status.dailyLossUsedPct}
          detail={`Hoy: ${signedMoney(status.dailyPnlToday)} · límite ${money(rules.maxDailyLoss, 0)}`} />
        <LimitBar label="Pérdida máxima total" remaining={status.distanceToMaxLoss} usedPct={status.maxLossUsedPct}
          detail={status.maxLossFloor !== null ? `Piso de la cuenta: ${money(status.maxLossFloor)}` : ''} />
      </div>
      {(status.breachedMaxLoss || status.breachedDaily) && (
        <div role="alert" style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', fontSize: 12 }}>
          {status.breachedMaxLoss ? 'Se alcanzó la pérdida máxima total de esta cuenta.' : 'En algún día se alcanzó la pérdida diaria máxima.'}
        </div>
      )}
      {rules.notes && <p style={{ fontSize: 12, color: 'var(--txt3)' }}>Reglas: {rules.notes}</p>}
    </div>
  );
}
