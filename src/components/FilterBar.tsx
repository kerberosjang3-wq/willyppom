'use client';

import type { CategoryId, SourceId } from '@/types/deal';
import { CATEGORY_META, SOURCE_META } from '@/types/deal';

interface Props {
  activeCategory: CategoryId;
  activeSources: SourceId[];
  activeSort: 'hot' | 'new';
  onCategory: (c: CategoryId) => void;
  onSource:   (s: SourceId) => void;
  onSort:     (s: 'hot' | 'new') => void;
}

const CATEGORIES = Object.entries(CATEGORY_META) as [CategoryId, { name: string; emoji: string }][];
const SOURCES    = Object.entries(SOURCE_META)   as [SourceId,   { name: string; color: string; bg: string }][];

export default function FilterBar({
  activeCategory, activeSources, activeSort,
  onCategory, onSource, onSort,
}: Props) {
  const allSources = activeSources.length === 0;

  return (
    <div className="bg-surface sticky top-[56px] z-10 border-b border-surface-border">
      {/* Category scroll */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 px-4 py-2.5" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(([id, meta]) => (
          <button
            key={id}
            onClick={() => onCategory(id)}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 ${
              activeCategory === id
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                : 'bg-surface-card text-zinc-400 hover:bg-surface-hover'
            }`}
          >
            <span>{meta.emoji}</span>
            <span>{meta.name}</span>
          </button>
        ))}
      </div>

      {/* Source + Sort row */}
      <div className="flex items-center gap-2 px-4 pb-2.5 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
        {/* Sort toggle */}
        <div className="flex items-center bg-surface-card rounded-full p-0.5 shrink-0 mr-1">
          {(['hot', 'new'] as const).map(s => (
            <button
              key={s}
              onClick={() => onSort(s)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all duration-150 ${
                activeSort === s
                  ? 'bg-surface-hover text-zinc-100'
                  : 'text-zinc-500'
              }`}
            >
              {s === 'hot' ? '🔥 인기' : '🕐 최신'}
            </button>
          ))}
        </div>

        {/* Source pills */}
        <button
          onClick={() => {
            SOURCES.forEach(([id]) => {
              if (!activeSources.includes(id) === false) onSource(id);
            });
          }}
          className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
            allSources
              ? 'bg-zinc-700 text-zinc-100'
              : 'bg-surface-card text-zinc-500'
          }`}
        >
          전체
        </button>
        {SOURCES.map(([id, meta]) => {
          const active = activeSources.includes(id);
          return (
            <button
              key={id}
              onClick={() => onSource(id)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${
                active
                  ? 'text-white'
                  : 'bg-surface-card text-zinc-500'
              }`}
              style={active ? { backgroundColor: meta.color } : {}}
            >
              {meta.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
