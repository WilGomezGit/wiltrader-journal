import { netPnl, tradeOutcome } from './analytics';
import type { Account, Trade } from '@/types';

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** One CSV format for every export, always including the account and the full cost breakdown. */
export function tradesToCSV(trades: Trade[], accounts: Account[]): string {
  const names = new Map(accounts.map((a) => [a.id, a.name]));
  const header = ['Cuenta', 'Fecha', 'Hora', 'Activo', 'Tipo', 'Estrategia', 'Entrada', 'Salida', 'SL', 'TP', 'Lote',
    'Bruto', 'Comisión', 'Swap', 'Otros costos', 'Neto', 'Resultado', 'Ticket', 'Emoción', 'Notas'];
  const rows = trades.map((t) => [
    esc(names.get(t.accountId) ?? t.accountId), t.date, t.time || '', t.asset, t.type, esc(t.strategy),
    t.entry, t.exitPrice ?? '', t.sl, t.tp, t.lotSize ?? '',
    t.result, t.commission || 0, t.swap || 0, t.otherCosts || 0, netPnl(t).toFixed(2),
    tradeOutcome(t), t.externalId ?? '', esc(t.emotion), esc(t.notes),
  ].join(','));
  return [header.join(','), ...rows].join('\n');
}

export function downloadCSV(csv: string, name: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
