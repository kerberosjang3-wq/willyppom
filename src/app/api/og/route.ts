import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

const CACHE_TTL = 86400; // 24 hours
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const res = await axios.get(targetUrl, {
      timeout: 5000,
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });

    const $ = cheerio.load(res.data);
    let imageUrl = $('meta[property="og:image"]').attr('content');
    
    // Fallback to finding the first img in the article body if OG image is missing
    if (!imageUrl) {
      imageUrl = $('article img, .article_view img, .board_main img, .document_content img').first().attr('src');
    }

    // Handle relative URLs
    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    } else if (imageUrl && imageUrl.startsWith('/')) {
      const urlObj = new URL(targetUrl);
      imageUrl = urlObj.origin + imageUrl;
    }

    // Set cache-control headers for fast re-fetching
    const response = NextResponse.json({ imageUrl: imageUrl || null });
    response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`);
    
    return response;
  } catch (error) {
    console.error(`OG fetch failed for ${targetUrl}:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ imageUrl: null }); // Don't fail the request, just return null image
  }
}
