import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 3600; // cache 1 hour

async function scrapeWilkinson(): Promise<number | null> {
  const today = new Date().toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).split('/').reverse().join('-'); // YYYY-MM-DD

  const urls = [
    `https://dolar.wilkinsonpc.com.co/${today}`,
    'https://dolar.wilkinsonpc.com.co/',
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WilTraderBot/1.0)' },
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      // Look for TRM values in range 3500–6000 (valid COP/USD)
      const patterns = [
        /trm[^0-9]*([3-6][.,]\d{3}[.,]\d{0,2})/i,
        /([3-6][.,]\d{3}[.,]\d{2})/,
        /([3-6]\d{3}[.,]\d{2})/,
      ];

      for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match) {
          const raw = match[1].replace(/\./g, '').replace(',', '.');
          const val = parseFloat(raw);
          if (val >= 3500 && val <= 6000) return val;
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

async function fetchOpenER(): Promise<number | null> {
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    const rate = data?.rates?.COP;
    if (rate && rate > 3000) return Math.round(rate);
  } catch {}
  return null;
}

export async function GET() {
  // 1. Try Wilkinson scrape
  const wilkinson = await scrapeWilkinson();
  if (wilkinson) {
    return NextResponse.json({ rate: Math.round(wilkinson), source: 'wilkinson' });
  }

  // 2. Fallback to open.er-api
  const openER = await fetchOpenER();
  if (openER) {
    return NextResponse.json({ rate: openER, source: 'open.er-api', fallback: true });
  }

  // 3. Last resort hardcoded fallback
  return NextResponse.json({ rate: 4200, source: 'fallback', fallback: true });
}
