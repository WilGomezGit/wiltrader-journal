import type { PropPhase } from '@/types';

/** Published rules of a prop-firm program, as % of the starting balance. */
export interface PropPreset {
  id: string;
  label: string;
  phase: PropPhase;
  targetPct: number;
  maxLossPct: number;
  dailyPct: number;
}

// FundingPips 2-Step Flex (fundingpips.com/2-step-flex): same percentages for every account size.
export const PROP_PRESETS: PropPreset[] = [
  { id: 'fp-flex-1', label: 'FundingPips 2-Step Flex · Fase 1', phase: 'Challenge', targetPct: 10, maxLossPct: 12, dailyPct: 4 },
  { id: 'fp-flex-2', label: 'FundingPips 2-Step Flex · Fase 2', phase: 'Phase 2', targetPct: 8, maxLossPct: 12, dailyPct: 4 },
  { id: 'fp-flex-master', label: 'FundingPips 2-Step Flex · Master (fondeada)', phase: 'Funded', targetPct: 0, maxLossPct: 12, dailyPct: 4 },
];

export const presetById = (id: string) => PROP_PRESETS.find((p) => p.id === id);

/** Dollar amounts of a preset for a given starting balance. */
export function presetAmounts(p: PropPreset, initial: number) {
  const r = (pct: number) => (initial > 0 ? String(Math.round(initial * pct) / 100) : '');
  return { target: p.targetPct > 0 ? r(p.targetPct) : '', maxLoss: r(p.maxLossPct), maxDaily: r(p.dailyPct) };
}
