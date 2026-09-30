const pad = (n: number) => String(n).padStart(2, '0');

/** Normalizes MM/DD/YYYY, YYYY-MM-DD or YYYY.MM.DD into YYYY-MM-DD. Returns '' when it can't be parsed. */
export function toISODate(input: string | undefined | null): string {
  if (!input) return '';
  const s = String(input).trim();
  let m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})/);
  if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${pad(+m[1])}-${pad(+m[2])}`;
  return '';
}

/** YYYY-MM-DD -> MM/DD/YYYY (the format the journal form and stored trades use). */
export function fromISODate(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso;
}

export function todayISO(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Local timestamp (ms) for a trade, used only to order trades chronologically. */
export function tradeTimestamp(t: { date: string; time?: string; createdAt?: number }): number {
  const iso = toISODate(t.date);
  if (!iso) return t.createdAt ?? 0;
  const time = /^\d{1,2}:\d{2}/.test(t.time || '') ? (t.time as string).padStart(5, '0') : '00:00';
  const ms = new Date(`${iso}T${time}:00`).getTime();
  return Number.isNaN(ms) ? (t.createdAt ?? 0) : ms;
}

/** Monday of the week that contains the given ISO date. */
export function weekStartISO(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dow = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dow);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

export const monthKey = (iso: string) => iso.slice(0, 7);

/** 0 = Sunday ... 6 = Saturday */
export function weekdayOf(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function daysBetween(fromIso: string, toIso: string): number {
  const a = new Date(`${fromIso}T00:00:00Z`).getTime();
  const b = new Date(`${toIso}T00:00:00Z`).getTime();
  return Math.round((b - a) / 86400000);
}

const COLOMBIA_UTC_OFFSET = -5; // Colombia has no daylight saving time.

/** n-th (1-based) Sunday of a month, as a UTC day-of-month. */
function nthSunday(year: number, month0: number, n: number): number {
  const firstDow = new Date(Date.UTC(year, month0, 1)).getUTCDay();
  return 1 + ((7 - firstDow) % 7) + (n - 1) * 7;
}

/**
 * Forex brokers run their MetaTrader server on GMT+2 in winter and GMT+3 while the US is on daylight
 * saving time (2nd Sunday of March 07:00 UTC to 1st Sunday of November 06:00 UTC).
 */
export function serverOffsetAt(utcMs: number): number {
  const y = new Date(utcMs).getUTCFullYear();
  const start = Date.UTC(y, 2, nthSunday(y, 2, 2), 7);
  const end = Date.UTC(y, 10, nthSunday(y, 10, 1), 6);
  return utcMs >= start && utcMs < end ? 3 : 2;
}

/** Converts a broker-server date/time (YYYY-MM-DD, HH:mm) to Colombian date and time. */
export function serverToColombia(iso: string, time: string): { date: string; time: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  const utc = naive - serverOffsetAt(naive - 3 * 3600000) * 3600000;
  const co = new Date(utc + COLOMBIA_UTC_OFFSET * 3600000);
  return {
    date: `${co.getUTCFullYear()}-${pad(co.getUTCMonth() + 1)}-${pad(co.getUTCDate())}`,
    time: `${pad(co.getUTCHours())}:${pad(co.getUTCMinutes())}`,
  };
}
