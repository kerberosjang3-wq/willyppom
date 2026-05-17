'use client';

import { useState, useEffect } from 'react';
import type { Deal } from '@/types/deal';
import DealCard from './DealCard';
import LoadingCard from './LoadingCard';

export default function LowestPriceFeed() {
  const [deals, setDeals]   = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState<string>();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res  = await fetch('/api/deals?sort=view&limit=100');
        if (!res.ok) throw new Error();
        const data = await res.json();
        const lowest = (data.deals as Deal[]).filter(
          d => d.priceStats?.isAllTimeLow && !d.isSoldOut
        );
        setDeals(lowest);
      } catch {
        setError('데이터를 불러오지 못했어요.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <LoadingCard key={i} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6 mx-4 p-4 rounded-2xl bg-red-900/30 border border-red-800/50 text-red-300 text-sm text-center">
        {error}
      </div>
    );
  }

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-32 gap-3">
        <span className="text-5xl">📊</span>
        <p className="text-zinc-500 text-sm">역대 최저가 딜이 없어요</p>
        <p className="text-zinc-700 text-xs">가격 이력이 쌓이면 여기에 표시돼요</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-2">
      <p className="text-[11px] text-zinc-600 mb-3">
        역대 최저가 달성 딜 <span className="text-brand-400 font-bold">{deals.length}</span>개
      </p>
      {deals.map(deal => <DealCard key={deal.id} deal={deal} />)}
    </div>
  );
}
