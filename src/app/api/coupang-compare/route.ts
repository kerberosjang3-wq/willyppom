import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const TIMEOUT = 8_000;

function parseKRW(text: string): number | null {
  const n = parseInt(text.replace(/[^\d]/g, ''), 10);
  return isNaN(n) || n === 0 ? null : n;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q')?.trim();

  if (!q) {
    return NextResponse.json({ error: 'query required' }, { status: 400 });
  }

  const searchUrl = `https://www.coupang.com/np/search?q=${encodeURIComponent(q)}&sorter=scoreDesc&rocketAll=false`;

  try {
    const { data: html } = await axios.get<string>(searchUrl, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        Referer: 'https://www.google.com/',
      },
    });

    const $ = cheerio.load(html);

    // 쿠팡 검색결과 첫 번째 일반 상품 (광고 제외)
    const item = $('li.search-product:not(.search-product__ad-badge)').first();

    if (!item.length) {
      return NextResponse.json({ error: 'no_results', searchUrl });
    }

    const priceText = item.find('strong.price-value').first().text().trim();
    const name = item.find('.name').first().text().trim();
    const href = item.find('a.search-product-link, a').first().attr('href') ?? '';
    const productUrl = href.startsWith('http')
      ? href
      : `https://www.coupang.com${href}`;
    const priceNum = parseKRW(priceText);

    if (!priceNum) {
      return NextResponse.json({ error: 'no_price', searchUrl });
    }

    return NextResponse.json({
      price: priceNum,
      priceText: `${priceNum.toLocaleString('ko-KR')}원`,
      name,
      url: productUrl,
      searchUrl,
    });
  } catch {
    return NextResponse.json({ error: 'fetch_failed', searchUrl });
  }
}
