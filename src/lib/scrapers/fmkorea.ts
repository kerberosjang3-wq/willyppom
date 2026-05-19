import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal } from '@/types/deal';
import { detectCategory, makeId, safeNumber } from './utils';

const BASE_URL  = 'https://www.fmkorea.com';
const TIMEOUT   = 5_000;
const MAX_PAGES = 2;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
};

// SCRAPER_API_KEY 환경변수가 있으면 ScraperAPI 프록시 경유
// https://www.scraperapi.com (무료 월 5000회)
function buildFetchUrl(targetUrl: string): string {
  const key = process.env.SCRAPER_API_KEY;
  if (key) return `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(targetUrl)}&render=false`;
  return targetUrl;
}

const SOLD_OUT_RE = /[\[(（]?(마감|품절|종료|판매종료|sold\s*out)[\])）]?/i;

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

// 실제 구조:
// div.fm_best_widget._bd_pc > ul > li.li > div.li
//   h3.title > a.hotdeal_var8 > span.ellipsis-target  ← 제목
//   div.hotdeal_info > span > a                        ← 가격/쇼핑몰/배송
//   span.regdate                                       ← 날짜
//   span.comment_count                                 ← 댓글수
//   a.pc_voted_count > span.count                      ← 추천수
//   img[data-original]                                 ← 썸네일 (lazy)

async function scrapePage(page: number): Promise<{ deals: Deal[]; hasMore: boolean }> {
  const targetUrl = `${BASE_URL}/index.php?mid=hotdeal&page=${page}`;
  const fetchUrl  = buildFetchUrl(targetUrl);
  const useProxy  = fetchUrl !== targetUrl;

  const res = await axios.get<string>(fetchUrl, {
    timeout: TIMEOUT,
    headers: useProxy ? {} : HEADERS,  // ScraperAPI는 자체 헤더 사용
  });
  const $   = cheerio.load(res.data);
  const deals: Deal[] = [];

  if (res.status !== 200) {
    console.warn(`[fmkorea] page ${page}: HTTP ${res.status}`);
    return { deals: [], hasMore: false };
  }

  // Cloudflare 차단 감지
  const pageTitle = $('title').first().text();
  if (/just a moment|cloudflare|attention required/i.test(pageTitle)) {
    console.warn(`[fmkorea] page ${page}: Cloudflare challenge — "${pageTitle}"`);
    return { deals: [], hasMore: false };
  }

  // div.fm_best_widget > ul > li  (> 직계 자식 아닌 하위 전체 매칭)
  const $items = $('.fm_best_widget li.li');

  if ($items.length === 0) {
    console.warn(`[fmkorea] page ${page}: no items. title="${pageTitle}"`);
    return { deals: [], hasMore: false };
  }

  console.info(`[fmkorea] page ${page}: ${$items.length} items`);

  $items.each((i, el) => {
    const $el = $(el);

    // 제목: span.ellipsis-target 텍스트
    const title = $el.find('.ellipsis-target').first().text().trim();
    if (!title) return;

    // URL
    const href = $el.find('h3.title a').first().attr('href') ?? '';
    if (!href) return;
    const postUrl = href.startsWith('http') ? href : BASE_URL + href;

    // document_srl
    const srlMatch = href.match(/\/(\d+)$/) ?? href.match(/(\d{7,})/);
    const srl      = srlMatch?.[1] ?? `${page}-${i}`;

    // 날짜 (regdate에 HTML 주석이 있으므로 직계 텍스트 노드만)
    const rawDate = $el.find('.regdate').first()
      .clone().children().remove().end().text().trim();
    const publishedAt = parsePostTime(rawDate);

    // 댓글수
    const commentCount = safeNumber(
      $el.find('.comment_count').first().text().replace(/[^\d]/g, '')
    );

    // 추천수
    const likeCount = safeNumber(
      $el.find('.pc_voted_count .count').first().text().replace(/[^\d]/g, '')
    );

    // 썸네일: lazy load → data-original 우선
    const imgEl   = $el.find('img.thumb').first();
    const imgSrc  = imgEl.attr('data-original') || imgEl.attr('src');
    const thumbnail = imgSrc
      ? (imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc)
      : undefined;

    // 마감 여부
    const isSoldOut = SOLD_OUT_RE.test(title) || $el.find('.hotdeal_var8Y').length > 0;

    // 가격 / 쇼핑몰 / 배송 (div.hotdeal_info > span > a)
    let price: string | undefined;
    let mallName: string | undefined;
    let shipping: string | undefined;

    $el.find('.hotdeal_info span').each((_, span) => {
      const text  = $(span).text();
      const value = $(span).find('a').first().text().trim();
      if (!value) return;
      if      (text.includes('가격'))   price    = value;
      else if (text.includes('쇼핑몰')) mallName = value;
      else if (text.includes('배송'))   shipping = value;
    });

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
      publishedAt,
      isSoldOut:   isSoldOut || undefined,
    });
  });

  console.info(`[fmkorea] page ${page}: ${deals.length} deals parsed`);

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
