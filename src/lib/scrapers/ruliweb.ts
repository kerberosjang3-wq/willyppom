import axios from 'axios';
import * as cheerio from 'cheerio';
import { detectCategory, calcHotScore, makeId, safeNumber } from './utils';

const BOARD_URL = 'https://bbs.ruliweb.com/market/board/1020?view=thumbnail&page=1';
const BASE_URL  = 'https://bbs.ruliweb.com';
const TIMEOUT   = 10_000;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function scrapeRuliweb(): Promise<any[]> {
  try {
    const { data: html } = await axios.get<string>(BOARD_URL, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        Referer: 'https://bbs.ruliweb.com/',
      },
    });

    const $ = cheerio.load(html);
    const deals: any[] = [];
    const now = new Date();

    // Thumbnail view: each item is .table_body tr or li.item_box
    $('tr.table_body, li.item_box').each((i, el) => {
      if (i >= 40) return false;

      // Skip notices
      if ($(el).hasClass('notice') || $(el).find('.label_notice').length > 0) return;

      const titleEl  = $(el).find('a.subject_link, .title_wrapper a').first();
      const title    = titleEl.text().trim();
      if (!title) return;

      const href     = titleEl.attr('href') ?? '';
      const url      = href.startsWith('http') ? href : BASE_URL + href;
      
      const commText = $(el).find('.num_answer_re, .replycount, .reply_count').text().trim();
      const likeText = $(el).find('.recom, .reco, .recomm_count').text().trim();
      const timeText = $(el).find('.time, .datetime').text().trim();
      const imgSrc   = $(el).find('img.thumb, img').attr('src');
      const cateText = $(el).find('.cate a').text().trim();

      const commentCount = safeNumber(commText.replace(/[^\d]/g, ''));
      const likeCount    = safeNumber(likeText.replace(/[^\d]/g, ''));

      // Parse date or use default
      const ageHours = 5;

      deals.push({
        id:           makeId('ruliweb', url.split('/').pop()?.split('?')[0] ?? String(i)),
        title,
        url,
        thumbnail:    imgSrc && imgSrc.startsWith('http') && !imgSrc.includes('ruliweb_logo') ? imgSrc : undefined,
        source:       'ruliweb' as const,
        sourceName:   '루리웹',
        category:     detectCategory(cateText || title),
        commentCount,
        likeCount,
        hotScore:     calcHotScore(commentCount, likeCount, ageHours),
        publishedAt:  now.toISOString(),
      });
    });



    return deals;
  } catch (err) {
    console.error('[ruliweb] scrape failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
