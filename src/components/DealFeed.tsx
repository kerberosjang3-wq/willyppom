'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Deal, CategoryId } from '@/types/deal';
import DealCard from './DealCard';
import LoadingCard from './LoadingCard';
import Header from './Header';
import FilterBar from './FilterBar';
import { getReadIds } from '@/hooks/useReadDeal';
import { getKeywords } from '@/hooks/useKeywords';
import KeywordToast from './KeywordToast';
import KeywordPanel from './KeywordPanel';

// 마감·읽음 딜을 하단으로 밀어내는 정렬 (normal → read → soldOut)
function prioritySort(deals: Deal[]): Deal[] {
  const readIds = getReadIds();
  return [...deals].sort((a, b) => {
    const w = (d: Deal) => d.isSoldOut ? 2 : readIds.has(d.id) ? 1 : 0;
    return w(a) - w(b);
  });
}

interface FeedResponse {
  deals: Deal[];
  total: number;
  page: number;
  hasMore: boolean;
  lastUpdated: string;
}

const AUTO_REFRESH_MS  = 5 * 60 * 1000;
const PULL_THRESHOLD   = 64;

interface Props {
  initialDeals?: Deal[];
}

export default function DealFeed({ initialDeals = [] }: Props) {
  const [deals, setDeals]           = useState<Deal[]>(() => prioritySort(initialDeals));
  const [total, setTotal]           = useState(initialDeals.length);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(initialDeals.length === 20);
  const [loading, setLoading]       = useState(initialDeals.length === 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [error, setError]           = useState<string>();

  const [category, setCategory]     = useState<CategoryId>('all');
  const [sort, setSort]             = useState<'view' | 'date' | 'comment'>('date');
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeywords, setShowKeywords] = useState(false);
  const prevDealIdsRef = useRef<Set<string>>(new Set(initialDeals.map(d => d.id)));
  const [keywords, setKeywords]     = useState<string[]>([]);
  const isInitialMount = useRef(true);

  const sentinelRef    = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [pullY, setPullY]           = useState(0);
  const [pullActive, setPullActive] = useState(false);
  const touchStartY  = useRef(0);
  const pullYRef     = useRef(0);
  const fetchDealsRef = useRef<(opts?: { refresh?: boolean }) => Promise<void>>();

  const buildUrl = useCallback((p: number, q?: string, refresh = false) => {
    const params = new URLSearchParams();
    if (category !== 'all') params.set('category', category);
    params.set('sort', sort);
    params.set('page', String(p));
    params.set('limit', '20');
    if (q) params.set('q', q);
    if (refresh) params.set('refresh', 'true');
    return `/api/deals?${params.toString()}`;
  }, [category, sort]);

  const fetchDeals = useCallback(async (opts?: { refresh?: boolean; query?: string }) => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await fetch(buildUrl(1, opts?.query ?? searchQuery, opts?.refresh));
      if (!res.ok) throw new Error('API 오류');
      const data: FeedResponse = await res.json();
      const sorted = prioritySort(data.deals);
      prevDealIdsRef.current = new Set(deals.map(d => d.id));
      setKeywords(getKeywords());
      setDeals(sorted);
      setTotal(data.total);
      setPage(1);
      setHasMore(data.hasMore);
      setLastUpdated(data.lastUpdated);
    } catch (e) {
      setError('데이터를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
    } finally {
      setLoading(false);
    }
  }, [buildUrl, searchQuery]);

  const fetchMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res  = await fetch(buildUrl(next, searchQuery));
      if (!res.ok) return;
      const data: FeedResponse = await res.json();
      setDeals(prev => prioritySort([...prev, ...data.deals]));
      setPage(next);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, loadingMore, hasMore, page, searchQuery]);

  // Initial fetch + re-fetch when filters change
  // Skip initial fetch when SSR data already populated
  useEffect(() => {
    if (isInitialMount.current && initialDeals.length > 0) {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false;
    fetchDeals();
  }, [category, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchDeals({ query: searchQuery }), 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh
  useEffect(() => {
    const id = setInterval(() => fetchDeals(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [fetchDeals]);

  // fetchDeals ref (이벤트 핸들러에서 최신 함수 참조)
  useEffect(() => { fetchDealsRef.current = fetchDeals; }, [fetchDeals]);

  // Pull-to-refresh
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) touchStartY.current = e.touches[0].clientY;
      else touchStartY.current = 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!touchStartY.current) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      const clamped = Math.max(0, Math.min(delta, 96));
      pullYRef.current = clamped;
      setPullY(clamped);
    };
    const onTouchEnd = async () => {
      if (!touchStartY.current) return;
      touchStartY.current = 0;
      if (pullYRef.current >= PULL_THRESHOLD) {
        setPullActive(true);
        await fetchDealsRef.current?.({ refresh: true });
        setPullActive(false);
      }
      pullYRef.current = 0;
      setPullY(0);
    };
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove',  onTouchMove,  { passive: true });
    document.addEventListener('touchend',   onTouchEnd,   { passive: true });
    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove',  onTouchMove);
      document.removeEventListener('touchend',   onTouchEnd);
    };
  }, [PULL_THRESHOLD]);

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) fetchMore();
    }, { rootMargin: '200px' });
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchMore]);

  return (
    <div className="bg-surface text-zinc-100">
      <KeywordToast deals={deals} prevDealIds={prevDealIdsRef.current} keywords={keywords} />
      {showKeywords && <KeywordPanel onClose={() => setShowKeywords(false)} />}
      <div className="sticky top-0 z-20 bg-surface">
        <Header
          lastUpdated={lastUpdated}
          total={total}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onKeyword={() => setShowKeywords(true)}
          keywordCount={keywords.length}
        />
        <FilterBar
          activeCategory={category}
          activeSort={sort}
          onCategory={c => { setCategory(c); }}
          onSort={(s: 'view' | 'date' | 'comment') => setSort(s)}
        />
      </div>

      {/* Pull-to-refresh 인디케이터 */}
      <div
        className="flex items-center justify-center overflow-hidden transition-all duration-200"
        style={{ height: pullActive ? 48 : pullY * 0.5 }}
      >
        <div
          className={`w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full ${
            pullActive || pullY >= PULL_THRESHOLD ? 'animate-spin' : ''
          }`}
          style={{ opacity: pullActive ? 1 : pullY / PULL_THRESHOLD }}
        />
      </div>

      <main className="px-4 pb-8">
        {/* Error */}
        {error && (
          <div className="mt-6 p-4 rounded-2xl bg-red-900/30 border border-red-800/50 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Loading skeletons */}
        {loading && (
          <div className="mt-4 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <LoadingCard key={i} />)}
          </div>
        )}

        {/* Deal list */}
        {!loading && deals.length === 0 && !error && (
          <div className="mt-20 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-zinc-400 text-sm">검색 결과가 없어요</p>
          </div>
        )}

        {!loading && (
          <div className="mt-4 space-y-2 animate-fade-in">
            {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
          </div>
        )}

        {/* Load-more sentinel */}
        <div ref={sentinelRef} className="h-1" />

        {/* Loading more spinner */}
        {loadingMore && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* All loaded */}
        {!loading && !hasMore && deals.length > 0 && (
          <p className="text-center text-zinc-700 text-xs py-8">모든 핫딜을 불러왔어요 🎉</p>
        )}
      </main>
    </div>
  );
}
