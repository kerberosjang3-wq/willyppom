'use client';

export type TabId = 'feed' | 'lowest' | 'bookmarks';

interface Props {
  active: TabId;
  onChange: (t: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'feed',
    label: '핫딜',
    icon: active => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
          d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
          d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
  },
  {
    id: 'lowest',
    label: '최저가',
    icon: active => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
          d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: 'bookmarks',
    label: '찜',
    icon: active => (
      <svg className="w-5 h-5" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 0 : 2}
          d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
  },
];

export default function BottomTabBar({ active, onChange }: Props) {
  return (
    <nav className="shrink-0 w-full z-30 bg-surface/90 backdrop-blur-xl border-t border-surface-border/50 pb-safe pl-safe pr-safe">
      <div className="flex items-center justify-around px-2 pt-2 pb-3 max-w-lg mx-auto">
        {TABS.map(tab => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className={`flex flex-col items-center gap-0.5 px-6 py-1 rounded-xl transition-all duration-150 ${
                isActive ? 'text-brand-400' : 'text-zinc-600 hover:text-zinc-400'
              }`}
            >
              {tab.icon(isActive)}
              <span className={`text-[10px] font-semibold ${isActive ? 'text-brand-400' : 'text-zinc-600'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
