import { NextRequest, NextResponse } from 'next/server';
import { fetchAllDeals } from '@/lib/scrapers';
import { getCache, setCache } from '@/lib/cache';
import { MOCK_DEALS } from '@/lib/mockDeals';
import type { DealsResponse, CategoryId } from '@/types/deal';
import { normalizeDeal } from '@/lib/parser';
import { aggregateDeals, buildMatchKey } from '@/lib/aggregator';
import { supabase, parsePriceValue, type PriceStats } from '@/lib/supabase';

const CACHE_KEY = 'deals:all';
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

async function enrichWithPriceStatsAndLog(deals: any[]) {
  if (!supabase) return deals;

  try {
    const matchKeys = deals.map(d => buildMatchKey(d));

    // Query existing history first, then insert current prices in background
    const { data: historyData } = await supabase
      .from('price_history')
      .select('match_key, price_value, price_str')
      .in('match_key', matchKeys);

    // Fire-and-forget inserts — wrapped in Promise.resolve so .catch() is available
    deals.forEach((d, i) => {
      const pVal = parsePriceValue(d.price);
      if (pVal === null) return;
      void Promise.resolve(
        supabase!.from('price_history').insert({
          match_key: matchKeys[i], price_value: pVal, price_str: d.price, source: d.source,
        })
      ).catch((err: unknown) => console.error('[price insert]', err));
    });

    if (historyData) {
      const statsMap: Record<string, PriceStats> = {};
      historyData.forEach(row => {
        if (!statsMap[row.match_key]) {
          statsMap[row.match_key] = {
            minPrice: row.price_value,
            maxPrice: row.price_value,
            avgPrice: 0,
            historyCount: 0,
            isAllTimeLow: false,
            minPriceStr: row.price_str,
            matchKey: row.match_key,
          };
        }
        const st = statsMap[row.match_key];
        if (row.price_value < st.minPrice) {
          st.minPrice    = row.price_value;
          st.minPriceStr = row.price_str;
        }
        if (row.price_value > st.maxPrice) st.maxPrice = row.price_value;
        st.avgPrice   += row.price_value;
        st.historyCount++;
      });

      deals.forEach((d, i) => {
        const st = statsMap[matchKeys[i]];
        if (!st || st.historyCount === 0) return;
        st.avgPrice = Math.round(st.avgPrice / st.historyCount);
        const currentVal = parsePriceValue(d.price);
        st.isAllTimeLow = currentVal !== null && currentVal <= st.minPrice;
        d.priceStats = st;
      });
    }
  } catch (err: unknown) {
    console.error('[enrich] Supabase error', err);
  }

  return deals;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const category  = (searchParams.get('category') ?? 'all') as CategoryId;
  const sort      = (searchParams.get('sort') ?? 'view') as 'view' | 'date' | 'comment';
  const page      = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
  const limit     = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20')));
  const q         = searchParams.get('q')?.trim().toLowerCase() ?? '';
  const forceRefresh = searchParams.get('refresh') === 'true';

  let response = forceRefresh ? null : getCache<DealsResponse>(CACHE_KEY);

  if (!response) {
    try {
      response = await fetchAllDeals();
      // Fallback to mock data if all scrapers fail
      if (response.total === 0) {
        response = {
          deals: MOCK_DEALS.map(d => ({...d, productName: d.title})),
          total: MOCK_DEALS.length,
          lastUpdated: new Date().toISOString(),
          sourceStats: { ppomppu: { count: 0, ok: false } },
        };
      } else {
        // Apply normalizer and aggregator
        const normalized = response.deals.map(normalizeDeal);
        const aggregated = aggregateDeals(normalized);
        const enriched = await enrichWithPriceStatsAndLog(aggregated);
        
        response.deals = enriched;
        response.total = enriched.length;
      }
      setCache(CACHE_KEY, response, CACHE_TTL);
    } catch (err: unknown) {
      console.error('[deals route]', err);
      response = {
        deals: MOCK_DEALS.map(d => ({...d, productName: d.title})),
        total: MOCK_DEALS.length,
        lastUpdated: new Date().toISOString(),
        sourceStats: {},
      };
    }
  }

  let deals = [...response.deals];

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
  if (sort === 'date') {
    deals.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } else if (sort === 'comment') {
    deals.sort((a, b) => b.commentCount - a.commentCount);
  } else {
    deals.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
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
