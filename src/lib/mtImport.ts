import * as XLSX from 'xlsx';
import type { Account } from '@/types';

export interface ImportedTrade {
  date: string;
  time: string;
  asset: string;
  type: 'Buy' | 'Sell';
  entry: number;
  sl: number;
  tp: number;
  lotSize: number;
  result: number;
  commission: number;
  status: 'Win' | 'Loss' | 'BE';
  ticket: string;
}

export interface ImportedAccountInfo {
  traderName: string;
  accountNumber: string;
  broker: string;
  currency: Account['baseCurrency'];
  endingBalance: number | null;
}

export interface MtImportResult {
  accountInfo: ImportedAccountInfo;
  trades: ImportedTrade[];
}

const SECTION_TITLES = ['posiciones', 'positions', 'órdenes', 'ordenes', 'orders', 'transacciones', 'operaciones', 'deals', 'resultados', 'results'];

const two = (n: number) => String(n).padStart(2, '0');

/** Parses "YYYY.MM.DD HH:MM:SS" (MetaTrader statement format) into a Date. */
function parseMtDate(value: unknown): Date | null {
  if (!value) return null;
  const str = String(value).trim();
  const m = str.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m;
  return new Date(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s || 0));
}

function num(v: unknown): number {
  if (typeof v === 'number') return v;
  const n = parseFloat(String(v ?? '').replace(/\s/g, '').replace(',', '.'));
  return isNaN(n) ? 0 : n;
}

function findLabelValue(rows: unknown[][], label: string): string | null {
  for (const row of rows.slice(0, 8)) {
    const first = String(row?.[0] ?? '').trim().toLowerCase();
    if (first === label.toLowerCase()) {
      const val = row.find((c, i) => i > 0 && c !== null && c !== undefined && String(c).trim() !== '');
      return val !== undefined ? String(val).trim() : null;
    }
  }
  return null;
}

function findLabelValueAnywhere(rows: unknown[][], label: string): string | null {
  for (const row of rows) {
    const first = String(row?.[0] ?? '').trim().toLowerCase();
    if (first === label.toLowerCase()) {
      const val = row.find((c, i) => i > 0 && c !== null && c !== undefined && String(c).trim() !== '');
      return val !== undefined ? String(val).trim() : null;
    }
  }
  return null;
}

function extractAccountInfo(rows: unknown[][]): ImportedAccountInfo {
  const traderName = findLabelValue(rows, 'Nombre:') || findLabelValue(rows, 'Name:') || '';
  const accountLine = findLabelValue(rows, 'Cuenta de trading:') || findLabelValue(rows, 'Account:') || '';
  const company = findLabelValue(rows, 'Empresa:') || findLabelValue(rows, 'Company:') || '';
  const balanceStr = findLabelValueAnywhere(rows, 'Balance:') || findLabelValueAnywhere(rows, 'Balance');

  const accMatch = accountLine.match(/^(\S+)\s*\(([^,)]+)(?:,\s*([^,)]+))?/);
  const accountNumber = accMatch?.[1] ?? '';
  const currencyRaw = (accMatch?.[2] ?? 'USD').trim().toUpperCase();
  const currency: Account['baseCurrency'] = (['USD', 'COP', 'EUR', 'GBP'] as const).includes(currencyRaw as Account['baseCurrency'])
    ? (currencyRaw as Account['baseCurrency'])
    : 'USD';

  const endingBalance = balanceStr ? num(balanceStr) : null;

  return {
    traderName,
    accountNumber,
    broker: company || accMatch?.[3]?.trim() || 'MetaTrader',
    currency,
    endingBalance,
  };
}

function isSectionTitle(cell: unknown): boolean {
  const v = String(cell ?? '').trim().toLowerCase();
  return SECTION_TITLES.includes(v);
}

/** Parses an uploaded MetaTrader 4/5 "ReportHistory" .xlsx statement into normalized trades. */
export async function parseMtReport(file: File): Promise<MtImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: false });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });

  const accountInfo = extractAccountInfo(rows);

  const startIdx = rows.findIndex((r) => {
    const v = String(r?.[0] ?? '').trim().toLowerCase();
    return v === 'posiciones' || v === 'positions';
  });
  if (startIdx === -1) {
    throw new Error('No se encontró la sección "Posiciones" en el archivo. Verifica que sea un reporte de historial de MetaTrader (MT4/MT5).');
  }

  const trades: ImportedTrade[] = [];
  // Data starts two rows after the section title (title row, then header row, then data).
  for (let i = startIdx + 2; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((c) => c === null || c === undefined || String(c).trim() === '')) break;
    if (isSectionTitle(row[0])) break;

    const openTime = parseMtDate(row[0]);
    const closeTime = parseMtDate(row[8]);
    if (!openTime || !closeTime) continue; // not a data row (could be a pending/open position without a close time)

    const typeRaw = String(row[3] ?? '').trim().toLowerCase();
    const type: 'Buy' | 'Sell' = typeRaw === 'sell' ? 'Sell' : 'Buy';

    const commissionRaw = num(row[10]);
    const swapRaw = num(row[11]);
    const profitRaw = num(row[12]);
    const fees = -(commissionRaw + swapRaw);
    const net = profitRaw - fees;

    trades.push({
      date: `${two(closeTime.getMonth() + 1)}/${two(closeTime.getDate())}/${closeTime.getFullYear()}`,
      time: `${two(closeTime.getHours())}:${two(closeTime.getMinutes())}`,
      asset: String(row[2] ?? '').trim(),
      type,
      entry: num(row[5]),
      sl: num(row[6]),
      tp: num(row[7]),
      lotSize: num(row[4]),
      result: profitRaw,
      commission: fees,
      status: net > 0 ? 'Win' : net < 0 ? 'Loss' : 'BE',
      ticket: String(row[1] ?? ''),
    });
  }

  if (trades.length === 0) {
    throw new Error('No se encontraron posiciones cerradas para importar en este archivo.');
  }

  return { accountInfo, trades };
}
