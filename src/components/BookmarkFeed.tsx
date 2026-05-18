'use client';

import { useState, useEffect } from 'react';
import type { Deal } from '@/types/deal';
import { getBookmarks } from '@/hooks/useBookmark';
import DealCard from './DealCard';

export default function BookmarkFeed() {
  const [deals, setDeals] = useState<Deal[]>([]);

  useEffect(() => {
    setDeals(getBookmarks().reverse()); // 최근 찜한 순
  }, []);

  // 북마크 해제 시 목록 갱신
  const refresh = () => setDeals(getBookmarks().reverse());

  if (deals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center mt-32 gap-3">
        <svg className="w-12 h-12 text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
        <p className="text-zinc-500 text-sm">찜한 딜이 없어요</p>
        <p className="text-zinc-700 text-xs">딜 카드의 북마크 아이콘을 눌러 저장하세요</p>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-8 space-y-2">
      <p className="text-[11px] text-zinc-600 mb-3">찜한 딜 {deals.length}개</p>
      {deals.map(deal => (
        <div key={deal.id} onClick={refresh}>
          <DealCard deal={deal} showNaverGauge />
        </div>
      ))}
    </div>
  );
}
