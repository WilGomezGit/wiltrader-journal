'use client';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Icon from '@/components/ui/Icon';
import { Card } from '@/components/ui/kit';
import { todayISO } from '@/lib/dates';
import { pct, signedMoney, tone } from '@/lib/format';
import { summarizeWeeks, weekSentence, type WeekSummary } from '@/lib/weekly';
import type { Trade } from '@/types';

const day = (iso: string) => format(new Date(`${iso}T00:00:00`), 'd MMM', { locale: es });
const range = (w: WeekSummary) => `${day(w.start)} – ${day(w.end)}`;

const navBtn: React.CSSProperties = { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border2)', background: 'transparent', color: 'var(--txt2)', cursor: 'pointer', display: 'flex' };

/** Week-by-week journal: each day's net result, a one-line verdict, and every week side by side. */
export default function WeeklySummary({ trades }: { trades: Trade[] }) {
  const today = todayISO();
  const weeks = useMemo(() => summarizeWeeks(trades, today), [trades, today]);
  const [picked, setPicked] = useState<string | null>(null);

  if (!weeks.length) return null;
  // Default view: the current week once it has trades, otherwise the last week that does.
  const latest = ([...weeks].reverse().find((w) => w.trades > 0) ?? weeks[weeks.length - 1]).start;
  const selected = weeks.find((w) => w.start === (picked ?? latest)) ?? weeks[weeks.length - 1];
  const idx = weeks.indexOf(selected);

  // Comparison: newest first, with the running total of net results from the first week.
  let running = 0;
  const rows = weeks.map((w) => { running += w.pnl; return { w, total: running }; }).reverse();
  const maxAbs = Math.max(...weeks.map((w) => Math.abs(w.pnl)), 1);

  return (
    <>
      <Card title="Resumen de la semana" subtitle={`${range(selected)}${selected.start <= today && today <= selected.end ? ' · semana en curso' : ''}`} style={{ flexShrink: 0 }}
        actions={
          <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
            <button type="button" aria-label="Semana anterior" disabled={idx === 0} onClick={() => setPicked(weeks[idx - 1].start)} style={{ ...navBtn, opacity: idx === 0 ? 0.4 : 1 }}>
              <span style={{ display: 'inline-flex', transform: 'rotate(180deg)' }}><Icon name="chevron" size={13} /></span>
            </button>
            <button type="button" aria-label="Semana siguiente" disabled={idx === weeks.length - 1} onClick={() => setPicked(weeks[idx + 1].start)} style={{ ...navBtn, opacity: idx === weeks.length - 1 ? 0.4 : 1 }}>
              <Icon name="chevron" size={13} />
            </button>
          </div>
        }>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {selected.days.map((d) => (
            <div key={d.iso} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: 13, color: 'var(--txt2)' }}>{d.name} <span style={{ fontSize: 11, color: 'var(--txt3)' }}>· {day(d.iso)}</span></span>
              {d.pnl !== null ? (
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: tone(d.pnl) }}>
                  {signedMoney(d.pnl)} <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--txt3)' }}>({d.trades} {d.trades === 1 ? 'trade' : 'trades'})</span>
                </span>
              ) : (
                <span style={{ fontSize: 12, color: 'var(--txt3)' }}>{d.upcoming ? 'Por venir' : 'Sin trades'}</span>
              )}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap', marginTop: 'var(--sp-4)', padding: 'var(--sp-4)', background: 'var(--bg3)', borderRadius: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--gold2)' }}>{weekSentence(selected)}</span>
          <span style={{ fontSize: 13, fontFamily: 'var(--mono)' }}>
            <span style={{ color: 'var(--txt3)' }}>Semana: </span>
            <span style={{ fontWeight: 700, color: tone(selected.pnl) }}>{selected.trades ? signedMoney(selected.pnl) : '—'}</span>
            <span style={{ color: 'var(--txt3)' }}> · {selected.trades} trades · </span>
            <span style={{ color: 'var(--gold2)' }}>{selected.winRate === null ? '—' : pct(selected.winRate)} victorias</span>
          </span>
        </div>
      </Card>

      <Card title="Comparativo por semanas" subtitle="Se acumulan solas con cada trade que registras · Días: G ganadores, P perdedores, S sin trades · clic en una semana para verla arriba" pad="var(--sp-5) 0 var(--sp-2)" style={{ flexShrink: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <div style={{ minWidth: 620 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px minmax(160px, 1fr) 70px 110px 90px 100px', gap: 12, padding: '0 var(--sp-5) 8px', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--txt3)' }}>
              <span>Semana</span><span>P&L neto</span><span style={{ textAlign: 'right' }}>Trades</span><span style={{ textAlign: 'center' }}>Días G / P / S</span><span style={{ textAlign: 'right' }}>Victorias</span><span style={{ textAlign: 'right' }}>Acumulado</span>
            </div>
            {rows.map(({ w, total }) => (
              <button key={w.start} type="button" onClick={() => setPicked(w.start)} style={{
                display: 'grid', gridTemplateColumns: '130px minmax(160px, 1fr) 70px 110px 90px 100px', gap: 12, alignItems: 'center', width: '100%', textAlign: 'left',
                padding: '11px var(--sp-5)', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)',
                background: w.start === selected.start ? 'var(--gold-dim)' : 'transparent', color: 'var(--gold2)',
              }}>
                <span style={{ fontFamily: 'Inter, sans-serif' }}>{range(w)}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg4)', position: 'relative', overflow: 'hidden' }}>
                    {w.trades > 0 && <span style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${Math.max((Math.abs(w.pnl) / maxAbs) * 100, 3)}%`, borderRadius: 4, background: w.pnl >= 0 ? 'var(--green)' : 'var(--red)' }} />}
                  </span>
                  <span style={{ minWidth: 72, textAlign: 'right', fontWeight: 700, color: w.trades ? tone(w.pnl) : 'var(--txt3)' }}>{w.trades ? signedMoney(w.pnl) : '—'}</span>
                </span>
                <span style={{ textAlign: 'right' }}>{w.trades}</span>
                <span style={{ textAlign: 'center' }}>
                  <span style={{ color: 'var(--green)' }}>{w.winDays}</span> / <span style={{ color: 'var(--red)' }}>{w.lossDays}</span> / <span style={{ color: 'var(--txt3)' }}>{w.noTradeDays}</span>
                </span>
                <span style={{ textAlign: 'right' }}>{w.winRate === null ? '—' : pct(w.winRate, 0)}</span>
                <span style={{ textAlign: 'right', fontWeight: 600, color: tone(total) }}>{signedMoney(total)}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>
    </>
  );
}
