const nf = (v: number, d = 2) => Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/** $1,234.56 (no sign). */
export const money = (v: number, d = 2) => `${v < 0 ? '-' : ''}$${nf(v, d)}`;

/** +$1,234.56 / -$1,234.56 */
export const signedMoney = (v: number, d = 2) => `${v < 0 ? '-' : '+'}$${nf(v, d)}`;

export const pct = (v: number, d = 1) => `${v.toFixed(d)}%`;

export const signedPct = (v: number, d = 1) => `${v < 0 ? '-' : '+'}${Math.abs(v).toFixed(d)}%`;

/** Profit factor: "∞" when there are profits and no losses, "—" when there is nothing to compare. */
export const profitFactor = (v: number, hasTrades = true) => (!hasTrades ? '—' : v === Infinity ? '∞' : v.toFixed(2));

export const tone = (v: number): string => (v > 0.005 ? 'var(--green)' : v < -0.005 ? 'var(--red)' : 'var(--txt2)');

/** YYYY-MM-DD -> dd/mm/yyyy, the way Spanish speakers read dates. */
export const shortDate = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
