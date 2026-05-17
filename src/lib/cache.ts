interface CacheEntry<T> {
  data: T;
  expiry: number;
}

const store = new Map<string, CacheEntry<unknown>>();

export function getCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    store.delete(key);
    return null;
  }
  return entry.data as T;
}

// Returns data even if expired (for stale-while-revalidate pattern)
export function getCacheWithMeta<T>(key: string): { data: T; isStale: boolean } | null {
  const entry = store.get(key);
  if (!entry) return null;
  return { data: entry.data as T, isStale: Date.now() > entry.expiry };
}

export function setCache<T>(key: string, data: T, ttlMs: number): void {
  store.set(key, { data, expiry: Date.now() + ttlMs });
}

export function clearCache(key?: string): void {
  if (key) store.delete(key);
  else store.clear();
}
