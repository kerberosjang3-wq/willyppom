import HomeClient from '@/components/HomeClient';
import { getCacheWithMeta } from '@/lib/cache';
import type { DealsResponse, Deal } from '@/types/deal';
import { buildAndCacheDeals, DEALS_CACHE_KEY } from '@/lib/dealBuilder';

// ISR: 5분마다 페이지 재생성 → 최초 방문자도 정적 HTML로 빠른 응답
export const revalidate = 300;

export default async function HomePage() {
  let initialDeals: Deal[] = [];

  try {
    const cached = getCacheWithMeta<DealsResponse>(DEALS_CACHE_KEY);
    if (cached) {
      initialDeals = [...cached.data.deals]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 20);
    } else {
      // ISR 재생성 시 스크래핑 실행하여 HTML에 deals 포함
      const data = await buildAndCacheDeals();
      initialDeals = [...data.deals]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 20);
    }
  } catch {
    // 실패 시 클라이언트가 /api/deals 직접 호출
  }

  return <HomeClient initialDeals={initialDeals} />;
}
