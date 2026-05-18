import { NextRequest, NextResponse } from 'next/server';
import { getCache, setCache } from '@/lib/cache';

const CACHE_TTL = 60 * 60 * 1000;

export interface NaverPriceItem {
  mallName: string;
  price:    number;
  link:     string;
  title:    string;
}

export interface NaverPriceResult {
  min:   number;
  max:   number;
  count: number;
  items: NaverPriceItem[];
}

function cleanQuery(q: string): string {
  return q
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

export async function GET(req: NextRequest) {
  const q        = req.nextUrl.searchParams.get('q')?.trim();
  const priceStr = req.nextUrl.searchParams.get('price') ?? '';
  if (!q) return NextResponse.json({ error: 'q required' }, { status: 400 });

  const query    = cleanQuery(q);
  const cacheKey = `naver-price:${query}`;
  const cached   = getCache<NaverPriceResult>(cacheKey);
  if (cached) return NextResponse.json(cached);

  const clientId     = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'API keys not configured' }, { status: 500 });
  }

  const url = new URL('https://openapi.naver.com/v1/search/shop.json');
  url.searchParams.set('query',   query);
  url.searchParams.set('display', '20');
  url.searchParams.set('sort',    'sim');

  try {
    const res = await fetch(url.toString(), {
      headers: {
        'X-Naver-Client-Id':     clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });
    if (!res.ok) throw new Error(`naver ${res.status}`);

    const data = await res.json();
    const currentPrice = parseInt(priceStr.replace(/[^\d]/g, '')) || 0;

    type RawItem = Record<string, string>;

    // 가격 범위 필터
    let rawItems: RawItem[] = data.items ?? [];
    if (currentPrice > 0) {
      const lo = currentPrice * 0.3;
      const hi = currentPrice * 3;
      const filtered = rawItems.filter(i => {
        const p = parseInt(i.lprice);
        return p >= lo && p <= hi;
      });
      if (filtered.length > 0) rawItems = filtered;
    }

    if (rawItems.length === 0) {
      return NextResponse.json({ min: 0, max: 0, count: 0, items: [] });
    }

    const items: NaverPriceItem[] = rawItems.map(i => ({
      mallName: i.mallName ?? '쇼핑몰',
      price:    parseInt(i.lprice),
      link:     i.link ?? '',
      title:    i.title?.replace(/<[^>]+>/g, '').trim() ?? '',
    }));

    // 가격 오름차순 정렬
    items.sort((a, b) => a.price - b.price);

    const prices = items.map(i => i.price);
    const result: NaverPriceResult = {
      min:   Math.min(...prices),
      max:   Math.max(...prices),
      count: items.length,
      items,
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
