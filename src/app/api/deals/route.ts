import { NextRequest, NextResponse } from 'next/server';
import { fetchAllDeals } from '@/lib/scrapers';
import { getCache, setCache } from '@/lib/cache';
import { MOCK_DEALS } from '@/lib/mockDeals';
import type { DealsResponse, SourceId, CategoryId, DealsQuery } from '@/types/deal';
import { normalizeDeal } from '@/lib/parser';
import { aggregateDeals } from '@/lib/aggregator';
import { supabase, parsePriceValue, type PriceStats } from '@/lib/supabase';

const CACHE_KEY = 'deals:all';
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

async function enrichWithPriceStatsAndLog(deals: any[]) {
  if (!supabase) return deals;

  try {
    // Collect all match keys
    const matchKeys = deals.map(d => {
      // Recreate matchKey exactly as in aggregator.ts
      const getBaseKey = (text: string) => text.toLowerCase().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '');
      const mallKey = d.mallName ? getBaseKey(d.mallName).replace('알리', '알리익스프레스').replace(/지마켓|g마켓/, '지마켓') : 'unknown';
      const productKey = getBaseKey(d.productName);
      const finalProductKey = productKey.length > 3 ? productKey : getBaseKey(d.title);
      return `${mallKey}-${finalProductKey}`;
    });

    // We can fetch historical stats for all these keys
    // For simplicity and performance, we'll just log them async and fetch stats for those with prices.
    const priceInsertPromises = deals.map(async (d, i) => {
      const pVal = parsePriceValue(d.price);
      if (pVal !== null) {
        try {
          await supabase!.from('price_history').insert({
            match_key: matchKeys[i],
            price_value: pVal,
            price_str: d.price,
            source: d.source,
          });
        } catch (err) {
          console.error('Supabase insert error', err);
        }
      }
    });

    // In a production app, we would run an RPC function to get stats for multiple keys at once.
    // Since we're just setting this up, let's fetch stats for the first few deals or just fetch all grouped by match_key if possible.
    // To keep it simple, we will query all history for these keys.
    const { data: historyData } = await supabase
      .from('price_history')
      .select('match_key, price_value, price_str')
      .in('match_key', matchKeys);

    if (historyData) {
      // Group by match_key
      const statsMap: Record<string, PriceStats> = {};
      historyData.forEach(row => {
        if (!statsMap[row.match_key]) {
          statsMap[row.match_key] = {
            minPrice: row.price_value,
            maxPrice: row.price_value,
            avgPrice: 0,
            historyCount: 0,
            isAllTimeLow: false,
            minPriceStr: row.price_str
          };
        }
        const st = statsMap[row.match_key];
        st.minPrice = Math.min(st.minPrice, row.price_value);
        st.maxPrice = Math.max(st.maxPrice, row.price_value);
        st.avgPrice += row.price_value;
        st.historyCount += 1;
        if (row.price_value === st.minPrice) {
            st.minPriceStr = row.price_str;
        }
      });

      // Assign stats back to deals
      deals.forEach((d, i) => {
        const st = statsMap[matchKeys[i]];
        if (st && st.historyCount > 0) {
          st.avgPrice = Math.round(st.avgPrice / st.historyCount);
          const currentVal = parsePriceValue(d.price);
          st.isAllTimeLow = currentVal !== null && currentVal <= st.minPrice;
          d.priceStats = st;
        }
      });
    }

    // Await inserts to finish in background
    Promise.allSettled(priceInsertPromises);

  } catch (err) {
    console.error('Supabase enrich error', err);
  }

  return deals;
}

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
          deals: MOCK_DEALS.map(d => ({...d, productName: d.title})),
          total: MOCK_DEALS.length,
          lastUpdated: new Date().toISOString(),
          sourceStats: {
            ppomppu: { count: 2, ok: false },
            clien:   { count: 2, ok: false },
            ruliweb: { count: 2, ok: false },
            fmkorea: { count: 2, ok: false },
          },
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
    } catch (err: any) {
      console.error(err);
      response = {
        deals: MOCK_DEALS.map(d => ({...d, productName: d.title})),
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
