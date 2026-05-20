'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Deal } from '@/types/deal';
import DealCard from './DealCard';
import LoadingCard from './LoadingCard';
import Header from './Header';
import FilterBar from './FilterBar';
import { getReadIds } from '@/hooks/useReadDeal';
import { getKeywords } from '@/hooks/useKeywords';
import { useFilterPrefs } from '@/hooks/useFilterPrefs';
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

  const {
    category,    setCategory,
    sort,        setSort,
    sources:     activeSources,
    setSources:  setActiveSources,
    view,        setView,
    loaded:      filterLoaded,
  } = useFilterPrefs();
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeywords, setShowKeywords] = useState(false);
  const prevDealIdsRef = useRef<Set<string>>(new Set(initialDeals.map(d => d.id)));
  const [keywords, setKeywords]     = useState<string[]>([]);
  const isInitialMount   = useRef(true);
  const isFirstSearch    = useRef(true);

  const sentinelRef    = useRef<HTMLDivElement>(null);
  const mainRef        = useRef<HTMLDivElement>(null);
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
      // prevDealIdsRef는 현재 deals 상태(state)가 아닌 setter 콜백에서 최신 값으로 업데이트
      setDeals(prev => {
        prevDealIdsRef.current = new Set(prev.map(d => d.id));
        return sorted;
      });
      setKeywords(getKeywords());
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
  // filterLoaded가 true가 된 후(localStorage 복원 완료) 실행
  useEffect(() => {
    if (!filterLoaded) return;
    if (isInitialMount.current && initialDeals.length > 0) {
      isInitialMount.current = false;
      return;
    }
    isInitialMount.current = false;
    fetchDeals();
  }, [category, sort, filterLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search — skip initial mount (filter effect handles first fetch)
  useEffect(() => {
    if (isFirstSearch.current) {
      isFirstSearch.current = false;
      return;
    }
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => fetchDeals({ query: searchQuery }), 400);
    return () => clearTimeout(searchTimerRef.current);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh — fetchDealsRef 사용으로 stale closure 방지
  useEffect(() => {
    const id = setInterval(() => fetchDealsRef.current?.(), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // fetchDeals ref (이벤트 핸들러에서 최신 함수 참조)
  useEffect(() => { fetchDealsRef.current = fetchDeals; }, [fetchDeals]);

  // Pull-to-refresh
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (mainRef.current && mainRef.current.scrollTop === 0) touchStartY.current = e.touches[0].clientY;
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — PULL_THRESHOLD는 모듈 상수

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

  const filteredDeals = deals.filter(d => activeSources.includes(d.source));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-surface text-zinc-100">
      <KeywordToast deals={deals} prevDealIds={prevDealIdsRef.current} keywords={keywords} />
      {showKeywords && <KeywordPanel onClose={() => setShowKeywords(false)} />}
      <div className="shrink-0 bg-surface relative z-10">
        <Header
          lastUpdated={lastUpdated}
          total={total}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onKeyword={() => setShowKeywords(true)}
          keywordCount={keywords.length}
          activeView={view}
          onView={setView}
        />
        <FilterBar
          activeCategory={category}
          activeSort={sort}
          activeSources={activeSources}
          onCategory={c => { setCategory(c); }}
          onSort={(s: 'view' | 'date' | 'comment') => setSort(s)}
          onSources={setActiveSources}
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

      {/* 스크롤 클리핑 래퍼 — overflow-hidden으로 스크롤바를 이 영역 안에만 표시 */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <main ref={mainRef} className="h-full scroll-elastic px-4 pb-6">
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

          {/* Empty state */}
          {!loading && filteredDeals.length === 0 && !error && (
            <div className="mt-20 text-center">
              <p className="text-4xl mb-3">🔍</p>
              <p className="text-zinc-400 text-sm">검색 결과가 없어요</p>
            </div>
          )}

          {/* Deal list — filteredDeals > 0 일 때만 렌더링 */}
          {!loading && filteredDeals.length > 0 && (
            view === 'grid' ? (
              <div className="mt-3 grid grid-cols-2 gap-2 animate-fade-in">
                {filteredDeals.map(deal => <DealCard key={deal.id} deal={deal} isGrid />)}
              </div>
            ) : (
              <div className="mt-4 space-y-1.5 animate-fade-in">
                {filteredDeals.map(deal => <DealCard key={deal.id} deal={deal} />)}
              </div>
            )
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
          {!loading && !hasMore && filteredDeals.length > 0 && (
            <p className="text-center text-zinc-700 text-xs py-8">모든 핫딜을 불러왔어요 🎉</p>
          )}
        </main>
      </div>
    </div>
  );
}
