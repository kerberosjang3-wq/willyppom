import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';
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
function parseHotdealInfo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $el: cheerio.Cheerio<any>,
  $: cheerio.CheerioAPI,
): { price?: string; mallName?: string; shipping?: string } {
  const result: { price?: string; mallName?: string; shipping?: string } = {};

  $el.find('.hotdeal_info span').each((_, span) => {
    const fullText = $(span).text();
    const value    = $(span).find('a').first().text().trim();
    if (!value) return;

    if      (fullText.includes('가격'))   result.price    = value;
    else if (fullText.includes('쇼핑몰')) result.mallName = value;
    else if (fullText.includes('배송'))   result.shipping = value;
  });

  return result;
}

// XE 구조에서 li 목록을 찾는 selector 후보들 (우선순위 순)
const ITEM_SELECTORS = [
  'ul.fm_best_widget > li',          // ul 자체가 fm_best_widget 클래스 (정상 구조)
  '.fm_best_widget > li',            // 태그 무관
  '#content .fm_best_widget li',     // 중첩 허용
  '.board_list li',                  // 일반 게시판 뷰
  '#content li.li',                  // XE 기본 테이블 행
];

async function scrapePage(page: number): Promise<{ deals: Deal[]; hasMore: boolean; selectorUsed?: string }> {
  const url = `${BASE_URL}/index.php?mid=hotdeal&page=${page}`;

  const res = await axios.get<string>(url, { timeout: TIMEOUT, headers: HEADERS });
  const $   = cheerio.load(res.data);
  const deals: Deal[] = [];

  // HTTP 상태 이상이면 조기 종료
  if (res.status !== 200) {
    console.warn(`[fmkorea] page ${page}: HTTP ${res.status}`);
    return { deals: [], hasMore: false };
  }

  // Cloudflare 차단 감지 (cf-ray 헤더 또는 타이틀)
  const pageTitle = $('title').first().text();
  if (/just a moment|cloudflare|attention required/i.test(pageTitle)) {
    console.warn(`[fmkorea] page ${page}: Cloudflare challenge — title: "${pageTitle}"`);
    return { deals: [], hasMore: false };
  }

  // selector 후보 탐색
  let $items = $('__nomatch_sentinel__');
  let selectorUsed = '';
  for (const sel of ITEM_SELECTORS) {
    const found = $(sel);
    if (found.length > 0) {
      $items = found;
      selectorUsed = sel;
      break;
    }
  }

  if ($items.length === 0) {
    // 진단용: 어떤 class들이 실제 HTML에 있는지 로그
    const classFreq: Record<string, number> = {};
    for (const m of res.data.matchAll(/class="([^"]+)"/g)) {
      for (const c of m[1].split(/\s+/)) {
        classFreq[c] = (classFreq[c] ?? 0) + 1;
      }
    }
    const topClasses = Object.entries(classFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([c, n]) => `${c}(${n})`);
    console.warn(`[fmkorea] page ${page}: no items found. title="${pageTitle}" topClasses=${topClasses.join(',')}`);
    return { deals: [], hasMore: false };
  }

  console.info(`[fmkorea] page ${page}: using selector "${selectorUsed}", ${$items.length} items`);

  $items.each((i, el) => {
    const $el     = $(el);
    const titleEl = $el.find('.title a, .subject a').first();

    // 직접 텍스트 노드만 추출 (댓글수 뱃지 등 자식 요소 제외)
    const title = titleEl
      .clone()
      .children()
      .remove()
      .end()
      .text()
      .trim();
    if (!title) return;

    const href = titleEl.attr('href') ?? '';
    if (!href) return;
    const postUrl = href.startsWith('http') ? href : BASE_URL + href;

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

  console.info(`[fmkorea] page ${page}: ${deals.length} deals parsed`);

  const hasMore = deals.length > 0 && (
    $('a.pg_next').length > 0 ||
    $(`.pagination a[href*="page=${page + 1}"]`).length > 0
  );
  return { deals, hasMore, selectorUsed };
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
