'use client';

interface Props {
  onRefresh: () => void;
  loading: boolean;
  lastUpdated?: string;
  total: number;
  searchQuery: string;
  onSearch: (q: string) => void;
}

export default function Header({
  onRefresh, loading, lastUpdated, total, searchQuery, onSearch,
}: Props) {
  const updatedText = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header className="bg-surface/80 backdrop-blur-xl sticky top-0 z-20 border-b border-surface-border/50">
      <div className="flex flex-col px-4 pt-3 pb-2 gap-3">
        {/* Top Row: Logo + Refresh */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
              <span className="text-lg">🔥</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-black text-sm tracking-tight text-zinc-100 uppercase">
                Willy<span className="text-brand-500">Ppom</span>
              </h1>
              <span className="text-[10px] text-zinc-500 font-medium -mt-1">인기 핫딜 큐레이션</span>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-card border border-surface-border/50 active:scale-95 transition-all disabled:opacity-50"
            aria-label="새로고침"
          >
            <svg
              className={`w-4 h-4 text-zinc-300 ${loading ? 'animate-spin' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
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
            className="w-full bg-surface-card/50 border border-surface-border/50 rounded-2xl py-2.5 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-surface-card transition-all"
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

