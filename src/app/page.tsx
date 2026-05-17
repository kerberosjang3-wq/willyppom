import HomeClient from '@/components/HomeClient';
import { getCacheWithMeta } from '@/lib/cache';
import type { DealsResponse, Deal } from '@/types/deal';

const DEALS_CACHE_KEY = 'deals:all';

export default function HomePage() {
  // Read from the shared in-memory cache — no HTTP round-trip needed.
  // If cache is cold (first ever request), returns [] and client will fetch normally.
  const cached = getCacheWithMeta<DealsResponse>(DEALS_CACHE_KEY);
  const initialDeals: Deal[] = cached
    ? [...cached.data.deals].sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0)).slice(0, 20)
    : [];

  return <HomeClient initialDeals={initialDeals} />;
}
