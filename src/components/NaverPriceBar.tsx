'use client';

interface Props {
  currentPriceStr: string;
  min: number;
  max: number;
  count: number;
}

function parsePriceNum(str: string): number {
  return parseInt(str.replace(/[^\d]/g, '')) || 0;
}

export default function NaverPriceBar({ currentPriceStr, min, max, count }: Props) {
  if (min === 0 || max === 0 || count === 0) return null;

  const current   = parsePriceNum(currentPriceStr);
  if (current === 0) return null;

  const range     = max - min || 1;
  const isCheaper = current < min;
  const pct       = isCheaper ? 0 : Math.min(100, ((current - min) / range) * 100);
  const dotColor  = isCheaper ? '#7aab8f' : current <= min * 1.05 ? '#7aab8f' : '#b08a40';

  return (
    <div className="mt-1.5 w-full">
      <div className="flex justify-between text-[9px] text-zinc-500 mb-1">
        <span>{min.toLocaleString('ko-KR')}원</span>
        <span className="text-zinc-600">네이버 {count}개몰</span>
        <span>{max.toLocaleString('ko-KR')}원</span>
      </div>

      <div className="relative h-1 bg-zinc-700 rounded-full">
        {/* 현재 가격 위치 닷 */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full border-2 border-zinc-900 transition-all"
          style={{ left: `${pct}%`, backgroundColor: dotColor }}
        />
      </div>

      {isCheaper && (
        <p className="text-[9px] text-emerald-400 mt-0.5 font-semibold">
          ↓ 네이버 최저보다 저렴
        </p>
      )}
    </div>
  );
}
