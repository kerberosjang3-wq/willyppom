import { NextResponse } from 'next/server';
import { scrapePpomppu } from '@/lib/scrapers/ppomppu';
import { scrapeFmkorea } from '@/lib/scrapers/fmkorea';
import axios from 'axios';

export const preferredRegion = 'hnd1';

export async function GET() {
  const results: Record<string, unknown> = {};

  // --- ppomppu ---
  try {
    const deals = await scrapePpomppu();
    results.ppomppu = { count: deals.length, ok: deals.length > 0, first: deals[0] ?? null };
  } catch (err: unknown) {
    results.ppomppu = { count: 0, ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // --- fmkorea ---
  try {
    const deals = await scrapeFmkorea();
    results.fmkorea = { count: deals.length, ok: deals.length > 0, first: deals[0] ?? null };
  } catch (err: unknown) {
    results.fmkorea = { count: 0, ok: false, error: err instanceof Error ? err.message : String(err) };
  }

  // --- fmkorea raw HTML 진단 ---
  try {
    const scraperKey = process.env.SCRAPER_API_KEY;
    const targetUrl  = 'https://www.fmkorea.com/index.php?mid=hotdeal&page=1';
    const fetchUrl   = scraperKey
      ? `http://api.scraperapi.com?api_key=${scraperKey}&url=${encodeURIComponent(targetUrl)}&render=false`
      : targetUrl;

    const res = await axios.get<string>(fetchUrl, {
      timeout: 10_000,
      headers: scraperKey ? {} : {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
      },
    });

    // class 빈도 집계 (상위 30개) — 어떤 구조인지 파악
    const classFreq: Record<string, number> = {};
    for (const m of res.data.matchAll(/class="([^"]+)"/g)) {
      for (const c of m[1].split(/\s+/)) {
        classFreq[c] = (classFreq[c] ?? 0) + 1;
      }
    }
    const topClasses = Object.entries(classFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([c, n]) => `${c}(${n})`);

    // fm_best_widget 포함 HTML 발췌 (최대 2000자)
    const widgetIdx = res.data.indexOf('fm_best_widget');
    const widgetSnippet = widgetIdx >= 0
      ? res.data.slice(Math.max(0, widgetIdx - 200), widgetIdx + 1800)
      : '(fm_best_widget not found)';

    results.fmkoreaHtml = {
      status:        res.status,
      proxy:         !!scraperKey,
      title:         res.data.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? '',
      topClasses,
      widgetSnippet,
      headSnippet:   res.data.slice(0, 2000),
    };
  } catch (err: unknown) {
    results.fmkoreaHtml = { error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(results);
}
