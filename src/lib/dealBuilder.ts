import { fetchAllDeals } from '@/lib/scrapers';
import { setCache } from '@/lib/cache';
import { MOCK_DEALS } from '@/lib/mockDeals';
import type { DealsResponse } from '@/types/deal';
import { normalizeDeal } from '@/lib/parser';
import { aggregateDeals, buildMatchKey } from '@/lib/aggregator';
import { supabase, parsePriceValue, type PriceStats } from '@/lib/supabase';

export const DEALS_CACHE_KEY = 'deals:all';
export const DEALS_CACHE_TTL = 60 * 60 * 1000; // 1 hour

let isRefreshing = false;

async function enrichWithPriceStatsAndLog(deals: any[]) {
  if (!supabase) return deals;

  try {
    const matchKeys = deals.map(d => buildMatchKey(d));

    const { data: historyData } = await supabase
      .from('price_history')
      .select('match_key, price_value, price_str, created_at')
      .in('match_key', matchKeys)
      .order('created_at', { ascending: true });

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
            sparkline: [],
          };
        }
        const st = statsMap[row.match_key];
        if (row.price_value < st.minPrice) { st.minPrice = row.price_value; st.minPriceStr = row.price_str; }
        if (row.price_value > st.maxPrice) st.maxPrice = row.price_value;
        st.avgPrice += row.price_value;
        st.historyCount++;
        st.sparkline!.push({ v: row.price_value, d: row.created_at });
      });

      // statsMap의 각 항목에 대해 avgPrice를 한 번만 계산
      Object.values(statsMap).forEach(st => {
        st.avgPrice = Math.round(st.avgPrice / st.historyCount);
        if (st.sparkline && st.sparkline.length > 7) st.sparkline = st.sparkline.slice(-7);
      });

      deals.forEach((d, i) => {
        const st = statsMap[matchKeys[i]];
        if (!st || st.historyCount === 0) return;
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

export async function buildAndCacheDeals(): Promise<DealsResponse> {
  const raw = await fetchAllDeals();

  if (raw.total === 0) {
    const fallback: DealsResponse = {
      deals: MOCK_DEALS.map(d => ({ ...d, productName: d.title })),
      total: MOCK_DEALS.length,
      lastUpdated: new Date().toISOString(),
      sourceStats: { ppomppu: { count: 0, ok: false } },
    };
    setCache(DEALS_CACHE_KEY, fallback, DEALS_CACHE_TTL);
    return fallback;
  }

  const normalized = raw.deals.map(normalizeDeal);
  const aggregated = aggregateDeals(normalized);

  // Cache immediately without Supabase — user gets fast response
  const response: DealsResponse = { ...raw, deals: aggregated, total: aggregated.length };
  setCache(DEALS_CACHE_KEY, response, DEALS_CACHE_TTL);

  // Supabase price enrichment runs in background, updates cache when done
  if (supabase) {
    enrichWithPriceStatsAndLog(aggregated)
      .then(enriched => {
        response.deals = enriched;
        response.total = enriched.length;
        setCache(DEALS_CACHE_KEY, response, DEALS_CACHE_TTL);
      })
      .catch(err => console.error('[enrich bg]', err));
  }

  return response;
}

export async function refreshInBackground(): Promise<void> {
  if (isRefreshing) return;
  isRefreshing = true;
  try {
    await buildAndCacheDeals();
  } catch (err: unknown) {
    console.error('[bg refresh]', err);
  } finally {
    isRefreshing = false;
  }
}
