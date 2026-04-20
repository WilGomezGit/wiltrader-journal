'use client';
import Sparkline from './Sparkline';
import Icon from './Icon';

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  sub2?: string;
  trend?: number;
  spark?: number[];
  sparkColor?: string;
  highlight?: boolean;
  delay?: number;
}

export default function MetricCard({ label, value, sub, sub2, trend, spark, sparkColor, highlight, delay = 0 }: MetricCardProps) {
  return (
    <div
      className="fade-up"
      style={{
        background: 'var(--bg2)',
        border: `1px solid ${highlight ? 'var(--gold)' : 'rgba(201,162,39,0.14)'}`,
        borderRadius: 14,
        padding: '18px 20px',
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        boxShadow: highlight ? '0 0 24px rgba(201,162,39,0.08), inset 0 1px 0 rgba(201,162,39,0.1)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        cursor: 'default',
        animationDelay: `${delay}ms`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = highlight
          ? '0 8px 32px rgba(201,162,39,0.18)'
          : '0 8px 24px rgba(0,0,0,0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = highlight ? '0 0 24px rgba(201,162,39,0.08)' : 'none';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--txt3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
            {label}
          </div>
          <div
            className="count-up"
            style={{
              fontSize: 26,
              fontWeight: 700,
              color: highlight ? 'var(--gold2)' : 'var(--txt)',
              fontFamily: 'var(--mono)',
              letterSpacing: '-0.02em',
              animationDelay: `${delay + 100}ms`,
            }}
          >
            {value}
          </div>
        </div>
        {spark && <Sparkline data={spark} color={sparkColor || 'var(--gold)'} w={70} h={30} />}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 13,
            color: sub.startsWith('+') ? 'var(--green)' : sub.startsWith('-') ? 'var(--red)' : 'var(--txt2)',
            fontFamily: 'var(--mono)',
            fontWeight: 500,
          }}
        >
          {sub}
        </div>
      )}
      {sub2 && <div style={{ fontSize: 11, color: 'var(--txt3)' }}>{sub2}</div>}
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: trend >= 0 ? 'var(--green)' : 'var(--red)' }}>
          <Icon name={trend >= 0 ? 'trend_up' : 'trend_dn'} size={12} />
          {trend >= 0 ? '+' : ''}{trend}% este mes
        </div>
      )}
    </div>
  );
}
