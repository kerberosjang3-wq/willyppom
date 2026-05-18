import type { CategoryId } from '@/types/deal';

const CATEGORY_KEYWORDS: Record<CategoryId, string[]> = {
  electronics: ['삼성', '애플', 'LG', '노트북', '아이폰', '갤럭시', '이어폰', '모니터', 'TV', '태블릿', '스마트', 'SSD', 'CPU', '그래픽', '마우스', '키보드', '충전', '배터리', '카메라', '프린터'],
  food:        ['치킨', '피자', '배달', '식품', '마트', '쿠팡', '편의점', '음식', '과자', '라면', '스낙', '커피', '음료', '닭', '소고기', '돼지', '할인쿠폰', '배달비'],
  fashion:     ['패션', '의류', '신발', '가방', '나이키', '아디다스', '옷', '티셔츠', '청바지', '코트', '자켓', '운동화', '구두', '지갑', '시계'],
  living:      ['가구', '청소기', '세탁기', '냉장고', '에어컨', '침대', '소파', '욕실', '주방', '조명', '인테리어', '청소', '선반'],
  travel:      ['항공', '호텔', '여행', '숙박', '렌터카', '티켓', '제주', '해외', '패키지', '에어비앤비'],
  game:        ['게임', '플스', 'PS5', '닌텐도', '스위치', 'XBOX', '스팀', '게이밍', 'PC방'],
  beauty:      ['화장품', '스킨케어', '마스크팩', '립스틱', '아이섀도', '향수', '헤어', '뷰티', '미백', '세럼'],
  all:         [],
  etc:         [],
};

export function detectCategory(title: string): CategoryId {
  const lower = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [CategoryId, string[]][]) {
    if (cat === 'all' || cat === 'etc') continue;
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) return cat;
  }
  return 'etc';
}

export function extractPrice(text: string): string | undefined {
  const m = text.match(/[\d,]+\s*원/);
  return m ? m[0].trim() : undefined;
}

export function makeId(source: string, rawId: string): string {
  return `${source}-${rawId.replace(/\W+/g, '-')}`;
}

export function safeNumber(val: string | undefined | null): number {
  if (!val) return 0;
  const n = parseInt(val.replace(/,/g, ''), 10);
  return isNaN(n) ? 0 : n;
}
