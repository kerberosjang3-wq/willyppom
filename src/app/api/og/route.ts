import { NextRequest, NextResponse } from 'next/server';
import { extractAndCacheOgImage } from '@/lib/ogExtractor';

const CACHE_TTL = 86400; // 24 hours

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const imageUrl = await extractAndCacheOgImage(targetUrl);

  const response = NextResponse.json({ imageUrl });
  response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`);
  return response;
}
