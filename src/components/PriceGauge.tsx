import type { PriceStats } from '@/lib/supabase';
import { parsePriceValue } from '@/lib/supabase';
import { useState, useCallback } from 'react';

interface HistoryPoint { value: number; label: string; date: string; }

interface Props {
  currentPriceStr?: string;
  stats?: PriceStats;
}

function MiniChart({ points, minPrice, maxPrice }: {
  points: HistoryPoint[];
  minPrice: number;
  maxPrice: number;
}) {
  if (points.length < 2) return null;

  const W = 260, H = 48, PAD = 4;
  const range = maxPrice - minPrice || 1;

  const coords = points.map((p, i) => ({
    x: PAD + (i / (points.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (p.value - minPrice) / range) * (H - PAD * 2),
  }));

  const d = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const fill = [...coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`),
    `${coords[coords.length - 1].x.toFixed(1)},${H}`, `${coords[0].x.toFixed(1)},${H}`
  ].join(' ');

  const last = coords[coords.length - 1];
  const isLow = points[points.length - 1].value <= minPrice;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 48 }}>
      <polygon points={fill} fill={isLow ? '#7aab8f' : '#b07878'} opacity={0.15} />
      <polyline points={coords.map(c => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ')}
        fill="none" stroke={isLow ? '#7aab8f' : '#b07878'} strokeWidth={1.5} strokeLinejoin="round" />
      <circle cx={last.x} cy={last.y} r={3} fill={isLow ? '#7aab8f' : '#b07878'} />
    </svg>
  );
}

export default function PriceGauge({ currentPriceStr, stats }: Props) {
  if (!stats || !currentPriceStr) return null;
  if (stats.historyCount < 1) return null;

  const currentVal = parsePriceValue(currentPriceStr);
  if (currentVal === null) return null;

  const range = stats.maxPrice - stats.minPrice;
  let percent = 0;
  if (range === 0) {
    percent = currentVal <= stats.minPrice ? 0 : 100;
  } else {
    percent = Math.max(0, Math.min(100, ((currentVal - stats.minPrice) / range) * 100));
  }

  const isAllTimeLow = currentVal <= stats.minPrice;
  const diffFromMin  = currentVal - stats.minPrice;

  const [expanded, setExpanded]       = useState(false);
  const [chartPoints, setChartPoints] = useState<HistoryPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const toggleChart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!stats.matchKey) return;

    if (expanded) { setExpanded(false); return; }

    if (chartPoints.length === 0) {
      setChartLoading(true);
      try {
        const res  = await fetch(`/api/price-history?key=${encodeURIComponent(stats.matchKey)}`);
        const data = await res.json();
        setChartPoints(data.points ?? []);
      } catch {
        setChartPoints([]);
      } finally {
        setChartLoading(false);
      }
    }
    setExpanded(true);
  }, [expanded, chartPoints.length, stats.matchKey]);

  return (
    <div className="mt-2.5 w-full bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50">
      <div className="flex justify-between items-end mb-1.5">
        <span className="text-[10px] text-zinc-400">
          역대최저가: <span className="font-bold text-zinc-300">{stats.minPriceStr}</span>
        </span>
        {isAllTimeLow ? (
          <span className="text-[10px] font-bold text-emerald-300/80 flex items-center gap-1 animate-pulse bg-emerald-400/10 px-1.5 py-0.5 rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            역대 최저가 달성!
          </span>
        ) : (
          <span className="text-[10px] text-rose-300/70 font-medium">
            최저가 대비 +{diffFromMin.toLocaleString()}원
          </span>
        )}
      </div>

      {/* 게이지 (이력 2개+) */}
      {stats.historyCount >= 2 && (
        <>
          <div className="relative w-full h-1.5 bg-zinc-700/50 rounded-full mt-2">
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all duration-500 opacity-30"
              style={{ width: `${percent}%`, backgroundColor: isAllTimeLow ? '#7aab8f' : '#b07878' }}
            />
            <div
              className="absolute top-1/2 w-3 h-3 rounded-full border-2 border-zinc-900 shadow-[0_0_8px_rgba(0,0,0,0.5)] transition-all duration-500"
              style={{ left: `calc(${percent}% - 6px)`, transform: 'translateY(-50%)', backgroundColor: isAllTimeLow ? '#7aab8f' : '#b07878' }}
            />
          </div>
          <div className="flex justify-between mt-1 px-0.5">
            <span className="text-[9px] text-zinc-500 font-medium">최저가</span>
            <span className="text-[9px] text-zinc-500 font-medium">최고가</span>
          </div>
        </>
      )}

      {/* 차트 토글 버튼 */}
      {stats.matchKey && stats.historyCount >= 2 && (
        <button
          onClick={toggleChart}
          className="mt-1.5 w-full flex items-center justify-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {chartLoading ? (
            <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={expanded ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
            </svg>
          )}
          {expanded ? '차트 접기' : '가격 추이'}
        </button>
      )}

      {/* 미니 차트 */}
      {expanded && chartPoints.length >= 2 && (
        <div className="mt-2 pt-2 border-t border-zinc-800/50">
          <MiniChart points={chartPoints} minPrice={stats.minPrice} maxPrice={stats.maxPrice} />
          <div className="flex justify-between mt-0.5 px-0.5">
            <span className="text-[9px] text-zinc-600">{new Date(chartPoints[0].date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
            <span className="text-[9px] text-zinc-600">{new Date(chartPoints[chartPoints.length - 1].date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}</span>
          </div>
        </div>
      )}
      {expanded && chartPoints.length < 2 && !chartLoading && (
        <p className="text-[10px] text-zinc-700 text-center mt-2">이력 데이터가 부족해요</p>
      )}
    </div>
  );
}
