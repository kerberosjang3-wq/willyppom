import type { DealsResponse } from '@/types/deal';
import { scrapePpomppu }    from './ppomppu';
import { scrapeQuasarzone } from './quasarzone';

export async function fetchAllDeals(): Promise<DealsResponse> {
  const [ppomppuResult, quasarzoneResult] = await Promise.allSettled([
    scrapePpomppu(),
    scrapeQuasarzone(),
  ]);

  const ppomppuDeals    = ppomppuResult.status    === 'fulfilled' ? ppomppuResult.value    : [];
  const quasarzoneDeals = quasarzoneResult.status === 'fulfilled' ? quasarzoneResult.value : [];

  const ppomppuOk    = ppomppuResult.status    === 'fulfilled' && ppomppuDeals.length    > 0;
  const quasarzoneOk = quasarzoneResult.status === 'fulfilled' && quasarzoneDeals.length > 0;

  if (ppomppuResult.status === 'rejected')
    console.error('[scrapers] ppomppu failed:', ppomppuResult.reason);
  if (quasarzoneResult.status === 'rejected')
    console.error('[scrapers] quasarzone failed:', quasarzoneResult.reason);

  const deals = [...ppomppuDeals, ...quasarzoneDeals];
  deals.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));

  return {
    deals,
    total:       deals.length,
    lastUpdated: new Date().toISOString(),
    sourceStats: {
      ppomppu:    { count: ppomppuDeals.length,    ok: ppomppuOk },
      quasarzone: { count: quasarzoneDeals.length, ok: quasarzoneOk },
    },
  };
}
