import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const revalidate = 3600;

const sig = (ms: number) => ({ signal: AbortSignal.timeout(ms) });

// 1. Datos.gov.co — TRM oficial Superfinanciera Colombia
async function fetchSuperfinanciera(): Promise<number | null> {
  try {
    const res = await fetch(
      'https://www.datos.gov.co/resource/mcec-87by.json?$limit=1&$order=vigenciadesde%20DESC',
      sig(6000)
    );
    const data = await res.json();
    const rate = parseFloat(data?.[0]?.valor);
    if (rate && rate > 2000 && rate < 10000) return Math.round(rate);
  } catch {}
  return null;
}

// 2. Fawaz Ahmed — open-source, sin key, CDN global
async function fetchFawaz(): Promise<number | null> {
  const urls = [
    'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json',
    'https://latest.currency-api.pages.dev/v1/currencies/usd.json',
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, sig(5000));
      const data = await res.json();
      const rate = data?.usd?.cop;
      if (rate && rate > 2000 && rate < 10000) return Math.round(rate);
    } catch {}
  }
  return null;
}

// 3. Frankfurter (BCE)
async function fetchFrankfurter(): Promise<number | null> {
  try {
    const res = await fetch('https://api.frankfurter.app/latest?from=USD&to=COP', sig(5000));
    const data = await res.json();
    const rate = data?.rates?.COP;
    if (rate && rate > 2000 && rate < 10000) return Math.round(rate);
  } catch {}
  return null;
}

// 4. ExchangeRate-API free
async function fetchExchangeRateAPI(): Promise<number | null> {
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD', sig(5000));
    const data = await res.json();
    const rate = data?.rates?.COP;
    if (rate && rate > 2000 && rate < 10000) return Math.round(rate);
  } catch {}
  return null;
}

export async function GET() {
  const [superfi, fawaz, frankfurt, erapi] = await Promise.allSettled([
    fetchSuperfinanciera(),
    fetchFawaz(),
    fetchFrankfurter(),
    fetchExchangeRateAPI(),
  ]);

  const v = (r: PromiseSettledResult<number | null>) =>
    r.status === 'fulfilled' ? r.value : null;

  const val = v(superfi) ?? v(fawaz) ?? v(frankfurt) ?? v(erapi);

  const source =
    v(superfi)   ? 'superfinanciera' :
    v(fawaz)     ? 'fawaz-api'       :
    v(frankfurt) ? 'frankfurter'     :
    v(erapi)     ? 'open.er-api'     : 'fallback';

  if (val) {
    return NextResponse.json({ rate: val, source, fallback: false });
  }

  return NextResponse.json({ rate: 4200, source: 'fallback', fallback: true });
}
