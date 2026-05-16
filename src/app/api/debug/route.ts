import { NextRequest, NextResponse } from 'next/server';
import { SCRAPERS } from '@/lib/scrapers';

export async function GET(req: NextRequest) {
  const results: any = {};
  
  for (const [name, scraper] of Object.entries(SCRAPERS)) {
    try {
      console.log(`[debug] scraping ${name}...`);
      const deals = await scraper();
      
      let htmlSnippet = null;
      if (name === 'ppomppu' && deals.length === 0) {
        const res = await fetch('https://m.ppomppu.co.kr/new/bbs_list.php?id=ppomppu', {
          headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
        });
        htmlSnippet = (await res.text()).slice(0, 2000);
      }

      results[name] = {
        count: deals.length,
        ok: true,
        first: deals[0] || null,
        htmlSnippet
      };
    } catch (err: any) {
      results[name] = {
        count: 0,
        ok: false,
        error: err.message
      };
    }
  }

  return NextResponse.json(results);
}
