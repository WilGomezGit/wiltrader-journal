'use client';

interface Segment {
  value: number;
  color: string;
  label?: string;
}

interface DonutChartProps {
  segments: Segment[];
  size?: number;
}

export default function DonutChart({ segments, size = 120 }: DonutChartProps) {
  const r = 50, cx = 60, cy = 60, stroke = 18;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let off = 0;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg4)" strokeWidth={stroke} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-off}
            transform={`rotate(-90 ${cx} ${cy})`}
          />
        );
        off += dash;
        return el;
      })}
    </svg>
  );
}
