import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal } from '@/types/deal';
import { detectCategory, makeId, safeNumber } from './utils';

const BASE_URL  = 'https://www.fmkorea.com';
const TIMEOUT   = 12_000;
const MAX_PAGES = 5;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9',
  'Referer': 'https://www.fmkorea.com/hotdeal',
};

const SOLD_OUT_RE = /[\[(（]?(마감|품절|종료|판매종료|sold\s*out)[\])）]?/i;

// XE 날짜 형식 파싱 (KST 기준)
// "HH:mm"          → 오늘
// "MM.DD HH:mm"    → 올해
// "YYYY.MM.DD"     → 해당 날짜 정오
function parsePostTime(raw: string): string {
  const kstNow  = new Date(Date.now() + 9 * 3600_000);
  const todayKST = kstNow.toISOString().slice(0, 10);
  const year     = kstNow.getUTCFullYear();

  // "14:30" — 오늘
  if (/^\d{2}:\d{2}$/.test(raw)) {
    return new Date(`${todayKST}T${raw}:00+09:00`).toISOString();
  }
  // "2024.05.19 14:30" — 날짜+시간 풀포맷
  const fullDT = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/);
  if (fullDT) {
    const [, y, mo, d, hh, mm] = fullDT;
    return new Date(`${y}-${mo}-${d}T${hh}:${mm}:00+09:00`).toISOString();
  }
  // "05.19 14:30" — 월일+시간
  const partDT = raw.match(/^(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/);
  if (partDT) {
    const [, mo, d, hh, mm] = partDT;
    return new Date(`${year}-${mo}-${d}T${hh}:${mm}:00+09:00`).toISOString();
  }
  // "2024.05.19" — 날짜만
  const dateOnly = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dateOnly) {
    const [, y, mo, d] = dateOnly;
    return new Date(`${y}-${mo}-${d}T12:00:00+09:00`).toISOString();
  }
  return new Date().toISOString();
}

// div.hotdeal_info 에서 가격·쇼핑몰·배송 전용 필드 추출
function parseHotdealInfo(
  $el: cheerio.Cheerio<cheerio.Element>,
  $: cheerio.CheerioAPI,
): { price?: string; mallName?: string; shipping?: string } {
  const result: { price?: string; mallName?: string; shipping?: string } = {};

  $el.find('div.hotdeal_info span').each((_, span) => {
    const label = $(span).clone().find('a').remove().end().text().replace(/\s/g, '');
    const value = $(span).find('a').first().text().trim();
    if (!value) return;

    if (label.includes('가격'))    result.price    = value;
    else if (label.includes('쇼핑몰')) result.mallName = value;
    else if (label.includes('배송'))  result.shipping = value;
  });

  return result;
}

async function scrapePage(page: number): Promise<{ deals: Deal[]; hasMore: boolean }> {
  const url = `${BASE_URL}/index.php?mid=hotdeal&page=${page}`;

  const res = await axios.get(url, {
    timeout: TIMEOUT,
    headers: HEADERS,
  });

  const $     = cheerio.load(res.data as string);
  const deals: Deal[] = [];

  $('#content .fm_best_widget ul li').each((i, el) => {
    const $el = $(el);

    const titleEl = $el.find('.title a').first();
    const title   = titleEl.text().trim();
    if (!title) return;

    const href = titleEl.attr('href') ?? '';
    if (!href) return;
    const postUrl = href.startsWith('http') ? href : BASE_URL + href;

    // document_srl 추출 (ID 생성용)
    const srlMatch = postUrl.match(/\/(\d{7,})/) ?? postUrl.match(/document_srl=(\d+)/);
    const srl      = srlMatch?.[1] ?? `${page}-${i}`;

    const rawDate    = $el.find('.regdate').first().text().trim()
                    || $el.find('time').first().text().trim();
    const publishedAt = parsePostTime(rawDate);

    const commentCount = safeNumber(
      $el.find('.comment_count').first().text().replace(/[^\d]/g, '')
    );
    const likeCount = safeNumber(
      $el.find('.pc_voted_count .count').first().text().replace(/[^\d]/g, '')
    );
    const viewCount = safeNumber(
      $el.find('.view, .hit').first().text().replace(/[^\d]/g, '')
    ) || undefined;

    const imgSrc    = $el.find('img').first().attr('src');
    const thumbnail = imgSrc
      ? (imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc)
      : undefined;

    const isSoldOut =
      SOLD_OUT_RE.test(title) ||
      $el.find('.hotdeal_var8Y').length > 0 ||
      undefined;

    const { price, mallName, shipping } = parseHotdealInfo($el, $);

    deals.push({
      id:          makeId('fmkorea', srl),
      title,
      url:         postUrl,
      price,
      mallName,
      shipping,
      thumbnail,
      source:      'fmkorea',
      sourceName:  '에펨코리아',
      category:    detectCategory(title),
      commentCount,
      likeCount,
      viewCount,
      publishedAt,
      isSoldOut:   isSoldOut || undefined,
    });
  });

  // 다음 페이지 존재 여부: 페이지네이션 링크 확인
  const hasMore = deals.length > 0 && $('a.pg_next, .pagination a[href*="page="]').length > 0;
  return { deals, hasMore };
}

export async function scrapeFmkorea(): Promise<Deal[]> {
  const all: Deal[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const { deals, hasMore } = await scrapePage(page);
      all.push(...deals);
      if (!hasMore) break;
      // 429 방지: 페이지 사이 간격
      if (page < MAX_PAGES) await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(
        `[fmkorea] page ${page} failed:`,
        err instanceof Error ? err.message : err,
      );
      break; // 한 페이지 실패 시 중단 (이미 수집된 것은 반환)
    }
  }

  return all;
}
