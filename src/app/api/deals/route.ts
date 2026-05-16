import { NextRequest, NextResponse } from 'next/server';
import { fetchAllDeals } from '@/lib/scrapers';
import { getCache, setCache } from '@/lib/cache';
import { MOCK_DEALS } from '@/lib/mockDeals';
import type { DealsResponse, SourceId, CategoryId, DealsQuery } from '@/types/deal';

const CACHE_KEY = 'deals:all';
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const sourcesParam = searchParams.get('sources');
  const sources = sourcesParam
    ? (sourcesParam.split(',') as SourceId[])
    : undefined;

  const category  = (searchParams.get('category') ?? 'all') as CategoryId;
  const sort      = (searchParams.get('sort') ?? 'hot') as 'hot' | 'new';
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const q         = searchParams.get('q')?.trim().toLowerCase() ?? '';
  const forceRefresh = searchParams.get('refresh') === 'true';

  let response = forceRefresh ? null : getCache<DealsResponse>(CACHE_KEY);

  if (!response) {
    try {
      response = await fetchAllDeals(sources);
      // Fallback to mock data if all scrapers fail
      if (response.total === 0) {
        response = {
          deals: MOCK_DEALS,
          total: MOCK_DEALS.length,
          lastUpdated: new Date().toISOString(),
          sourceStats: {
            ppomppu: { count: 2, ok: false },
            clien:   { count: 2, ok: false },
            ruliweb: { count: 2, ok: false },
            fmkorea: { count: 2, ok: false },
          },
        };
      }
      setCache(CACHE_KEY, response, CACHE_TTL);
    } catch {
      response = {
        deals: MOCK_DEALS,
        total: MOCK_DEALS.length,
        lastUpdated: new Date().toISOString(),
        sourceStats: {},
      };
    }
  }

  let deals = [...response.deals];

  // Filter by sources
  if (sources?.length) {
    deals = deals.filter(d => sources.includes(d.source));
  }

  // Filter by category
  if (category && category !== 'all') {
    deals = deals.filter(d => d.category === category);
  }

  // Search
  if (q) {
    deals = deals.filter(d =>
      d.title.toLowerCase().includes(q) ||
      d.description?.toLowerCase().includes(q)
    );
  }

  // Sort
  if (sort === 'new') {
    deals.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } else {
    deals.sort((a, b) => b.hotScore - a.hotScore);
  }

  // Paginate
  const total    = deals.length;
  const start    = (page - 1) * limit;
  const paginated = deals.slice(start, start + limit);
  const hasMore  = start + limit < total;

  return NextResponse.json({
    deals: paginated,
    total,
    page,
    limit,
    hasMore,
    lastUpdated: response.lastUpdated,
    sourceStats: response.sourceStats,
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
