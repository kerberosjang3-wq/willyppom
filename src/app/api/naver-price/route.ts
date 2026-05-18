import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/cache';

const CACHE_TTL = 60 * 60 * 1000; // 1시간

export interface NaverPriceResult {
  min: number;
  max: number;
  count: number;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });

  const cacheKey = `naver-price:${q}`;
  const cached = getCache<NaverPriceResult>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'API keys not configured' }, { status: 500 });
  }

  const url = new URL('https://openapi.naver.com/v1/search/shop.json');
  url.searchParams.set('query',   q);
  url.searchParams.set('display', '10');
  url.searchParams.set('sort',    'asc');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) throw new Error(`naver ${res.status}`);

    const data = await res.json();
    const prices: number[] = (data.items ?? [])
      .map((item: Record<string, string>) => parseInt(item.lprice))
      .filter((p: number) => p > 0);

    if (prices.length === 0) {
      return NextResponse.json({ min: 0, max: 0, count: 0 });
    }

    const result: NaverPriceResult = {
      min:   Math.min(...prices),
      max:   Math.max(...prices),
      count: prices.length,
    };

    setCache(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('[naver-price]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
