'use client';

import { useState, useCallback } from 'react';
import { format, isToday, isThisYear } from 'date-fns';
import type { Deal } from '@/types/deal';
import { SOURCE_META, CATEGORY_META } from '@/types/deal';
import PriceGauge from '@/components/PriceGauge';
import { useReadDeal } from '@/hooks/useReadDeal';
import { useBookmark } from '@/hooks/useBookmark';

interface Props {
  deal: Deal;
}

export default function DealCard({ deal }: Props) {
  const meta     = SOURCE_META[deal.source];
  const catMeta  = CATEGORY_META[deal.category];
  const pubDate  = new Date(deal.publishedAt);
  const soldOut  = deal.isSoldOut ?? false;
  const hasPrice = !!deal.price;

  const postTime = isToday(pubDate)
    ? format(pubDate, 'HH:mm')
    : isThisYear(pubDate)
      ? format(pubDate, 'MM/dd HH:mm')
      : format(pubDate, 'yy/MM/dd');

  const { isRead, markRead }       = useReadDeal(deal.id);
  const { isBookmarked, toggle }   = useBookmark(deal.id);
  const [mallLoading, setMallLoading] = useState(false);

  const handleMallClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (mallLoading) return;

    markRead();
    setMallLoading(true);
    try {
      const res  = await fetch(`/api/mall-link?url=${encodeURIComponent(deal.url)}`);
      const data = await res.json();
      window.open(data.mallUrl ?? deal.url, '_blank', 'noopener,noreferrer');
    } catch {
      window.open(deal.url, '_blank', 'noopener,noreferrer');
    } finally {
      setMallLoading(false);
    }
  }, [deal.url, mallLoading, markRead]);

  const opacityClass = soldOut ? 'opacity-50' : isRead ? 'opacity-55' : '';

  return (
    <div className={`bg-surface-card rounded-2xl overflow-hidden border border-surface-border/40 hover:bg-surface-hover transition-all duration-150 ${opacityClass}`}>

      {/* 1·2행: 뽐뿌 게시글 링크 */}
      <a
        href={deal.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={markRead}
        className="block active:scale-[0.98] transition-transform duration-100 px-3 pt-3 pb-1.5"
      >
        <div className="flex gap-2.5">

          {/* 썸네일 or 카테고리 이모지 placeholder */}
          <div className="shrink-0 w-8 h-8 rounded-md overflow-hidden bg-zinc-800 flex items-center justify-center">
            {deal.thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={deal.thumbnail}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-base leading-none">{catMeta.emoji}</span>
            )}
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-0">

            {/* 1행: 상품명 */}
            <p className={`font-medium text-zinc-100 leading-snug line-clamp-2 ${hasPrice ? 'text-[12px]' : 'text-[13px]'}`}>
              {deal.productName || deal.title}
            </p>

            {/* 2행: 가격 정보 (가격 있을 때만) */}
            {hasPrice && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-brand-400 font-bold text-sm leading-none">{deal.price}</span>
                {deal.shipping && (
                  <span className="text-zinc-400 text-[10px] bg-zinc-800 px-1 rounded leading-none py-0.5">
                    {deal.shipping}
                  </span>
                )}
                {deal.discountRate && (
                  <span className="text-emerald-400/70 text-[10px] font-bold">{deal.discountRate}</span>
                )}
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto"
                  style={{ color: meta.color, backgroundColor: `${meta.color}15` }}
                >
                  {deal.sourceName}
                </span>
              </div>
            )}

            {/* 가격 없을 때: 채널명만 오른쪽에 */}
            {!hasPrice && (
              <div className="flex items-center">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-auto"
                  style={{ color: meta.color, backgroundColor: `${meta.color}15` }}
                >
                  {deal.sourceName}
                </span>
              </div>
            )}

            {/* Price Gauge */}
            {deal.priceStats && deal.priceStats.historyCount >= 1 && (
              <PriceGauge currentPriceStr={deal.price} stats={deal.priceStats} />
            )}

          </div>
        </div>
      </a>

      {/* 3행: 쇼핑몰 뱃지 + 상태 뱃지 + 북마크 / 댓글·좋아요·시간 */}
      <div className="flex items-center gap-2 px-3 pb-3">
        <button
          onClick={handleMallClick}
          disabled={mallLoading}
          className="flex items-center gap-1 text-[10px] text-brand-300 border border-brand-500/30 bg-brand-900/20 px-1.5 py-0.5 rounded-md font-semibold hover:bg-brand-900/40 transition-colors disabled:opacity-60"
        >
          {mallLoading ? (
            <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="w-2.5 h-2.5 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          )}
          {deal.mallName ?? '쇼핑몰 이동'}
        </button>

        {deal.viewCount !== undefined && (
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {deal.viewCount.toLocaleString('ko-KR')}
          </span>
        )}

        {soldOut && (
          <span className="bg-zinc-700 text-zinc-300 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
            마감
          </span>
        )}

        {/* 북마크 버튼 */}
        <button
          onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(deal); }}
          className="ml-auto text-zinc-600 hover:text-yellow-400 transition-colors"
          aria-label={isBookmarked ? '북마크 제거' : '북마크'}
        >
          <svg className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            {deal.commentCount}
          </span>
          <span className="text-[10px] text-zinc-500 flex items-center gap-1">
            <svg className="w-3 h-3 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            {deal.likeCount}
          </span>
          <span className="text-[10px] text-zinc-500">{postTime}</span>
        </div>
      </div>

    </div>
  );
}
