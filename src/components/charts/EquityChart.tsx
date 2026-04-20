'use client';
import { useRef, useEffect, useState, useId } from 'react';

interface EquityChartProps {
  data: number[];
}

const niceStep = (range: number): number => {
  const steps = [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000, 25000];
  const ideal = range / 6;
  return steps.find((s) => s >= ideal) ?? 25000;
};

const fmtY = (v: number): string => {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
  return `$${v}`;
};

export default function EquityChart({ data }: EquityChartProps) {
  const pathRef = useRef<SVGPathElement>(null);
  const [animated, setAnimated] = useState(false);
  const uid = useId().replace(/:/g, '');

  const W = 700, H = 200;
  const pad = { t: 20, r: 20, b: 30, l: 64 };

  const safeData = data.length > 0 ? data : [0];
  const minRaw = Math.min(...safeData);
  const maxRaw = Math.max(...safeData);

  const step = niceStep(Math.max(maxRaw - minRaw, 10));
  const min = Math.floor((minRaw - step) / step) * step;
  const max = Math.ceil((maxRaw + step) / step) * step;
  const range = max - min || step * 6;

  const safeLength = Math.max(1, safeData.length - 1);

  const pts = safeData.map((v, i) => ({
    x: pad.l + (i * (W - pad.l - pad.r)) / safeLength,
    y: pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b),
  }));

  const smooth = pts
    .map((p, i, arr) => {
      if (i === 0) return `M${p.x},${p.y}`;
      const prev = arr[i - 1];
      const cpx = (prev.x + p.x) / 2;
      return `C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`;
    })
    .join(' ');

  const last = pts[pts.length - 1];

  const areaPath =
    pts.length > 1
      ? `${smooth} L${last.x},${H - pad.b} L${pts[0].x},${H - pad.b} Z`
      : '';

  const yLabels: number[] = [];
  for (let v = Math.ceil(min / step) * step; v <= max; v += step) {
    yLabels.push(v);
  }

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!animated || !pathRef.current || pts.length <= 1) return;
    const path = pathRef.current;
    const totalLen = path.getTotalLength();

    path.style.strokeDasharray = String(totalLen);
    path.style.strokeDashoffset = String(totalLen);
    path.style.transition = 'none';

    const startAt = performance.now();
    const dur = 1800;
    const ease = (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - startAt) / dur, 1);
      const drawn = totalLen * ease(progress);
      path.style.strokeDashoffset = String(totalLen - drawn);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animated, pts.length]);

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={{ display: 'block' }}
    >
      <defs>
        <linearGradient id={`areaGrad-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c9a227" stopOpacity="0.3" />
          <stop offset="60%" stopColor="#c9a227" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#c9a227" stopOpacity="0" />
        </linearGradient>

        <linearGradient id={`lineGrad-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#7a5c08" />
          <stop offset="50%" stopColor="#c9a227" />
          <stop offset="100%" stopColor="#f5d87a" />
        </linearGradient>

        <filter id={`glow-${uid}`}>
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id={`dotGlow-${uid}`}>
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Grid Y */}
      {yLabels.map((v) => {
        const y = pad.t + (1 - (v - min) / range) * (H - pad.t - pad.b);
        if (y < pad.t - 2 || y > H - pad.b + 2) return null;
        return (
          <g key={v}>
            <line
              x1={pad.l}
              y1={y}
              x2={W - pad.r}
              y2={y}
              stroke="#252528"
              strokeWidth="1"
              strokeDasharray="4,6"
            />
            <text
              x={pad.l - 6}
              y={y + 4}
              fill="#5a5450"
              fontSize="9"
              textAnchor="end"
              fontFamily="JetBrains Mono"
            >
              {fmtY(v)}
            </text>
          </g>
        );
      })}

      {/* Area */}
      {areaPath && (
        <path
          d={areaPath}
          fill={`url(#areaGrad-${uid})`}
          style={{
            opacity: 0,
            animation: animated ? 'fillArea 1s ease 1.4s both' : 'none',
          }}
        />
      )}

      {/* Line */}
      {pts.length > 1 && (
        <path
          ref={pathRef}
          d={smooth}
          fill="none"
          stroke={`url(#lineGrad-${uid})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          filter={`url(#glow-${uid})`}
        />
      )}


    </svg>
  );
}
