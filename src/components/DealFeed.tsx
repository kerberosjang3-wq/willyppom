'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { Deal, CategoryId } from '@/types/deal';
import DealCard from './DealCard';
import LoadingCard from './LoadingCard';
import Header from './Header';
import FilterBar from './FilterBar';

interface FeedResponse {
  deals: Deal[];
  total: number;
  page: number;
  hasMore: boolean;
  lastUpdated: string;
}

const AUTO_REFRESH_MS = 5 * 60 * 1000; // 5 minutes

export default function DealFeed() {
  const [deals, setDeals]           = useState<Deal[]>([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [hasMore, setHasMore]       = useState(false);
  const [loading, setLoading]       = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>();
  const [error, setError]           = useState<string>();

  const [category, setCategory]     = useState<CategoryId>('all');
  const [sort, setSort]             = useState<'view' | 'date' | 'comment'>('view');
  const [searchQuery, setSearchQuery] = useState('');

  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

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
      setDeals(data.deals);
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
      setDeals(prev => [...prev, ...data.deals]);
      setPage(next);
      setHasMore(data.hasMore);
    } finally {
      setLoadingMore(false);
    }
  }, [buildUrl, loadingMore, hasMore, page, searchQuery]);

  // Initial fetch + re-fetch when filters change
  useEffect(() => { fetchDeals(); }, [category, sort]); // eslint-disable-line react-hooks/exhaustive-deps

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
    <div className="min-h-screen bg-surface text-zinc-100">
      <Header
        onRefresh={() => fetchDeals({ refresh: true })}
        loading={loading}
        lastUpdated={lastUpdated}
        total={total}
        searchQuery={searchQuery}
        onSearch={setSearchQuery}
      />

      <FilterBar
        activeCategory={category}
        activeSort={sort}
        onCategory={c => { setCategory(c); }}
        onSort={(s: 'view' | 'date' | 'comment') => setSort(s)}
      />

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
