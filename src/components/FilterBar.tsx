'use client';

import type { CategoryId } from '@/types/deal';
import { CATEGORY_META } from '@/types/deal';

type SortId = 'view' | 'date' | 'comment';

const SORT_OPTIONS: { id: SortId; label: string }[] = [
  { id: 'view',    label: '조회순' },
  { id: 'date',    label: '등록순' },
  { id: 'comment', label: '댓글순' },
];

interface Props {
  activeCategory: CategoryId;
  activeSort:     SortId;
  onCategory: (c: CategoryId) => void;
  onSort:     (s: SortId)     => void;
}

const CATEGORIES = Object.entries(CATEGORY_META) as [CategoryId, { name: string; emoji: string }][];

export default function FilterBar({ activeCategory, activeSort, onCategory, onSort }: Props) {
  return (
    <div className="bg-surface border-b border-surface-border">
      {/* Category scroll */}
      <div className="flex overflow-x-auto scrollbar-hide gap-1.5 px-3 py-1.5" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(([id, meta]) => (
          <button
            key={id}
            onClick={() => onCategory(id)}
            className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold transition-all duration-150 ${
              activeCategory === id
                ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30'
                : 'bg-surface-card text-zinc-500 hover:bg-surface-hover'
            }`}
          >
            <span className="text-[11px] leading-none">{meta.emoji}</span>
            <span>{meta.name}</span>
          </button>
        ))}
      </div>

      {/* Sort row */}
      <div className="flex items-center px-3 pb-1.5">
        <div className="flex items-center bg-surface-card rounded-full p-0.5 gap-0">
          {SORT_OPTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onSort(id)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold transition-all duration-150 ${
                activeSort === id
                  ? 'bg-surface-hover text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
