import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get('key');
  if (!key) return NextResponse.json({ points: [] });
  if (!supabase) return NextResponse.json({ points: [] });

  const { data, error } = await supabase
    .from('price_history')
    .select('price_value, price_str, created_at')
    .eq('match_key', key)
    .order('created_at', { ascending: true })
    .limit(30);

  if (error || !data) return NextResponse.json({ points: [] });

  return NextResponse.json({
    points: data.map(r => ({
      value: r.price_value,
      label: r.price_str,
      date:  r.created_at,
    })),
  });
}
