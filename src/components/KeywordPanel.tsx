'use client';

import { useState, useRef } from 'react';
import { useKeywords } from '@/hooks/useKeywords';

interface Props { onClose: () => void; }

export default function KeywordPanel({ onClose }: Props) {
  const { keywords, add, remove } = useKeywords();
  const [input, setInput] = useState('');
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    if (!add(input)) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div
        className="w-full bg-surface-card border-t border-surface-border/60 rounded-t-3xl p-5 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 핸들 */}
        <div className="w-10 h-1 bg-zinc-700 rounded-full mx-auto mb-4" />

        <h3 className="text-sm font-bold text-zinc-100 mb-1">키워드 알림</h3>
        <p className="text-[11px] text-zinc-500 mb-4">
          등록한 키워드가 포함된 새 딜이 뜨면 알림을 드려요 (최대 10개)
        </p>

        {/* 입력 */}
        <div className={`flex gap-2 mb-4 ${shake ? 'animate-[shake_0.4s_ease]' : ''}`}>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="키워드 입력 (예: 에어팟, 다이슨)"
            className="flex-1 bg-surface border border-surface-border/60 rounded-xl px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim() || keywords.length >= 10}
            className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-xl disabled:opacity-40 hover:bg-brand-500 transition-colors"
          >
            추가
          </button>
        </div>

        {/* 키워드 목록 */}
        {keywords.length === 0 ? (
          <p className="text-[11px] text-zinc-700 text-center py-4">등록된 키워드가 없어요</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map(kw => (
              <span
                key={kw}
                className="flex items-center gap-1.5 bg-brand-900/40 border border-brand-500/30 text-brand-300 text-xs font-semibold px-3 py-1.5 rounded-full"
              >
                {kw}
                <button onClick={() => remove(kw)} className="text-brand-500 hover:text-brand-300">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 bg-surface border border-surface-border/50 rounded-xl text-zinc-400 text-sm font-semibold hover:bg-surface-hover transition-colors"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
