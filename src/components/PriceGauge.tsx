'use client';

import type { PriceStats } from '@/lib/supabase';
import { parsePriceValue } from '@/lib/supabase';
import { useState, useCallback } from 'react';

interface HistoryPoint { value: number; label: string; date: string; }

// Inline sparkline rendered from priceStats.sparkline (no extra fetch needed)
function InlineSparkline({ points, isLow }: {
  points: { v: number; d: string }[];
  isLow: boolean;
}) {
  const W = 260, H = 36, PX = 3, PY = 4;
  const vals  = points.map(p => p.v);
  const min   = Math.min(...vals);
  const max   = Math.max(...vals);
  const range = max - min || 1;

  const coords = points.map((p, i) => ({
    x: PX + (i / Math.max(1, points.length - 1)) * (W - PX * 2),
    y: PY + (1 - (p.v - min) / range) * (H - PY * 2),
  }));

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${H} L${coords[0].x.toFixed(1)},${H} Z`;
  const last = coords[coords.length - 1];
  const color = isLow ? '#7aab8f' : '#b07878';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <path d={area} fill={color} fillOpacity="0.15" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Intermediate dots */}
      {coords.slice(0, -1).map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r="1.2" fill={color} opacity="0.45" />
      ))}
      {/* Current price dot */}
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}

// Full history chart (fetched on demand)
function FullChart({ points, minPrice, maxPrice }: {
  points: HistoryPoint[];
  minPrice: number;
  maxPrice: number;
}) {
  if (points.length < 2) return null;

  const W = 260, H = 52, PX = 4, PY = 4;
  const range = maxPrice - minPrice || 1;

  const coords = points.map((p, i) => ({
    x: PX + (i / (points.length - 1)) * (W - PX * 2),
    y: PY + (1 - (p.value - minPrice) / range) * (H - PY * 2),
  }));

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)},${H} L${coords[0].x.toFixed(1)},${H} Z`;
  const last = coords[coords.length - 1];
  const isLow = points[points.length - 1].value <= minPrice;
  const color = isLow ? '#7aab8f' : '#b07878';

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <path d={area} fill={color} fillOpacity="0.15" />
      <path d={line} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={i === coords.length - 1 ? 2.5 : 1.2}
          fill={color} opacity={i === coords.length - 1 ? 1 : 0.45} />
      ))}
      <circle cx={last.x} cy={last.y} r="2.5" fill={color} />
    </svg>
  );
}

interface Props {
  currentPriceStr?: string;
  stats?: PriceStats;
}

export default function PriceGauge({ currentPriceStr, stats }: Props) {
  if (!stats || !currentPriceStr) return null;
  if (stats.historyCount < 1) return null;

  const currentVal = parsePriceValue(currentPriceStr);
  if (currentVal === null) return null;

  const isAllTimeLow = currentVal <= stats.minPrice;
  const diffFromMin  = currentVal - stats.minPrice;

  const hasSpark  = (stats.sparkline?.length ?? 0) >= 2;
  const canExpand = !!stats.matchKey && stats.historyCount >= 2;

  const [expanded,     setExpanded]     = useState(false);
  const [chartPoints,  setChartPoints]  = useState<HistoryPoint[]>([]);
  const [chartLoading, setChartLoading] = useState(false);

  const toggleChart = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canExpand) return;

    if (expanded) { setExpanded(false); return; }

    if (chartPoints.length === 0) {
      setChartLoading(true);
      try {
        const res  = await fetch(`/api/price-history?key=${encodeURIComponent(stats.matchKey!)}`);
        const data = await res.json();
        setChartPoints(data.points ?? []);
      } catch {
        setChartPoints([]);
      } finally {
        setChartLoading(false);
      }
    }
    setExpanded(true);
  }, [expanded, chartPoints.length, stats.matchKey, canExpand]);

  return (
    <div className="mt-2 w-full bg-zinc-900/50 rounded-lg p-2 border border-zinc-800/50">

      {/* 상단: 최저가 표시 + 상태 뱃지 */}
      <div className="flex justify-between items-center mb-1">
        <span className="text-[10px] text-zinc-400">
          역대최저 <span className="font-bold text-zinc-300">{stats.minPriceStr}</span>
        </span>
        {isAllTimeLow ? (
          <span className="text-[10px] font-bold text-emerald-300/80 flex items-center gap-1 animate-pulse bg-emerald-400/10 px-1.5 py-0.5 rounded">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            역대 최저가!
          </span>
        ) : (
          <span className="text-[10px] text-rose-300/60">+{diffFromMin.toLocaleString()}원</span>
        )}
      </div>

      {/* 인라인 스파크라인 (항상 표시, 탭으로 전체 차트 확장) */}
      {hasSpark && (
        <button
          onClick={canExpand ? toggleChart : undefined}
          disabled={chartLoading}
          className={`w-full block ${canExpand ? 'active:opacity-70' : ''}`}
        >
          <InlineSparkline points={stats.sparkline!} isLow={isAllTimeLow} />
          <div className="flex justify-between items-center px-0.5 mt-0.5">
            <span className="text-[9px] text-zinc-600">
              {new Date(stats.sparkline![0].d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
            {canExpand && (
              <span className="text-[9px] text-zinc-600 flex items-center gap-0.5">
                {chartLoading
                  ? <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
                  : <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expanded ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} /></svg>
                }
                {expanded ? '접기' : '전체보기'}
              </span>
            )}
            <span className="text-[9px] text-zinc-600">
              {new Date(stats.sparkline![stats.sparkline!.length - 1].d).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
            </span>
          </div>
        </button>
      )}

      {/* 스파크라인 없을 때 폴백: 텍스트 토글만 */}
      {!hasSpark && canExpand && (
        <button
          onClick={toggleChart}
          className="mt-1 w-full flex items-center justify-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          {chartLoading
            ? <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" /></svg>
            : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={expanded ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} /></svg>
          }
          {expanded ? '차트 접기' : '가격 추이'}
        </button>
      )}

      {/* 전체 이력 차트 (탭으로 확장) */}
      {expanded && (
        <div className="mt-2 pt-2 border-t border-zinc-800/40">
          {chartPoints.length >= 2 ? (
            <>
              <FullChart points={chartPoints} minPrice={stats.minPrice} maxPrice={stats.maxPrice} />
              <div className="flex justify-between mt-0.5 px-0.5">
                <span className="text-[9px] text-zinc-600">
                  {new Date(chartPoints[0].date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                </span>
                <span className="text-[9px] text-zinc-500">
                  최저 {stats.minPriceStr} · 최고 {stats.maxPrice.toLocaleString()}원
                </span>
                <span className="text-[9px] text-zinc-600">
                  {new Date(chartPoints[chartPoints.length - 1].date).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' })}
                </span>
              </div>
            </>
          ) : (
            <p className="text-[10px] text-zinc-700 text-center py-2">이력 데이터가 부족해요</p>
          )}
        </div>
      )}

    </div>
  );
}
