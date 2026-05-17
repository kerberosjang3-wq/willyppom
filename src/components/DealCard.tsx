'use client';

import { useState, useEffect, useRef } from 'react';
import { useInView } from 'react-intersection-observer';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { Deal } from '@/types/deal';
import { SOURCE_META } from '@/types/deal';
import PriceGauge from '@/components/PriceGauge';

interface Props {
  deal: Deal;
}

export default function DealCard({ deal }: Props) {
  const meta     = SOURCE_META[deal.source];
  const pubDate  = new Date(deal.publishedAt);
  const timeAgo  = formatDistanceToNow(pubDate, { addSuffix: true, locale: ko });
  const isHot    = deal.hotScore > 60;
  
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const hasAttemptedFetch = useRef(false);

  const { ref, inView } = useInView({
    triggerOnce: true,
    rootMargin: '100px 0px', // Fetch slightly before it scrolls into view
  });

  useEffect(() => {
    // If we already have a thumbnail, or we already attempted to fetch, or not in view yet, do nothing
    if (deal.thumbnail || hasAttemptedFetch.current || !inView) return;
    
    let isMounted = true;
    hasAttemptedFetch.current = true;

    async function fetchOg() {
      try {
        const res = await fetch(`/api/og?url=${encodeURIComponent(deal.url)}`);
        const data = await res.json();
        if (isMounted && data.imageUrl) {
          setOgImage(data.imageUrl);
        }
      } catch (e) {
        // Silently ignore OG fetch errors
      }
    }
    
    // Slight delay so we don't spam requests the millisecond the list renders
    const timer = setTimeout(fetchOg, 100);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [deal.thumbnail, deal.url, inView]);

  const displayImage = deal.thumbnail || ogImage;
  
  return (
    <a
      href={deal.url}
      ref={ref}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-surface-card rounded-2xl overflow-hidden active:scale-[0.98] transition-all duration-100 border border-surface-border/50 hover:bg-surface-hover"
    >
      <div className="flex items-center p-3 gap-3">
        {/* Left: Thumbnail or Placeholder */}
        <div className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-surface-border">
          {displayImage ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={displayImage}
              alt=""
              className={`w-full h-full object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              loading="lazy"
              onLoad={() => setImgLoaded(true)}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl bg-gradient-to-br from-zinc-800 to-zinc-900 transition-opacity duration-300">
              {meta.name[0]}
            </div>
          )}
          
          {/* Loading state for OG image */}
          {(!displayImage && !hasAttemptedFetch.current && !deal.thumbnail) && (
            <div className="absolute inset-0 bg-zinc-800/50 flex items-center justify-center backdrop-blur-sm animate-pulse">
              <span className="w-4 h-4 border-2 border-zinc-500 border-t-brand-500 rounded-full animate-spin" />
            </div>
          )}
          
          {/* Hot Badge Overlay */}
          {isHot && (
            <div className="absolute top-1 left-1 bg-brand-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg shadow-lg">
              HOT
            </div>
          )}
        </div>

        {/* Right: Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between h-20 py-0.5">
          <div>
            {/* Source & Time */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                style={{ color: meta.color, backgroundColor: `${meta.color}15` }}
              >
                {deal.sourceName}
              </span>
              
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
          <div className="flex items-end justify-between">
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

          {/* Price Gauge (Support Line) */}
          {deal.priceStats && deal.priceStats.historyCount >= 2 && (
            <PriceGauge currentPriceStr={deal.price} stats={deal.priceStats} />
          )}
        </div>
      </div>
    </a>
  );
}

