'use client';

import { useState, useCallback } from 'react';

const LS_KEY  = 'wpom_read';
const MAX_IDS = 500;

function loadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveIds(ids: Set<string>) {
  try {
    let arr = Array.from(ids);
    if (arr.length > MAX_IDS) arr = arr.slice(arr.length - MAX_IDS);
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {}
}

export function useReadDeal(id: string) {
  const [isRead, setIsRead] = useState(() => loadIds().has(id));

  const markRead = useCallback(() => {
    if (isRead) return;
    setIsRead(true);
    const ids = loadIds();
    ids.add(id);
    saveIds(ids);
  }, [id, isRead]);

  return { isRead, markRead };
}
