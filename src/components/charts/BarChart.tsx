'use client';
import { useState, useEffect } from 'react';

interface BarChartProps {
  data: number[];
  labels: string[];
  colors?: string[];
  height?: number;
}

export default function BarChart({ data, labels, colors, height = 120 }: BarChartProps) {
  const [shown, setShown] = useState(false);
  useEffect(() => { setTimeout(() => setShown(true), 200); }, []);
  const max = Math.max(...data.map(Math.abs), 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height, padding: '0 4px' }}>
      {data.map((v, i) => {
        const pct = (Math.abs(v) / max) * 100;
        const color = colors?.[i] || (v >= 0 ? 'var(--green)' : 'var(--red)');
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: v >= 0 ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)' }}>
              {v > 0 ? '+' : ''}{v}%
            </span>
            <div
              style={{
                width: '100%',
                borderRadius: '4px 4px 0 0',
                opacity: 0.85,
                background: color,
                height: shown ? `${pct}%` : '0%',
                minHeight: shown ? 4 : 0,
                transition: `height 0.7s cubic-bezier(.22,.68,0,1.2) ${i * 80}ms`,
              }}
            />
            <span style={{ fontSize: 9, color: 'var(--txt3)', textAlign: 'center', lineHeight: 1.2 }}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}
