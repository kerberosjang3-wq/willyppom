import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal } from '@/types/deal';
import { detectCategory, calcHotScore, makeId, safeNumber } from './utils';

const BOARD_URL = 'https://m.ppomppu.co.kr/new/bbs_list.php?id=ppomppu&hotlist_flag=999';
const BASE_URL  = 'https://m.ppomppu.co.kr';
const TIMEOUT   = 10_000;

// 뽐뿌 시간 문자열을 ISO로 변환 (KST 기준)
// 오늘 글: "HH:mm:ss" → 오늘 날짜 + 해당 시각 (KST)
// 이전 날: "YY/MM/DD" → 해당 날짜 정오 (KST)
function parsePostTime(raw: string): string {
  const timeOnly = raw.match(/^(\d{2}):(\d{2}):(\d{2})$/);
  if (timeOnly) {
    const nowKST   = new Date(Date.now() + 9 * 3600_000);
    const datePart = nowKST.toISOString().slice(0, 10); // YYYY-MM-DD
    return new Date(`${datePart}T${raw}+09:00`).toISOString();
  }
  const dateOnly = raw.match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (dateOnly) {
    const [, yy, mm, dd] = dateOnly;
    return new Date(`20${yy}-${mm}-${dd}T12:00:00+09:00`).toISOString();
  }
  return new Date().toISOString();
}

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

    $('.bbsList_new > li').each((i, el) => {
      if (i >= 40) return false;

      const titleEl = $(el).find('.title .cont').first();
      let title = titleEl.text().trim();
      if (!title) {
        title = $(el).find('.title').clone().find('.rp').remove().end().text().trim();
      }
      if (!title) return;

      const href    = $(el).find('a').first().attr('href') ?? '';
      const url     = href.startsWith('http')
        ? href
        : (href.startsWith('/') ? BASE_URL + href : BASE_URL + '/new/' + href);

      // 쇼핑포럼(id=ppomppu 이외 게시판) 제외
      const boardId = new URLSearchParams(href.split('?')[1] ?? '').get('id');
      if (boardId && boardId !== 'ppomppu') return;

      const commText = $(el).find('.rp').first().text().trim();
      const likeText = $(el).find('.recs').first().text().trim() || '0';
      const viewText = $(el).find('.view').first().text().trim();
      const imgEl    = $(el).find('div[class^="thmb_"] img, .thumb img').first();
      const imgSrc   = imgEl.attr('src');

      const commentCount = safeNumber(commText.replace(/[^\d]/g, ''));
      const likeCount    = safeNumber(likeText.replace(/[^\d]/g, ''));
      const viewCount    = safeNumber(viewText.replace(/[^\d]/g, '')) || undefined;

      const rawTime   = $(el).find('time').first().text().trim();
      const publishedAt = rawTime ? parsePostTime(rawTime) : now.toISOString();

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
        viewCount,
        hotScore:     calcHotScore(commentCount, likeCount, 2),
        publishedAt,
      });
    });

    return deals;
  } catch (err) {
    console.error('[ppomppu] scrape failed:', err instanceof Error ? err.message : err);
    return [];
  }
}


