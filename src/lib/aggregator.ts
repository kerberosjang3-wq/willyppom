import type { Deal } from '@/types/deal';

function getBaseKey(text: string): string {
  // Remove whitespace and special characters, keep alphanumeric and Korean
  return text.toLowerCase().replace(/[^\w\s가-힣]/g, '').replace(/\s+/g, '');
}

function normalizeMallKey(mall: string): string {
  const key = getBaseKey(mall);
  if (key.includes('알리')) return '알리익스프레스';
  if (key.includes('아마존')) return '아마존';
  if (key.includes('지마켓') || key.includes('g마켓')) return '지마켓';
  return key;
}

export function aggregateDeals(deals: Deal[]): Deal[] {
  const aggregated: Record<string, Deal> = {};
  const mergedList: Deal[] = [];

  // Sort deals by hotScore descending first, so the base deal is always the "hottest" one
  const sortedDeals = [...deals].sort((a, b) => b.hotScore - a.hotScore);

  for (const deal of sortedDeals) {
    // Generate a matching key based on mallName and simplified productName
    const mallKey = deal.mallName ? normalizeMallKey(deal.mallName) : 'unknown';
    const productKey = getBaseKey(deal.productName || deal.title);
    
    // Fallback to original title if productKey is too short (to avoid merging unrelated items)
    const finalProductKey = productKey.length > 3 ? productKey : getBaseKey(deal.title);

    const matchKey = `${mallKey}-${finalProductKey}`;

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
        baseDeal.hotScore += deal.hotScore; // Combine hot scores
      }
    } else {
      // New distinct deal
      aggregated[matchKey] = deal;
      mergedList.push(deal);
    }
  }

  // Final re-sort by the newly combined hotScore
  return mergedList.sort((a, b) => b.hotScore - a.hotScore);
}
