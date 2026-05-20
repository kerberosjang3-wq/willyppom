import { NextRequest, NextResponse } from 'next/server';
import { getCacheWithMeta, clearCache } from '@/lib/cache';
import { MOCK_DEALS } from '@/lib/mockDeals';
import type { DealsResponse, CategoryId } from '@/types/deal';
import { buildAndCacheDeals, refreshInBackground, DEALS_CACHE_KEY } from '@/lib/dealBuilder';

export const preferredRegion = 'hnd1'; // 도쿄 — Cloudflare IP 차단 우회

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const category     = (searchParams.get('category') ?? 'all') as CategoryId;
  const sort         = (searchParams.get('sort') ?? 'view') as 'view' | 'date' | 'comment';
  const page         = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit        = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const q            = searchParams.get('q')?.trim().toLowerCase() ?? '';
  const forceRefresh = searchParams.get('refresh') === 'true';

  if (forceRefresh) clearCache(DEALS_CACHE_KEY);

  let response: DealsResponse;

  const cached = getCacheWithMeta<DealsResponse>(DEALS_CACHE_KEY);

  if (cached && !forceRefresh) {
    if (cached.isStale) void refreshInBackground();
    response = cached.data;
  } else {
    try {
      response = await buildAndCacheDeals();
    } catch (err: unknown) {
      console.error('[deals route]', err);
      response = {
        deals: MOCK_DEALS.map(d => ({ ...d, productName: d.title })),
        total: MOCK_DEALS.length,
        lastUpdated: new Date().toISOString(),
        sourceStats: {},
      };
    }
  }

  let deals = [...response.deals];

  if (category && category !== 'all') {
    deals = deals.filter(d => d.category === category);
  }

  if (q) {
    deals = deals.filter(d =>
      d.title.toLowerCase().includes(q) ||
      (d.productName?.toLowerCase().includes(q) ?? false) ||
      (d.mallName?.toLowerCase().includes(q) ?? false) ||
      (d.description?.toLowerCase().includes(q) ?? false)
    );
  }

  if (sort === 'date') {
    deals.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } else if (sort === 'comment') {
    deals.sort((a, b) => b.commentCount - a.commentCount);
  } else {
    deals.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
  }

  const total     = deals.length;
  const start     = (page - 1) * limit;
  const paginated = deals.slice(start, start + limit);
  const hasMore   = start + limit < total;

  // 검색·강제갱신은 CDN 캐시 제외, 일반 요청은 CDN이 10분 캐시 후 stale-while-revalidate
  const cacheControl =
    forceRefresh || q
      ? 'no-store'
      : page > 1
        ? 'public, s-maxage=120, stale-while-revalidate=600'
        : 'public, s-maxage=600, stale-while-revalidate=7200';

  return NextResponse.json({
    deals: paginated,
    total,
    page,
    limit,
    hasMore,
    lastUpdated: response.lastUpdated,
    sourceStats: response.sourceStats,
  }, {
    headers: { 'Cache-Control': cacheControl },
  });
}
