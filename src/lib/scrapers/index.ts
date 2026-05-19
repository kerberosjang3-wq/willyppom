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

  if (ppomppuResult.status    === 'rejected') console.error('[scrapers] ppomppu failed:',    ppomppuResult.reason);
  if (quasarzoneResult.status === 'rejected') console.error('[scrapers] quasarzone failed:', quasarzoneResult.reason);
  if (fmkoreaResult.status    === 'rejected') console.error('[scrapers] fmkorea failed:',    fmkoreaResult.reason);

  const deals = [...ppomppuDeals, ...quasarzoneDeals, ...fmkoreaDeals];
  deals.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));

  return {
    deals,
    total:       deals.length,
    lastUpdated: new Date().toISOString(),
    sourceStats: {
      ppomppu:    { count: ppomppuDeals.length,    ok: ppomppuResult.status    === 'fulfilled' && ppomppuDeals.length    > 0 },
      quasarzone: { count: quasarzoneDeals.length, ok: quasarzoneResult.status === 'fulfilled' && quasarzoneDeals.length > 0 },
      fmkorea:    { count: fmkoreaDeals.length,    ok: fmkoreaResult.status    === 'fulfilled' && fmkoreaDeals.length    > 0 },
    },
  };
}
