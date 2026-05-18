import type { Deal } from '@/types/deal';

// Common shopping malls to match
const MALLS = [
  '알리', '알리익스프레스', '아마존', '아마존일반', '아마존프라임', '11번가', '지마켓', 'g마켓', '옥션',
  '쿠팡', '위메프', '티몬', '네이버', '네이버페이', '스마트스토어', '쓱', 'ssg', '이마트', '홈플러스',
  '롯데온', '하이마트', '오늘의집', '무신사', '큐텐', 'qoo10', '아이허브', '올리브영', '요기요', '배달의민족'
];

export function extractMall(title: string): string | undefined {
  // First, check for bracketed text like [지마켓] or (알리)
  const bracketMatch = title.match(/\[([^\]]+)\]|\(([^\)]+)\)|<([^>]+)>/);
  if (bracketMatch) {
    const textInBracket = bracketMatch[1] || bracketMatch[2] || bracketMatch[3];
    // Check if the bracketed text looks like a mall name
    if (MALLS.some(m => textInBracket.replace(/\s+/g, '').toLowerCase().includes(m))) {
      return textInBracket.trim();
    }
  }

  // Fallback: check if the title starts with a known mall name or contains it separated by space/colon
  const lowerTitle = title.toLowerCase();
  for (const mall of MALLS) {
    if (lowerTitle.includes(mall)) {
      // Very basic fallback, but bracket check is usually better
      return mall;
    }
  }

  return undefined;
}

export function extractShipping(title: string): string | undefined {
  if (title.match(/무료배송|무배|배송무료|프라임무료|로켓배송|스마일배송/)) {
    return '무료배송';
  }
  const feeMatch = title.match(/배송비\s*[\d,]+원?/);
  if (feeMatch) {
    return feeMatch[0];
  }
  if (title.includes('/무료') || title.includes('(무료)')) {
    return '무료배송';
  }
  return undefined;
}

// 한국 가격 포맷 유효성 검사: 1~3자리 시작 후 ,xxx 그룹 반복 (예: 16,900 / 1,234,567)
function isValidKoreanPrice(s: string): boolean {
  return /^\d{1,3}(,\d{3})*$/.test(s);
}

export function extractPrice(title: string): string | undefined {
  // 명시적 "원" 패턴: 16,900원
  const wonMatch = title.match(/[\d,]+\s*원/);
  if (wonMatch) {
    const num = wonMatch[0].replace(/\s*원$/, '');
    if (isValidKoreanPrice(num)) return wonMatch[0].trim();
  }

  // 달러 패턴
  const dollarMatch = title.match(/\$\s*[\d,.]+/);
  if (dollarMatch) return dollarMatch[0].trim();

  // 괄호 안 가격 패턴: (16,900/무배) 또는 잘린 제목 (16,900...
  // 단, 쉼표 뒤 자리수가 맞지 않는 잘린 숫자(62,6 등)는 제외
  const parenMatch = title.match(/\(([\d,]{4,})(?:\/|\.\.\.|\))/);
  if (parenMatch && isValidKoreanPrice(parenMatch[1])) return parenMatch[1] + '원';

  return undefined;
}

export function cleanTitle(title: string, mall?: string): string {
  let cleaned = title;

  // Remove bracketed mall name if it matches
  if (mall) {
    cleaned = cleaned.replace(new RegExp(`\\[${mall}\\]|\\(${mall}\\)|<${mall}>`, 'i'), '');
    // Also remove just the mall text if it was dangling
    if (cleaned.startsWith(mall)) {
      cleaned = cleaned.substring(mall.length);
    }
  }

  // Remove common prefix/suffix garbage like [핫딜], [종료], [끌올]
  cleaned = cleaned.replace(/\[?(핫딜|종료|품절|끌올|진행중|할인|특가)\]?/g, '');

  // Strip extracted price and shipping from the end of the title if they exist there
  // (Usually they are at the end in parentheses)
  cleaned = cleaned.replace(/\([^\)]*[\d,]+원[^\)]*\)/g, ''); // Removes like (19,900원/무배)
  cleaned = cleaned.replace(/\([^\)]*무배[^\)]*\)/g, '');
  cleaned = cleaned.replace(/\([^\)]*무료배송[^\)]*\)/g, '');
  
  // Also remove standalone "무배", "무료배송" from the end
  cleaned = cleaned.replace(/\s*(무배|무료배송|무료|배송무료)\s*$/g, '');
  cleaned = cleaned.replace(/!+$/g, ''); // remove trailing exclamation marks

  return cleaned.trim().replace(/^[\/\-\_\|\:\s]+|[\/\-\_\|\:\s]+$/g, ''); // remove leading/trailing separators
}

export function normalizeDeal(deal: Deal): Deal {
  const mallName = extractMall(deal.title);
  const shipping = extractShipping(deal.title);
  const price = deal.price || extractPrice(deal.title); // Use already extracted price if available, else try from title
  const productName = cleanTitle(deal.title, mallName);

  return {
    ...deal,
    productName: productName || deal.title, // Fallback to original if completely stripped
    mallName,
    shipping,
    price,
  };
}
