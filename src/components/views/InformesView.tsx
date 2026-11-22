'use client';
import { useMemo } from 'react';
import { Card, PageHeader, Stat } from '@/components/ui/kit';
import { buildInsights, rankSlices, MIN_SAMPLE, type Slice } from '@/lib/insights';
import { money, pct, shortDate, signedMoney, tone } from '@/lib/format';
import type { Trade } from '@/types';

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const monthName = (key: string) => `${MONTHS[parseInt(key.slice(5, 7), 10) - 1] ?? key} ${key.slice(0, 4)}`;
const wr = (v: number | null) => (v === null ? '—' : pct(v, 0));

function SliceRow({ s, overall }: { s: Slice; overall: number }) {
  const diff = s.winRate === null ? 0 : s.winRate - overall;
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-3)', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--txt2)' }}>{s.label}</div>
        <div style={{ fontSize: 11, color: 'var(--txt3)', marginTop: 2 }}>
          {s.trades} trades · {s.wins} ganados de {s.wins + s.losses} · promedio <span style={{ color: tone(s.avgPnl) }}>{signedMoney(s.avgPnl)}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15, color: 'var(--gold2)' }}>{wr(s.winRate)}</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: diff >= 0 ? 'var(--green)' : 'var(--red)' }}>{diff >= 0 ? '+' : ''}{diff.toFixed(0)} pts vs tu media</div>
      </div>
    </div>
  );
}

const note = (text: string) => <p style={{ fontSize: 12, color: 'var(--txt3)', padding: 'var(--sp-3) 0', lineHeight: 1.5 }}>{text}</p>;

/** Report in the spirit of "know your numbers": what you win and lose on average, what the strategy needs, and where it leaks. */
export default function InformesView({ trades, scopeLabel }: { trades: Trade[]; scopeLabel: string }) {
  const ins = useMemo(() => buildInsights(trades), [trades]);
  const { stats, breakEven, worstDays, months, earlyClose, plan } = ins;
  const { worse, better } = useMemo(() => rankSlices(ins.slices, stats.winRate), [ins.slices, stats.winRate]);
  const small = ins.slices.filter((s) => s.trades > 0 && s.trades < MIN_SAMPLE);

  if (stats.totalTrades < MIN_SAMPLE * 2) {
    return (
      <div style={{ height: '100%', overflowY: 'auto' }}>
        <PageHeader title="Informes" subtitle={`${scopeLabel} · tus números reales`} />
        <Card><p style={{ textAlign: 'center', color: 'var(--txt3)', fontSize: 13, padding: 'var(--sp-6) 0' }}>
          Con menos de {MIN_SAMPLE * 2} operaciones los porcentajes no dicen nada. Registra o importa más trades para ver tu informe.
        </p></Card>
      </div>
    );
  }

  const payoff = breakEven?.payoff ?? null;
  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: 'var(--sp-2)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)', paddingBottom: 'var(--sp-5)' }}>
        <PageHeader title="Informes" subtitle={`${scopeLabel} · ${stats.totalTrades} operaciones · P&L neto`} />

        <Card title="Tus números" subtitle="Toda estrategia se resume en cuántas veces aciertas y cuánto ganas cuando ganas frente a cuánto pierdes cuando pierdes" style={{ flexShrink: 0 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--sp-5)' }}>
            <Stat label="Acierto" value={stats.wins + stats.losses ? pct(stats.winRate) : '—'} sub={`${stats.wins} ganadas · ${stats.losses} perdidas`} />
            <Stat label="Ganas de media" value={stats.wins ? signedMoney(stats.avgWin) : '—'} color="var(--green)" sub="cuando ganas" />
            <Stat label="Pierdes de media" value={stats.losses ? `-${money(stats.avgLoss)}` : '—'} color="var(--red)" sub="cuando pierdes" />
            <Stat label="Ganas por cada $1 que pierdes" value={payoff === null ? '—' : `$${payoff.toFixed(2)}`} sub="ganancia media ÷ pérdida media" />
            <Stat label="Ganas de media por trade" value={signedMoney(stats.expectancy)} color={tone(stats.expectancy)} sub="la expectativa de tu estrategia" />
          </div>
          {breakEven && note(
            breakEven.profitable
              ? `Con un ${pct(breakEven.winRate, 0)} de acierto y ganando $${breakEven.payoff.toFixed(2)} por cada $1 que pierdes, tu estrategia gana dinero por operación. Cerrar las ganancias antes de tiempo es lo que más rápido destruye esa ventaja.`
              : `Con un ${pct(breakEven.winRate, 0)} de acierto y ganando solo $${breakEven.payoff.toFixed(2)} por cada $1 que pierdes, tu estrategia pierde dinero por operación aunque aciertes bastante.`
          )}
        </Card>

        {breakEven && (
          <Card title="Qué te haría falta" subtitle="Para no perder dinero con esta estrategia, una de las dos cosas debe cambiar" style={{ flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 'var(--sp-4)' }}>
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 'var(--sp-4)' }}>
                <div style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Con tu acierto de {pct(breakEven.winRate, 1)}</div>
                <div style={{ fontSize: 13, marginTop: 'var(--sp-2)', color: 'var(--txt2)' }}>
                  necesitas ganar <b style={{ color: 'var(--gold2)', fontFamily: 'var(--mono)' }}>${breakEven.neededPayoff.toFixed(2)}</b> por cada $1 que pierdes.
                  Ahora ganas <b style={{ fontFamily: 'var(--mono)', color: breakEven.payoff >= breakEven.neededPayoff ? 'var(--green)' : 'var(--red)' }}>${breakEven.payoff.toFixed(2)}</b>.
                </div>
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: 10, padding: 'var(--sp-4)' }}>
                <div style={{ fontSize: 11, color: 'var(--txt3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Con lo que ganas por cada $1 perdido (${breakEven.payoff.toFixed(2)})</div>
                <div style={{ fontSize: 13, marginTop: 'var(--sp-2)', color: 'var(--txt2)' }}>
                  necesitas acertar al menos <b style={{ color: 'var(--gold2)', fontFamily: 'var(--mono)' }}>{pct(breakEven.neededWinRate, 1)}</b>.
                  Ahora aciertas <b style={{ fontFamily: 'var(--mono)', color: breakEven.winRate >= breakEven.neededWinRate ? 'var(--green)' : 'var(--red)' }}>{pct(breakEven.winRate, 1)}</b>.
                </div>
              </div>
            </div>
          </Card>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--sp-5)' }}>
          <Card title="Lo que peor te va" subtitle={`Situaciones con al menos ${MIN_SAMPLE} trades y un acierto claramente bajo tu media (${pct(stats.winRate, 0)})`} style={{ flexShrink: 0 }}>
            {worse.length ? worse.map((s) => <SliceRow key={s.id} s={s} overall={stats.winRate} />) : note('Ninguna situación medida está claramente por debajo de tu media.')}
          </Card>
          <Card title="Lo que mejor te va" subtitle="Situaciones donde tu acierto supera claramente tu media" style={{ flexShrink: 0 }}>
            {better.length ? better.map((s) => <SliceRow key={s.id} s={s} overall={stats.winRate} />) : note('Ninguna situación medida está claramente por encima de tu media.')}
          </Card>
        </div>
        {small.length > 0 && note(`Sin suficientes trades para concluir algo (menos de ${MIN_SAMPLE}): ${small.map((s) => `${s.label} (${s.trades})`).join(' · ')}.`)}

        {worstDays && (
          <Card title={`Tus ${worstDays.count} peores días`} subtitle="Pocos días malos pueden borrar semanas de ganancias" style={{ flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-5)' }}>
              <Stat label="Resultado total" value={signedMoney(worstDays.total)} color={tone(worstDays.total)} />
              <Stat label={`Sin esos ${worstDays.count} días`} value={signedMoney(worstDays.withoutThem)} color={tone(worstDays.withoutThem)} sub="lo que habrías ganado" />
            </div>
            <div style={{ marginTop: 'var(--sp-4)' }}>
              {worstDays.days.map((d) => (
                <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                  <span style={{ color: 'var(--txt2)' }}>{shortDate(d.key)}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 600, color: tone(d.pnl) }}>{signedMoney(d.pnl)}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {earlyClose && (
          <Card title="Cierres antes del take profit" subtitle="Solo operaciones ganadoras con entrada, salida y take profit registrados" style={{ flexShrink: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--sp-5)' }}>
              <Stat label="Cerradas antes del objetivo" value={`${earlyClose.early} de ${earlyClose.measured}`} sub={`${pct((earlyClose.early / earlyClose.measured) * 100, 0)} de tus ganadoras`} />
              <Stat label="Capturas del objetivo" value={pct(earlyClose.avgCapture, 0)} sub="en promedio, del recorrido planeado" />
            </div>
            {note('Si tu estrategia está pensada para llegar al objetivo, cada cierre anticipado recorta justo la ganancia que paga las pérdidas.')}
          </Card>
        )}

        <Card title="Disciplina: ¿seguiste tu plan?" subtitle="Se marca en cada trade (Sí / No)" style={{ flexShrink: 0 }}>
          {plan ? (
            <>
              <SliceRow s={plan.followed} overall={stats.winRate} />
              <SliceRow s={plan.broke} overall={stats.winRate} />
              {plan.unmarked > 0 && note(`${plan.unmarked} trades sin marcar quedan fuera de esta comparación.`)}
            </>
          ) : note('Aún no marcaste ningún trade. Al registrar o editar un trade, responde «¿Seguiste tu plan?». Con eso verás cuánto dinero te cuestan las operaciones fuera de plan.')}
        </Card>

        <Card title="Últimos 3 meses" subtitle="Comparativo mensual y costos" pad="var(--sp-5) 0 var(--sp-2)" style={{ flexShrink: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 560 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 70px 110px 80px 100px 100px 100px', gap: 12, padding: '0 var(--sp-5) 8px', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--txt3)' }}>
                <span>Mes</span><span style={{ textAlign: 'right' }}>Trades</span><span style={{ textAlign: 'right' }}>P&L neto</span><span style={{ textAlign: 'right' }}>Acierto</span><span style={{ textAlign: 'right' }}>Ganas</span><span style={{ textAlign: 'right' }}>Pierdes</span><span style={{ textAlign: 'right' }}>Costos</span>
              </div>
              {months.map((m) => (
                <div key={m.key} style={{ display: 'grid', gridTemplateColumns: '1.3fr 70px 110px 80px 100px 100px 100px', gap: 12, padding: '11px var(--sp-5)', borderTop: '1px solid var(--border)', fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--gold2)' }}>
                  <span style={{ fontFamily: 'Inter, sans-serif', textTransform: 'capitalize' }}>{monthName(m.key)}</span>
                  <span style={{ textAlign: 'right' }}>{m.trades}</span>
                  <span style={{ textAlign: 'right', fontWeight: 700, color: tone(m.pnl) }}>{signedMoney(m.pnl)}</span>
                  <span style={{ textAlign: 'right' }}>{wr(m.winRate)}</span>
                  <span style={{ textAlign: 'right', color: m.avgWin ? 'var(--green)' : 'var(--txt3)' }}>{m.avgWin ? signedMoney(m.avgWin) : '—'}</span>
                  <span style={{ textAlign: 'right', color: m.avgLoss ? 'var(--red)' : 'var(--txt3)' }}>{m.avgLoss ? `-${money(m.avgLoss)}` : '—'}</span>
                  <span style={{ textAlign: 'right', color: m.costs ? 'var(--red)' : 'var(--txt3)' }}>{m.costs ? `-${money(m.costs)}` : '—'}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: '0 var(--sp-5)' }}>
            {note(`Costos de todo el historial: comisiones ${money(stats.commissions)} · swaps ${money(stats.swaps)}${stats.otherCosts ? ` · otros ${money(stats.otherCosts)}` : ''}. P&L bruto ${signedMoney(stats.pnlGross)}, neto ${signedMoney(stats.pnl)}.`)}
          </div>
        </Card>
      </div>
    </div>
  );
}
