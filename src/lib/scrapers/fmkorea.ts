import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal } from '@/types/deal';
import { detectCategory, calcHotScore, makeId, safeNumber } from './utils';

const BOARD_URL = 'https://www.fmkorea.com/hotdeal';
const BASE_URL  = 'https://www.fmkorea.com';
const TIMEOUT   = 10_000;

export async function scrapeFmkorea(): Promise<Deal[]> {
  try {
    const { data: html } = await axios.get<string>(BOARD_URL, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        Referer: 'https://www.fmkorea.com/',
        Cookie: 'fm_visited=1',
      },
    });

    const $ = cheerio.load(html);
    const deals: Deal[] = [];
    const now = new Date();

    $('li.li').each((i, el) => {
      if (i >= 40) return false;

      // Prefer .title a for robustness
      const titleEl  = $(el).find('.hotdeal_var8, .title a').first();
      const title    = titleEl.text().trim();
      if (!title) return;

      const href     = titleEl.attr('href') ?? '';
      const url      = href.startsWith('http') ? href : BASE_URL + href;
      
      const commText = $(el).find('.replyNum, .comment_count').text().trim();
      const likeText = $(el).find('.pc_voted_count, .recommend').text().trim();
      const priceText = $(el).find('.hotdeal_info span:nth-child(2), .hotdeal_var4').text().trim();
      const timeText = $(el).find('.hotdeal_info span:last-child, time').text().trim();
      const imgSrc   = $(el).find('img.thumb, img').attr('src');

      const commentCount = safeNumber(commText.replace(/[^\d]/g, ''));
      const likeCount    = safeNumber(likeText.replace(/[^\d]/g, ''));

      // Parse time or use default
      const ageHours = 4;

      deals.push({
        id:           makeId('fmkorea', url.split('/').pop()?.split('?')[0] ?? String(i)),
        title,
        url,
        price:        priceText || undefined,
        thumbnail:    imgSrc && imgSrc.startsWith('http') ? imgSrc : undefined,
        source:       'fmkorea' as const,
        sourceName:   '에펨코리아',
        category:     detectCategory(title),
        commentCount,
        likeCount,
        hotScore:     calcHotScore(commentCount, likeCount, ageHours),
        publishedAt:  now.toISOString(),
      });
    });


    return deals;
  } catch (err) {
    console.error('[fmkorea] scrape failed:', err instanceof Error ? err.message : err);
    return [];
  }
}
