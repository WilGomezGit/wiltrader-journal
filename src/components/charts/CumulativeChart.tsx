'use client';
import { useEffect, useId, useRef, useState } from 'react';

export interface ChartPoint { label: string; value: number }

interface CumulativeChartProps {
  points: ChartPoint[];
  /** Formats values in the tooltip and on the Y axis. */
  format?: (v: number) => string;
  height?: number;
  emptyText?: string;
}

const GOLD = '#c9a227';
const RED = '#ef4444';
const PAD = { t: 16, r: 20, b: 34, l: 64 };

const defaultFormat = (v: number) => `${v < 0 ? '-' : ''}$${Math.abs(v).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;

/** 1-2-5 tick steps, so the Y axis reads like a trading platform ($0, $1.00, $2.00...). */
function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = Math.floor(min / step) * step; ; v += step) {
    ticks.push(Math.round(v / step) * step);
    if (v >= max) break;
  }
  return ticks;
}

/**
 * Cumulative curve in the style of a trading platform: dashed grid, dated X axis, area gold while in
 * profit and red while in loss (split at the zero line), and a crosshair with the exact value.
 * Drawn in real pixels (measured with ResizeObserver) so text never gets stretched.
 */
export default function CumulativeChart({ points, format = defaultFormat, height = 280, emptyText = 'Sin datos aún' }: CumulativeChartProps) {
  const uid = useId().replace(/:/g, '');
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(el.clientWidth, 280));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (points.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--txt3)', fontSize: 12 }}>{emptyText}</div>;
  }

  const values = points.map((p) => p.value);
  const dataMin = Math.min(0, ...values), dataMax = Math.max(0, ...values);
  const pad = (dataMax - dataMin || 1) * 0.08;
  const ticks = niceTicks(dataMin - (dataMin < 0 ? pad : 0), dataMax + pad);
  const min = ticks[0], max = ticks[ticks.length - 1];

  const plotW = width - PAD.l - PAD.r, plotH = height - PAD.t - PAD.b;
  const n = points.length;
  const x = (i: number) => PAD.l + (n === 1 ? plotW / 2 : (i * plotW) / (n - 1));
  const y = (v: number) => PAD.t + (1 - (v - min) / (max - min)) * plotH;
  const zeroY = y(0);

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const area = n > 1 ? `${line} L${x(n - 1).toFixed(1)},${zeroY.toFixed(1)} L${x(0).toFixed(1)},${zeroY.toFixed(1)} Z` : '';

  const labelEvery = Math.max(1, Math.ceil(n / Math.max(Math.floor(plotW / 90), 1)));
  const yFmt = (v: number) => (Math.abs(v) >= 10000 ? `${v < 0 ? '-' : ''}$${(Math.abs(v) / 1000).toFixed(0)}k` : format(v).replace(/\.00$/, ''));

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const idx = n === 1 ? 0 : Math.round(((px - PAD.l) / plotW) * (n - 1));
    setHover(Math.min(Math.max(idx, 0), n - 1));
  };

  const hp = hover !== null ? points[hover] : null;
  const tipLeft = hover !== null ? Math.min(Math.max(x(hover) + 12, 8), width - 150) : 0;

  return (
    <div ref={boxRef} style={{ position: 'relative', width: '100%' }}>
      <svg width={width} height={height} style={{ display: 'block' }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="Curva acumulada">
        <defs>
          <linearGradient id={`g-${uid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD} stopOpacity="0.55" />
            <stop offset="100%" stopColor={GOLD} stopOpacity="0.05" />
          </linearGradient>
          <linearGradient id={`r-${uid}`} x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={RED} stopOpacity="0.55" />
            <stop offset="100%" stopColor={RED} stopOpacity="0.05" />
          </linearGradient>
          <clipPath id={`up-${uid}`}><rect x={0} y={0} width={width} height={Math.max(zeroY, 0)} /></clipPath>
          <clipPath id={`dn-${uid}`}><rect x={0} y={zeroY} width={width} height={Math.max(height - zeroY, 0)} /></clipPath>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={width - PAD.r} y1={y(t)} y2={y(t)} stroke={t === 0 ? '#4a4a52' : '#2a2a2f'} strokeWidth="1" strokeDasharray={t === 0 ? '0' : '4,5'} />
            <text x={PAD.l - 10} y={y(t) + 3.5} fill="#6a6458" fontSize="10" textAnchor="end" fontFamily="JetBrains Mono, monospace">{yFmt(t)}</text>
          </g>
        ))}

        {points.map((p, i) => (i % labelEvery === 0 ? (
          <g key={i}>
            <line x1={x(i)} x2={x(i)} y1={PAD.t} y2={PAD.t + plotH} stroke="#2a2a2f" strokeWidth="1" strokeDasharray="2,6" />
            <text x={x(i)} y={height - 12} fill="#6a6458" fontSize="10" textAnchor="middle" fontFamily="JetBrains Mono, monospace">{p.label}</text>
          </g>
        ) : null))}

        {area && (
          <>
            <path d={area} fill={`url(#g-${uid})`} clipPath={`url(#up-${uid})`} />
            <path d={area} fill={`url(#r-${uid})`} clipPath={`url(#dn-${uid})`} />
          </>
        )}
        {n > 1 && (
          <>
            <path d={line} fill="none" stroke={GOLD} strokeWidth="2" strokeLinejoin="round" clipPath={`url(#up-${uid})`} />
            <path d={line} fill="none" stroke={RED} strokeWidth="2" strokeLinejoin="round" clipPath={`url(#dn-${uid})`} />
          </>
        )}

        {hp && hover !== null && (
          <g pointerEvents="none">
            <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + plotH} stroke="#8a8478" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(hp.value)} r="4.5" fill={hp.value >= 0 ? GOLD : RED} stroke="#09090a" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hp && hover !== null && (
        <div style={{
          position: 'absolute', top: Math.max(y(hp.value) - 52, 4), left: tipLeft, pointerEvents: 'none',
          background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, padding: '8px 12px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)', whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 10, color: 'var(--txt3)', marginBottom: 2 }}>{hp.label}</div>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--mono)', color: hp.value >= 0 ? GOLD : RED }}>{format(hp.value)}</div>
        </div>
      )}
    </div>
  );
}
