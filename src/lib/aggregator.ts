import type { Deal } from '@/types/deal';

function getBaseKey(text: string): string {
  return text.toLowerCase().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '');
}

function normalizeMallKey(mall: string): string {
  const key = getBaseKey(mall);
  if (key.includes('알리')) return '알리익스프레스';
  if (key.includes('아마존')) return '아마존';
  if (key.includes('지마켓') || key.includes('g마켓')) return '지마켓';
  return key;
}

export function buildMatchKey(deal: Pick<Deal, 'mallName' | 'productName' | 'title'>): string {
  const mallKey = deal.mallName ? normalizeMallKey(deal.mallName) : 'unknown';
  const productKey = getBaseKey(deal.productName || deal.title);
  const finalProductKey = productKey.length > 3 ? productKey : getBaseKey(deal.title);
  return `${mallKey}-${finalProductKey}`;
}

export function aggregateDeals(deals: Deal[]): Deal[] {
  const aggregated: Record<string, Deal> = {};
  const mergedList: Deal[] = [];

  const sortedDeals = [...deals].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));

  for (const deal of sortedDeals) {
    const matchKey = buildMatchKey(deal);

    if (aggregated[matchKey]) {
      // Merge into existing deal
      const baseDeal = aggregated[matchKey];
      
      if (!baseDeal.duplicateSources) {
        baseDeal.duplicateSources = [];
      }
      
      // Avoid adding the same source multiple times (though shouldn't happen usually)
      const alreadyAdded = baseDeal.duplicateSources.some(s => s.url === deal.url);
      if (!alreadyAdded && baseDeal.url !== deal.url) {
        baseDeal.duplicateSources.push({
          source: deal.source,
          sourceName: deal.sourceName,
          url: deal.url,
        });

        // Combine stats
        baseDeal.commentCount += deal.commentCount;
        baseDeal.likeCount += deal.likeCount;
      }
    } else {
      // New distinct deal
      aggregated[matchKey] = deal;
      mergedList.push(deal);
    }
  }

  return mergedList.sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0));
}
