'use client';

import { useState, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Deal } from '@/types/deal';
import { SOURCE_META } from '@/types/deal';
import PriceGauge from '@/components/PriceGauge';

interface Props {
  deal: Deal;
}

type CoupangState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; price: number; priceText: string; url: string; searchUrl: string; diff: number | null }
  | { status: 'error'; searchUrl: string };

function parseKRW(str?: string): number | null {
  if (!str) return null;
  const n = parseInt(str.replace(/[^\d]/g, ''), 10);
  return isNaN(n) || n === 0 ? null : n;
}

export default function DealCard({ deal }: Props) {
  const meta    = SOURCE_META[deal.source];
  const pubDate = new Date(deal.publishedAt);
  const timeAgo = formatDistanceToNow(pubDate, { addSuffix: true, locale: ko });
  const isHot   = deal.hotScore > 60;

  const [coupang, setCoupang] = useState<CoupangState>({ status: 'idle' });

  const fetchCoupang = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (coupang.status === 'loading') return;

    setCoupang({ status: 'loading' });
    const q = encodeURIComponent(deal.productName || deal.title);

    try {
      const res  = await fetch(`/api/coupang-compare?q=${q}`);
      const data = await res.json();

      const searchUrl: string = data.searchUrl ?? `https://www.coupang.com/np/search?q=${q}`;

      if (data.error || !data.price) {
        setCoupang({ status: 'error', searchUrl });
        return;
      }

      const dealPrice    = parseKRW(deal.price);
      const coupangPrice = data.price as number;
      const diff         = dealPrice != null ? coupangPrice - dealPrice : null;

      setCoupang({
        status: 'done',
        price: coupangPrice,
        priceText: data.priceText,
        url: data.url,
        searchUrl,
        diff,
      });
    } catch {
      setCoupang({
        status: 'error',
        searchUrl: `https://www.coupang.com/np/search?q=${q}`,
      });
    }
  }, [coupang.status, deal.productName, deal.title, deal.price]);

  return (
    <div className="bg-surface-card rounded-2xl overflow-hidden border border-surface-border/50 hover:bg-surface-hover transition-all duration-100">
      {/* 메인 딜 링크 영역 */}
      <a
        href={deal.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block active:scale-[0.98] transition-all duration-100"
      >
        <div className="flex items-center p-3 gap-3">
          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col gap-1">
            <div>
              {/* Source & Time */}
              <div className="flex flex-wrap items-center gap-2 mb-1">
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

                {/* Duplicate Sources Badges */}
                {deal.duplicateSources && deal.duplicateSources.length > 0 && (
                  <div className="flex items-center gap-1 border-l border-zinc-700 pl-2">
                    {deal.duplicateSources.map(src => {
                      const srcMeta = SOURCE_META[src.source];
                      return srcMeta ? (
                        <span
                          key={src.url}
                          className="text-[9px] font-bold px-1 py-0.5 rounded"
                          style={{ color: srcMeta.color, backgroundColor: `${srcMeta.color}15` }}
                          title={src.sourceName}
                        >
                          {srcMeta.name[0]}
                        </span>
                      ) : null;
                    })}
                  </div>
                )}

                <span className="text-[10px] text-zinc-500 ml-auto">{timeAgo}</span>
              </div>

              {/* Title & Mall Name */}
              <p className="text-sm font-medium text-zinc-100 leading-snug line-clamp-2">
                {deal.mallName && (
                  <span className="text-[10px] text-brand-300 border border-brand-500/30 bg-brand-900/20 px-1 rounded mr-1.5 align-text-bottom">
                    {deal.mallName}
                  </span>
                )}
                {deal.productName || deal.title}
              </p>
            </div>

            {/* Price & Stats */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  {deal.price && (
                    <span className="text-brand-400 font-bold text-sm leading-none">{deal.price}</span>
                  )}
                  {deal.shipping && (
                    <span className="text-zinc-400 text-[10px] bg-zinc-800 px-1 rounded leading-none py-0.5">
                      {deal.shipping}
                    </span>
                  )}
                </div>
                {deal.discountRate && (
                  <span className="text-green-400 text-[10px] font-bold mt-0.5">{deal.discountRate}</span>
                )}
              </div>

              <div className="flex items-center gap-2.5 mb-0.5">
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
              </div>
            </div>

            {/* Price Gauge */}
            {deal.priceStats && deal.priceStats.historyCount >= 2 && (
              <PriceGauge currentPriceStr={deal.price} stats={deal.priceStats} />
            )}
          </div>
        </div>
      </a>

      {/* 쿠팡 가격 비교 섹션 */}
      <div className="border-t border-surface-border/30 px-3 py-2">
        {coupang.status === 'idle' && (
          <button
            onClick={fetchCoupang}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            쿠팡 가격 비교
          </button>
        )}

        {coupang.status === 'loading' && (
          <div className="flex items-center gap-2 text-[11px] text-zinc-500">
            <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            쿠팡 검색 중...
          </div>
        )}

        {coupang.status === 'done' && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-zinc-500 font-medium">쿠팡</span>
            <a
              href={coupang.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[12px] font-bold text-zinc-200 hover:text-white underline underline-offset-2"
            >
              {coupang.priceText}
            </a>

            {coupang.diff !== null && coupang.diff > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                여기가 {coupang.diff.toLocaleString('ko-KR')}원 저렴
              </span>
            )}
            {coupang.diff !== null && coupang.diff < 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400">
                쿠팡이 {Math.abs(coupang.diff).toLocaleString('ko-KR')}원 저렴
              </span>
            )}
            {coupang.diff !== null && coupang.diff === 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-zinc-700 text-zinc-400">
                동일 가격
              </span>
            )}
            {coupang.diff === null && (
              <span className="text-[9px] text-zinc-600">(가격 비교 불가)</span>
            )}

            <a
              href={coupang.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="ml-auto text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              검색 결과 →
            </a>
          </div>
        )}

        {coupang.status === 'error' && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-600">쿠팡 조회 실패</span>
            <a
              href={coupang.searchUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors"
            >
              쿠팡에서 직접 검색 →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
