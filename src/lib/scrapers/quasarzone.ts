import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal, CategoryId } from '@/types/deal';
import { makeId, safeNumber } from './utils';

const BOARD_URL = 'https://quasarzone.com/bbs/qb_saleinfo';
const BASE_URL  = 'https://quasarzone.com';
const TIMEOUT   = 10_000;

const SOLD_OUT_KEYWORDS = /[\[(（]?(마감|품절|종료|판매종료|sold\s*out)[\])）]?/i;

// 퀘이사존 카테고리 → 앱 CategoryId 매핑
const QZ_CATEGORY_MAP: [string, CategoryId][] = [
  ['PC부품',     'electronics'],
  ['노트북',     'electronics'],
  ['모니터',     'electronics'],
  ['스마트기기', 'electronics'],
  ['주변기기',   'electronics'],
  ['가전',       'electronics'],
  ['TV',         'electronics'],
  ['의류',       'fashion'],
  ['잡화',       'fashion'],
  ['뷰티',       'beauty'],
  ['미용',       'beauty'],
  ['식품',       'food'],
  ['생활',       'living'],
  ['인테리어',   'living'],
  ['가구',       'living'],
  ['여행',       'travel'],
  ['숙박',       'travel'],
  ['게임',       'game'],
];

function mapCategory(qzCat: string): CategoryId {
  for (const [key, val] of QZ_CATEGORY_MAP) {
    if (qzCat.includes(key)) return val;
  }
  return 'etc';
}

// "N분 전", "N시간 전", "MM-DD" → ISO string (KST 기준)
function parseDate(raw: string): string {
  const min = raw.match(/(\d+)분\s*전/);
  if (min) return new Date(Date.now() - parseInt(min[1]) * 60_000).toISOString();

  const hour = raw.match(/(\d+)시간\s*전/);
  if (hour) return new Date(Date.now() - parseInt(hour[1]) * 3_600_000).toISOString();

  const md = raw.match(/^(\d{2})-(\d{2})$/);
  if (md) {
    const year = new Date().getFullYear();
    return new Date(`${year}-${md[1]}-${md[2]}T12:00:00+09:00`).toISOString();
  }

  return new Date().toISOString();
}

// "￦ 15,900 (KRW)", "￦ 88,900원 (KRW)" → "15,900원"
function parsePrice(raw: string): string | undefined {
  const m = raw.match(/[\d,]+/);
  if (!m) return undefined;
  const num = parseInt(m[0].replace(/,/g, ''), 10);
  if (!num || isNaN(num)) return undefined;
  return `${num.toLocaleString('ko-KR')}원`;
}

// "배송비 무료", "배송비 무배", "배송비 2,500원" 등 파싱
function parseShipping(subText: string): string | undefined {
  if (/배송비\s*(무료|무배|0원)/.test(subText) || /무료배송|무배/.test(subText)) return '무료배송';
  const fee = subText.match(/배송비\s*([\d,]+원?)/);
  if (fee) return `배송비 ${fee[1].includes('원') ? fee[1] : fee[1] + '원'}`;
  return undefined;
}

export async function scrapeQuasarzone(): Promise<Deal[]> {
  try {
    const res = await axios.get(BOARD_URL, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        'Referer':         'https://quasarzone.com/',
      },
    });

    const $ = cheerio.load(res.data);
    const deals: Deal[] = [];

    $('.market-info-type-list tbody tr').each((i, el) => {
      if (i >= 40) return false;

      const cont = $(el).find('.market-info-list-cont');
      if (!cont.length) return;

      // 공지 스킵
      const label = cont.find('.label').first().text().trim();
      if (label === '공지') return;

      // 제목 (댓글수 뱃지 제외)
      const titleSpan = cont.find('.ellipsis-with-reply-cnt').clone();
      titleSpan.find('.board-list-comment').remove();
      const title = titleSpan.text().trim();
      if (!title) return;

      // URL & 게시글 ID
      const href   = cont.find('a.subject-link').first().attr('href') ?? '';
      if (!href) return;
      const url    = href.startsWith('http') ? href : BASE_URL + href;
      const postId = href.split('/views/')[1]?.split('?')[0] ?? String(i);

      // 마감 여부
      const isSoldOut = label === '마감' || SOLD_OUT_KEYWORDS.test(title);

      // 썸네일 (no-image SVG 제외)
      const imgSrc = $(el).find('.thumb-wrap img.maxImg').first().attr('src')?.trim();
      const thumbnail = imgSrc && !imgSrc.includes('thumb_no_image') ? imgSrc : undefined;

      // 추천수 (첫 번째 <td>의 .num)
      const likeCount = safeNumber($(el).find('td:first-child .num').first().text().trim());

      // 가격 정보 행
      const subRow1 = cont.find('.market-info-sub p').eq(0);
      const subRow2 = cont.find('.market-info-sub p').eq(1);

      const qzCat   = subRow1.find('.category').text().trim();
      const category = mapCategory(qzCat);

      const priceRaw = subRow1.find('.text-orange').first().text().trim();
      const price    = parsePrice(priceRaw);
      const shipping = parseShipping(subRow1.text());

      // 조회수 & 댓글수
      const viewCount    = safeNumber(subRow2.find('.count').first().text().trim()) || undefined;
      const commentCount = safeNumber(cont.find('.ctn-count').first().text().trim());

      // 날짜
      const dateText  = subRow2.find('.date').first().text().trim();
      const publishedAt = parseDate(dateText);

      const ageHours = Math.max(0.1, (Date.now() - new Date(publishedAt).getTime()) / 3_600_000);

      deals.push({
        id:          makeId('quasarzone', postId),
        title,
        url,
        price,
        shipping,
        thumbnail,
        source:      'quasarzone',
        sourceName:  '퀘이사존',
        category,
        commentCount,
        likeCount,
        viewCount,
        publishedAt,
        isSoldOut:   isSoldOut || undefined,
      });
    });

    return deals;
  } catch (err) {
    console.error('[quasarzone] scrape failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
