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
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

// 뽐뿌: HTML 스크래핑
async function fetchPpomppuComments(url: string): Promise<Comment[]> {
  const res  = await axios.get(url, { timeout: TIMEOUT, responseType: 'arraybuffer', headers: HEADERS });
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

  return comments;
}

// 퀘이사존: JSON API 호출
// URL 형식: https://quasarzone.com/bbs/{boardName}/views/{writeId}
async function fetchQuasarzoneComments(url: string): Promise<Comment[]> {
  const match = url.match(/quasarzone\.com\/bbs\/([^/]+)\/views\/(\d+)/);
  if (!match) return [];

  const [, boardName, writeId] = match;

  const res = await axios.get(`https://quasarzone.com/comments/${boardName}/getComment`, {
    timeout: TIMEOUT,
    params:  { boardName, writeId, page: 1, order: 'old' },
    headers: { ...HEADERS, Referer: url },
  });

  const data     = res.data;
  const rawList  = data.comm_list?.comments?.data ?? [];
  const bestList = data.comm_list?.best_comments ?? [];
  const all      = [...bestList, ...rawList];

  return all.map((c: Record<string, unknown>) => ({
    id:       String(c.id ?? Math.random()),
    nickname: String(c.user_nick || c.name || '익명'),
    body:     String(c.content ?? '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
    time:     String(c.created_at ?? '').slice(0, 16),
    isReply:  Number(c.comm_depth ?? 0) > 0,
    upvote:   Number(c.good ?? 0),
    downvote: Number(c.nogood ?? 0),
  })).filter((c: Comment) => c.body.length > 0);
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'url required' }, { status: 400 });
  }

  try {
    const comments = url.includes('quasarzone.com')
      ? await fetchQuasarzoneComments(url)
      : await fetchPpomppuComments(url);

    return NextResponse.json({ comments, total: comments.length }, {
      headers: { 'Cache-Control': 'public, max-age=120, stale-while-revalidate=60' },
    });
  } catch (err) {
    console.error('[comments]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'fetch failed' }, { status: 500 });
  }
}
