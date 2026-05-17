import type { PriceStats } from '@/lib/supabase';
import { parsePriceValue } from '@/lib/supabase';

interface Props {
  currentPriceStr?: string;
  stats?: PriceStats;
}

export default function PriceGauge({ currentPriceStr, stats }: Props) {
  if (!stats || !currentPriceStr) return null;
  if (stats.historyCount < 1) return null;

  const currentVal = parsePriceValue(currentPriceStr);
  if (currentVal === null) return null;

  // Calculate percentage for the gauge
  // To avoid divide by zero if max == min
  const range = stats.maxPrice - stats.minPrice;
  let percent = 0;
  
  if (range === 0) {
    percent = currentVal <= stats.minPrice ? 0 : 100;
  } else {
    percent = ((currentVal - stats.minPrice) / range) * 100;
    // Clamp between 0 and 100
    percent = Math.max(0, Math.min(100, percent));
  }

  const isAllTimeLow = currentVal <= stats.minPrice;
  
  // Format numbers nicely
  const diffFromMin = currentVal - stats.minPrice;

  return (
    <div className="mt-2.5 w-full bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50">
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-[10px] text-zinc-400">
          역대최저가: <span className="font-bold text-zinc-300">{stats.minPriceStr}</span>
        </span>
        {isAllTimeLow ? (
          <span className="text-[10px] font-bold text-green-400 flex items-center gap-1 animate-pulse bg-green-400/10 px-1.5 py-0.5 rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            역대 최저가 달성!
          </span>
        ) : (
          <span className="text-[10px] text-red-400 font-medium">
            최저가 대비 +{diffFromMin.toLocaleString()}원
          </span>
        )}
      </div>

      {/* 이력 2개 이상일 때만 게이지 표시 */}
      {stats.historyCount >= 2 && (
        <>
          <div className="relative w-full h-1.5 bg-zinc-700/50 rounded-full mt-2">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 opacity-30"
              style={{ width: `${percent}%`, backgroundColor: isAllTimeLow ? '#4ade80' : '#f87171' }}
            />
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-zinc-900 shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-500"
              style={{ left: `calc(${percent}% - 6px)`, transform: 'translateY(-50%)', backgroundColor: isAllTimeLow ? '#4ade80' : '#f87171' }}
            />
          </div>
          <div className="flex justify-between mt-1 px-0.5">
            <span className="text-[9px] text-zinc-500 font-medium">최저가</span>
            <span className="text-[9px] text-zinc-500 font-medium">최고가</span>
          </div>
        </>
      )}
    </div>
  );
}
