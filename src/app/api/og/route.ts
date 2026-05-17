import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase';

const CACHE_TTL = 86400; // 24 hours
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// List of generic community logos to ignore
const IGNORED_IMAGES = [
  'clien.net',
  'ruliweb.com',
  'ppomppu.co.kr',
  'fmkorea.com',
  'logo',
  'default'
];

function isIgnoredImage(url: string | undefined): boolean {
  if (!url) return true;
  const lower = url.toLowerCase();
  return IGNORED_IMAGES.some(ignore => lower.includes(ignore));
}

async function fetchHtml(url: string, timeout = 5000) {
  const res = await axios.get(url, {
    timeout,
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
      'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
    },
  });
  return res.data;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    // 1. Check Supabase Cache first
    if (supabase) {
      const { data: cacheData } = await supabase
        .from('og_cache')
        .select('image_url')
        .eq('url', targetUrl)
        .single();
      
      if (cacheData) {
        const response = NextResponse.json({ imageUrl: cacheData.image_url });
        response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`);
        return response;
      }
    }

    const html = await fetchHtml(targetUrl, 4000);
    const $ = cheerio.load(html);
    
    // 1. Try to find the Outlink (Shopping mall link)
    let outlink = '';
    if (targetUrl.includes('clien.net')) {
      outlink = $('.outlink a').attr('href') || '';
      if (!outlink) outlink = $('.post_content a.url').attr('href') || '';
    } else if (targetUrl.includes('ruliweb.com')) {
      outlink = $('.source_url a').attr('href') || '';
    } else if (targetUrl.includes('ppomppu.co.kr')) {
      outlink = $('.wordfix a').attr('href') || '';
    } else if (targetUrl.includes('fmkorea.com')) {
      outlink = $('a.xe_url').attr('href') || '';
    }

    // Double Hop: If outlink exists, go to the shopping mall and get the high quality image
    let imageUrl: string | undefined;

    if (outlink && outlink.startsWith('http')) {
      try {
        const outHtml = await fetchHtml(outlink, 3000);
        const out$ = cheerio.load(outHtml);
        const mallOgImg = out$('meta[property="og:image"]').attr('content');
        if (mallOgImg && !isIgnoredImage(mallOgImg)) {
          imageUrl = mallOgImg;
        }
      } catch (e) {
        // Silently ignore outlink fetch errors and fallback
        console.error(`Outlink fetch failed for ${outlink}`);
      }
    }

    // Fallback: If no outlink or outlink failed to provide a valid image, look in the community post
    if (!imageUrl) {
      imageUrl = $('meta[property="og:image"]').attr('content');
      
      // If OG image is missing or is just the community logo, search the article body
      if (!imageUrl || isIgnoredImage(imageUrl)) {
        imageUrl = $('article img, .article_view img, .board_main img, .document_content img, .post_content img').first().attr('src');
      }
    }

    // Handle relative URLs
    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    } else if (imageUrl && imageUrl.startsWith('/')) {
      const urlObj = new URL(targetUrl);
      imageUrl = urlObj.origin + imageUrl;
    }

    // Nullify if it's still an ignored logo
    if (isIgnoredImage(imageUrl)) {
      imageUrl = undefined;
    }

    // Save to cache asynchronously if supabase exists
    if (supabase) {
      (async () => {
        try {
          await supabase.from('og_cache').insert({
            url: targetUrl,
            image_url: imageUrl || null
          });
        } catch (err) {
          console.error('OG Cache insert error', err);
        }
      })();
    }

    const response = NextResponse.json({ imageUrl: imageUrl || null });
    response.headers.set('Cache-Control', `public, s-maxage=${CACHE_TTL}, stale-while-revalidate=86400`);
    
    return response;
  } catch (error) {
    console.error(`OG fetch failed for ${targetUrl}:`, error instanceof Error ? error.message : error);
    return NextResponse.json({ imageUrl: null });
  }
}
