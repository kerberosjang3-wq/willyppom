import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Initialize the Supabase client
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface PriceHistory {
  id: number;
  match_key: string;
  price_value: number; // numeric value extracted from price string
  price_str: string;
  source: string;
  created_at: string;
}

export interface PriceStats {
  minPrice: number;
  maxPrice: number;
  avgPrice: number;
  historyCount: number;
  isAllTimeLow: boolean;
  minPriceStr: string;
}

// Function to safely extract number from price string
export function parsePriceValue(priceStr?: string): number | null {
  if (!priceStr) return null;
  const num = parseInt(priceStr.replace(/[^\d]/g, ''), 10);
  return isNaN(num) || num === 0 ? null : num;
}
