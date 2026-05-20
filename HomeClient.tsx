'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Deal } from '@/types/deal';
import DealFeed from '@/components/DealFeed';
import BottomTabBar, { type TabId } from '@/components/BottomTabBar';
import Header from '@/components/Header';

// Lazy-load non-default tabs — only downloaded when the user first taps the tab
const BookmarkFeed    = dynamic(() => import('@/components/BookmarkFeed'),    { ssr: false });
const LowestPriceFeed = dynamic(() => import('@/components/LowestPriceFeed'), { ssr: false });

interface Props {
  initialDeals: Deal[];
}

export default function HomeClient({ initialDeals }: Props) {
  const [tab, setTab] = useState<TabId>('feed');

  return (
    <div className="h-full flex flex-col overflow-hidden bg-surface text-zinc-100">
      {tab === 'feed' && <DealFeed initialDeals={initialDeals} />}

      {tab === 'lowest' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 bg-surface">
            <Header total={0} searchQuery="" onSearch={() => {}} />
            <div className="px-4 pt-3 pb-2 bg-surface border-b border-surface-border/50">
              <h2 className="text-sm font-bold text-zinc-100">역대 최저가</h2>
              <p className="text-[11px] text-zinc-500">현재 역대 최저가를 달성한 딜만 모았어요</p>
            </div>
          </div>
          <div className="flex-1 scroll-elastic pb-6">
            <LowestPriceFeed />
          </div>
        </div>
      )}

      {tab === 'bookmarks' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 bg-surface">
            <Header total={0} searchQuery="" onSearch={() => {}} />
            <div className="px-4 pt-3 pb-2 bg-surface border-b border-surface-border/50">
              <h2 className="text-sm font-bold text-zinc-100">찜한 딜</h2>
              <p className="text-[11px] text-zinc-500">북마크한 딜을 모아볼 수 있어요</p>
            </div>
          </div>
          <div className="flex-1 scroll-elastic pb-6">
            <BookmarkFeed />
          </div>
        </div>
      )}

      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  );
}
