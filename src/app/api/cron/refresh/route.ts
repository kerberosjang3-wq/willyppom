import { NextResponse } from 'next/server';
import { buildAndCacheDeals } from '@/lib/dealBuilder';

// Vercel cron jobs are allowed up to 60s on Hobby plan
export const maxDuration = 60;

export async function GET(req: Request) {
  // Validate cron secret to block unauthorized calls
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const start = Date.now();
  try {
    const result = await buildAndCacheDeals();
    return NextResponse.json({
      ok: true,
      total: result.total,
      lastUpdated: result.lastUpdated,
      ms: Date.now() - start,
    });
  } catch (err: unknown) {
    console.error('[cron/refresh]', err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
