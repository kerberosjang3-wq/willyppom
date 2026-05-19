import HomeClient from '@/components/HomeClient';
import { getCacheWithMeta } from '@/lib/cache';
import type { DealsResponse, Deal } from '@/types/deal';
import { DEALS_CACHE_KEY } from '@/lib/dealBuilder';

// ISR: 5분마다 페이지 재생성
export const revalidate = 300;

export default async function HomePage() {
  let initialDeals: Deal[] = [];

  try {
    // 인메모리 캐시에 데이터가 있으면 사용, 없으면 클라이언트가 /api/deals 직접 호출
    // ISR에서 직접 스크래핑하면 Vercel Hobby 10s 타임아웃 초과 위험 → 제외
    const cached = getCacheWithMeta<DealsResponse>(DEALS_CACHE_KEY);
    if (cached) {
      initialDeals = [...cached.data.deals]
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 20);
    }
  } catch {
    // 클라이언트가 /api/deals 직접 호출
  }

  return <HomeClient initialDeals={initialDeals} />;
}
