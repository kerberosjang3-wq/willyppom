'use client';

import { useState } from 'react';
import DealFeed from '@/components/DealFeed';
import BookmarkFeed from '@/components/BookmarkFeed';
import LowestPriceFeed from '@/components/LowestPriceFeed';
import BottomTabBar, { type TabId } from '@/components/BottomTabBar';
import Header from '@/components/Header';

export default function HomePage() {
  const [tab, setTab] = useState<TabId>('feed');

  return (
    <div className="min-h-screen bg-surface text-zinc-100 pb-tab-safe">
      {tab === 'feed' && <DealFeed />}

      {tab === 'lowest' && (
        <>
          <div className="sticky top-0 z-20 bg-surface">
            <Header total={0} searchQuery="" onSearch={() => {}} />
            <div className="px-4 pt-3 pb-2 bg-surface border-b border-surface-border/50">
              <h2 className="text-sm font-bold text-zinc-100">역대 최저가</h2>
              <p className="text-[11px] text-zinc-500">현재 역대 최저가를 달성한 딜만 모았어요</p>
            </div>
          </div>
          <LowestPriceFeed />
        </>
      )}

      {tab === 'bookmarks' && (
        <>
          <div className="sticky top-0 z-20 bg-surface">
            <Header total={0} searchQuery="" onSearch={() => {}} />
            <div className="px-4 pt-3 pb-2 bg-surface border-b border-surface-border/50">
              <h2 className="text-sm font-bold text-zinc-100">찜한 딜</h2>
              <p className="text-[11px] text-zinc-500">북마크한 딜을 모아볼 수 있어요</p>
            </div>
          </div>
          <BookmarkFeed />
        </>
      )}

      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  );
}
