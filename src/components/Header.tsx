'use client';

import { useState, useRef, useCallback } from 'react';

const LS_RECENT = 'wpom_recent_search';
const MAX_RECENT = 5;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(LS_RECENT);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function saveRecent(query: string) {
  try {
    const prev = loadRecent().filter(q => q !== query);
    const next = [query, ...prev].slice(0, MAX_RECENT);
    localStorage.setItem(LS_RECENT, JSON.stringify(next));
  } catch {}
}

function removeRecent(query: string) {
  try {
    const next = loadRecent().filter(q => q !== query);
    localStorage.setItem(LS_RECENT, JSON.stringify(next));
  } catch {}
}

type ViewMode = 'list' | 'grid';

interface Props {
  lastUpdated?: string;
  total: number;
  searchQuery: string;
  onSearch:   (q: string) => void;
  onKeyword?: () => void;
  keywordCount?: number;
  activeView?: ViewMode;
  onView?: (v: ViewMode) => void;
}

export default function Header({ lastUpdated, total, searchQuery, onSearch, onKeyword, keywordCount = 0, activeView = 'list', onView }: Props) {
  const updatedText = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null;

  const [showRecent, setShowRecent] = useState(false);
  const [recentList, setRecentList] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const openDropdown = useCallback(() => {
    setRecentList(loadRecent());
    setShowRecent(true);
  }, []);

  const closeDropdown = useCallback(() => setShowRecent(false), []);

  const handleSearch = useCallback((q: string) => {
    onSearch(q);
    if (q.trim()) saveRecent(q.trim());
  }, [onSearch]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const q = (e.target as HTMLInputElement).value.trim();
      if (q) {
        saveRecent(q);
        onSearch(q);
      }
      setShowRecent(false);
      inputRef.current?.blur();
    }
    if (e.key === 'Escape') {
      setShowRecent(false);
      inputRef.current?.blur();
    }
  }, [onSearch]);

  const selectRecent = useCallback((q: string) => {
    handleSearch(q);
    setShowRecent(false);
    inputRef.current?.blur();
  }, [handleSearch]);

  const deleteRecent = useCallback((e: React.MouseEvent, q: string) => {
    e.stopPropagation();
    removeRecent(q);
    setRecentList(prev => prev.filter(r => r !== q));
  }, []);

  return (
    <header className="bg-surface/80 backdrop-blur-xl border-b border-surface-border/50 pt-safe">
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

          {onKeyword && (
            <button
              onClick={onKeyword}
              className="ml-auto relative w-8 h-8 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-300 hover:bg-surface-card transition-all"
              aria-label="키워드 알림"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {keywordCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-brand-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {keywordCount}
                </span>
              )}
            </button>
          )}
        </div>

        {/* Search Row */}
        <div className="relative">
          <svg
            className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600 pointer-events-none transition-colors"
            style={{ color: showRecent ? 'rgb(80,122,170)' : undefined }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            value={searchQuery}
            onChange={e => onSearch(e.target.value)}
            onFocus={openDropdown}
            onBlur={() => setTimeout(closeDropdown, 150)}
            onKeyDown={handleKeyDown}
            placeholder="오늘은 어떤 딜이 떴을까요?"
            className="w-full bg-surface-card/50 border border-surface-border/50 rounded-2xl py-2 pl-10 pr-4 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:bg-surface-card transition-all"
          />

          {/* 최근 검색어 드롭다운 */}
          {showRecent && recentList.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-surface-card border border-surface-border/60 rounded-2xl shadow-xl overflow-hidden z-30">
              <p className="text-[10px] text-zinc-600 font-semibold px-4 pt-2.5 pb-1">최근 검색어</p>
              {recentList.map(q => (
                <button
                  key={q}
                  onMouseDown={() => selectRecent(q)}
                  className="w-full flex items-center justify-between px-4 py-2 text-sm text-zinc-300 hover:bg-surface-hover transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-zinc-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {q}
                  </span>
                  <span
                    onMouseDown={e => deleteRecent(e, q)}
                    className="text-zinc-600 hover:text-zinc-400 p-1 -mr-1"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          )}
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
          {onView && (
            <button
              onClick={() => onView(activeView === 'list' ? 'grid' : 'list')}
              className={`${updatedText ? '' : 'ml-auto'} shrink-0 p-1 rounded-md transition-colors ${activeView === 'grid' ? 'text-brand-400' : 'text-zinc-500 hover:text-zinc-300'}`}
              aria-label={activeView === 'list' ? '그리드 뷰로 전환' : '리스트 뷰로 전환'}
            >
              {activeView === 'list' ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="3" width="7" height="7" rx="1" />
                  <rect x="14" y="3" width="7" height="7" rx="1" />
                  <rect x="3" y="14" width="7" height="7" rx="1" />
                  <rect x="14" y="14" width="7" height="7" rx="1" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <line x1="8"  y1="6"  x2="21" y2="6" />
                  <line x1="8"  y1="12" x2="21" y2="12" />
                  <line x1="8"  y1="18" x2="21" y2="18" />
                  <line x1="3"  y1="6"  x2="3.01" y2="6"  strokeLinecap="round" strokeWidth={2.5} />
                  <line x1="3"  y1="12" x2="3.01" y2="12" strokeLinecap="round" strokeWidth={2.5} />
                  <line x1="3"  y1="18" x2="3.01" y2="18" strokeLinecap="round" strokeWidth={2.5} />
                </svg>
              )}
            </button>
          )}
        </div>
      )}
    </header>
  );
}
