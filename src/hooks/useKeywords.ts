'use client';

import { useState, useCallback } from 'react';

const LS_KEY   = 'wpom_keywords';
const MAX_KW   = 10;

function load(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

function save(kws: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(kws)); } catch {}
}

export function getKeywords(): string[] { return load(); }

export function useKeywords() {
  const [keywords, setKeywords] = useState<string[]>(load);

  const add = useCallback((kw: string) => {
    const trimmed = kw.trim().toLowerCase();
    if (!trimmed) return false;
    setKeywords(prev => {
      if (prev.includes(trimmed) || prev.length >= MAX_KW) return prev;
      const next = [...prev, trimmed];
      save(next);
      return next;
    });
    return true;
  }, []);

  const remove = useCallback((kw: string) => {
    setKeywords(prev => {
      const next = prev.filter(k => k !== kw);
      save(next);
      return next;
    });
  }, []);

  return { keywords, add, remove };
}
