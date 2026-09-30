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
