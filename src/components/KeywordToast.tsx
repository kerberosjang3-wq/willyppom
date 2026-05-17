'use client';

import { useEffect, useState } from 'react';
import type { Deal } from '@/types/deal';

interface Props {
  deals: Deal[];
  prevDealIds: Set<string>;
  keywords: string[];
}

interface ToastItem {
  id: string;
  deal: Deal;
  keyword: string;
}

export default function KeywordToast({ deals, prevDealIds, keywords }: Props) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    if (prevDealIds.size === 0 || keywords.length === 0) return;

    const matched: ToastItem[] = deals
      .filter(d => !prevDealIds.has(d.id))
      .flatMap(deal => {
        const text = `${deal.title} ${deal.productName ?? ''}`.toLowerCase();
        const kw = keywords.find(k => text.includes(k));
        return kw ? [{ id: `${deal.id}-${kw}`, deal, keyword: kw }] : [];
      })
      .slice(0, 3);

    if (matched.length === 0) return;
    setToasts(prev => [...prev, ...matched]);

    // 5초 후 자동 제거
    const timer = setTimeout(() => {
      setToasts(prev => prev.filter(t => !matched.some(m => m.id === t.id)));
    }, 5000);
    return () => clearTimeout(timer);
  }, [deals, prevDealIds, keywords]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className="bg-surface-card border border-brand-500/30 rounded-2xl px-4 py-3 shadow-xl shadow-black/40 pointer-events-auto animate-slide-up"
        >
          <div className="flex items-start gap-2">
            <span className="text-brand-400 shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-brand-300 font-semibold mb-0.5">
                키워드 알림 · <span className="text-brand-400">"{toast.keyword}"</span>
              </p>
              <p className="text-xs text-zinc-200 line-clamp-1">
                {toast.deal.productName || toast.deal.title}
              </p>
              {toast.deal.price && (
                <p className="text-[11px] text-brand-400 font-bold mt-0.5">{toast.deal.price}</p>
              )}
            </div>
            <button
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              className="text-zinc-600 hover:text-zinc-400 shrink-0"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
