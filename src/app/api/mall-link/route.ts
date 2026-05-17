import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const postUrl = searchParams.get('url');

  if (!postUrl) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  try {
    const { data } = await axios.get<ArrayBuffer>(postUrl, {
      timeout: 8_000,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    const html = new TextDecoder('euc-kr').decode(data);
    const $ = cheerio.load(html);

    // 뽐뿌 리다이렉트 링크: https://s.ppomppu.co.kr?idno=...&target=<base64>
    let mallUrl: string | null = null;
    $('a[href*="s.ppomppu.co.kr"]').each((_, el) => {
      if (mallUrl) return;
      const href = $(el).attr('href') ?? '';
      try {
        const u = new URL(href);
        const target = u.searchParams.get('target');
        if (target) {
          const decoded = Buffer.from(target, 'base64').toString('utf-8');
          if (decoded.startsWith('http')) {
            mallUrl = decoded;
          }
        }
      } catch {
        // invalid URL, skip
      }
    });

    if (!mallUrl) {
      return NextResponse.json({ error: 'no_mall_link' });
    }

    return NextResponse.json({ mallUrl });
  } catch {
    return NextResponse.json({ error: 'fetch_failed' });
  }
}
