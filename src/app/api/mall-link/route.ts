import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const HEADERS_DESKTOP = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

const HEADERS_MOBILE = {
  'User-Agent':      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

// FM Korea 내부 리다이렉트 URL 패턴 (실제 쇼핑몰로 302 리다이렉트)
const FM_REDIRECT_RE = /\/index\.php\?.*act=goodsRedirect|\/link\//;

// 뽐뿌: s.ppomppu.co.kr?target=BASE64 → 원본 쇼핑몰 URL
async function extractPpomppuMallUrl(postUrl: string): Promise<string | null> {
  const { data } = await axios.get<ArrayBuffer>(postUrl, {
    timeout: 8_000,
    responseType: 'arraybuffer',
    headers: HEADERS_MOBILE,
  });

  const html = new TextDecoder('euc-kr').decode(data);
  const $ = cheerio.load(html);

  let mallUrl: string | null = null;
  $('a[href*="s.ppomppu.co.kr"]').each((_, el) => {
    if (mallUrl) return;
    const href = $(el).attr('href') ?? '';
    try {
      const u = new URL(href);
      const target = u.searchParams.get('target');
      if (target) {
        const decoded = Buffer.from(target, 'base64').toString('utf-8');
        if (decoded.startsWith('http')) mallUrl = decoded;
      }
    } catch { /* invalid URL */ }
  });

  return mallUrl;
}

// 에펨코리아: 게시글 본문에서 외부 쇼핑몰 URL 추출
// .xe_content 내 외부 링크(non-fmkorea) 우선, FM Korea 내부 리다이렉트 차선
async function extractFmkoreaMallUrl(postUrl: string): Promise<string | null> {
  const key      = process.env.SCRAPER_API_KEY;
  const fetchUrl = key
    ? `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(postUrl)}&render=false`
    : postUrl;

  const { data } = await axios.get<string>(fetchUrl, {
    timeout:      10_000,
    maxRedirects: 5,
    headers: key ? {} : { ...HEADERS_DESKTOP, Referer: 'https://www.fmkorea.com/hotdeal' },
  });

  const $ = cheerio.load(data);

  if (/just a moment|cloudflare/i.test($('title').text())) return null;

  let mallUrl: string | null = null;

  // 1순위: 게시글 본문 내 직접 외부 링크
  $('.xe_content a[href]').each((_, el) => {
    if (mallUrl) return;
    const href = $(el).attr('href') ?? '';
    if (href.startsWith('http') && !href.includes('fmkorea.com')) {
      mallUrl = href;
    }
  });

  // 2순위: FM Korea 내부 리다이렉트 (→ 실제 쇼핑몰로 302)
  if (!mallUrl) {
    $('a[href]').each((_, el) => {
      if (mallUrl) return;
      const href = $(el).attr('href') ?? '';
      if (FM_REDIRECT_RE.test(href)) {
        mallUrl = href.startsWith('http') ? href : `https://www.fmkorea.com${href}`;
      }
    });
  }

  return mallUrl;
}

// 퀘이사존: javascript:goToLink('BASE64') → 원본 쇼핑몰 URL
async function extractQuasarzoneMallUrl(postUrl: string): Promise<string | null> {
  const { data } = await axios.get<string>(postUrl, {
    timeout: 8_000,
    headers: { ...HEADERS_DESKTOP, Referer: 'https://quasarzone.com/bbs/qb_saleinfo' },
  });

  const $ = cheerio.load(data);

  // 구매 링크: javascript:goToLink('BASE64_ENCODED_URL')
  let mallUrl: string | null = null;
  $('a[href^="javascript:goToLink"]').each((_, el) => {
    if (mallUrl) return;
    const href = $(el).attr('href') ?? '';
    const m = href.match(/goToLink\('([^']+)'\)/);
    if (!m) return;
    try {
      const decoded = Buffer.from(m[1], 'base64').toString('utf-8');
      if (decoded.startsWith('http')) mallUrl = decoded;
    } catch { /* invalid base64 */ }
  });

  return mallUrl;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postUrl = searchParams.get('url');

  if (!postUrl) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  try {
    let mallUrl: string | null = null;

    if (postUrl.includes('quasarzone.com')) {
      mallUrl = await extractQuasarzoneMallUrl(postUrl);
    } else if (postUrl.includes('fmkorea.com')) {
      mallUrl = await extractFmkoreaMallUrl(postUrl);
    } else {
      mallUrl = await extractPpomppuMallUrl(postUrl);
    }

    if (!mallUrl) {
      return NextResponse.json({ error: 'no_mall_link' });
    }

    return NextResponse.json({ mallUrl });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' });
  }
}
