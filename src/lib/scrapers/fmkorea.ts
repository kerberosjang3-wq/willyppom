import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal, CategoryId } from '@/types/deal';
import { calcHotScore, makeId, safeNumber } from './utils';

const BOARD_URL = 'https://www.fmkorea.com/hotdeal';
const BASE_URL  = 'https://www.fmkorea.com';
const TIMEOUT   = 10_000;

const SOLD_OUT_KEYWORDS = /[\[(（]?(마감|품절|종료|판매종료|sold\s*out)[\])）]?/i;
const SOLD_OUT_CLASSES  = /hotdeal_var[1-6]/;

const FM_CATEGORY_MAP: [string, CategoryId][] = [
  ['PC',       'electronics'],
  ['노트북',   'electronics'],
  ['모니터',   'electronics'],
  ['스마트폰', 'electronics'],
  ['태블릿',   'electronics'],
  ['가전',     'electronics'],
  ['TV',       'electronics'],
  ['이어폰',   'electronics'],
  ['의류',     'fashion'],
  ['잡화',     'fashion'],
  ['신발',     'fashion'],
  ['뷰티',     'beauty'],
  ['화장품',   'beauty'],
  ['식품',     'food'],
  ['음식',     'food'],
  ['생활',     'living'],
  ['가구',     'living'],
  ['인테리어', 'living'],
  ['여행',     'travel'],
  ['숙박',     'travel'],
  ['게임',     'game'],
];

function mapCategory(raw: string): CategoryId {
  for (const [key, val] of FM_CATEGORY_MAP) {
    if (raw.includes(key)) return val;
  }
  return 'etc';
}

// "HH:MM" or "MM/DD" → ISO string (KST)
function parseDate(raw: string): string {
  const hm = raw.match(/^(\d{2}):(\d{2})$/);
  if (hm) {
    const now = new Date();
    const kst = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    kst.setHours(parseInt(hm[1]), parseInt(hm[2]), 0, 0);
    if (kst.getTime() > now.getTime() + 60_000) kst.setDate(kst.getDate() - 1);
    return kst.toISOString();
  }

  const md = raw.match(/^(\d{2})\/(\d{2})$/);
  if (md) {
    const year = new Date().getFullYear();
    return new Date(`${year}-${md[1]}-${md[2]}T12:00:00+09:00`).toISOString();
  }

  return new Date().toISOString();
}

function parsePrice(raw: string): string | undefined {
  if (!raw || raw === '-') return undefined;
  const m = raw.match(/[\d,]+/);
  if (!m) return undefined;
  const num = parseInt(m[0].replace(/,/g, ''), 10);
  if (!num || isNaN(num)) return undefined;
  return `${num.toLocaleString('ko-KR')}원`;
}

function parseShipping(raw: string): string | undefined {
  if (!raw || raw === '-') return undefined;
  if (/무료|무배|0원/.test(raw)) return '무료배송';
  const m = raw.match(/[\d,]+원?/);
  if (m) return `배송비 ${m[0].includes('원') ? m[0] : m[0] + '원'}`;
  return undefined;
}

export async function scrapeFmkorea(): Promise<Deal[]> {
  try {
    const res = await axios.get(BOARD_URL, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer':         'https://www.fmkorea.com/',
      },
    });

    const $ = cheerio.load(res.data);
    const deals: Deal[] = [];

    $('ul.hotdeal_list > li, li.li_box').each((i, el) => {
      if (i >= 40) return false;

      const $el = $(el);

      const elClass = $el.attr('class') ?? '';
      if (elClass.includes('notice') || elClass.includes('ad')) return;

      const isSoldOutByClass = SOLD_OUT_CLASSES.test(elClass);

      const titleEl = $el.find('.hotdeal_info .ellipsis-target, .title .ellipsis-target, a.hotdeal_var0, a[class^="hotdeal_var"]').first();
      const title = titleEl.text().trim();
      if (!title) return;

      const isSoldOut = isSoldOutByClass || SOLD_OUT_KEYWORDS.test(title);

      const href = $el.find('a.hotdeal_var0, a[class^="hotdeal_var"], .hotdeal_info a').first().attr('href') ?? '';
      if (!href) return;
      const url    = href.startsWith('http') ? href : BASE_URL + href;
      const postId = href.replace(/\/$/, '').split('/').pop() ?? String(i);

      const imgEl  = $el.find('img.thumb, .hotdeal_img img').first();
      const imgSrc = (imgEl.attr('data-original') || imgEl.attr('src') || '').trim();
      const thumbnail = imgSrc && !imgSrc.includes('no_image') && !imgSrc.includes('nophoto')
        ? (imgSrc.startsWith('//') ? 'https:' + imgSrc : imgSrc)
        : undefined;

      const voteRaw   = $el.find('.pc_voted_count .count, .voted_count .count').first().text().trim();
      const likeCount = Math.max(0, safeNumber(voteRaw));

      const strongs     = $el.find('.hotdeal_info .strong');
      const priceRaw    = strongs.eq(0).text().trim();
      const shippingRaw = strongs.eq(1).text().trim();

      const price    = parsePrice(priceRaw);
      const shipping = parseShipping(shippingRaw);
      const mallName = strongs.eq(2).text().trim() || undefined;

      const catText  = $el.find('.hotdeal_info .category a, .category a').first().text().trim();
      const category = mapCategory(catText);

      const cmtRaw      = $el.find('.comment_count, .num_comment').first().text().trim();
      const cmtMatch    = cmtRaw.match(/\d+/);
      const commentCount = cmtMatch ? parseInt(cmtMatch[0], 10) : 0;

      const dateText    = $el.find('.regdate, .date').first().text().trim();
      const publishedAt = parseDate(dateText);

      const ageHours = Math.max(0.1, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);

      deals.push({
        id:          makeId('fmkorea', postId),
        title,
        url,
        price,
        shipping,
        mallName,
        thumbnail,
        source:      'fmkorea',
        sourceName:  '에펨코리아',
        category,
        commentCount,
        likeCount,
        viewCount:   undefined,
        hotScore:    calcHotScore(commentCount, likeCount, ageHours),
        publishedAt,
        isSoldOut:   isSoldOut || undefined,
      });
    });

    return deals;
  } catch (err) {
    console.error('[fmkorea] scrape failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
