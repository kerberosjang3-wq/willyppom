import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal } from '@/types/deal';
import { detectCategory, makeId, safeNumber } from './utils';

const BASE_URL  = 'https://m.ppomppu.co.kr';
const TIMEOUT   = 5_000;
const MAX_PAGES = 1;

function boardUrl(page: number) {
  return `${BASE_URL}/new/pop_bbs.php?id=ppomppu&bot_type=pop_bbs&page=${page}`;
}

const SOLD_OUT_KEYWORDS = /[\[(（]?(마감|품절|종료|판매종료|sold\s*out)[\])）]?/i;

function detectSoldOut(title: string, liClasses: string): boolean {
  if (SOLD_OUT_KEYWORDS.test(title)) return true;
  // 뽐뿌는 마감 항목 li에 'end' 클래스 추가
  return /\bend\b/.test(liClasses);
}

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

async function scrapePage(page: number): Promise<{ deals: Deal[]; hasMore: boolean }> {
  const res = await axios.get(boardUrl(page), {
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

  $('.bbsList_new > li').each((i, el) => {
    const rawTime = $(el).find('time').first().text().trim();

    // HOT 리스트는 인기순 정렬 → 이전날 항목이 중간에 섞일 수 있으므로
    // 당일("HH:mm:ss") 형식이 아니면 해당 항목만 스킵, 루프는 계속
    if (!/^\d{2}:\d{2}:\d{2}$/.test(rawTime)) {
      return;
    }

    const titleEl = $(el).find('.title .cont').first();
    let title = titleEl.text().trim();
    if (!title) {
      title = $(el).find('.title').clone().find('.rp').remove().end().text().trim();
    }
    if (!title) return;

    const href = $(el).find('a').first().attr('href') ?? '';
    const url  = href.startsWith('http')
      ? href
      : (href.startsWith('/') ? BASE_URL + href : BASE_URL + '/new/' + href);

    const commText = $(el).find('.rp').first().text().trim();
    const likeText = $(el).find('.recs').first().text().trim() || '0';
    const viewText = $(el).find('.view').first().text().trim();
    const imgEl    = $(el).find('div[class^="thmb_"] img, .thumb img').first();
    const imgSrc   = imgEl.attr('src');

    const commentCount = safeNumber(commText.replace(/[^\d]/g, ''));
    const likeCount    = safeNumber(likeText.replace(/[^\d]/g, ''));
    const viewCount    = safeNumber(viewText.replace(/[^\d]/g, '')) || undefined;

    const publishedAt = parsePostTime(rawTime);
    const liClasses   = $(el).attr('class') ?? '';
    const isSoldOut   = detectSoldOut(title, liClasses);

    deals.push({
      id:         makeId('ppomppu', url.split('no=')[1]?.split('&')[0] ?? `${page}-${i}`),
      title,
      url,
      thumbnail:  imgSrc ? (imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc) : undefined,
      source:     'ppomppu' as const,
      sourceName: '뽐뿌',
      category:   detectCategory(title),
      commentCount,
      likeCount,
      viewCount,
      publishedAt,
      isSoldOut:  isSoldOut || undefined,
    });
  });

  const hasMore = $('a[href*="page="]').length > 0;
  return { deals, hasMore };
}

export async function scrapePpomppu(): Promise<Deal[]> {
  const all: Deal[] = [];

  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { deals, hasMore } = await scrapePage(page);
      all.push(...deals);
      if (!hasMore) break;
    }
  } catch (err) {
    console.error('[ppomppu] scrape failed:', err instanceof Error ? err.message : err);
  }

  return all;
}


