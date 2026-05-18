import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { getCache, setCache } from '@/lib/cache';
import { extractPrice } from '@/lib/parser';

const CACHE_TTL = 60 * 60 * 1000;
const TIMEOUT   = 8_000;
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function fetchPageTitle(url: string): Promise<string | null> {
  if (url.includes('ppomppu.co.kr')) {
    const res = await axios.get(url, {
      timeout: TIMEOUT,
      responseType: 'arraybuffer',
      headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
    });
    const html = new TextDecoder('euc-kr').decode(res.data);
    return cheerio.load(html)('title').text().trim() || null;
  }

  if (url.includes('quasarzone.com')) {
    const res = await axios.get(url, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': UA, 'Accept-Language': 'ko-KR,ko;q=0.9' },
    });
    return cheerio.load(res.data)('title').text().trim() || null;
  }

  return null;
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url')?.trim();
  if (!url) return NextResponse.json({ price: null }, { status: 400 });

  const cacheKey = `deal-price:${url}`;
  const cached = getCache<{ price: string | null }>(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    const title = await fetchPageTitle(url);
    const price = title ? (extractPrice(title) ?? null) : null;
    const result = { price };
    setCache(cacheKey, result, CACHE_TTL);
    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (err) {
    console.error('[deal-price]', err instanceof Error ? err.message : err);
    return NextResponse.json({ price: null }, { status: 500 });
  }
}
