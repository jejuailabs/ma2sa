'use client';

import { useState } from 'react';
import { Header } from '@/components/common/Header';
import { BottomTabBar } from '@/components/common/BottomTabBar';
import { SearchBar } from '@/components/common/SearchBar';
import { FeedCard } from '@/components/feed/FeedCard';
import { MOCK_POSTS } from '@/lib/mockData';
import { Search } from 'lucide-react';

export default function SearchPage() {
  const [query, setQuery] = useState('');

  const results = query.length >= 2
    ? MOCK_POSTS.filter(
        (p) =>
          p.title.toLowerCase().includes(query.toLowerCase()) ||
          p.content.toLowerCase().includes(query.toLowerCase()) ||
          p.villageName.includes(query)
      )
    : [];

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <Header />

      <main className="max-w-content mx-auto px-4 sm:px-6 py-6">
        <h1 className="text-xl font-bold text-[var(--color-text)] mb-4">검색</h1>
        <SearchBar placeholder="마을 소식, 이벤트, 특산품 검색" value={query} onChange={setQuery} />

        <div className="mt-6">
          {query.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-20 text-[var(--color-text-secondary)]">
              <Search className="w-12 h-12 mb-4 opacity-30" />
              <p>검색어를 입력해주세요</p>
              <p className="text-sm mt-1">2글자 이상 입력하면 검색됩니다</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 text-[var(--color-text-secondary)]">
              <p className="text-lg mb-2">&ldquo;{query}&rdquo; 검색 결과가 없습니다</p>
              <p className="text-sm">다른 검색어로 시도해보세요</p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-[var(--color-text-secondary)]">{results.length}건의 결과</p>
              {results.map((post) => (
                <FeedCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      </main>

      <BottomTabBar />
    </div>
  );
}
