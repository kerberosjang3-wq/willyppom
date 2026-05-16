import axios from 'axios';
import * as cheerio from 'cheerio';
import type { Deal } from '@/types/deal';
import { detectCategory, calcHotScore, makeId, safeNumber } from './utils';

const BOARD_URL = 'https://www.clien.net/service/board/jirum?&od=T31&po=0';
const BASE_URL  = 'https://www.clien.net';
const TIMEOUT   = 10_000;

export async function scrapeClien(): Promise<Deal[]> {
  try {
    const { data: html } = await axios.get<string>(BOARD_URL, {
      timeout: TIMEOUT,
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9',
        Referer: 'https://www.clien.net/',
      },
    });

    const $ = cheerio.load(html);
    const deals: Deal[] = [];
    const now = new Date();

    $('.list_item').each((i, el) => {
      if (i >= 40) return false;

      const titleEl  = $(el).find('[data-role="list-title-text"]');
      const title    = titleEl.text().trim();
      if (!title) return;

      const href     = $(el).attr('href') ?? '';
      const url      = href.startsWith('http') ? href : BASE_URL + href;
      
      // Use data attribute for comments if available
      const commAttr = $(el).attr('data-comment-count');
      const commText = commAttr || $(el).find('.rSymph05, .list_reply').text().trim();
      const likeText = $(el).find('.list_symph').text().trim();
      const timeText = $(el).find('.list_time .time').text().trim();

      const commentCount = safeNumber(commText.replace(/[^\d]/g, ''));
      const likeCount    = safeNumber(likeText.replace(/[^\d]/g, ''));

      // Parse relative time or specific time
      const ageHours = 3;

      deals.push({
        id:           makeId('clien', url.split('/').pop()?.split('?')[0] ?? String(i)),
        title,
        url,
        source:       'clien' as const,
        sourceName:   '클리앙',
        category:     detectCategory(title),
        commentCount,
        likeCount,
        hotScore:     calcHotScore(commentCount, likeCount, ageHours),
        publishedAt:  now.toISOString(),
      });
    });


    return deals;
  } catch (err) {
    console.error('[clien] scrape failed:', err instanceof Error ? err.message : err);
    return [];
  }
}

