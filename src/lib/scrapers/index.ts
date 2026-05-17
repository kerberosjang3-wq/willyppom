import type { DealsResponse } from '@/types/deal';
import { scrapePpomppu }    from './ppomppu';
import { scrapeQuasarzone } from './quasarzone';
import { scrapeFmkorea }    from './fmkorea';

export async function fetchAllDeals(): Promise<DealsResponse> {
  const [ppomppuResult, quasarzoneResult, fmkoreaResult] = await Promise.allSettled([
    scrapePpomppu(),
    scrapeQuasarzone(),
    scrapeFmkorea(),
  ]);

  const ppomppuDeals    = ppomppuResult.status    === 'fulfilled' ? ppomppuResult.value    : [];
  const quasarzoneDeals = quasarzoneResult.status === 'fulfilled' ? quasarzoneResult.value : [];
  const fmkoreaDeals    = fmkoreaResult.status    === 'fulfilled' ? fmkoreaResult.value    : [];

  const ppomppuOk    = ppomppuResult.status    === 'fulfilled' && ppomppuDeals.length    > 0;
  const quasarzoneOk = quasarzoneResult.status === 'fulfilled' && quasarzoneDeals.length > 0;
  const fmkoreaOk    = fmkoreaResult.status    === 'fulfilled' && fmkoreaDeals.length    > 0;

  if (ppomppuResult.status === 'rejected')
    console.error('[scrapers] ppomppu failed:', ppomppuResult.reason);
  if (quasarzoneResult.status === 'rejected')
    console.error('[scrapers] quasarzone failed:', quasarzoneResult.reason);
  if (fmkoreaResult.status === 'rejected')
    console.error('[scrapers] fmkorea failed:', fmkoreaResult.reason);

  const deals = [...ppomppuDeals, ...quasarzoneDeals, ...fmkoreaDeals];
  deals.sort((a, b) => b.hotScore - a.hotScore);

  return {
    deals,
    total:       deals.length,
    lastUpdated: new Date().toISOString(),
    sourceStats: {
      ppomppu:    { count: ppomppuDeals.length,    ok: ppomppuOk },
      quasarzone: { count: quasarzoneDeals.length, ok: quasarzoneOk },
      fmkorea:    { count: fmkoreaDeals.length,    ok: fmkoreaOk },
    },
  };
}
