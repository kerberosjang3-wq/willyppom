'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Deal } from '@/types/deal';
import { SOURCE_META } from '@/types/deal';
import PriceGauge from '@/components/PriceGauge';

interface Props {
  deal: Deal;
}

export default function DealCard({ deal }: Props) {
  const meta    = SOURCE_META[deal.source];
  const pubDate = new Date(deal.publishedAt);
  const timeAgo = formatDistanceToNow(pubDate, { addSuffix: true, locale: ko });
  const isHot   = deal.hotScore > 60;

  return (
    <a
      href={deal.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-surface-card rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-100 border border-surface-border/50 hover:bg-surface-hover"
    >
      <div className="flex flex-col p-3 gap-1.5">

        {/* 1행: 상품명 */}
        <p className="text-[12px] font-medium text-zinc-100 leading-snug line-clamp-2">
          {deal.mallName && (
            <span className="text-[10px] text-brand-300 border border-brand-500/30 bg-brand-900/20 px-1 rounded mr-1.5 align-text-bottom">
              {deal.mallName}
            </span>
          )}
          {deal.productName || deal.title}
        </p>

        {/* 2행: 가격 */}
        <div className="flex items-center gap-1.5">
          {deal.price && (
            <span className="text-brand-400 font-bold text-sm leading-none">{deal.price}</span>
          )}
          {deal.shipping && (
            <span className="text-zinc-400 text-[10px] bg-zinc-800 px-1 rounded leading-none py-0.5">
              {deal.shipping}
            </span>
          )}
          {deal.discountRate && (
            <span className="text-green-400 text-[10px] font-bold">{deal.discountRate}</span>
          )}
        </div>

        {/* Price Gauge */}
        {deal.priceStats && deal.priceStats.historyCount >= 2 && (
          <PriceGauge currentPriceStr={deal.price} stats={deal.priceStats} />
        )}

        {/* 3행: 채널명 + HOT + 중복소스 + 댓글/좋아요 + 시간 */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
            style={{ color: meta.color, backgroundColor: `${meta.color}15` }}
          >
            {deal.sourceName}
          </span>

          {isHot && (
            <span className="bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
              HOT
            </span>
          )}

          <div className="flex items-center gap-2 ml-auto">
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
            <span className="text-[10px] text-zinc-500">{timeAgo}</span>
          </div>
        </div>

      </div>
    </a>
  );
}
