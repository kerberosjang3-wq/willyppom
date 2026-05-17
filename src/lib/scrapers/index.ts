import type { DealsResponse } from '@/types/deal';
import { scrapePpomppu } from './ppomppu';

export async function fetchAllDeals(): Promise<DealsResponse> {
  try {
    const deals = await scrapePpomppu();
    deals.sort((a, b) => b.hotScore - a.hotScore);
    return {
      deals,
      total:       deals.length,
      lastUpdated: new Date().toISOString(),
      sourceStats: { ppomppu: { count: deals.length, ok: true } },
    };
  } catch {
    return {
      deals:       [],
      total:       0,
      lastUpdated: new Date().toISOString(),
      sourceStats: { ppomppu: { count: 0, ok: false } },
    };
  }
}
