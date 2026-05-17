'use client';

interface Props {
  lastUpdated?: string;
  total: number;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export default function Header({
  lastUpdated, total, searchQuery, onSearch,
}: Props) {
  const updatedText = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-20 border-b border-surface-border/50">
      <div className="flex flex-col px-4 pt-2 pb-1.5 gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl overflow-hidden shadow-lg shadow-brand-500/20 bg-white/5 p-0.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/icon-192.png" alt="WillyPpom Logo" className="w-full h-full object-cover rounded-[10px]" />
          </div>
          <div className="flex flex-col">
            <h1 className="font-black text-sm tracking-tight text-zinc-100 uppercase">
              Willy<span className="text-brand-500">Ppom</span>
            </h1>
            <span className="text-[10px] text-zinc-500 font-medium -mt-1">인기 핫딜 큐레이션</span>
          </div>
        </div>

        {/* Search Row */}
        <div className="relative group">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 group-focus-within:text-brand-500 transition-colors pointer-events-none"
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            placeholder="오늘은 어떤 딜이 떴을까요?"
            className="w-full bg-surface-card/50 border border-surface-border/50 rounded-2xl py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-surface-card transition-all"
          />
        </div>
      </div>

      {/* Stats bar */}
      {(total > 0 || updatedText) && (
        <div className="flex items-center px-4 py-1.5 gap-2 bg-surface-card/30 border-t border-surface-border/30">
          {total > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-brand-500 animate-pulse-fast" />
              <span className="text-[10px] text-zinc-500">
                실시간 핫딜 <span className="text-zinc-300 font-bold">{total.toLocaleString()}</span>개
              </span>
            </div>
          )}
          {updatedText && (
            <span className="text-[10px] text-zinc-600 ml-auto font-medium">
              {updatedText} 갱신됨
            </span>
          )}
        </div>
      )}
    </header>
  );
}

