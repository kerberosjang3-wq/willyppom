'use client';

import { useState, useEffect } from 'react';
import type { CategoryId, SourceId } from '@/types/deal';

const KEY = 'willyppom:filter';

type ViewMode = 'list' | 'grid';

interface Prefs {
  category: CategoryId;
  sort:     'view' | 'date' | 'comment';
  sources:  SourceId[];
  view:     ViewMode;
}

const DEFAULTS: Prefs = {
  category: 'all',
  sort:     'date',
  sources:  ['ppomppu', 'quasarzone', 'fmkorea'],
  view:     'list',
};

const ALL_SOURCES: SourceId[] = ['ppomppu', 'quasarzone', 'fmkorea'];

function isValidSource(s: unknown): s is SourceId {
  return ALL_SOURCES.includes(s as SourceId);
}

export function useFilterPrefs() {
  const [category, setCategory] = useState<CategoryId>(DEFAULTS.category);
  const [sort, setSort]         = useState<'view' | 'date' | 'comment'>(DEFAULTS.sort);
  const [sources, setSources]   = useState<SourceId[]>(DEFAULTS.sources);
  const [view, setView]         = useState<ViewMode>(DEFAULTS.view);
  const [loaded, setLoaded]     = useState(false);

  // 마운트 후 localStorage에서 복원
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved: Partial<Prefs> = JSON.parse(raw);
        if (saved.category) setCategory(saved.category);
        if (saved.sort)     setSort(saved.sort);
        if (saved.view === 'list' || saved.view === 'grid') setView(saved.view);
        if (Array.isArray(saved.sources) && saved.sources.every(isValidSource) && saved.sources.length > 0) {
          setSources(saved.sources);
        }
      }
    } catch {}
    setLoaded(true);
  }, []);

  // 변경 시 저장 (loaded 전에는 기본값으로 덮어쓰기 방지)
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ category, sort, sources, view }));
    } catch {}
  }, [category, sort, sources, view, loaded]);

  return { category, setCategory, sort, setSort, sources, setSources, view, setView, loaded };
}
