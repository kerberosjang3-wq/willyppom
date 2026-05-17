import axios from 'axios';
import * as cheerio from 'cheerio';
import { supabase } from '@/lib/supabase';

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

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

/**
 * Extracts OG Image using Double-Hop logic and caches it in Supabase.
 * Returns the cached URL if it already exists.
 */
export async function extractAndCacheOgImage(targetUrl: string): Promise<string | null> {
  // 1. Check Supabase Cache first
  if (supabase) {
    try {
      const { data: cacheData } = await supabase
        .from('og_cache')
        .select('image_url')
        .eq('url', targetUrl)
        .single();
      
      if (cacheData) {
        return cacheData.image_url;
      }
    } catch (err) {
      // Ignore cache miss or DB error
    }
  }

  try {
    const html = await fetchHtml(targetUrl, 4000);
    const $ = cheerio.load(html);
    
    // 2. Try to find the Outlink (Shopping mall link)
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

    let imageUrl: string | undefined;

    // 3. Double Hop to Shopping Mall
    if (outlink && outlink.startsWith('http')) {
      try {
        const outHtml = await fetchHtml(outlink, 3000);
        const out$ = cheerio.load(outHtml);
        const mallOgImg = out$('meta[property="og:image"]').attr('content');
        if (mallOgImg && !isIgnoredImage(mallOgImg)) {
          imageUrl = mallOgImg;
        }
      } catch (e) {
        console.error(`Outlink fetch failed for ${outlink}`);
      }
    }

    // 4. Fallback to Community Post
    if (!imageUrl) {
      imageUrl = $('meta[property="og:image"]').attr('content');
      if (!imageUrl || isIgnoredImage(imageUrl)) {
        imageUrl = $('article img, .article_view img, .board_main img, .document_content img, .post_content img').first().attr('src');
      }
    }

    // Resolve relative URLs
    if (imageUrl && imageUrl.startsWith('//')) {
      imageUrl = 'https:' + imageUrl;
    } else if (imageUrl && imageUrl.startsWith('/')) {
      const urlObj = new URL(targetUrl);
      imageUrl = urlObj.origin + imageUrl;
    }

    if (isIgnoredImage(imageUrl)) {
      imageUrl = undefined;
    }

    const finalImage = imageUrl || null;

    // 5. Save to Cache
    if (supabase) {
      try {
        await supabase.from('og_cache').insert({
          url: targetUrl,
          image_url: finalImage
        });
      } catch (err) {
        console.error('OG Cache insert error', err);
      }
    }

    return finalImage;

  } catch (error) {
    console.error(`OG extraction failed for ${targetUrl}:`, error instanceof Error ? error.message : error);
    return null;
  }
}
