import { NextResponse } from 'next/server';
import { scrapePpomppu } from '@/lib/scrapers/ppomppu';
import { scrapeFmkorea } from '@/lib/scrapers/fmkorea';
import axios from 'axios';

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

  // --- fmkorea raw HTML 샘플 (셀렉터 검증용) ---
  try {
    const res = await axios.get<string>('https://www.fmkorea.com/index.php?mid=hotdeal&page=1', {
      timeout: 10_000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });
    results.fmkoreaHtml = {
      status: res.status,
      snippet: res.data.slice(0, 3000),
    };
  } catch (err: unknown) {
    results.fmkoreaHtml = { error: err instanceof Error ? err.message : String(err) };
  }

  return NextResponse.json(results);
}
