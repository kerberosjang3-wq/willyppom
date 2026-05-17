import { NextResponse } from 'next/server';
import { scrapePpomppu } from '@/lib/scrapers/ppomppu';

export async function GET() {
  try {
    const deals = await scrapePpomppu();

    let htmlSnippet = null;
    if (deals.length === 0) {
      const res = await fetch('https://m.ppomppu.co.kr/new/bbs_list.php?id=ppomppu&hotlist_flag=999', {
        headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
      });
      htmlSnippet = (await res.text()).slice(0, 2000);
    }

    return NextResponse.json({
      ppomppu: { count: deals.length, ok: true, first: deals[0] ?? null, htmlSnippet },
    });
  } catch (err: any) {
    return NextResponse.json({
      ppomppu: { count: 0, ok: false, error: err.message },
    });
  }
}
