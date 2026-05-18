import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface Comment {
  id:       string;
  nickname: string;
  body:     string;
  time:     string;
  isReply:  boolean;
  upvote:   number;
  downvote: number;
}

const TIMEOUT = 8_000;

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  try {
    const res = await axios.get(url, {
      timeout: TIMEOUT,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    const html = new TextDecoder('euc-kr').decode(res.data);
    const $    = cheerio.load(html);
    const comments: Comment[] = [];

    $('.sect-cmt').each((_, el) => {
      const id       = $(el).find('.comment_memo').first().attr('id') ?? String(Math.random());
      const nickname = $(el).find('.com_name_writer').text().replace(/\s+/g, ' ').trim();
      const body     = $(el).find('.comment_memo').text().replace(/\s+/g, ' ').trim();
      const time     = $(el).find('time, .com_date').first().text().trim();
      const isReply  = $(el).find('.recomment').length > 0;
      const upvote   = parseInt($(el).find('[id^="vote_cnt_"]').text().trim()) || 0;
      const downvote = parseInt($(el).find('[id^="anti_vote_cnt_"]').text().trim()) || 0;

      if (!nickname || !body) return;

      comments.push({ id, nickname, body, time, isReply, upvote, downvote });
    });

    return NextResponse.json({ comments, total: comments.length }, {
      headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[comments]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
