import type { Deal, SourceId, DealsResponse } from '@/types/deal';
import { scrapePpomppu } from './ppomppu';
import { scrapeClien }   from './clien';
import { scrapeRuliweb } from './ruliweb';
import { scrapeFmkorea } from './fmkorea';

const SCRAPERS: Record<SourceId, () => Promise<Deal[]>> = {
  ppomppu: scrapePpomppu,
  clien:   scrapeClien,
  ruliweb: scrapeRuliweb,
  fmkorea: scrapeFmkorea,
};

export async function fetchAllDeals(sources?: SourceId[]): Promise<DealsResponse> {
  const targets = sources?.length
    ? sources.filter(s => s in SCRAPERS)
    : (Object.keys(SCRAPERS) as SourceId[]);

  const results = await Promise.allSettled(
    targets.map(src => SCRAPERS[src]().then(deals => ({ src, deals })))
  );

  const allDeals: Deal[] = [];
  const sourceStats: DealsResponse['sourceStats'] = {};

  for (const result of results) {
    if (result.status === 'fulfilled') {
      const { src, deals } = result.value;
      allDeals.push(...deals);
      sourceStats[src] = { count: deals.length, ok: true };
    } else {
      const idx = results.indexOf(result);
      const src = targets[idx];
      sourceStats[src] = { count: 0, ok: false };
    }
  }

  // Sort by hot score descending
  allDeals.sort((a, b) => b.hotScore - a.hotScore);

  return {
    deals:       allDeals,
    total:       allDeals.length,
    lastUpdated: new Date().toISOString(),
    sourceStats,
  };
}

export { SCRAPERS };
