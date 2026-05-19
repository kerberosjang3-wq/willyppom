import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal } from '@/types/deal';
import { detectCategory, makeId, safeNumber } from './utils';

const BASE_URL  = 'https://www.fmkorea.com';
const TIMEOUT   = 12_000;
const MAX_PAGES = 5;

// 데스크톱 UA 필수 — 모바일 UA 사용 시 m.fmkorea.com HTML이 내려와 셀렉터 불일치
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
  'Referer': 'https://www.fmkorea.com/',
};

const SOLD_OUT_RE = /[\[(（]?(마감|품절|종료|판매종료|sold\s*out)[\])）]?/i;

// XE 날짜 형식 파싱 (KST 기준)
function parsePostTime(raw: string): string {
  const kstNow   = new Date(Date.now() + 9 * 3600_000);
  const todayKST = kstNow.toISOString().slice(0, 10);
  const year     = kstNow.getUTCFullYear();

  if (/^\d{2}:\d{2}$/.test(raw))
    return new Date(`${todayKST}T${raw}:00+09:00`).toISOString();

  const fullDT = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/);
  if (fullDT) {
    const [, y, mo, d, hh, mm] = fullDT;
    return new Date(`${y}-${mo}-${d}T${hh}:${mm}:00+09:00`).toISOString();
  }
  const partDT = raw.match(/^(\d{2})\.(\d{2})\s+(\d{2}):(\d{2})$/);
  if (partDT) {
    const [, mo, d, hh, mm] = partDT;
    return new Date(`${year}-${mo}-${d}T${hh}:${mm}:00+09:00`).toISOString();
  }
  const dateOnly = raw.match(/^(\d{4})\.(\d{2})\.(\d{2})$/);
  if (dateOnly) {
    const [, y, mo, d] = dateOnly;
    return new Date(`${y}-${mo}-${d}T12:00:00+09:00`).toISOString();
  }
  return new Date().toISOString();
}

// .hotdeal_info 내 가격·쇼핑몰·배송 전용 필드 추출
// krepe90 방식: span 전체 text에 키워드 있는지 확인 → a 링크 텍스트 추출
function parseHotdealInfo(
  $el: cheerio.Cheerio<cheerio.Element>,
  $: cheerio.CheerioAPI,
): { price?: string; mallName?: string; shipping?: string } {
  const result: { price?: string; mallName?: string; shipping?: string } = {};

  // div.hotdeal_info 아닐 수 있으므로 class만으로 검색
  $el.find('.hotdeal_info span').each((_, span) => {
    const fullText = $(span).text();        // 레이블 + 링크 전체 텍스트
    const value    = $(span).find('a').first().text().trim();
    if (!value) return;

    if      (fullText.includes('가격'))   result.price    = value;
    else if (fullText.includes('쇼핑몰')) result.mallName = value;
    else if (fullText.includes('배송'))   result.shipping = value;
  });

  return result;
}

async function scrapePage(page: number): Promise<{ deals: Deal[]; hasMore: boolean }> {
  const url = `${BASE_URL}/index.php?mid=hotdeal&page=${page}`;

  const res = await axios.get<string>(url, { timeout: TIMEOUT, headers: HEADERS });
  const $   = cheerio.load(res.data);
  const deals: Deal[] = [];

  // 페이지가 제대로 수신됐는지 확인 (봇 차단 시 board 없음)
  const boardName = $('.bd_tl h1 a').first().text().trim();
  if (!boardName) {
    console.warn(`[fmkorea] page ${page}: board not found — possible block`);
    return { deals: [], hasMore: false };
  }

  $('#content .fm_best_widget ul li').each((i, el) => {
    const $el     = $(el);
    const titleEl = $el.find('.title a').first();

    // 직접 텍스트 노드만 추출 (댓글수 뱃지 등 자식 요소 제외) — krepe90과 동일
    const title = titleEl
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    if (!title) return;

    // href는 "/7106724564" 형태의 순수 숫자 경로
    const href = titleEl.attr('href') ?? '';
    if (!href) return;
    const postUrl = href.startsWith('http') ? href : BASE_URL + href;

    // document_srl 추출
    const srlMatch = href.match(/\/(\d+)$/) ?? href.match(/(\d{7,})/);
    const srl      = srlMatch?.[1] ?? `${page}-${i}`;

    const rawDate     = $el.find('.regdate').first().text().trim()
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
      $el.find('.hotdeal_var8Y').length > 0;

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

  console.info(`[fmkorea] page ${page}: ${deals.length} deals`);

  const hasMore = deals.length > 0 && (
    $('a.pg_next').length > 0 ||
    $(`.pagination a[href*="page=${page + 1}"]`).length > 0
  );
  return { deals, hasMore };
}

export async function scrapeFmkorea(): Promise<Deal[]> {
  const all: Deal[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    try {
      const { deals, hasMore } = await scrapePage(page);
      all.push(...deals);
      if (!hasMore) break;
      if (page < MAX_PAGES) await new Promise(r => setTimeout(r, 400));
    } catch (err) {
      console.error(
        `[fmkorea] page ${page} failed:`,
        err instanceof Error ? err.message : err,
      );
      break;
    }
  }

  console.info(`[fmkorea] total: ${all.length} deals`);
  return all;
}
