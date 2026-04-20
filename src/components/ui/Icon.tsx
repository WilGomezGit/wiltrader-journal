'use client';
import type { ReactNode } from 'react';

const s = { stroke: 'currentColor', fill: 'none', strokeWidth: '1.8', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const icons: Record<string, ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1" {...s}/><rect x="14" y="3" width="7" height="7" rx="1" {...s}/><rect x="3" y="14" width="7" height="7" rx="1" {...s}/><rect x="14" y="14" width="7" height="7" rx="1" {...s}/></>,
  journal:   <><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" {...s}/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" {...s}/></>,
  analytics: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" {...s}/>,
  settings:  <><circle cx="12" cy="12" r="3" {...s}/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" {...s}/></>,
  plus:      <><line x1="12" y1="5" x2="12" y2="19" {...s}/><line x1="5" y1="12" x2="19" y2="12" {...s}/></>,
  close:     <><line x1="18" y1="6" x2="6" y2="18" {...s}/><line x1="6" y1="6" x2="18" y2="18" {...s}/></>,
  filter:    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" {...s}/>,
  search:    <><circle cx="11" cy="11" r="8" {...s}/><line x1="21" y1="21" x2="16.65" y2="16.65" {...s}/></>,
  trophy:    <><path d="M6 9H4a2 2 0 0 1-2-2V5h4" {...s}/><path d="M18 9h2a2 2 0 0 0 2-2V5h-4" {...s}/><path d="M12 17v4" {...s}/><path d="M8 21h8" {...s}/><path d="M6 5h12v8a6 6 0 0 1-12 0V5z" {...s}/></>,
  tag:       <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" {...s}/><line x1="7" y1="7" x2="7.01" y2="7" {...s}/></>,
  layers:    <><polygon points="12 2 2 7 12 12 22 7 12 2" {...s}/><polyline points="2 17 12 22 22 17" {...s}/><polyline points="2 12 12 17 22 12" {...s}/></>,
  check:     <polyline points="20 6 9 17 4 12" {...s}/>,
  logout:    <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" {...s}/><polyline points="16 17 21 12 16 7" {...s}/><line x1="21" y1="12" x2="9" y2="12" {...s}/></>,
  upload:    <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...s}/><polyline points="17 8 12 3 7 8" {...s}/><line x1="12" y1="3" x2="12" y2="15" {...s}/></>,
  trend_up:  <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" {...s}/><polyline points="17 6 23 6 23 12" {...s}/></>,
  trend_dn:  <><polyline points="23 18 13.5 8.5 8.5 13.5 1 6" {...s}/><polyline points="17 18 23 18 23 12" {...s}/></>,
  trash:     <><polyline points="3 6 5 6 21 6" {...s}/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" {...s}/></>,
  edit:      <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" {...s}/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" {...s}/></>,
  download:  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" {...s}/><polyline points="7 10 12 15 17 10" {...s}/><line x1="12" y1="15" x2="12" y2="3" {...s}/></>,
};

interface IconProps {
  name: keyof typeof icons;
  size?: number;
  color?: string;
  className?: string;
}

export default function Icon({ name, size = 18, color = 'currentColor', className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ color }}
      className={className}
      aria-hidden="true"
    >
      {icons[name] || null}
    </svg>
  );
}
