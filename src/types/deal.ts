import type { PriceStats } from '@/lib/supabase';

export type SourceId = 'ppomppu';

export type CategoryId =
  | 'all'
  | 'electronics'
  | 'food'
  | 'fashion'
  | 'living'
  | 'travel'
  | 'game'
  | 'beauty'
  | 'etc';

export interface Deal {
  id: string;
  title: string;
  productName?: string; // Cleaned and parsed product name
  url: string;
  price?: string;
  originalPrice?: string;
  discountRate?: string;
  shipping?: string; // Parsed shipping info (e.g., "무료배송")
  mallName?: string; // Parsed mall name (e.g., "지마켓", "알리")
  thumbnail?: string;
  source: SourceId;
  sourceName: string;
  category: CategoryId;
  commentCount: number;
  likeCount: number;
  viewCount?: number;
  hotScore: number;
  publishedAt: string; // ISO string
  description?: string;
  duplicateSources?: { source: SourceId; sourceName: string; url: string }[]; // Links from merged duplicates
  priceStats?: PriceStats; // Historical price tracking data
}

export interface DealsResponse {
  deals: Deal[];
  total: number;
  lastUpdated: string;
  sourceStats: Partial<Record<SourceId, { count: number; ok: boolean }>>;
}

export interface DealsQuery {
  sources?: SourceId[];
  category?: CategoryId;
  page?: number;
  limit?: number;
  sort?: 'view' | 'date' | 'comment';
  q?: string;
}

export const SOURCE_META: Record<SourceId, { name: string; color: string; bg: string }> = {
  ppomppu: { name: '뽐뿌', color: '#ff6b6b', bg: 'bg-red-900/50' },
};

export const CATEGORY_META: Record<CategoryId, { name: string; emoji: string }> = {
  all:         { name: '전체',   emoji: '🔥' },
  electronics: { name: '전자',   emoji: '📱' },
  food:        { name: '식품',   emoji: '🍔' },
  fashion:     { name: '패션',   emoji: '👗' },
  living:      { name: '생활',   emoji: '🏠' },
  travel:      { name: '여행',   emoji: '✈️' },
  game:        { name: '게임',   emoji: '🎮' },
  beauty:      { name: '뷰티',   emoji: '💄' },
  etc:         { name: '기타',   emoji: '📦' },
};
