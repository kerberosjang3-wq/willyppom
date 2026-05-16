import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal } from '@/types/deal';
import { detectCategory, calcHotScore, makeId, safeNumber } from './utils';

const BOARD_URL = 'https://m.ppomppu.co.kr/new/bbs_list.php?id=ppomppu';
const BASE_URL  = 'https://m.ppomppu.co.kr';
const TIMEOUT   = 10_000;

export async function scrapePpomppu(): Promise<Deal[]> {
  try {
    const res = await axios.get(BOARD_URL, {
      timeout: TIMEOUT,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    const decoder = new TextDecoder('euc-kr');
    const html = decoder.decode(res.data);

    const $ = cheerio.load(html);
    const deals: Deal[] = [];
    const now = new Date();

    $('.bbsList li').each((i, el) => {
      if (i >= 40) return false;

      const titleEl = $(el).find('.title');
      const title   = titleEl.text().trim();
      if (!title) return;

      const href    = $(el).find('a').attr('href') ?? '';
      const url     = href.startsWith('http') ? href : BASE_URL + '/new/' + href;
      
      const commText = $(el).find('.comment_num').text().trim();
      const likeText = $(el).find('.voted_count').text().trim() || '0';
      const imgSrc   = $(el).find('.thumb img').attr('src');

      const commentCount = safeNumber(commText.replace(/[^\d]/g, ''));
      const likeCount    = safeNumber(likeText.replace(/[^\d]/g, ''));

      deals.push({
        id:           makeId('ppomppu', url.split('no=')[1]?.split('&')[0] ?? String(i)),
        title,
        url,
        thumbnail:    imgSrc ? (imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc) : undefined,
        source:       'ppomppu' as const,
        sourceName:   '뽐뿌',
        category:     detectCategory(title),
        commentCount,
        likeCount,
        hotScore:     calcHotScore(commentCount, likeCount, 2),
        publishedAt:  now.toISOString(),
      });
    });

    return deals;
  } catch (err) {
    console.error('[ppomppu] scrape failed:', err instanceof Error ? err.message : err);
    return [];
  }
}


