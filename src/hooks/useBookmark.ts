'use client';

import { useState, useCallback } from 'react';
import type { Deal } from '@/types/deal';

const LS_KEY   = 'wpom_bookmarks';
const MAX_ITEMS = 200;

function loadBookmarks(): Deal[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Deal[]) : [];
  } catch {
    return [];
  }
}

function saveBookmarks(items: Deal[]) {
  try {
    const capped = items.slice(-MAX_ITEMS);
    localStorage.setItem(LS_KEY, JSON.stringify(capped));
  } catch {}
}

export function getBookmarks(): Deal[] {
  return loadBookmarks();
}

export function useBookmark(id: string) {
  const [isBookmarked, setIsBookmarked] = useState(() =>
    loadBookmarks().some(d => d.id === id)
  );

  const toggle = useCallback((deal: Deal) => {
    const current = loadBookmarks();
    const exists  = current.some(d => d.id === id);

    let next: Deal[];
    if (exists) {
      next = current.filter(d => d.id !== id);
    } else {
      next = [...current, deal];
    }

    saveBookmarks(next);
    setIsBookmarked(!exists);
  }, [id]);

  return { isBookmarked, toggle };
}
