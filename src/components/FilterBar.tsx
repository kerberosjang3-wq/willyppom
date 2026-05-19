'use client';

import type { CategoryId, SourceId } from '@/types/deal';
import { CATEGORY_META, SOURCE_META } from '@/types/deal';

type SortId = 'view' | 'date' | 'comment';

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'date',    label: '등록' },
  { id: 'view',    label: '조회' },
  { id: 'comment', label: '댓글' },
];

const SOURCE_OPTIONS: SourceId[] = ['ppomppu', 'quasarzone', 'fmkorea'];

interface Props {
  activeCategory: CategoryId;
  activeSort:     SortId;
  activeSources:  SourceId[];
  onCategory: (c: CategoryId) => void;
  onSort:     (s: SortId)     => void;
  onSources:  (s: SourceId[]) => void;
}

const CATEGORIES = Object.entries(CATEGORY_META) as [CategoryId, { name: string; emoji: string }][];

export default function FilterBar({ activeCategory, activeSort, activeSources, onCategory, onSort, onSources }: Props) {
  function toggleSource(id: SourceId) {
    if (activeSources.includes(id)) {
      // 하나만 남으면 해제 못하게
      if (activeSources.length === 1) return;
      onSources(activeSources.filter(s => s !== id));
    } else {
      onSources([...activeSources, id]);
    }
  }

  return (
    <div className="bg-surface border-b border-surface-border">
      {/* Category scroll */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1 px-2.5 py-1" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(([id, meta]) => (
          <button
            key={id}
            onClick={() => onCategory(id)}
            className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold transition-all duration-150 ${
              activeCategory === id
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                : 'bg-surface-card text-zinc-500 hover:bg-surface-hover'
            }`}
          >
            <span className="text-[10px] leading-none">{meta.emoji}</span>
            <span>{meta.name}</span>
          </button>
        ))}
      </div>

      {/* Sort + Source row */}
      <div className="flex items-center gap-2 px-2.5 pb-1">
        {/* Sort */}
        <div className="flex items-center bg-surface-card rounded-full p-0.5 gap-0">
          {SORT_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onSort(id)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-150 ${
                activeSort === id
                  ? 'bg-surface-hover text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Source filter */}
        <div className="flex items-center gap-1 ml-auto">
          {SOURCE_OPTIONS.map(id => {
            const meta    = SOURCE_META[id];
            const active  = activeSources.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleSource(id)}
                className="px-2 py-0.5 rounded-full text-[10px] font-bold transition-all duration-150 border"
                style={active ? {
                  color:           meta.color,
                  borderColor:     meta.color,
                  backgroundColor: `${meta.color}20`,
                } : {
                  color:           '#52525b',
                  borderColor:     '#3f3f46',
                  backgroundColor: 'transparent',
                }}
              >
                {meta.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
