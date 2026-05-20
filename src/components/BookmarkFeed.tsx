'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { Deal } from '@/types/deal';
import { getBookmarks, saveBookmarks } from '@/hooks/useBookmark';
import DealCard from './DealCard';

const REVEAL_WIDTH = 68; // 삭제 버튼 노출 너비(px)
const THRESHOLD    = 48; // 스와이프 확정 임계값(px)

interface SwipeRowProps {
  deal: Deal;
  onDelete: (id: string) => void;
  openId: string | null;
  setOpenId: (id: string | null) => void;
}

function SwipeRow({ deal, onDelete, openId, setOpenId }: SwipeRowProps) {
  const isOpen       = openId === deal.id;
  const [liveX, setLiveX] = useState(0);   // 드래그 중 실시간 offset
  const dragging     = useRef(false);
  const startX       = useRef(0);
  const startY       = useRef(0);
  const lockedAxis   = useRef<'h' | 'v' | null>(null);

  const targetX = isOpen ? -REVEAL_WIDTH : 0;

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    startX.current     = e.touches[0].clientX;
    startY.current     = e.touches[0].clientY;
    lockedAxis.current = null;
    dragging.current   = false;
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - startX.current;
    const dy = e.touches[0].clientY - startY.current;

    // 첫 움직임으로 축 결정
    if (!lockedAxis.current) {
      if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      lockedAxis.current = Math.abs(dx) > Math.abs(dy) ? 'h' : 'v';
    }
    if (lockedAxis.current === 'v') return;

    dragging.current = true;
    // 현재 열린 상태에서의 offset 기준으로 드래그
    const base  = isOpen ? -REVEAL_WIDTH : 0;
    const clamped = Math.max(-REVEAL_WIDTH, Math.min(0, base + dx));
    setLiveX(clamped);
  }, [isOpen]);

  const onTouchEnd = useCallback(() => {
    if (!dragging.current) return;
    dragging.current = false;
    const base = isOpen ? -REVEAL_WIDTH : 0;
    const moved = liveX - base;

    if (!isOpen && moved < -THRESHOLD) {
      setOpenId(deal.id);
    } else if (isOpen && moved > THRESHOLD) {
      setOpenId(null);
    } else {
      // 원위치로 snap
      setOpenId(isOpen ? deal.id : null);
    }
    setLiveX(0);
  }, [isOpen, liveX, deal.id, setOpenId]);

  // 다른 카드가 열리면 이 카드 닫기
  useEffect(() => {
    if (!isOpen) setLiveX(0);
  }, [isOpen]);

  const displayX = dragging.current ? liveX : targetX;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#1c1c21]">
      {/* 삭제 버튼 (슬라이드로 노출) */}
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-zinc-800"
        style={{ width: REVEAL_WIDTH }}
      >
        <button
          onClick={() => onDelete(deal.id)}
          className="flex flex-col items-center gap-1 text-white px-3"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <span className="text-[9px] font-semibold">삭제</span>
        </button>
      </div>

      {/* 카드 (좌우 슬라이드) */}
      <div
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: `translateX(${displayX}px)`,
          transition: dragging.current ? 'none' : 'transform 0.22s ease',
        }}
        onClick={() => { if (isOpen) setOpenId(null); }}
        className="bg-[#1c1c21] rounded-2xl"
      >
        <DealCard deal={deal} showNaverGauge />
      </div>
    </div>
  );
}

export default function BookmarkFeed() {
  const [deals, setDeals]   = useState<Deal[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setDeals(getBookmarks().reverse());

    const syncList = () => setDeals(getBookmarks().reverse());
    window.addEventListener('bookmarkchange', syncList);
    return () => window.removeEventListener('bookmarkchange', syncList);
  }, []);

  const handleDelete = useCallback((id: string) => {
    const next = getBookmarks().filter(d => d.id !== id);
    saveBookmarks(next);
    setDeals(next.slice().reverse());
    setOpenId(null);
  }, []);

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
        <SwipeRow
          key={deal.id}
          deal={deal}
          onDelete={handleDelete}
          openId={openId}
          setOpenId={setOpenId}
        />
      ))}
    </div>
  );
}
